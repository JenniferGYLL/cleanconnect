"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PhotoQcStatus = "pending" | "approved" | "flagged";

export function PhotoQualityCheck({
  leadId,
  status,
  note,
  onUpdated,
}: {
  leadId: string;
  status: PhotoQcStatus;
  note: string | null;
  onUpdated: (status: PhotoQcStatus, note: string | null) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const [saving, setSaving] = useState<PhotoQcStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: PhotoQcStatus) {
    setSaving(next);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        photo_qc_status: next,
        photo_qc_note: noteDraft.trim() || null,
        photo_qc_reviewed_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    setSaving(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onUpdated(next, noteDraft.trim() || null);
  }

  if (status === "approved") {
    return (
      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
        <span>✓ Photos approved</span>
        <button
          type="button"
          onClick={() => setStatus("pending")}
          className="text-brand-700/60 underline hover:text-brand-700"
        >
          Undo
        </button>
      </div>
    );
  }

  if (status === "flagged") {
    return (
      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <p className="font-medium">⚑ Flagged for a redo</p>
        {note && <p className="mt-1 text-amber-700/80">{note}</p>}
        <button
          type="button"
          onClick={() => setStatus("pending")}
          className="mt-1 font-medium underline hover:text-amber-900"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-ink-900/15 p-3">
      <p className="text-xs font-medium text-ink-900">
        Quality check — do these photos match the job?
      </p>
      <textarea
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        placeholder="Optional note (e.g. what needs redoing)"
        rows={2}
        className="mt-2 w-full rounded-lg border border-ink-900/10 bg-white/70 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-700/40 focus:border-brand-400 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setStatus("approved")}
          disabled={saving !== null}
          className="flex-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving === "approved" ? "Saving…" : "Looks good"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("flagged")}
          disabled={saving !== null}
          className="flex-1 rounded-full bg-ink-900/[0.06] px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/[0.1] disabled:opacity-60"
        >
          {saving === "flagged" ? "Saving…" : "Needs redo"}
        </button>
      </div>
    </div>
  );
}
