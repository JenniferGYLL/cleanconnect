import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { ComingNext } from "@/components/dashboard/ComingNext";

export default async function CustomersPage() {
  const { company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="customers"
          companyName={company.company_name}
          email={company.email}
        />
        <ComingNext
          eyebrow="Customers"
          title="One screen per relationship"
          description="Every quote, job, invoice, review and note for a customer, on a single timeline — not a traditional CRM grid."
          points={[
            "New lead → quote sent → accepted → job → paid → reviewed, shown as one visual timeline",
            "Search and filter by date, job type, size or price — no more scrolling the full history",
            "Feeds directly from the Leads & Quotes and Jobs data already live today",
          ]}
        />
      </div>
    </main>
  );
}
