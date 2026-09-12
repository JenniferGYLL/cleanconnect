import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_LABEL, isServiceCategory } from "@/lib/buildings/categories";

// A one-off contractor never signs in, so every request here is
// unauthenticated by design — the token itself (long, random, unique,
// expiring, single-use) is the only credential. one_off_job_tokens has
// zero client-facing RLS policies (see supabase/schema.sql 27f), so the
// service role key is required just to read the table at all; that's
// the intended shape, not a shortcut around security.
function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadValidToken(token: string) {
  const admin = serviceClient();

  const { data: tokenRow } = await admin
    .from("one_off_job_tokens")
    .select("id, job_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return { admin, error: "not_found" as const };
  if (tokenRow.used_at) return { admin, error: "used" as const };
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return { admin, error: "expired" as const };
  }

  const { data: job } = await admin
    .from("jobs")
    .select("id, category, title, notes, job_type, status, building_id, buildings(name)")
    .eq("id", tokenRow.job_id)
    .maybeSingle();

  if (!job) return { admin, error: "not_found" as const };

  return { admin, tokenRow, job };
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const result = await loadValidToken(params.token);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { job } = result;
  const building = Array.isArray(job!.buildings) ? job!.buildings[0] : job!.buildings;
  const category = isServiceCategory(job!.category) ? job!.category : "other";

  return NextResponse.json({
    job: {
      id: job!.id,
      title: job!.title,
      notes: job!.notes,
      status: job!.status,
      categoryLabel: CATEGORY_LABEL[category],
      buildingName: building?.name ?? "your building",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const result = await loadValidToken(params.token);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { admin, job } = result;

  if (job!.status === "completed") {
    return NextResponse.json(
      { error: "This job has already been submitted." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const notes = (form.get("notes") as string | null)?.trim() || null;
  const contractorName =
    (form.get("contractorName") as string | null)?.trim() || null;
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File);

  const category = isServiceCategory(job!.category) ? job!.category : "other";

  const { data: record, error: insertError } = await admin
    .from("service_records")
    .insert({
      job_id: job!.id,
      building_id: job!.building_id,
      category,
      contractor_org_id: null,
      contractor_name: contractorName,
      submitted_by: null,
      notes,
    })
    .select("id")
    .single();

  if (insertError || !record) {
    return NextResponse.json(
      { error: insertError?.message ?? "Couldn't submit this job." },
      { status: 500 }
    );
  }

  for (const photo of photos) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${job!.building_id}/${record.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("service-record-photos")
      .upload(path, photo);

    if (uploadError) continue;

    const { data: publicUrl } = admin.storage
      .from("service-record-photos")
      .getPublicUrl(path);

    await admin.from("service_record_photos").insert({
      service_record_id: record.id,
      url: publicUrl.publicUrl,
    });
  }

  await admin.from("jobs").update({ status: "completed" }).eq("id", job!.id);
  await admin
    .from("one_off_job_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("job_id", job!.id)
    .is("used_at", null);

  return NextResponse.json({ ok: true });
}
