import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Company = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  service_area: string | null;
  approved: boolean;
  created_at: string;
};

// Shared guard for every /dashboard/* page: confirms the visitor is a
// logged-in company account and hands back the row. Individual pages
// decide what to do with `company.approved === false` — the Home page
// shows the "under review" message, everything else redirects there.
export async function requireCompany() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!company) {
    redirect("/login");
  }

  return { supabase, user, company: company as Company };
}
