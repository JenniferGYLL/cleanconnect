import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { ComingNext } from "@/components/dashboard/ComingNext";

export default async function JobsPage() {
  const { company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="jobs"
          companyName={company.company_name}
          email={company.email}
        />
        <ComingNext
          eyebrow="Jobs"
          title="Scheduling, in one simple list"
          description="Who's working where, when, and on which job — grouped by day, no calendar to learn first."
          points={[
            "Today / Tomorrow / This week, grouped automatically once a lead is accepted",
            "One-tap staff assignment per job",
            "A drag-and-drop calendar arrives once your team outgrows a list view",
          ]}
        />
      </div>
    </main>
  );
}
