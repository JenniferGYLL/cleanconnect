import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Needs the service role key for one reason only: to look up whether a
// customer account already exists for the given email so the resident
// can be linked immediately instead of waiting for handle_new_user() to
// backfill it on signup. Companies have no RLS access to arbitrary rows
// in `customers` (only ones who've booked with them), which is correct
// — this route is the one narrow, server-side exception.
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

  const body = (await request.json()) as {
    buildingId?: string;
    email?: string;
  };
  const buildingId = body.buildingId?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!buildingId || !email) {
    return NextResponse.json(
      { error: "Building and email are required" },
      { status: 400 }
    );
  }

  // Confirms the caller actually owns this building — RLS would also
  // reject the eventual insert, but checking here gives a clean 403
  // instead of a generic database error.
  const { data: building } = await supabase
    .from("buildings")
    .select("id, org_id")
    .eq("id", buildingId)
    .eq("org_id", user.id)
    .maybeSingle();

  if (!building) {
    return NextResponse.json(
      { error: "Building not found" },
      { status: 404 }
    );
  }

  const admin = serviceClient();

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id, full_name")
    .ilike("email", email)
    .maybeSingle();

  const { data: resident, error: insertError } = await admin
    .from("building_residents")
    .insert({
      building_id: buildingId,
      email,
      customer_id: existingCustomer?.id ?? null,
      added_by: user.id,
    })
    .select("id, email, customer_id, created_at")
    .single();

  if (insertError) {
    const message = insertError.code === "23505"
      ? "That email has already been added to this building."
      : insertError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    resident: { ...resident, full_name: existingCustomer?.full_name ?? null },
  });
}
