import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerBookingsList from "@/components/dashboard/CustomerBookingsList";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";

type BookingQuote = {
  id: string;
  lead_id: string;
  final_price: number | null;
  status: string;
  addons: { label: string; amount: number }[] | null;
  additional_charge: number | null;
  additional_charge_reason: string | null;
  created_at: string;
};

type InspectionStatus = {
  lead_id: string;
  completed_at: string | null;
};

export default async function MyBookingsPage() {
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
    .single();

  if (!customer) {
    redirect("/login");
  }

  const { data: bookings } = await supabase
    .from("leads")
    .select("*, companies(company_name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("lead_id")
    .eq("customer_id", user.id);

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, lead_id, final_price, status, addons, additional_charge, additional_charge_reason, created_at"
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: inspections } = await supabase
    .from("inspections")
    .select("lead_id, completed_at")
    .eq("customer_id", user.id)
    .order("requested_at", { ascending: false });

  const reviewedLeadIds = new Set(
    (existingReviews ?? []).map((review) => review.lead_id)
  );

  // Only the most recent (non-draft) quote per booking is shown.
  const quoteByLeadId = new Map<string, BookingQuote>();
  for (const quote of (quotes ?? []) as BookingQuote[]) {
    if (!quoteByLeadId.has(quote.lead_id)) {
      quoteByLeadId.set(quote.lead_id, quote);
    }
  }

  // Only the most recent inspection per booking matters for the banner.
  const inspectionByLeadId = new Map<string, InspectionStatus>();
  for (const inspection of (inspections ?? []) as InspectionStatus[]) {
    if (!inspectionByLeadId.has(inspection.lead_id)) {
      inspectionByLeadId.set(inspection.lead_id, inspection);
    }
  }

  const bookingsWithReviewFlag = (bookings ?? []).map((booking) => ({
    ...booking,
    hasReview: reviewedLeadIds.has(booking.id),
    quote: quoteByLeadId.get(booking.id) ?? null,
    inspectionPending:
      inspectionByLeadId.get(booking.id)?.completed_at === null,
  }));

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav active="bookings" customerName={customer.full_name} email={user.email ?? ""} />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              {customer.full_name}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              My bookings
            </h1>
          </FadeIn>

          <div className="mt-6">
            <CustomerBookingsList
              customerId={user.id}
              customerName={customer.full_name}
              bookings={bookingsWithReviewFlag}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
