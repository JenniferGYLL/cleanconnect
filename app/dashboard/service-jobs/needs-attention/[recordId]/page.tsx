import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SubmitServiceRecordForm } from "@/components/dashboard/SubmitServiceRecordForm";
import { CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";

export default async function ResolveNeedsAttentionPage({
  params,
}: {
  params: { recordId: string };
}) {
  const { supabase, company } = await requireCompany();

  if (company.org_type === "property_manager") {
    redirect("/dashboard/buildings");
  }

  const { data: record } = await supabase
    .from("service_records")
    .select("id, category, notes, building_id, issue_status, buildings(name)")
    .eq("id", params.recordId)
    .eq("contractor_org_id", company.id)
    .maybeSingle();

  if (!record) {
    notFound();
  }

  const { data: feedbackRows } = await supabase
    .from("service_record_feedback")
    .select("id, comment")
    .eq("service_record_id", record.id)
    .eq("status", "needs_attention")
    .not("comment", "is", null);

  const building = Array.isArray(record.buildings) ? record.buildings[0] : record.buildings;
  const category = record.category as ServiceCategory;

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

        <div className="mx-auto max-w-lg px-6">
          <FadeIn>
            <Link
              href="/dashboard/service-jobs/needs-attention"
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← Needs attention
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
              {CATEGORY_EMOJI[category]} {building?.name}
            </h1>
            {(feedbackRows ?? []).map((f) => (
              <p
                key={f.id}
                className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                A resident said: &ldquo;{f.comment}&rdquo;
              </p>
            ))}
            {record.notes && (
              <p className="mt-2 rounded-xl bg-white/60 px-3 py-2 text-sm text-ink-700/70">
                Original visit note: {record.notes}
              </p>
            )}
            {record.issue_status === "resolved" && (
              <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                This has already been marked resolved.
              </p>
            )}
          </FadeIn>

          {record.issue_status !== "resolved" && (
            <FadeIn delay={0.05} className="mt-6">
              <SubmitServiceRecordForm
                jobId={null}
                buildingId={record.building_id}
                category={category}
                jobType={null}
                contractorOrgId={company.id}
                submittedBy={company.id}
                contractorName={company.company_name}
                backHref="/dashboard/service-jobs/needs-attention"
                resolvesRecordId={record.id}
              />
            </FadeIn>
          )}
        </div>
      </div>
    </main>
  );
}
