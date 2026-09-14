import Link from "next/link";
import { requireStaff } from "@/lib/dashboard/requireStaff";
import { StaffNav } from "@/components/staff/StaffNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";

type JobRow = {
  id: string;
  category: ServiceCategory;
  title: string;
  schedule_note: string | null;
  buildings: { id: string; name: string; address: string } | { id: string; name: string; address: string }[] | null;
};

export default async function StaffServiceJobsPage() {
  const { supabase, staff, companyName } = await requireStaff();

  const { data } = await supabase
    .from("jobs")
    .select("id, category, title, schedule_note, buildings(id, name, address)")
    .eq("assigned_staff_id", staff.id)
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
        <StaffNav staffName={staff.full_name} companyName={companyName} />

        <div className="mx-auto max-w-lg px-6">
          <FadeIn>
            <Link href="/staff" className="text-sm font-medium text-ink-700/60 hover:text-ink-900">
              ← My jobs
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
              Building service jobs
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">Open a job, take photos, submit.</p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-6">
            {jobs.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Nothing assigned to you right now.
              </div>
            ) : (
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/staff/service-jobs/${job.id}`}
                      className="glass-surface flex items-center justify-between gap-4 rounded-2xl p-5 transition hover:shadow-tint-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">
                          {CATEGORY_EMOJI[job.category]} {job.title}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-700/60">
                          {job.building?.name}
                        </p>
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
