import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import {
  PricingProfileSettings,
  type PricingProfileForm,
} from "@/components/dashboard/PricingProfileSettings";
import { FadeIn } from "@/components/motion/FadeIn";

const DEFAULT_PROFILE: PricingProfileForm = {
  pricing_model: "hourly",
  hourly_rate: 0,
  flat_job_rate: 0,
  min_job_charge: 0,
  gst_included: true,
  travel_fee: 0,
  addon_oven: 0,
  addon_fridge: 0,
  addon_windows: 0,
  addon_carpet: 0,
  addon_high_access: 0,
  addon_other_label: "",
  addon_other_price: 0,
};

export default async function PricingPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const { data: profileRow } = await supabase
    .from("company_pricing_profiles")
    .select("*")
    .eq("company_id", user.id)
    .maybeSingle();

  const initialProfile: PricingProfileForm = profileRow
    ? {
        pricing_model: (profileRow.pricing_model as "hourly" | "per_job") ?? "hourly",
        hourly_rate: Number(profileRow.hourly_rate),
        flat_job_rate: Number(profileRow.flat_job_rate),
        min_job_charge: Number(profileRow.min_job_charge),
        gst_included: Boolean(profileRow.gst_included),
        travel_fee: Number(profileRow.travel_fee),
        addon_oven: Number(profileRow.addon_oven),
        addon_fridge: Number(profileRow.addon_fridge),
        addon_windows: Number(profileRow.addon_windows),
        addon_carpet: Number(profileRow.addon_carpet),
        addon_high_access: Number(profileRow.addon_high_access),
        addon_other_label: profileRow.addon_other_label ?? "",
        addon_other_price: Number(profileRow.addon_other_price),
      }
    : DEFAULT_PROFILE;

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
              Pricing
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Tell us how you charge — we&apos;ll handle the rest
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              You never need to understand a pricing formula. Answer these
              three simple questions and every AI-suggested quote will be
              built from your own numbers — always editable before it&apos;s
              sent.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <PricingProfileSettings
              companyId={user.id}
              initialProfile={initialProfile}
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
