import Link from "next/link";
import { requireStaff } from "@/lib/dashboard/requireStaff";
import { StaffNav } from "@/components/staff/StaffNav";
import { StaffJobsList, type StaffJob } from "@/components/staff/StaffJobsList";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function StaffPage() {
  const { supabase, staff, companyName } = await requireStaff();

  const [{ data: jobs }, { count: serviceJobCount }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, customers(full_name)")
      .eq("assigned_staff_id", staff.id)
      .in("status", ["accepted", "in_progress"])
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("assigned_staff_id", staff.id)
      .eq("status", "open"),
  ]);

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <StaffNav staffName={staff.full_name} companyName={companyName} />

        <div className="mx-auto max-w-lg px-6">
          <FadeIn>
            <h1 className="font-display text-2xl font-semibold text-ink-900">
              My jobs
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">
              Everything assigned to you, soonest first.
            </p>
          </FadeIn>

          {!!serviceJobCount && serviceJobCount > 0 && (
            <FadeIn delay={0.03} className="mt-4">
              <Link
                href="/staff/service-jobs"
                className="glass-surface spotlight-border flex items-center justify-between rounded-2xl px-5 py-3 text-sm font-medium text-ink-900"
              >
                <span>
                  {serviceJobCount} building service job{serviceJobCount === 1 ? "" : "s"}{" "}
                  assigned to you
                </span>
                <span aria-hidden>→</span>
              </Link>
            </FadeIn>
          )}

          <div className="mt-6">
            <StaffJobsList jobs={(jobs ?? []) as StaffJob[]} />
          </div>
        </div>
      </div>
    </main>
  );
}
