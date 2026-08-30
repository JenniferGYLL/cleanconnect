import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { LeadsBoard } from "@/components/dashboard/LeadsBoard";
import { FadeIn } from "@/components/motion/FadeIn";
import type { Category, PricingRule, PricingProfile } from "@/lib/quoting/estimate";
import type { QuoteRow } from "@/components/dashboard/QuoteBuilder";

type QuoteWithLead = QuoteRow & { lead_id: string };

export default async function LeadsPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const [
    { data: leads },
    { data: reviews },
    { data: ruleRows },
    { data: profileRow },
    { data: quoteRows },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*, customers(full_name, phone)")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pricing_rules")
      .select("category, base_rate, size_multiplier, frequency_discount_percent")
      .eq("company_id", user.id),
    supabase
      .from("company_pricing_profiles")
      .select("*")
      .eq("company_id", user.id)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select(
        "id, lead_id, final_price, final_hours, final_cleaners, confidence, status, addons, created_at"
      )
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const pricingRules: Record<Category, PricingRule | null> = {
    residential: null,
    commercial: null,
    garden: null,
  };
  for (const row of ruleRows ?? []) {
    const category = row.category as Category;
    if (category in pricingRules) {
      pricingRules[category] = {
        base_rate: Number(row.base_rate),
        size_multiplier: Number(row.size_multiplier),
        frequency_discount_percent: Number(row.frequency_discount_percent),
      };
    }
  }

  const pricingProfile: PricingProfile | null = profileRow
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
        addon_other_label: profileRow.addon_other_label ?? null,
        addon_other_price: Number(profileRow.addon_other_price),
      }
    : null;

  // Keep only the most recent quote per lead (rows already newest-first).
  const quotesByLead: Record<string, QuoteRow> = {};
  for (const quote of (quoteRows ?? []) as QuoteWithLead[]) {
    if (!quotesByLead[quote.lead_id]) {
      quotesByLead[quote.lead_id] = quote;
    }
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="leads"
          companyName={company.company_name}
          email={company.email}
        />
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Leads &amp; Quotes
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Every enquiry, one place
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Tap an enquiry to see the full detail — before &amp; after
              photos stay tucked behind their own button, not on the list.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <LeadsBoard
              companyId={user.id}
              leads={leads ?? []}
              reviews={reviews ?? []}
              pricingRules={pricingRules}
              pricingProfile={pricingProfile}
              quotesByLead={quotesByLead}
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
