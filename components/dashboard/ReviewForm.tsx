"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DIMENSIONS: { key: "quality" | "communication" | "punctuality" | "value"; label: string }[] = [
  { key: "quality", label: "Cleaning quality" },
  { key: "communication", label: "Communication" },
  { key: "punctuality", label: "Punctuality" },
  { key: "value", label: "Value for money" },
];

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [dimensions, setDimensions] = useState<Record<string, number | undefined>>({});
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
      quality_rating: dimensions.quality ?? null,
      communication_rating: dimensions.communication ?? null,
      punctuality_rating: dimensions.punctuality ?? null,
      value_rating: dimensions.value ?? null,
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

      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="text-xs font-medium text-brand-600 underline underline-offset-2"
      >
        {detailOpen ? "Hide extra detail" : "Add more detail (optional)"}
      </button>

      {detailOpen && (
        <div className="space-y-1.5 rounded-lg bg-white p-2.5">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="flex items-center justify-between">
              <span className="text-xs text-slate-600">{d.label}</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setDimensions((prev) => ({ ...prev, [d.key]: value }))
                    }
                    className={`text-sm ${
                      value <= (dimensions[d.key] ?? 0)
                        ? "text-amber-500"
                        : "text-slate-300"
                    }`}
                    aria-label={`${d.label}: ${value} star${value === 1 ? "" : "s"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
