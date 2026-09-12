import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CompanyCard, type DirectoryCompany } from "@/components/browse/CompanyCard";

type UpcomingBooking = {
  id: string;
  service_type: string | null;
  status: string;
  created_at: string;
  companies: { company_name: string } | null;
};

const QUICK_CATEGORIES: { label: string; query: string }[] = [
  { label: "Residential", query: "Residential" },
  { label: "Commercial", query: "Commercial" },
  { label: "Garden", query: "Garden" },
  { label: "Specialty / Deep Cleaning", query: "Deep clean" },
];

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  completed: "Completed",
};

// Melbourne-local greeting regardless of which timezone the server happens
// to be running in.
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function CustomerHomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!customer) {
    redirect("/login");
  }

  const [{ data: upcomingRows }, { data: historyRows }, { data: recommended }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, service_type, status, created_at, companies(company_name)")
        .eq("customer_id", user.id)
        .in("status", ["requested", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("leads")
        .select("company_id, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("company_directory")
        .select("*")
        .order("average_rating", { ascending: false })
        .order("review_count", { ascending: false })
        .limit(8),
    ]);

  const upcoming = (upcomingRows?.[0] ?? null) as UpcomingBooking | null;

  // Most recent distinct companies the customer has booked with before —
  // "book again" reuses whichever ones show up first.
  const seen = new Set<string>();
  const bookAgainIds: string[] = [];
  for (const row of historyRows ?? []) {
    if (!seen.has(row.company_id)) {
      seen.add(row.company_id);
      bookAgainIds.push(row.company_id);
    }
    if (bookAgainIds.length >= 3) break;
  }

  const allRecommended = (recommended ?? []) as DirectoryCompany[];
  const bookAgainCompanies = bookAgainIds
    .map((id) => allRecommended.find((c) => c.id === id))
    .filter((c): c is DirectoryCompany => !!c);
  // Falls back to a direct lookup for a previously-booked company that
  // didn't happen to land in the top-8 recommended set fetched above.
  const missingBookAgainIds = bookAgainIds.filter(
    (id) => !bookAgainCompanies.some((c) => c.id === id)
  );
  let extraBookAgain: DirectoryCompany[] = [];
  if (missingBookAgainIds.length > 0) {
    const { data: extra } = await supabase
      .from("company_directory")
      .select("*")
      .in("id", missingBookAgainIds);
    extraBookAgain = (extra ?? []) as DirectoryCompany[];
  }
  const bookAgain = [...bookAgainCompanies, ...extraBookAgain].slice(0, 3);

  const recommendedForYou = allRecommended
    .filter((c) => !seen.has(c.id))
    .slice(0, 4);

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav
            active="home"
            customerName={customer.full_name}
            email={user.email ?? ""}
          />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              {greeting()}, {customer.full_name.split(" ")[0]}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              What do you need cleaned?
            </h1>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.label}
                  href={`/browse?q=${encodeURIComponent(cat.query)}`}
                  className="rounded-2xl border border-ink-900/10 bg-white/70 px-3 py-3 text-center text-sm font-medium text-ink-800 transition hover:border-ink-900/25 hover:bg-white active:scale-[0.98]"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
            <Link
              href="/browse"
              className="btn-primary mt-3 flex w-full items-center justify-center py-3"
            >
              + Request a Cleaning
            </Link>
          </FadeIn>

          {upcoming && (
            <FadeIn delay={0.1} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Upcoming booking
              </p>
              <div className="glass-surface spotlight-border rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display font-medium text-ink-900">
                    {upcoming.companies?.company_name ?? "Cleaning company"}
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    {STATUS_LABEL[upcoming.status] ?? upcoming.status}
                  </span>
                </div>
                {upcoming.service_type && (
                  <p className="mt-1 text-sm text-ink-700/60">
                    {upcoming.service_type}
                  </p>
                )}
                <Link
                  href="/my-bookings"
                  className="mt-3 inline-flex text-sm font-semibold text-ink-900 underline underline-offset-2"
                >
                  View booking
                </Link>
              </div>
            </FadeIn>
          )}

          {bookAgain.length > 0 && (
            <FadeIn delay={0.15} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Book again
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {bookAgain.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </FadeIn>
          )}

          {recommendedForYou.length > 0 && (
            <FadeIn delay={0.2} className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Recommended for you
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendedForYou.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </FadeIn>
          )}

          {!upcoming && bookAgain.length === 0 && recommendedForYou.length === 0 && (
            <FadeIn delay={0.1} className="mt-8">
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                No cleaning companies have been approved yet — check back
                soon, or{" "}
                <Link
                  href="/browse"
                  className="font-medium text-brand-600 underline underline-offset-2"
                >
                  browse what&apos;s there
                </Link>
                .
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </main>
  );
}
