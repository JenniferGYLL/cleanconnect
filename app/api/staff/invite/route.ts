import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Needs the Supabase service role key to create the staff member's own
// auth.users row and send the invite email — the same key already used
// by app/api/notify for push notifications. Never exposed to the client;
// only used here, server-side, after confirming the caller is an
// approved company.
function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || !company.approved) {
    return NextResponse.json(
      { error: "Only approved companies can invite staff" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    email?: string;
    fullName?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const admin = serviceClient();
  const origin = new URL(request.url).origin;

  // Supabase's invite email carries a one-time link that lands on
  // /auth/callback, which exchanges it for a session and forwards to
  // /reset-password — reusing the exact same "choose your password"
  // page as the existing forgot-password flow.
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
      data: { full_name: fullName },
    });

  if (inviteError || !invited?.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Couldn't send the invite" },
      { status: 500 }
    );
  }

  const { data: staffRow, error: insertError } = await admin
    .from("staff")
    .insert({
      id: invited.user.id,
      company_id: company.id,
      full_name: fullName,
      email,
    })
    .select("id, full_name, email, active, invited_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ staff: staffRow });
}
