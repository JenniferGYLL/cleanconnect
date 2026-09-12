import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Service role is needed only to write the token row — one_off_job_tokens
// deliberately has zero RLS policies (see supabase/schema.sql 27f) so a
// signed-in-but-unrelated user can never read or guess their way into
// another building's tokens. The one authorization check that matters
// happens below, with the caller's own session, before the admin client
// is ever touched.
function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const LINK_LIFETIME_DAYS = 14;

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as { jobId?: string };
  const jobId = body.jobId?.trim();

  if (!jobId) {
    return NextResponse.json({ error: "Job is required" }, { status: 400 });
  }

  // Confirm the caller's own company owns the building this job belongs
  // to, using their real session (RLS-scoped) rather than the admin
  // client — this is the actual access check for the whole route.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_type, buildings(org_id)")
    .eq("id", jobId)
    .maybeSingle();

  const building = job
    ? ((Array.isArray((job as { buildings: unknown }).buildings)
        ? (job as unknown as { buildings: { org_id: string }[] }).buildings[0]
        : (job as unknown as { buildings: { org_id: string } | null }).buildings) ?? null)
    : null;

  if (!job || !building || building.org_id !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + LINK_LIFETIME_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const admin = serviceClient();
  const { error: insertError } = await admin.from("one_off_job_tokens").insert({
    job_id: jobId,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const origin = new URL(request.url).origin;

  return NextResponse.json({
    url: `${origin}/one-off/${token}`,
    expiresAt,
  });
}
