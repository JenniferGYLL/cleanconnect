"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeedbackStatus = "good" | "needs_attention";

export type OwnFeedback = {
  id: string;
  liked: boolean;
  status: FeedbackStatus | null;
  comment: string | null;
  is_anonymous: boolean;
};

export function FeedbackWidget({
  serviceRecordId,
  residentId,
  initialOwn,
  likeCount,
  goodCount,
  needsAttentionCount,
  commentCount,
}: {
  serviceRecordId: string;
  residentId: string;
  initialOwn: OwnFeedback | null;
  likeCount: number;
  goodCount: number;
  needsAttentionCount: number;
  commentCount: number;
}) {
  const [own, setOwn] = useState(initialOwn);
  const [liked, setLiked] = useState(initialOwn?.liked ?? false);
  const [status, setStatus] = useState<FeedbackStatus | null>(initialOwn?.status ?? null);
  const [comment, setComment] = useState(initialOwn?.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(initialOwn?.is_anonymous ?? false);
  const [showCommentBox, setShowCommentBox] = useState(!!initialOwn?.comment);
  const [counts, setCounts] = useState({ likeCount, goodCount, needsAttentionCount, commentCount });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: {
    liked: boolean;
    status: FeedbackStatus | null;
    comment: string;
    isAnonymous: boolean;
  }) {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: upsertError } = await supabase
      .from("service_record_feedback")
      .upsert(
        {
          service_record_id: serviceRecordId,
          resident_id: residentId,
          liked: next.liked,
          status: next.status,
          comment: next.comment || null,
          is_anonymous: next.isAnonymous,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "service_record_id,resident_id" }
      )
      .select("id, liked, status, comment, is_anonymous")
      .single();

    setSaving(false);

    if (upsertError || !data) {
      setError(upsertError?.message ?? "Couldn't save your feedback.");
      return;
    }

    // Recompute local aggregate counts against the previous saved state
    // rather than the whole list — good enough for a single-resident
    // toggle and avoids a second round trip just to re-count.
    setCounts((prev) => ({
      likeCount: prev.likeCount + (next.liked ? 1 : 0) - (own?.liked ? 1 : 0),
      goodCount:
        prev.goodCount +
        (next.status === "good" ? 1 : 0) -
        (own?.status === "good" ? 1 : 0),
      needsAttentionCount:
        prev.needsAttentionCount +
        (next.status === "needs_attention" ? 1 : 0) -
        (own?.status === "needs_attention" ? 1 : 0),
      commentCount:
        prev.commentCount + (next.comment ? 1 : 0) - (own?.comment ? 1 : 0),
    }));
    setOwn(data as OwnFeedback);
  }

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    save({ liked: next, status, comment, isAnonymous });
  }

  function setStatusAndSave(next: FeedbackStatus) {
    const value = status === next ? null : next;
    setStatus(value);
    save({ liked, status: value, comment, isAnonymous });
  }

  function submitComment() {
    save({ liked, status, comment, isAnonymous });
    setShowCommentBox(false);
  }

  return (
    <div className="mt-3 border-t border-ink-900/5 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            liked ? "bg-ink-900 text-foam-50" : "bg-ink-900/5 text-ink-700/70 hover:bg-ink-900/10"
          }`}
        >
          <span
            aria-hidden
            className={`h-[6px] w-[6px] rounded-full ${liked ? "bg-foam-50" : "bg-ink-700/40"}`}
          />
          {counts.likeCount > 0 ? counts.likeCount : "Like"}
        </button>
        <button
          type="button"
          onClick={() => setStatusAndSave("good")}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            status === "good"
              ? "bg-ink-900/8 text-ink-900 ring-1 ring-ink-900/25"
              : "bg-ink-900/5 text-ink-700/70 hover:bg-ink-900/10"
          }`}
        >
          <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-ink-700/50" />
          Good{counts.goodCount > 0 ? ` (${counts.goodCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setStatusAndSave("needs_attention")}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            status === "needs_attention"
              ? "bg-brand-50 text-brand-800 ring-1 ring-brand-500"
              : "bg-ink-900/5 text-ink-700/70 hover:bg-ink-900/10"
          }`}
        >
          <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-brand-500" />
          Needs Attention{counts.needsAttentionCount > 0 ? ` (${counts.needsAttentionCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setShowCommentBox((v) => !v)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700/50 hover:text-ink-900"
        >
          {counts.commentCount > 0 ? `${counts.commentCount} comments` : "Comment"}
        </button>
      </div>

      {showCommentBox && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="input text-sm"
            placeholder="Say a bit more (optional)"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 text-xs text-ink-700/60">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              Post anonymously to other residents
            </label>
            <button
              type="button"
              onClick={submitComment}
              disabled={saving}
              className="rounded-full bg-ink-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
