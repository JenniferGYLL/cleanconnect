"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  estimateQuote,
  type Condition,
  type JobType,
  type Frequency,
  type PricingProfile,
  type AddonKey,
} from "@/lib/quoting/estimate";

export type QuoteRow = {
  id: string;
  final_price: number | null;
  final_hours: number | null;
  final_cleaners: number | null;
  confidence: string | null;
  status: string;
  addons: { label: string; amount: number }[] | null;
  created_at: string;
};

type LeadForQuote = {
  id: string;
  customer_id: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_condition: string | null;
  job_frequency: string | null;
  job_type: string | null;
  info_requested_note: string | null;
  info_requested_at: string | null;
};

const ADDON_OPTIONS: {
  key: AddonKey;
  label: (p: PricingProfile) => string;
  price: (p: PricingProfile) => number;
}[] = [
  { key: "oven", label: () => "Oven clean", price: (p) => p.addon_oven },
  { key: "fridge", label: () => "Fridge clean", price: (p) => p.addon_fridge },
  {
    key: "windows",
    label: () => "Window clean",
    price: (p) => p.addon_windows,
  },
  { key: "carpet", label: () => "Carpet clean", price: (p) => p.addon_carpet },
  {
    key: "high_access",
    label: () => "High-access cleaning",
    price: (p) => p.addon_high_access,
  },
  {
    key: "other",
    label: (p) => p.addon_other_label || "Other",
    price: (p) => p.addon_other_price,
  },
];

