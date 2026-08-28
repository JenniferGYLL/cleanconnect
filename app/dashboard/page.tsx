import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardTabs from "./DashboardTabs";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
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

  if (!company.approved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Your account is under review
          </h1>
          <p className="mt-3 text-slate-500">
            {company.company_name} has been submitted and is pending
            approval. Once approved, you&apos;ll see your leads and reviews here.
          </p>
        </div>
      </main>
    );
  }

  const [{ data: leads }, { data: reviews }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, customers(full_name, phone)")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">
              {company.company_name}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <DashboardTabs
          companyId={user.id}
          leads={leads ?? []}
          reviews={reviews ?? []}
        />
      </div>
    </main>
  );
}
