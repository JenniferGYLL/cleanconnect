import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import {
  CustomersBoard,
  type CustomerSummary,
} from "@/components/dashboard/CustomersBoard";
import { FadeIn } from "@/components/motion/FadeIn";

type LeadRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  customers: { full_name: string; phone: string | null } | null;
};

type ReviewRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export default async function CustomersPage() {
  const { supabase, user, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const [{ data: leads }, { data: reviews }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, customer_id, customer_name, customer_contact, service_type, message, status, before_photo_url, after_photo_url, created_at, customers(full_name, phone)"
      )
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, customer_id, customer_name, rating, comment, created_at")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const allLeads = (leads ?? []) as unknown as LeadRow[];
  const allReviews = (reviews ?? []) as ReviewRow[];

  const byKey = new Map<string, CustomerSummary>();

  for (const lead of allLeads) {
    const displayName =
      lead.customers?.full_name ?? lead.customer_name ?? "Anonymous customer";
    const key = lead.customer_id ?? `anon:${displayName}:${lead.customer_contact ?? ""}`;

    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        displayName,
        phone: lead.customers?.phone ?? lead.customer_contact ?? null,
        leads: [],
        reviews: [],
        lastActivity: lead.created_at,
      });
    }

    const summary = byKey.get(key)!;
    summary.leads.push({
      id: lead.id,
      service_type: lead.service_type,
      message: lead.message,
      status: lead.status,
      before_photo_url: lead.before_photo_url,
      after_photo_url: lead.after_photo_url,
      created_at: lead.created_at,
    });
    if (lead.created_at > summary.lastActivity) {
      summary.lastActivity = lead.created_at;
    }
  }

  for (const review of allReviews) {
    // Match by customer_id when the review is tied to a registered
    // customer; fall back to matching the name for anonymous bookings.
    const target = review.customer_id
      ? Array.from(byKey.values()).find(
          (c) => c.key === review.customer_id
        )
      : Array.from(byKey.values()).find(
          (c) => c.displayName === (review.customer_name ?? "")
        );

    if (target) {
      target.reviews.push({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
      });
      if (review.created_at > target.lastActivity) {
        target.lastActivity = review.created_at;
      }
    }
  }

  const customers = Array.from(byKey.values()).sort((a, b) =>
    b.lastActivity.localeCompare(a.lastActivity)
  );

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="customers"
          companyName={company.company_name}
          email={company.email}
        />
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Customers
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              One screen per relationship
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Tap a customer to see every job, photo and review with them —
              newest first.
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            <CustomersBoard customers={customers} />
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
