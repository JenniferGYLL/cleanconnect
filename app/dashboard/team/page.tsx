import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { TeamManager, type StaffRow } from "@/components/dashboard/TeamManager";

export default async function TeamPage() {
  const { supabase, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, email, active, invited_at")
    .eq("company_id", company.id)
    .order("invited_at", { ascending: false });

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="team"
          companyName={company.company_name}
          email={company.email}
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Team
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Invite your cleaners
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Give each cleaner their own login so they can see just their
              assigned jobs — nothing else.
            </p>
          </FadeIn>

          <div className="mt-8">
            <TeamManager initialStaff={(staff ?? []) as StaffRow[]} />
          </div>
        </div>
      </div>
    </main>
  );
}
