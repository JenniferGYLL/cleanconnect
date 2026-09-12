import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  BuildingsManager,
  type BuildingRow,
} from "@/components/dashboard/BuildingsManager";

export default async function BuildingsPage() {
  const { supabase, company } = await requireCompany();

  if (company.org_type !== "property_manager") {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("buildings")
    .select("id, name, address, suburb, postcode, created_at")
    .eq("org_id", company.id)
    .order("created_at", { ascending: false });

  const buildings = (data ?? []) as BuildingRow[];

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

        <div className="mx-auto max-w-4xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Buildings
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              See what has been done in every building you manage
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Add a building, invite its residents, and every service visit
              your contractors log gets filed here automatically.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <BuildingsManager orgId={company.id} initialBuildings={buildings} />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
