"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReviewForm } from "@/components/dashboard/ReviewForm";
import { CustomerQuoteCard, type CustomerQuote } from "@/components/dashboard/CustomerQuoteCard";

export type Booking = {
  id: string;
  company_id: string;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  companies: { company_name: string } | null;
  quote: CustomerQuote | null;
};

export default function CustomerBookingsList({
  customerId,
  customerName,
  bookings: initialBookings,
}: {
  customerId: string;
  customerName: string;
  bookings: (Booking & { hasReview: boolean })[];
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [justReviewed, setJustReviewed] = useState<string[]>([]);

  // 实时监听:公司一更新预约状态或上传照片,这里立刻自动更新,不用刷新页面
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`customer-${customerId}-live`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const updated = payload.new as Omit<Booking, "companies" | "quote">;
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === updated.id
                ? { ...booking, ...updated }
                : booking
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quotes",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const quote = payload.new as CustomerQuote & { lead_id: string };
          if (quote.status === "draft") return;
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === quote.lead_id ? { ...booking, quote } : booking
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quotes",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const quote = payload.new as CustomerQuote & { lead_id: string };
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === quote.lead_id ? { ...booking, quote } : booking
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No bookings yet — browse companies to request one.
      </div>
    );
  }

  function handleQuoteAccepted(quoteId: string) {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.quote && booking.quote.id === quoteId
          ? { ...booking, quote: { ...booking.quote, status: "accepted" } }
          : booking
      )
    );
  }

  const statusLabel: Record<string, string> = {
    requested: "Requested",
    accepted: "Accepted",
    declined: "Declined",
    in_progress: "In progress",
    completed: "Completed",
  };

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="rounded-xl border border-slate-100 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">
              {booking.companies?.company_name ?? "Cleaning company"}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {statusLabel[booking.status] ?? booking.status}
            </span>
          </div>
          {booking.service_type && (
            <p className="mt-1 text-sm text-slate-500">
              Service: {booking.service_type}
            </p>
          )}
          {booking.quote && (
            <CustomerQuoteCard
              quote={booking.quote}
              onAccepted={handleQuoteAccepted}
            />
          )}
          {(booking.before_photo_url || booking.after_photo_url) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {booking.before_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.before_photo_url}
                  alt="Before"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
              {booking.after_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.after_photo_url}
                  alt="After"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
          {booking.status === "completed" &&
            !booking.hasReview &&
            !justReviewed.includes(booking.id) && (
              <ReviewForm
                leadId={booking.id}
                companyId={booking.company_id}
                customerId={customerId}
                customerName={customerName}
                onSubmitted={() =>
                  setJustReviewed((prev) => [...prev, booking.id])
                }
              />
            )}
        </li>
      ))}
    </ul>
  );
}
