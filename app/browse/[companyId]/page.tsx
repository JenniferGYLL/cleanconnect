import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { BookingForm } from "@/components/browse/BookingForm";
import {
  ReviewsScroller,
  type DirectoryReview,
} from "@/components/browse/ReviewsScroller";
import type { DirectoryCompany } from "@/components/browse/CompanyCard";

export default async function CompanyProfilePage({
  params,
}: {
  params: { companyId: string };
}) {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("company_directory")
    .select("*")
    .eq("id", params.companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }
  const directoryCompany = company as DirectoryCompany;

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, customer_name, rating, comment, quality_rating, communication_rating, punctuality_rating, value_rating, source, created_at"
    )
    .eq("company_id", params.companyId)
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let customerId: string | null = null;
  let customerName: string | null = null;
  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();
    customerId = customer?.id ?? null;
    customerName = customer?.full_name ?? null;
  }

  const initial =
    directoryCompany.company_name.trim().charAt(0).toUpperCase() || "C";

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        {customerId && customerName ? (
          <div className="mx-auto max-w-5xl px-6 pt-6">
            <CustomerNav
              active="browse"
              customerName={customerName}
              email={user?.email ?? ""}
            />
          </div>
        ) : (
          <SiteNav />
        )}

        <div className="mx-auto max-w-5xl px-6 pt-12">
          {/* Header */}
          <FadeIn>
            <div className="glass-surface flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {directoryCompany.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={directoryCompany.logo_url}
                      alt={`${directoryCompany.company_name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div>
                  <h1 className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">
                    {directoryCompany.company_name}
                  </h1>
                  {directoryCompany.review_count > 0 ? (
                    <p className="mt-1 text-sm text-ink-700/60">
                      <span className="text-gold-500">
                        ★ {directoryCompany.average_rating.toFixed(1)}
                      </span>{" "}
                      · {directoryCompany.review_count} Verified Review
                      {directoryCompany.review_count === 1 ? "" : "s"}
                      {directoryCompany.service_area &&
                        ` · ${directoryCompany.service_area}`}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-700/50">
                      No reviews yet
                      {directoryCompany.service_area &&
                        ` · ${directoryCompany.service_area}`}
                    </p>
                  )}
                </div>
              </div>
              <a
                href="#request"
                className="btn-primary shrink-0 px-6 py-2.5 text-sm"
              >
                Request a Cleaning
              </a>
            </div>
          </FadeIn>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              {/* About */}
              {directoryCompany.description && (
                <FadeIn delay={0.05}>
                  <SpotlightCard className="rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                      About
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-800">
                      {directoryCompany.description}
                    </p>
                    {(directoryCompany.years_in_business ||
                      directoryCompany.team_size) && (
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-700/60">
                        {directoryCompany.years_in_business && (
                          <span>
                            {directoryCompany.years_in_business} years in
                            business
                          </span>
                        )}
                        {directoryCompany.team_size && (
                          <span>Team of {directoryCompany.team_size}</span>
                        )}
                      </div>
                    )}
                  </SpotlightCard>
                </FadeIn>
              )}

              {/* Services */}
              {(directoryCompany.services ?? []).length > 0 && (
                <FadeIn delay={0.08}>
                  <SpotlightCard className="rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                      Services
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(directoryCompany.services ?? []).map((service) => (
                        <span
                          key={service}
                          className="rounded-full bg-ink-950/[0.04] px-3 py-1.5 text-xs font-medium text-ink-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </SpotlightCard>
                </FadeIn>
              )}

              {/* Work photos */}
              {(directoryCompany.photos ?? []).length > 0 && (
                <FadeIn delay={0.1}>
                  <SpotlightCard className="rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                      Recent work
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {(directoryCompany.photos ?? []).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={`${directoryCompany.company_name} work photo ${
                            i + 1
                          }`}
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  </SpotlightCard>
                </FadeIn>
              )}

              {/* Reviews */}
              <FadeIn delay={0.12}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                    Reviews
                  </p>
                  <div className="mt-3">
                    <ReviewsScroller
                      reviews={(reviews ?? []) as DirectoryReview[]}
                    />
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Request a booking */}
            <div id="request" className="scroll-mt-24">
              <FadeIn delay={0.05}>
                <SpotlightCard className="rounded-2xl p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                    Request a booking
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink-900">
                    Tell us what you need
                  </h2>
                  <div className="mt-4">
                    <BookingForm
                      companyId={directoryCompany.id}
                      customerId={customerId}
                    />
                  </div>
                </SpotlightCard>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
