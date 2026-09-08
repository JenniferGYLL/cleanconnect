import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CompanyCard, type DirectoryCompany } from "@/components/browse/CompanyCard";

export default async function BrowsePage() {
  const supabase = createClient();

  const { data: companies } = await supabase
    .from("company_directory")
    .select("*")
    .order("average_rating", { ascending: false });

  const list = (companies ?? []) as DirectoryCompany[];

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <SiteNav />

        <div className="mx-auto max-w-5xl px-6 pt-12">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Cleaning companies
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Find trusted cleaning professionals across Melbourne
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Tell us what you need — browse verified companies, compare
              reviews and request a booking in a couple of minutes.
            </p>
          </FadeIn>

          {list.length === 0 ? (
            <FadeIn delay={0.05} className="mt-10">
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                No companies have been approved yet.
              </div>
            </FadeIn>
          ) : (
            <FadeIn delay={0.05} className="mt-10 grid gap-5 sm:grid-cols-2">
              {list.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </FadeIn>
          )}
        </div>
      </div>
    </main>
  );
}
