import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { JobsBoard, type JobLead, type StaffOption } from "@/components/dashboard/JobsBoard";

export default async function JobsPage() {
  const { supabase, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const { data: jobs } = await supabase
    .from("leads")
    .select("*, customers(full_name)")
    .eq("company_id", company.id)
    .in("status", ["accepted", "in_progress"])
    .order("scheduled_date", { ascending: true, nullsFirst: true });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, active")
    .eq("company_id", company.id)
    .order("full_name", { ascending: true });

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="jobs"
          companyName={company.company_name}
          email={company.email}
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Jobs
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Scheduling, in one simple list
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Every accepted job, grouped by day — set a date and assign a
              cleaner. Mark a job complete from its card on the Leads tab.
            </p>
          </FadeIn>

          <div className="mt-8">
            <JobsBoard
              jobs={(jobs ?? []) as JobLead[]}
              staff={(staff ?? []) as StaffOption[]}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
