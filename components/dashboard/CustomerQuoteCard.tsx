"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CustomerQuote = {
  id: string;
  final_price: number | null;
  status: string;
  addons: { label: string; amount: number }[] | null;
};

export function CustomerQuoteCard({
  quote,
  onAccepted,
}: {
  quote: CustomerQuote;
  onAccepted: (quoteId: string) => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setAccepting(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    setAccepting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onAccepted(quote.id);
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {quote.status === "accepted" ? "Quote accepted" : "Quote ready"}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
        ${Math.round(quote.final_price ?? 0)}
      </p>

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

      {quote.status === "sent" && (
        <button
          type="button"
          onClick={accept}
          disabled={accepting}
          className="btn-primary mt-3 w-full py-2 text-sm disabled:opacity-60"
        >
          {accepting ? "Accepting…" : "Accept quote"}
        </button>
      )}
    </div>
  );
}
