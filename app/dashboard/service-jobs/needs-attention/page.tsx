import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";
import { StatusDot } from "@/components/status/StatusDot";

type FlaggedRecord = {
  id: string;
  category: ServiceCategory;
  notes: string | null;
  completed_at: string;
  buildings: { id: string; name: string } | { id: string; name: string }[] | null;
};

export default async function NeedsAttentionPage() {
  const { supabase, company } = await requireCompany();

  if (company.org_type === "property_manager") {
    redirect("/dashboard/buildings");
  }

  const { data } = await supabase
    .from("service_records")
    .select("id, category, notes, completed_at, buildings(id, name)")
    .eq("contractor_org_id", company.id)
    .eq("issue_status", "flagged")
    .order("completed_at", { ascending: false });

  const records = (data ?? []).map((r) => {
    const row = r as unknown as FlaggedRecord;
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
            <Link
              href="/dashboard/service-jobs"
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← Today&apos;s jobs
            </Link>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">
              Needs attention
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Residents flagged these visits
            </h1>
            <p className="mt-1.5 text-sm text-ink-700/70">
              Fix it and log the correction — it&apos;ll be marked resolved
              automatically and shown alongside the original.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            {records.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Nothing flagged right now.
              </div>
            ) : (
              <ul className="space-y-3">
                {records.map((record) => (
                  <li key={record.id}>
                    <Link
                      href={`/dashboard/service-jobs/needs-attention/${record.id}`}
                      className="glass-surface flex items-center justify-between gap-4 rounded-2xl p-5 transition hover:shadow-tint-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">
                          {CATEGORY_EMOJI[record.category]} {record.building?.name}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-700/60">
                          {CATEGORY_LABEL[record.category]} ·{" "}
                          {new Date(record.completed_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        {record.notes && (
                          <p className="mt-0.5 truncate text-xs text-ink-700/50">
                            {record.notes}
                          </p>
                        )}
                      </div>
                      <StatusDot status="flagged" className="shrink-0" />
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
