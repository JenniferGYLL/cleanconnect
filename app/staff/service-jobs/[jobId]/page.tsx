import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/dashboard/requireStaff";
import { StaffNav } from "@/components/staff/StaffNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SubmitServiceRecordForm } from "@/components/dashboard/SubmitServiceRecordForm";
import { CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";

export default async function StaffServiceJobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { supabase, staff, companyName } = await requireStaff();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, category, title, notes, job_type, schedule_note, status, building_id, buildings(name, address)"
    )
    .eq("id", params.jobId)
    .eq("assigned_staff_id", staff.id)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const building = Array.isArray(job.buildings) ? job.buildings[0] : job.buildings;
  const category = job.category as ServiceCategory;

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <StaffNav staffName={staff.full_name} companyName={companyName} />

        <div className="mx-auto max-w-lg px-6">
          <FadeIn>
            <Link
              href="/staff/service-jobs"
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← Building service jobs
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
              {CATEGORY_EMOJI[category]} {job.title}
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">
              {building?.name}
              {building?.address ? ` · ${building.address}` : ""}
            </p>
            {job.notes && (
              <p className="mt-2 rounded-xl bg-white/60 px-3 py-2 text-sm text-ink-700/70">
                {job.notes}
              </p>
            )}
          </FadeIn>

          <FadeIn delay={0.05} className="mt-6">
            <SubmitServiceRecordForm
              jobId={job.id}
              buildingId={job.building_id}
              category={category}
              jobType={job.job_type}
              contractorOrgId={staff.company_id}
              submittedBy={staff.id}
              contractorName={staff.full_name}
              backHref="/staff/service-jobs"
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
