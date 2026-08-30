import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { PricingSettings } from "@/components/dashboard/PricingSettings";
import {
  PricingProfileSettings,
  type PricingProfileForm,
} from "@/components/dashboard/PricingProfileSettings";
import { FadeIn } from "@/components/motion/FadeIn";

type Category = "residential" | "commercial" | "garden";

const DEFAULT_RULE = {
  base_rate: 0,
  size_multiplier: 1,
  frequency_discount_percent: 0,
};

const DEFAULT_PROFILE: PricingProfileForm = {
  min_job_charge: 0,
  min_cleaners: 1,
  labour_cost_per_hour: 0,
  margin_target_percent: 30,
  gst_included: true,
  travel_fee: 0,
  addon_oven: 0,
  addon_fridge: 0,
  addon_windows: 0,
  addon_carpet: 0,
  addon_other_label: "",
  addon_other_price: 0,
};

export default async function PricingPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const [{ data: rows }, { data: profileRow }] = await Promise.all([
    supabase
      .from("pricing_rules")
      .select(
        "category, base_rate, size_multiplier, frequency_discount_percent"
      )
      .eq("company_id", user.id),
    supabase
      .from("company_pricing_profiles")
      .select("*")
      .eq("company_id", user.id)
      .maybeSingle(),
  ]);

  const initialRules: Record<Category, typeof DEFAULT_RULE> = {
    residential: { ...DEFAULT_RULE },
    commercial: { ...DEFAULT_RULE },
    garden: { ...DEFAULT_RULE },
  };

  for (const row of rows ?? []) {
    const category = row.category as Category;
    if (category in initialRules) {
      initialRules[category] = {
        base_rate: Number(row.base_rate),
        size_multiplier: Number(row.size_multiplier),
        frequency_discount_percent: Number(row.frequency_discount_percent),
      };
    }
  }

  const initialProfile: PricingProfileForm = profileRow
    ? {
        min_job_charge: Number(profileRow.min_job_charge),
        min_cleaners: Number(profileRow.min_cleaners),
        labour_cost_per_hour: Number(profileRow.labour_cost_per_hour),
        margin_target_percent: Number(profileRow.margin_target_percent),
        gst_included: Boolean(profileRow.gst_included),
        travel_fee: Number(profileRow.travel_fee),
        addon_oven: Number(profileRow.addon_oven),
        addon_fridge: Number(profileRow.addon_fridge),
        addon_windows: Number(profileRow.addon_windows),
        addon_carpet: Number(profileRow.addon_carpet),
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
              Pricing settings
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              What powers your AI-suggested quotes
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Set a base rate per category and the AI quote suggestion will
              use these numbers — you can always edit a suggested price
              before sending it.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <PricingSettings companyId={user.id} initialRules={initialRules} />
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8">
            <PricingProfileSettings
              companyId={user.id}
              initialProfile={initialProfile}
            />
          </FadeIn>

          <FadeIn
            delay={0.15}
            className="mt-8 max-w-xl rounded-2xl border border-dashed border-ink-900/10 bg-white/40 px-5 py-4 text-xs text-ink-700/60"
          >
            With this filled in, open any enquiry in Leads &amp; Quotes to
            see an AI-suggested price you can edit and send.
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
