"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type InspectionRow = {
  id: string;
  lead_id: string;
  quote_id: string | null;
  requested_at: string;
  findings: string | null;
  completed_at: string | null;
};

export type QuoteAdjustment = {
  additional_charge: number;
  additional_charge_reason: string;
};

// Shown once a company has requested a site inspection for a lead. The
// company is always the one who decides what happens next — this panel
// never auto-adjusts a price. Completing an inspection with an additional
// charge only ever *proposes* a new total; the customer still has to
// accept it (enforced by a DB trigger, not just this UI).
export function InspectionPanel({
  companyId,
  leadId,
  inspection,
  hasSentQuote,
  onCompleted,
}: {
  companyId: string;
  leadId: string;
  inspection: InspectionRow;
  hasSentQuote: boolean;
  onCompleted: (
    inspection: InspectionRow,
    adjustment: QuoteAdjustment | null
  ) => void;
}) {
  const [findings, setFindings] = useState("");
  const [wantsCharge, setWantsCharge] = useState(false);
  const [additionalCharge, setAdditionalCharge] = useState("");
  const [chargeReason, setChargeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (inspection.completed_at) {
    return (
      <div className="rounded-xl border border-ink-900/10 bg-white/60 p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/50">
          Inspection completed
        </p>
        {inspection.findings && (
          <p className="mt-1 text-ink-800">{inspection.findings}</p>
        )}
        <p className="mt-1 text-xs text-ink-700/50">
          {new Date(inspection.completed_at).toLocaleDateString()}
        </p>
      </div>
    );
  }

  async function complete() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const charge = wantsCharge ? Number(additionalCharge) || 0 : 0;

    const { data, error: updateError } = await supabase
      .from("inspections")
      .update({ findings: findings.trim() || null, completed_at: new Date().toISOString() })
      .eq("id", inspection.id)
      .select()
      .single();

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    let adjustment: QuoteAdjustment | null = null;

    if (hasSentQuote && inspection.quote_id && charge > 0) {
      const { error: quoteError } = await supabase
        .from("quotes")
        .update({
          additional_charge: charge,
          additional_charge_reason: chargeReason.trim() || null,
          status: "adjusted",
        })
        .eq("id", inspection.quote_id);

      if (quoteError) {
        setSaving(false);
        setError(quoteError.message);
        return;
      }
      adjustment = {
        additional_charge: charge,
        additional_charge_reason: chargeReason.trim(),
      };
    }

    await supabase.from("quote_events").insert({
      lead_id: leadId,
      quote_id: inspection.quote_id,
      event_type: "inspection_completed",
      actor_role: "company",
      actor_id: companyId,
      note: findings.trim() || null,
      payload: adjustment ?? {},
    });

    setSaving(false);
    onCompleted(data as InspectionRow, adjustment);
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
        Site inspection requested
      </p>
      <p className="mt-1 text-xs text-amber-700/70">
        Requested {new Date(inspection.requested_at).toLocaleDateString()}
      </p>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-ink-700/70">
          What did you find?
        </span>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={2}
          className="input text-sm"
          placeholder="e.g. property is in good condition, matches description"
        />
      </label>

      {hasSentQuote && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input
              type="checkbox"
              checked={wantsCharge}
              onChange={(e) => setWantsCharge(e.target.checked)}
            />
            This changes the price — add an additional charge
          </label>
          {wantsCharge && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink-700/50">
                  Additional charge ($)
                </span>
                <input
                  type="number"
                  min="0"
                  value={additionalCharge}
                  onChange={(e) => setAdditionalCharge(e.target.value)}
                  className="input text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink-700/50">
                  Reason
                </span>
                <input
                  value={chargeReason}
                  onChange={(e) => setChargeReason(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. more mould than described"
                />
              </label>
            </div>
          )}
          <p className="mt-2 text-[11px] text-amber-700/70">
            The customer will need to accept the updated total before it
            becomes final — nothing is charged automatically.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={complete}
        disabled={saving}
        className="btn-primary mt-3 w-full py-2 text-xs disabled:opacity-60"
      >
        {saving ? "Saving…" : "Complete inspection"}
      </button>
    </div>
  );
}
