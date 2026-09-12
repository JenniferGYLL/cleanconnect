import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";

type JobRow = {
  id: string;
  category: ServiceCategory;
  title: string;
  notes: string | null;
  job_type: "recurring" | "one_off";
  schedule_note: string | null;
  status: "open" | "completed" | "cancelled";
  buildings: { id: string; name: string; address: string } | { id: string; name: string; address: string }[] | null;
};

export default async function ServiceJobsPage() {
  const { supabase, company } = await requireCompany();

  if (company.org_type === "property_manager") {
    redirect("/dashboard/buildings");
  }

  const { data } = await supabase
    .from("jobs")
    .select(
      "id, category, title, notes, job_type, schedule_note, status, buildings(id, name, address)"
    )
    .eq("contractor_org_id", company.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const jobs = (data ?? []).map((j) => {
    const row = j as unknown as JobRow;
    const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    return { ...row, building };
  });

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="service-jobs"
          companyName={company.company_name}
          email={company.email}
          orgType="contractor"
        />

        <div className="mx-auto max-w-2xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Today&apos;s jobs
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Open a job, take photos, submit
            </h1>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            {jobs.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                No open jobs assigned to you right now.
              </div>
            ) : (
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/dashboard/service-jobs/${job.id}`}
                      className="glass-surface flex items-center justify-between gap-4 rounded-2xl p-5 transition hover:shadow-tint-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">
                          {CATEGORY_EMOJI[job.category]} {job.title}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-700/60">
                          {job.building?.name}
                          {job.building?.address ? ` · ${job.building.address}` : ""}
                        </p>
                        {job.schedule_note && (
                          <p className="mt-0.5 text-xs text-ink-700/50">
                            {job.schedule_note}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {CATEGORY_LABEL[job.category]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
