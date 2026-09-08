import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffMember = {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  active: boolean;
  invited_at: string;
};

// Shared guard for every /staff/* page: confirms the visitor is a
// logged-in staff account (invited by a company, not self-registered)
// and hands back the row plus their company's name.
export async function requireStaff() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!staff) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("company_name")
    .eq("id", staff.company_id)
    .maybeSingle();

  return {
    supabase,
    user,
    staff: staff as StaffMember,
    companyName: company?.company_name ?? "Your company",
  };
}
