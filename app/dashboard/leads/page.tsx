import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { LeadsBoard } from "@/components/dashboard/LeadsBoard";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function LeadsPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const [{ data: leads }, { data: reviews }] = await Promise.all([
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
  ]);

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
            />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
