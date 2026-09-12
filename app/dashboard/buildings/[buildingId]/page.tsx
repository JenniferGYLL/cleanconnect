import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  BuildingResidentsManager,
  type ResidentRow,
} from "@/components/dashboard/BuildingResidentsManager";
import { SERVICE_CATEGORIES, CATEGORY_LABEL, type ServiceCategory } from "@/lib/buildings/categories";

type RawServiceRecord = {
  id: string;
  category: ServiceCategory;
  contractor_name: string | null;
  notes: string | null;
  completed_at: string;
};

type RawJob = {
  id: string;
  category: ServiceCategory;
  title: string;
  job_type: "recurring" | "one_off";
  status: "open" | "completed" | "cancelled";
  contractor_org_id: string | null;
  companies: { company_name: string } | { company_name: string }[] | null;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export default async function BuildingDetailPage({
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
    .select("id, name, address, suburb, postcode, created_at")
    .eq("id", params.buildingId)
    .eq("org_id", company.id)
    .maybeSingle();

  if (!building) {
    notFound();
  }

  const [{ data: residentRows }, { data: recordRows }, { data: jobRows }] =
    await Promise.all([
      supabase
        .from("building_residents")
        .select("id, email, customer_id, created_at, customers(full_name)")
        .eq("building_id", building.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("service_records")
        .select("id, category, contractor_name, notes, completed_at")
        .eq("building_id", building.id)
        .order("completed_at", { ascending: false })
        .limit(12),
      supabase
        .from("jobs")
        .select("id, category, title, job_type, status, contractor_org_id, companies(company_name)")
        .eq("building_id", building.id)
        .order("created_at", { ascending: false }),
    ]);

  const residents: ResidentRow[] = (residentRows ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      email: string;
      customer_id: string | null;
      created_at: string;
      customers: { full_name: string } | { full_name: string }[] | null;
    };
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    return {
      id: row.id,
      email: row.email,
      customer_id: row.customer_id,
      created_at: row.created_at,
      full_name: customer?.full_name ?? null,
    };
  });

  const records = (recordRows ?? []) as RawServiceRecord[];
  const jobs = (jobRows ?? []).map((j) => {
    const row = j as unknown as RawJob;
    const contractor = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return { ...row, contractorName: contractor?.company_name ?? null };
  });

  const countByCategory = new Map<ServiceCategory, number>();
  for (const record of records) {
    countByCategory.set(record.category, (countByCategory.get(record.category) ?? 0) + 1);
  }

  const openJobs = jobs.filter((j) => j.status === "open");

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

        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <Link
              href="/dashboard/buildings"
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← All buildings
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {building.name}
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">
              {building.address}
              {building.suburb ? `, ${building.suburb}` : ""}
              {building.postcode ? ` ${building.postcode}` : ""}
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Services
            </p>
            <Link
              href={`/dashboard/buildings/${building.id}/jobs/new`}
              className="btn-primary px-4 py-2 text-sm"
            >
              + Create job
            </Link>
          </FadeIn>

          <FadeIn delay={0.08} className="mt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SERVICE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.key}
                  href={`/dashboard/buildings/${building.id}/${cat.key}`}
                  className="glass-surface flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-center transition hover:shadow-tint-sm"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-medium text-ink-800">
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-ink-700/50">
                    {countByCategory.get(cat.key) ?? 0} logged
                  </span>
                </Link>
              ))}
            </div>
          </FadeIn>

          {openJobs.length > 0 && (
            <FadeIn delay={0.1} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Open jobs
              </p>
              <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
                {openJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {CATEGORY_LABEL[job.category]} · {job.title}
                      </p>
                      <p className="truncate text-xs text-ink-700/50">
                        {job.contractorName ?? "Unassigned"} ·{" "}
                        {job.job_type === "one_off" ? "One-off" : "Recurring"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </FadeIn>
          )}

          <FadeIn delay={0.12} className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
              Recent activity
            </p>
            {records.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Nothing logged yet — once a contractor completes a job here,
                it&apos;ll show up in this feed automatically.
              </div>
            ) : (
              <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
                {records.map((record) => (
                  <li key={record.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink-900">
                        {CATEGORY_LABEL[record.category]}
                        {record.contractor_name ? ` · ${record.contractor_name}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-ink-700/50">
                        {timeAgo(record.completed_at)}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="mt-1 text-sm text-ink-700/70">{record.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
              Residents
            </p>
            <BuildingResidentsManager
              buildingId={building.id}
              initialResidents={residents}
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
