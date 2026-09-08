import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import {
  CompanyProfileSettings,
  type CompanyProfileForm,
} from "@/components/dashboard/CompanyProfileSettings";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function CompanyProfilePage() {
  const { user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const initialProfile: CompanyProfileForm = {
    logo_url: company.logo_url ?? null,
    description: company.description ?? "",
    services: company.services ?? [],
    photos: company.photos ?? [],
    abn: company.abn ?? "",
    years_in_business: company.years_in_business ?? null,
    team_size: company.team_size ?? null,
  };

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="home"
          companyName={company.company_name}
          email={company.email}
        />
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Business profile
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Make a strong first impression
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Logo, photos and a short description are what customers see
              first when choosing between companies.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <CompanyProfileSettings
              companyId={user.id}
              initialProfile={initialProfile}
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
