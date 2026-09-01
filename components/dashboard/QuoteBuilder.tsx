"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  estimateQuote,
  type Condition,
  type JobType,
  type Frequency,
  type PricingProfile,
  type AddonKey,
} from "@/lib/quoting/estimate";
import { assessRisk, type RiskLevel, type QuoteMode } from "@/lib/quoting/risk";
import {
  InspectionPanel,
  type InspectionRow,
  type QuoteAdjustment,
} from "@/components/dashboard/InspectionPanel";

export type QuoteRow = {
  id: string;
  lead_id?: string;
  final_price: number | null;
  final_hours: number | null;
  final_cleaners: number | null;
  confidence: string | null;
  status: string;
  addons: { label: string; amount: number }[] | null;
  risk_level: string | null;
  quote_mode: string | null;
  additional_charge: number | null;
  additional_charge_reason: string | null;
  created_at: string;
};

type LeadForQuote = {
  id: string;
  customer_id: string | null;
  message: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_condition: string | null;
  job_frequency: string | null;
  job_type: string | null;
  request_photos: string[] | null;
  info_requested_note: string | null;
  info_requested_at: string | null;
};

type QuoteEvent = {
  id: string;
  event_type: string;
  actor_role: string;
  note: string | null;
  created_at: string;
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

const MODE_LABEL: Record<QuoteMode, string> = {
  instant: "Instant estimate",
  verification: "Estimate · may be verified",
  inspection: "Inspection required",
};

const EVENT_LABEL: Record<string, string> = {
  quote_sent: "Estimate sent to customer",
  inspection_requested: "Site inspection requested",
  inspection_completed: "Inspection completed",
  info_requested: "Asked customer for more info",
  customer_accepted: "Customer accepted the quote",
  job_completed: "Job marked complete",
};

export function QuoteBuilder({
  companyId,
  lead,
  pricingProfile,
  existingQuote,
  existingInspection,
  onSent,
  onInfoRequested,
  onInspectionChange,
}: {
  companyId: string;
  lead: LeadForQuote;
  pricingProfile: PricingProfile | null;
  existingQuote: QuoteRow | null;
  existingInspection: InspectionRow | null;
  onSent: (quote: QuoteRow) => void;
  onInfoRequested: (leadId: string, note: string) => void;
  onInspectionChange: (leadId: string, inspection: InspectionRow) => void;
}) {
  const [addons, setAddons] = useState<Set<AddonKey>>(new Set());
  const [editing, setEditing] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [events, setEvents] = useState<QuoteEvent[]>([]);
  const [overrides, setOverrides] = useState<{
    price?: number;
    hours?: number;
    cleaners?: number;
  }>({});
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [sending, setSending] = useState(false);
  const [requestingInspection, setRequestingInspection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentQuote, setSentQuote] = useState<QuoteRow | null>(existingQuote);
  const [inspection, setInspection] = useState<InspectionRow | null>(
    existingInspection
  );

  const [askingInfo, setAskingInfo] = useState(false);
  const [infoNote, setInfoNote] = useState("");
  const [sendingInfo, setSendingInfo] = useState(false);

  const profile = pricingProfile;
  const photoCount = lead.request_photos?.length ?? 0;

  useEffect(() => {
    setSentQuote(existingQuote);
  }, [existingQuote]);

  useEffect(() => {
    setInspection(existingInspection);
  }, [existingInspection]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quote_events")
        .select("id, event_type, actor_role, note, created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true });
      if (!cancelled) setEvents((data as QuoteEvent[]) ?? []);
    }
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

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

  const risk = useMemo(
    () =>
      assessRisk({
        photoCount,
        descriptionLength: (lead.message ?? "").trim().length,
        bedroomsKnown: lead.bedrooms != null,
        bathroomsKnown: lead.bathrooms != null,
        conditionKnown: !!lead.property_condition,
        jobType: (lead.job_type as JobType) ?? "standard",
        condition: (lead.property_condition as Condition) ?? null,
      }),
    [photoCount, lead]
  );

  async function logEvent(
    eventType: string,
    quoteId: string | null,
    note?: string | null,
    payload?: Record<string, unknown>
  ) {
    const supabase = createClient();
    await supabase.from("quote_events").insert({
      lead_id: lead.id,
      quote_id: quoteId,
      event_type: eventType,
      actor_role: "company",
      actor_id: companyId,
      note: note ?? null,
      payload: payload ?? {},
    });
    setEvents((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        event_type: eventType,
        actor_role: "company",
        note: note ?? null,
        created_at: new Date().toISOString(),
      },
    ]);
  }

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
    await logEvent("info_requested", sentQuote?.id ?? null, infoNote.trim());
    setAskingInfo(false);
    setInfoNote("");
  }

  async function requestInspection() {
    setRequestingInspection(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("inspections")
      .insert({
        lead_id: lead.id,
        quote_id: sentQuote?.id ?? null,
        company_id: companyId,
        customer_id: lead.customer_id,
        requested_by: companyId,
      })
      .select()
      .single();

    setRequestingInspection(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    const row = data as InspectionRow;
    setInspection(row);
    onInspectionChange(lead.id, row);
    await logEvent("inspection_requested", sentQuote?.id ?? null);
  }

  function handleInspectionCompleted(
    updated: InspectionRow,
    adjustment: QuoteAdjustment | null
  ) {
    setInspection(updated);
    onInspectionChange(lead.id, updated);
    if (adjustment && sentQuote) {
      const updatedQuote: QuoteRow = {
        ...sentQuote,
        status: "adjusted",
        additional_charge: adjustment.additional_charge,
        additional_charge_reason: adjustment.additional_charge_reason || null,
      };
      setSentQuote(updatedQuote);
      onSent(updatedQuote);
    }
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

  async function approveAndSend(mode: QuoteMode) {
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
        risk_level: risk.level,
        quote_mode: mode,
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
    await logEvent("quote_sent", row.id, null, {
      mode,
      risk_level: risk.level,
      price,
    });
  }

  // Once an inspection has been completed, InspectionPanel shows the
  // read-only findings summary itself — so it stays mounted either way.
  // The builder only re-appears once there's no *pending* inspection
  // blocking it (a completed one with no quote yet still lets the company
  // build the quote now, informed by what they just found).
  const showBuilder = !sentQuote && (!inspection || !!inspection.completed_at);

  return (
    <div className="space-y-4 rounded-2xl border border-ink-900/10 bg-white/60 p-4">
      {lead.info_requested_note && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You asked the customer: &ldquo;{lead.info_requested_note}&rdquo;
        </div>
      )}

      {photoCount > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-700/70">
            Photos from the customer ({photoCount})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(lead.request_photos ?? []).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Customer photo ${i + 1}`}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {sentQuote && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {sentQuote.status === "adjusted"
                ? `Awaiting re-acceptance — $${Math.round(
                    (sentQuote.final_price ?? 0) +
                      (sentQuote.additional_charge ?? 0)
                  )}`
                : `Quote sent — $${Math.round(sentQuote.final_price ?? 0)}`}
              {sentQuote.status === "accepted" ? " · Accepted" : ""}
            </p>
            {sentQuote.quote_mode && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                {MODE_LABEL[sentQuote.quote_mode as QuoteMode] ??
                  sentQuote.quote_mode}
              </span>
            )}
          </div>
          {sentQuote.status === "adjusted" && (
            <p className="mt-1 text-xs text-brand-700/80">
              Original ${Math.round(sentQuote.final_price ?? 0)} + additional
              charge ${Math.round(sentQuote.additional_charge ?? 0)}
              {sentQuote.additional_charge_reason
                ? ` (${sentQuote.additional_charge_reason})`
                : ""}
              . Customer must accept before this is final.
            </p>
          )}
          <p className="mt-1 text-xs text-brand-700/70">
            Sent {new Date(sentQuote.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {inspection && (
        <InspectionPanel
          companyId={companyId}
          leadId={lead.id}
          inspection={inspection}
          hasSentQuote={!!sentQuote}
          onCompleted={handleInspectionCompleted}
        />
      )}

      {showBuilder && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink-700/70">
              Add-ons for this job
            </p>
            <RiskBadge level={risk.level} />
          </div>
          <div className="flex flex-wrap gap-2">
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
                      setOverrides((o) => ({
                        ...o,
                        price: Number(e.target.value),
                      }))
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
                      setOverrides((o) => ({
                        ...o,
                        hours: Number(e.target.value),
                      }))
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
                This is lower than we&apos;d usually expect for a job like
                this — worth double-checking before you send it. You can
                still send it if that&apos;s the right call.
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
                <p className="mt-2 font-medium text-ink-700">
                  Risk factors ({risk.level}):
                </p>
                <ul className="mt-1 space-y-0.5">
                  {risk.reasons.map((r, i) => (
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
            <>
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
              </div>
              <div className="flex flex-wrap gap-2">
                {risk.level !== "low" && (
                  <button
                    type="button"
                    onClick={requestInspection}
                    disabled={requestingInspection}
                    className="btn-ghost flex-1 basis-full border border-amber-300 py-2 text-xs text-amber-700 disabled:opacity-60 sm:basis-auto"
                  >
                    {requestingInspection
                      ? "Requesting…"
                      : "Request site inspection"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => approveAndSend(risk.suggestedMode)}
                  disabled={sending}
                  className="btn-primary flex-1 basis-full py-2 text-xs disabled:opacity-60 sm:basis-auto"
                >
                  {sending
                    ? "Sending…"
                    : risk.level === "low"
                    ? "Approve & send"
                    : "Continue with estimate"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {sentQuote && !inspection && risk.level !== "low" && (
        <button
          type="button"
          onClick={requestInspection}
          disabled={requestingInspection}
          className="text-xs font-medium text-amber-700 underline underline-offset-2"
        >
          {requestingInspection
            ? "Requesting…"
            : "Something doesn't add up — request a site inspection"}
        </button>
      )}

      {events.length > 0 && (
        <div className="border-t border-ink-900/10 pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-xs font-medium text-ink-700/60 underline underline-offset-2"
          >
            {historyOpen ? "Hide history" : `History (${events.length})`}
          </button>
          {historyOpen && (
            <ul className="mt-2 space-y-1 text-xs text-ink-700/70">
              {events.map((e) => (
                <li key={e.id}>
                  · {EVENT_LABEL[e.event_type] ?? e.event_type}
                  {" — "}
                  {new Date(e.created_at).toLocaleString()}
                  {e.note ? ` (${e.note})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    low: "bg-brand-100 text-brand-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[level]}`}
    >
      {level} risk
    </span>
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
