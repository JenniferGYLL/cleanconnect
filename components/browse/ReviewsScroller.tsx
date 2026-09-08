"use client";

export type DirectoryReview = {
  id: string;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  quality_rating: number | null;
  communication_rating: number | null;
  punctuality_rating: number | null;
  value_rating: number | null;
  source: string;
  created_at: string;
};

const DIMENSION_LABELS: { key: keyof DirectoryReview; label: string }[] = [
  { key: "quality_rating", label: "Quality" },
  { key: "communication_rating", label: "Communication" },
  { key: "punctuality_rating", label: "Punctuality" },
  { key: "value_rating", label: "Value" },
];

// Horizontal-scroll review cards, per the brief: keep the profile page
// clean rather than stacking every review vertically. Every review here
// already comes from a real completed booking (enforced at the database
// level — see reviews.lead_id), so the "Verified Booking" badge is
// always accurate, never decorative.
export function ReviewsScroller({ reviews }: { reviews: DirectoryReview[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-ink-700/50">
        No reviews yet — this company&apos;s first completed booking will
        appear here.
      </p>
    );
  }

  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: DirectoryReview }) {
  const dimensions = DIMENSION_LABELS.filter(
    (d) => typeof review[d.key] === "number"
  );

  return (
    <div className="glass-surface w-[280px] shrink-0 snap-start rounded-2xl p-5 sm:w-[320px]">
      <div className="flex items-center justify-between gap-2">
        {review.rating != null && (
          <span className="text-sm text-gold-500">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </span>
        )}
        {review.source === "verified_booking" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
            ✓ Verified Booking
          </span>
        )}
      </div>

      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-ink-800">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      <p className="mt-4 text-xs font-medium text-ink-700/60">
        {review.customer_name ?? "Anonymous customer"}
      </p>

      {dimensions.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-ink-900/10 pt-3">
          {dimensions.map((d) => (
            <div
              key={d.key}
              className="flex items-center justify-between text-[11px] text-ink-700/60"
            >
              <span>{d.label}</span>
              <span className="text-gold-500">
                {"★".repeat(review[d.key] as number)}
                {"☆".repeat(5 - (review[d.key] as number))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
