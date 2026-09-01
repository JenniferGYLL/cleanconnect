"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CustomerQuote = {
  id: string;
  lead_id: string;
  final_price: number | null;
  status: string;
  addons: { label: string; amount: number }[] | null;
  additional_charge: number | null;
  additional_charge_reason: string | null;
};

export function CustomerQuoteCard({
  quote,
  customerId,
  onAccepted,
}: {
  quote: CustomerQuote;
  customerId: string;
  onAccepted: (quoteId: string) => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAdjustment = quote.status === "adjusted" && (quote.additional_charge ?? 0) > 0;
  const total = (quote.final_price ?? 0) + (hasAdjustment ? quote.additional_charge ?? 0 : 0);

  async function accept() {
    setAccepting(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    if (updateError) {
      setAccepting(false);
      setError(updateError.message);
      return;
    }

    await supabase.from("quote_events").insert({
      lead_id: quote.lead_id,
      quote_id: quote.id,
      event_type: "customer_accepted",
      actor_role: "customer",
      actor_id: customerId,
    });

    setAccepting(false);
    onAccepted(quote.id);
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {quote.status === "accepted"
          ? "Quote accepted"
          : hasAdjustment
          ? "Updated quote — needs your OK"
          : "Quote ready"}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
        ${Math.round(total)}
      </p>

      {hasAdjustment ? (
        <p className="mt-1 text-xs text-slate-600">
          Original estimate ${Math.round(quote.final_price ?? 0)} + additional
          ${Math.round(quote.additional_charge ?? 0)}
          {quote.additional_charge_reason
            ? ` (${quote.additional_charge_reason})`
            : ""}
          . This is an estimate, not a guaranteed final price, until you
          accept it.
        </p>
      ) : (
        quote.status !== "accepted" && (
          <p className="mt-1 text-xs text-slate-500">
            Based on the information provided — this is an estimate, not a
            guaranteed final price, until you accept it.
          </p>
        )
      )}

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>✓ Clean as requested</p>
        {(quote.addons ?? []).map((addon, i) => (
          <p key={i}>
            ✓ {addon.label} — ${addon.amount}
          </p>
        ))}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {(quote.status === "sent" || quote.status === "adjusted") && (
        <button
          type="button"
          onClick={accept}
          disabled={accepting}
          className="btn-primary mt-3 w-full py-2 text-sm disabled:opacity-60"
        >
          {accepting
            ? "Accepting…"
            : hasAdjustment
            ? "Accept updated quote"
            : "Accept quote"}
        </button>
      )}
    </div>
  );
}
