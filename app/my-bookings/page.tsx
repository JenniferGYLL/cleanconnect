import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerBookingsList from "@/components/dashboard/CustomerBookingsList";
import LogoutButton from "@/app/dashboard/LogoutButton";
import { NotificationOptIn } from "@/components/notifications/NotificationOptIn";

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

  const reviewedLeadIds = new Set(
    (existingReviews ?? []).map((review) => review.lead_id)
  );

  const bookingsWithReviewFlag = (bookings ?? []).map((booking) => ({
    ...booking,
    hasReview: reviewedLeadIds.has(booking.id),
  }));

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">
              {customer.full_name}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/browse"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Browse companies
            </Link>
            <NotificationOptIn />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-xl font-semibold text-slate-900">
          My bookings
        </h1>
        <div className="mt-6">
          <CustomerBookingsList
            customerId={user.id}
            customerName={customer.full_name}
            bookings={bookingsWithReviewFlag}
          />
        </div>
      </div>
    </main>
  );
}
