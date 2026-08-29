import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { ComingNext } from "@/components/dashboard/ComingNext";

export default async function TeamPage() {
  const { company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="team"
          companyName={company.company_name}
          email={company.email}
        />
        <ComingNext
          eyebrow="Team"
          title="Invite your cleaners"
          description="Employee accounts so your team can log in on their phone and see just today's jobs — nothing else."
          points={[
            "Invite by email, using the same secure link flow as password reset",
            "Each cleaner sees only their own assigned jobs for the day",
            "One-minute job completion: checklist, before/after photos, done",
          ]}
        />
      </div>
    </main>
  );
}
