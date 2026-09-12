import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CreateJobForm, type ContractorOption } from "@/components/dashboard/CreateJobForm";

export default async function NewJobPage({
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

  const { data: contractorRows } = await supabase
    .from("company_directory")
    .select("id, company_name, org_type")
    .eq("org_type", "contractor")
    .order("company_name", { ascending: true });

  const contractors = (contractorRows ?? []) as ContractorOption[];

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

        <div className="mx-auto max-w-2xl px-6">
          <FadeIn>
            <Link
              href={`/dashboard/buildings/${building.id}`}
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← {building.name}
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Create a job
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-ink-700/70">
              Every completed visit against this job automatically becomes a
              record in the building&apos;s history.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <CreateJobForm buildingId={building.id} contractors={contractors} />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
