import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { type DirectoryCompany } from "@/components/browse/CompanyCard";
import { BrowseList } from "@/components/browse/BrowseList";

export default async function BrowsePage() {
  const supabase = createClient();

  const [{ data: companies }, { data: userData }] = await Promise.all([
    supabase
      .from("company_directory")
      .select("*")
      .order("average_rating", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const list = (companies ?? []) as DirectoryCompany[];

  // Signed-in customers get their own tabbed nav (Home/Browse/Bookings/
  // Profile) instead of the public "Sign In" header — everyone else
  // (signed out, or a company/staff account) keeps the public nav.
  let customerNavProps: { customerName: string; email: string } | null = null;
  if (userData.user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (customer) {
      customerNavProps = {
        customerName: customer.full_name,
        email: userData.user.email ?? "",
      };
    }
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        {customerNavProps ? (
          <div className="mx-auto max-w-5xl px-6 pt-6">
            <CustomerNav active="browse" {...customerNavProps} />
          </div>
        ) : (
          <SiteNav />
        )}

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
            <FadeIn delay={0.05} className="mt-10">
              <Suspense fallback={null}>
                <BrowseList companies={list} />
              </Suspense>
            </FadeIn>
          )}
        </div>
      </div>
    </main>
  );
}