export function QuoteBuilder({
  companyId,
  lead,
  pricingProfile,
  existingQuote,
  onSent,
  onInfoRequested,
}: {
  companyId: string;
  lead: LeadForQuote;
  pricingProfile: PricingProfile | null;
  existingQuote: QuoteRow | null;
  onSent: (quote: QuoteRow) => void;
  onInfoRequested: (leadId: string, note: string) => void;
}) {
  const [addons, setAddons] = useState<Set<AddonKey>>(new Set());
  const [editing, setEditing] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [overrides, setOverrides] = useState<{
    price?: number;
    hours?: number;
    cleaners?: number;
  }>({});
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentQuote, setSentQuote] = useState<QuoteRow | null>(existingQuote);

  const [askingInfo, setAskingInfo] = useState(false);
  const [infoNote, setInfoNote] = useState("");
  const [sendingInfo, setSendingInfo] = useState(false);

  const profile = pricingProfile;

  const estimate = useMemo(() => {
    if (!profile) return null;
    return estimateQuote(
      {
        bedrooms: lead.bedrooms,
        bathrooms: lead.bathrooms,
        condition: (lead.property_condition as Condition) ?? null,
        jobType: (lead.job_type as JobType) ?? "standard",
        frequency: (lead.job_frequency as Frequency) ?? "one_off",
        addons: Array.from(addons),
      },
      profile
    );
  }, [profile, lead, addons]);

  async function sendInfoRequest() {
    if (!infoNote.trim()) return;
    setSendingInfo(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        info_requested_note: infoNote.trim(),
        info_requested_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    setSendingInfo(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onInfoRequested(lead.id, infoNote.trim());
    setAskingInfo(false);
    setInfoNote("");
  }

  if (sentQuote && sentQuote.status !== "draft") {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        <p className="font-medium">
          Quote sent — ${Math.round(sentQuote.final_price ?? 0)}
          {sentQuote.status === "accepted" ? " · Accepted by customer" : ""}
        </p>
        <p className="mt-1 text-xs text-brand-700/70">
          Sent {new Date(sentQuote.created_at).toLocaleDateString()}
        </p>
      </div>
    );
  }

  if (!profile || !estimate) {
    return (
      <p className="rounded-xl border border-dashed border-ink-900/10 bg-white/40 p-4 text-xs text-ink-700/60">
        Set up your{" "}
        <a href="/dashboard/pricing" className="underline">
          pricing
        </a>{" "}
        first — just how you charge, your minimum job price, and any add-on
        prices. The AI takes it from there.
      </p>
    );
  }

  const price = overrides.price ?? estimate.priceMid;
  const hours = overrides.hours ?? estimate.hoursMid;
  const cleaners = overrides.cleaners ?? estimate.cleaners;
  const belowEstimatedRange = price < estimate.priceMin;

  function toggleAddon(key: AddonKey) {
    setAddons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function approveAndSend() {
    setSending(true);
    setError(null);
    const supabase = createClient();

    const addonLines = ADDON_OPTIONS.filter(
      (o) => addons.has(o.key) && o.price(profile!) > 0
    ).map((o) => ({ label: o.label(profile!), amount: o.price(profile!) }));

    const { data, error: insertError } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        lead_id: lead.id,
        customer_id: lead.customer_id,
        ai_hours_min: estimate!.hoursMin,
        ai_hours_max: estimate!.hoursMax,
        ai_price_min: estimate!.priceMin,
        ai_price_max: estimate!.priceMax,
        confidence: estimate!.confidence,
        confidence_reason: estimate!.confidenceReason,
        final_cleaners: cleaners,
        final_hours: hours,
        final_price: price,
        price_adjustment_reason: adjustmentReason.trim() || null,
        addons: addonLines,
        status: "sent",
        approved_at: new Date().toISOString(),
        approved_by: companyId,
      })
      .select()
      .single();

    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const row = data as QuoteRow;
    setSentQuote(row);
    onSent(row);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-ink-900/10 bg-white/60 p-4">
      {lead.info_requested_note && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You asked the customer: &ldquo;{lead.info_requested_note}&rdquo;
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-ink-700/70">
          Add-ons for this job
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADDON_OPTIONS.filter((o) => o.price(profile) > 0).map((o) => {
            const active = addons.has(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleAddon(o.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-900/15 text-ink-700 hover:border-ink-900/30"
                }`}
              >
                {o.label(profile)} · ${o.price(profile)}
              </button>
            );
          })}
          {ADDON_OPTIONS.every((o) => o.price(profile) <= 0) && (
            <p className="text-xs text-ink-700/40">
              No add-ons priced yet — set them up in pricing settings.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-ink-950/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/50">
            AI estimate
          </p>
          <ConfidenceBadge confidence={estimate.confidence} />
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-800">
          <Stat label="Cleaners" value={String(estimate.cleaners)} />
          <Stat
            label="Hours"
            value={`${estimate.hoursMin}–${estimate.hoursMax}`}
          />
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-700/50">
          Recommended price
        </p>

        {editing ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink-700/50">
                Price ($)
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, price: Number(e.target.value) }))
                }
                className="input text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink-700/50">
                Hours
              </span>
              <input
                type="number"
                step="0.1"
                value={hours}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, hours: Number(e.target.value) }))
                }
                className="input text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink-700/50">
                Cleaners
              </span>
              <input
                type="number"
                min="1"
                value={cleaners}
                onChange={(e) =>
                  setOverrides((o) => ({
                    ...o,
                    cleaners: Number(e.target.value),
                  }))
                }
                className="input text-sm"
              />
            </label>
          </div>
        ) : (
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
            ${Math.round(price)}
          </p>
        )}

        {belowEstimatedRange && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This is lower than we&apos;d usually expect for a job like this —
            worth double-checking before you send it. You can still send it
            if that&apos;s the right call.
          </p>
        )}

        {editing && (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              Why did you change the price? (optional)
            </span>
            <input
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. regular customer discount"
              className="input text-sm"
            />
          </label>
        )}

        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          className="mt-3 text-xs font-medium text-brand-700 underline underline-offset-2"
        >
          {whyOpen ? "Hide" : "Why this price?"}
        </button>
        {whyOpen && (
          <div className="mt-2 rounded-lg bg-white/70 p-3 text-xs text-ink-700/80">
            <p>{estimate.summary}</p>
            <ul className="mt-2 space-y-0.5">
              {estimate.reasons.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {askingInfo ? (
        <div className="rounded-xl border border-ink-900/10 bg-white/70 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              What do you need from the customer?
            </span>
            <textarea
              value={infoNote}
              onChange={(e) => setInfoNote(e.target.value)}
              rows={2}
              className="input text-sm"
              placeholder="e.g. could you confirm how many bathrooms?"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAskingInfo(false)}
              className="btn-ghost flex-1 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sendInfoRequest}
              disabled={sendingInfo || !infoNote.trim()}
              className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-60"
            >
              {sendingInfo ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-ghost flex-1 py-2 text-xs"
          >
            {editing ? "Done editing" : "Edit quote"}
          </button>
          <button
            type="button"
            onClick={() => setAskingInfo(true)}
            className="btn-ghost flex-1 py-2 text-xs"
          >
            Ask for more info
          </button>
          <button
            type="button"
            onClick={approveAndSend}
            disabled={sending}
            className="btn-primary flex-1 basis-full py-2 text-xs disabled:opacity-60 sm:basis-auto"
          >
            {sending ? "Sending…" : "Approve & send"}
          </button>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: "bg-brand-100 text-brand-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        styles[confidence] ?? "bg-ink-100 text-ink-700"
      }`}
    >
      {confidence} confidence
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-700/40">
        {label}
      </p>
      <p className="font-medium text-ink-900">{value}</p>
    </div>
  );
}
