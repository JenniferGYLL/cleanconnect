"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReviewForm({
  leadId,
  companyId,
  customerId,
  customerName,
  onSubmitted,
}: {
  leadId: string;
  companyId: string;
  customerId: string;
  customerName: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reviews").insert({
      company_id: companyId,
      customer_id: customerId,
      lead_id: leadId,
      customer_name: customerName,
      rating,
      comment,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`text-lg ${value <= rating ? "text-amber-500" : "text-slate-300"}`}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="input"
        rows={2}
        placeholder="How did it go?"
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
