import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SERVICE_CATEGORIES, CATEGORY_LABEL, type ServiceCategory } from "@/lib/buildings/categories";

type ReportRecord = {
  id: string;
  category: ServiceCategory;
  contractor_name: string | null;
  issue_status: "none" | "flagged" | "resolved";
  completed_at: string;
};

type ReportFeedback = {
  liked: boolean;
  status: "good" | "needs_attention" | null;
};

export default async function BuildingReportPage({
  params,
}: {
  params: { buildingId: string };
}) {
  const { supabase, company } = await requireCompany();

  if (company.org_type !== "property_manager") {
    redirect("/dashboard");
  }

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("id", params.buildingId)
    .eq("org_id", company.id)
    .maybeSingle();

  if (!building) {
    notFound();
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recordRows } = await supabase
    .from("service_records")
    .select("id, category, contractor_name, issue_status, completed_at")
    .eq("building_id", building.id)
    .gte("completed_at", ninetyDaysAgo)
    .order("completed_at", { ascending: false });

  const records = (recordRows ?? []) as ReportRecord[];
  const recordIds = records.map((r) => r.id);

  let feedback: ReportFeedback[] = [];
  if (recordIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from("service_record_feedback")
      .select("liked, status")
      .in("service_record_id", recordIds);
    feedback = (feedbackRows ?? []) as ReportFeedback[];
  }

  const totalByCategory = new Map<ServiceCategory, number>();
  const contractorActivity = new Map<string, number>();
  for (const record of records) {
    totalByCategory.set(record.category, (totalByCategory.get(record.category) ?? 0) + 1);
    if (record.contractor_name) {
      contractorActivity.set(
        record.contractor_name,
        (contractorActivity.get(record.contractor_name) ?? 0) + 1
      );
    }
  }

  const flaggedCount = records.filter((r) => r.issue_status === "flagged").length;
  const resolvedCount = records.filter((r) => r.issue_status === "resolved").length;
  const likeCount = feedback.filter((f) => f.liked).length;
  const goodCount = feedback.filter((f) => f.status === "good").length;
  const needsAttentionCount = feedback.filter((f) => f.status === "needs_attention").length;

  const contractorRows = Array.from(contractorActivity.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="buildings"
          companyName={company.company_name}
          email={company.email}
          orgType="property_manager"
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <Link
              href={`/dashboard/buildings/${building.id}`}
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← {building.name}
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold-500">
              Building report
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Last 90 days
            </h1>
            <p className="mt-1.5 text-sm text-ink-700/70">
              Generated from {records.length} logged service record
              {records.length === 1 ? "" : "s"} — nothing here is estimated or
              invented, only what was actually recorded.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Visits logged" value={String(records.length)} />
              <Stat label="Marked Good" value={String(goodCount)} />
              <Stat label="Needs attention" value={String(flaggedCount)} tone={flaggedCount > 0 ? "warn" : undefined} />
              <Stat label="Issues resolved" value={String(resolvedCount)} />
            </div>
          </FadeIn>

          <FadeIn delay={0.08} className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
              By service category
            </p>
            <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
              {SERVICE_CATEGORIES.filter((cat) => (totalByCategory.get(cat.key) ?? 0) > 0).map(
                (cat) => (
                  <li key={cat.key} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ink-900">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="font-medium text-ink-700/70">
                      {totalByCategory.get(cat.key)} visits
                    </span>
                  </li>
                )
              )}
              {records.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-ink-700/50">
                  Nothing logged in the last 90 days.
                </li>
              )}
            </ul>
          </FadeIn>

          {contractorRows.length > 0 && (
            <FadeIn delay={0.11} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Contractor activity
              </p>
              <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
                {contractorRows.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ink-900">{name}</span>
                    <span className="font-medium text-ink-700/70">{count} visits</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          )}

          {(likeCount > 0 || goodCount > 0 || needsAttentionCount > 0) && (
            <FadeIn delay={0.14} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Resident feedback
              </p>
              <div className="glass-surface rounded-2xl p-5 text-sm text-ink-700/70">
                👍 {likeCount} likes · {goodCount} said Good · {needsAttentionCount} flagged
                Needs Attention
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="glass-surface rounded-2xl p-4 text-center">
      <p
        className={`font-display text-xl font-semibold ${
          tone === "warn" ? "text-brand-600" : "text-ink-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-700/50">{label}</p>
    </div>
  );
}
