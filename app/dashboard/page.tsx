import Link from "next/link";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

type Lead = {
  id: string;
  customer_name: string | null;
  service_type: string | null;
  status: string;
  created_at: string;
  customers: { full_name: string }[] | null;
};

type Review = {
  id: string;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export default async function DashboardPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    return (
      <main className="bg-grain relative flex min-h-dvh items-center justify-center overflow-hidden bg-foam-50 px-6">
        <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-70" />
        <div className="glass-surface spotlight-border relative max-w-md rounded-3xl p-8 text-center">
          <p className="label mb-2 text-xs font-semibold uppercase tracking-widest text-gold-500">
            Under review
          </p>
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {company.company_name} is pending approval
          </h1>
          <p className="mt-3 text-sm text-ink-700/70">
            We&apos;re reviewing your application. Once approved, your leads,
            quotes and jobs will show up here.
          </p>
        </div>
      </main>
    );
  }

  const [{ data: leads }, { data: reviews }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, customer_name, service_type, status, created_at, customers(full_name)")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const allLeads: Lead[] = leads ?? [];
  const needsResponse = allLeads.filter((l) => l.status === "requested");
  const awaitingScheduling = allLeads.filter((l) => l.status === "accepted");
  const inProgress = allLeads.filter((l) => l.status === "in_progress");
  const recentlyCompleted = allLeads
    .filter((l) => l.status === "completed")
    .slice(0, 5);
  const recentReviews = (reviews ?? []) as Review[];

  const priorityCount =
    needsResponse.length + awaitingScheduling.length + inProgress.length;

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
              Home
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Welcome back, {company.company_name}
            </h1>
            <p className="mt-1.5 text-sm text-ink-700/70">
              {priorityCount === 0
                ? "You're all caught up — nothing needs a decision right now."
                : `${priorityCount} thing${priorityCount === 1 ? "" : "s"} could use a decision today.`}
            </p>
          </FadeIn>

          {/* Above the fold — needs a decision today */}
          <FadeIn delay={0.05} className="mt-8 space-y-4">
            <PrioritySection
              title="Needs your response"
              hint="New enquiries — accept or decline"
              leads={needsResponse}
              emptyText="No new enquiries right now."
            />
            <PrioritySection
              title="Awaiting scheduling"
              hint="Accepted — pick a date and get started"
              leads={awaitingScheduling}
              emptyText="Nothing waiting on scheduling."
            />
            <PrioritySection
              title="In progress"
              hint="Underway right now"
              leads={inProgress}
              emptyText="No jobs currently in progress."
            />
          </FadeIn>

          {/* Below the fold — checked, not decided on */}
          <FadeIn delay={0.1} className="mt-14 grid gap-5 sm:grid-cols-2">
            <SpotlightCard className="rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-ink-900">
                  Recently completed
                </h2>
                <Link
                  href="/dashboard/leads"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all
                </Link>
              </div>
              {recentlyCompleted.length === 0 ? (
                <p className="mt-3 text-sm text-ink-700/60">
                  Completed jobs will show up here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {recentlyCompleted.map((lead) => (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-ink-800">
                        {lead.customers?.[0]?.full_name ??
                          lead.customer_name ??
                          "Customer"}
                      </span>
                      <span className="text-xs text-ink-700/50">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SpotlightCard>

            <SpotlightCard className="rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-ink-900">
                  Recent feedback
                </h2>
              </div>
              {recentReviews.length === 0 ? (
                <p className="mt-3 text-sm text-ink-700/60">
                  Reviews from completed jobs will appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {recentReviews.map((review) => (
                    <li key={review.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-800">
                          {review.customer_name ?? "Anonymous customer"}
                        </span>
                        {review.rating != null && (
                          <span className="text-xs text-gold-500">
                            {"★".repeat(review.rating)}
                            {"☆".repeat(5 - review.rating)}
                          </span>
                        )}
                      </div>
                      {review.comment && (
                        <p className="mt-1 line-clamp-2 text-ink-700/70">
                          {review.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SpotlightCard>
          </FadeIn>

          <FadeIn
            delay={0.15}
            className="mt-8 rounded-2xl border border-dashed border-ink-900/10 bg-white/40 px-5 py-4 text-xs text-ink-700/60"
          >
            Staff scheduling, an AI-assisted quote builder and a revenue
            snapshot are coming in the next phase — this Home screen will
            grow into those without changing shape.
          </FadeIn>
        </div>
      </div>
    </main>
  );
}

function PrioritySection({
  title,
  hint,
  leads,
  emptyText,
}: {
  title: string;
  hint: string;
  leads: Lead[];
  emptyText: string;
}) {
  if (leads.length === 0) {
    return (
      <div className="glass-surface rounded-2xl px-5 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold text-ink-900">
            {title}
          </h2>
          <span className="text-xs text-ink-700/40">{hint}</span>
        </div>
        <p className="mt-2 text-sm text-ink-700/50">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="glass-surface spotlight-border rounded-2xl px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold text-ink-900">
          {title}
          <span className="ml-2 text-xs font-normal text-ink-700/40">
            {leads.length}
          </span>
        </h2>
        <Link
          href="/dashboard/leads"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Open in Leads &amp; Quotes
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-ink-900/5">
        {leads.slice(0, 4).map((lead) => (
          <li
            key={lead.id}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="truncate text-ink-800">
              {lead.customers?.[0]?.full_name ?? lead.customer_name ?? "Customer"}
              {lead.service_type && (
                <span className="ml-2 text-xs text-ink-700/50">
                  · {lead.service_type}
                </span>
              )}
            </span>
            <StatusPill status={lead.status} />
          </li>
        ))}
      </ul>
      {leads.length > 4 && (
        <p className="mt-2 text-xs text-ink-700/50">
          +{leads.length - 4} more in Leads &amp; Quotes
        </p>
      )}
    </div>
  );
}
