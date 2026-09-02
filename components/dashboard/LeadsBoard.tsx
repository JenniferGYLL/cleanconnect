"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BeforeAfterUploader } from "@/components/dashboard/BeforeAfterUploader";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { QuoteBuilder, type QuoteRow } from "@/components/dashboard/QuoteBuilder";
import type { InspectionRow } from "@/components/dashboard/InspectionPanel";
import type { PricingProfile } from "@/lib/quoting/estimate";

type Lead = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  category: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_condition: string | null;
  job_frequency: string | null;
  job_type: string | null;
  service_details: Record<string, unknown> | null;
  request_photos: string[] | null;
  info_requested_note: string | null;
  info_requested_at: string | null;
  created_at: string;
  customers: { full_name: string; phone: string | null } | null;
};

type Review = {
  id: string;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export function LeadsBoard({
  companyId,
  leads: initialLeads,
  reviews: initialReviews,
  pricingProfile,
  quotesByLead: initialQuotesByLead,
  inspectionsByLead: initialInspectionsByLead,
}: {
  companyId: string;
  leads: Lead[];
  reviews: Review[];
  pricingProfile: PricingProfile | null;
  quotesByLead: Record<string, QuoteRow>;
  inspectionsByLead: Record<string, InspectionRow>;
}) {
  const [tab, setTab] = useState<"enquiries" | "reviews">("enquiries");
  const [leads, setLeads] = useState(initialLeads);
  const [reviews, setReviews] = useState(initialReviews);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotesByLead, setQuotesByLead] = useState(initialQuotesByLead);
  const [inspectionsByLead, setInspectionsByLead] = useState(
    initialInspectionsByLead
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actualHours, setActualHours] = useState("");
  const [actualCleaners, setActualCleaners] = useState("");
  const [savingCompletion, setSavingCompletion] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`company-${companyId}-leads-live`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const review = payload.new as Review;
          setReviews((prev) => [review, ...prev]);
          setToast(`New review from ${review.customer_name ?? "a customer"}`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const lead = payload.new as Lead;
          setLeads((prev) => [lead, ...prev]);
          setToast(`New lead from ${lead.customer_name ?? "a customer"}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handlePhotoUploaded(
    leadId: string,
    slot: "before" | "after",
    url: string
  ) {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              [slot === "before" ? "before_photo_url" : "after_photo_url"]:
                url,
            }
          : lead
      )
    );
  }

  async function handleStatusChange(leadId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId);

    if (error) {
      setToast(`Couldn't update status: ${error.message}`);
      return;
    }

    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
    );
  }

  function openLead(id: string) {
    setSelectedId(id);
    setPhotosOpen(false);
    setQuoteOpen(false);
  }

  function handleQuoteSent(leadId: string, quote: QuoteRow) {
    setQuotesByLead((prev) => ({ ...prev, [leadId]: quote }));
  }

  function handleInspectionChange(leadId: string, inspection: InspectionRow) {
    setInspectionsByLead((prev) => ({ ...prev, [leadId]: inspection }));
  }

  async function submitCompletion(leadId: string) {
    setSavingCompletion(true);
    const supabase = createClient();

    const quote = quotesByLead[leadId] ?? null;
    const hours = actualHours === "" ? null : Number(actualHours);
    const cleaners = actualCleaners === "" ? null : Number(actualCleaners);

    const { error: outcomeError } = await supabase.from("job_outcomes").insert({
      lead_id: leadId,
      quote_id: quote?.id ?? null,
      company_id: companyId,
      actual_hours: hours,
      actual_cleaners: cleaners,
    });

    if (outcomeError) {
      setSavingCompletion(false);
      setToast(`Couldn't save job outcome: ${outcomeError.message}`);
      return;
    }

    if (quote) {
      await supabase.from("quote_events").insert({
        lead_id: leadId,
        quote_id: quote.id,
        event_type: "job_completed",
        actor_role: "company",
        actor_id: companyId,
        payload: { actual_hours: hours, actual_cleaners: cleaners },
      });
    }

    await handleStatusChange(leadId, "completed");
    setSavingCompletion(false);
    setCompletingId(null);
    setActualHours("");
    setActualCleaners("");
  }

  function handleInfoRequested(leadId: string, note: string) {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              info_requested_note: note,
              info_requested_at: new Date().toISOString(),
            }
          : lead
      )
    );
  }

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <SegmentButton
          active={tab === "enquiries"}
          onClick={() => setTab("enquiries")}
          label={`Enquiries (${leads.length})`}
        />
        <SegmentButton
          active={tab === "reviews"}
          onClick={() => setTab("reviews")}
          label={`Reviews (${reviews.length})`}
        />
      </div>

      <div className="mt-6">
        {tab === "enquiries" ? (
          leads.length === 0 ? (
            <EmptyState text="No leads yet — once a customer requests a quote, it'll show up here instantly." />
          ) : (
            <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => openLead(lead.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {lead.customers?.full_name ??
                          lead.customer_name ??
                          "Anonymous customer"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-700/50">
                        {lead.service_type ?? "Service not specified"} ·{" "}
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill status={lead.status} />
                      <span className="text-ink-700/30">›</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : reviews.length === 0 ? (
          <EmptyState text="No reviews yet — feedback from completed jobs will appear here the moment a customer submits it." />
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="glass-surface rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900">
                    {review.customer_name ?? "Anonymous customer"}
                  </span>
                  {review.rating != null && (
                    <span className="text-sm text-gold-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-ink-700/80">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.button
              aria-label="Close"
              onClick={() => setSelectedId(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink-950/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-surface fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                    {selectedLead.service_type ?? "Enquiry"}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink-900">
                    {selectedLead.customers?.full_name ??
                      selectedLead.customer_name ??
                      "Anonymous customer"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full p-1.5 text-ink-700/50 hover:bg-white/60 hover:text-ink-900"
                  aria-label="Close detail panel"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <StatusPill status={selectedLead.status} />
                <span className="text-xs text-ink-700/50">
                  Received{" "}
                  {new Date(selectedLead.created_at).toLocaleDateString(
                    undefined,
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                </span>
              </div>

              {selectedLead.message && (
                <p className="mt-4 rounded-xl bg-white/60 p-3 text-sm text-ink-800">
                  {selectedLead.message}
                </p>
              )}

              {(selectedLead.customer_contact ||
                selectedLead.customers?.phone) && (
                <p className="mt-3 text-xs text-ink-700/60">
                  Contact:{" "}
                  {selectedLead.customer_contact ??
                    selectedLead.customers?.phone}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedLead.status === "requested" && (
                  <>
                    <button
                      onClick={() =>
                        handleStatusChange(selectedLead.id, "accepted")
                      }
                      className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(selectedLead.id, "declined")
                      }
                      className="rounded-full border border-ink-900/15 px-4 py-1.5 text-xs font-medium text-ink-700 hover:border-ink-900/30"
                    >
                      Decline
                    </button>
                  </>
                )}
                {selectedLead.status === "accepted" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedLead.id, "in_progress")
                    }
                    className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    Start job
                  </button>
                )}
                {selectedLead.status === "in_progress" &&
                  completingId !== selectedLead.id && (
                    <button
                      onClick={() => setCompletingId(selectedLead.id)}
                      className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Mark complete
                    </button>
                  )}
              </div>

              {completingId === selectedLead.id && (
                <div className="mt-3 rounded-xl border border-ink-900/10 bg-white/60 p-3">
                  <p className="text-xs font-medium text-ink-700/70">
                    Quick record for your own numbers (optional) — helps
                    future estimates get more accurate.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] text-ink-700/50">
                        Actual hours
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={actualHours}
                        onChange={(e) => setActualHours(e.target.value)}
                        className="input text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] text-ink-700/50">
                        Cleaners used
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={actualCleaners}
                        onChange={(e) => setActualCleaners(e.target.value)}
                        className="input text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setCompletingId(null)}
                      className="rounded-full border border-ink-900/15 px-4 py-1.5 text-xs font-medium text-ink-700 hover:border-ink-900/30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitCompletion(selectedLead.id)}
                      disabled={savingCompletion}
                      className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {savingCompletion ? "Saving…" : "Confirm complete"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-ink-900/10 pt-5">
                <button
                  type="button"
                  onClick={() => setQuoteOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-ink-900">
                    AI-assisted quote
                  </span>
                  <span
                    className={`text-ink-700/50 transition-transform ${
                      quoteOpen ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {quoteOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <QuoteBuilder
                          companyId={companyId}
                          lead={selectedLead}
                          pricingProfile={pricingProfile}
                          existingQuote={quotesByLead[selectedLead.id] ?? null}
                          existingInspection={
                            inspectionsByLead[selectedLead.id] ?? null
                          }
                          onSent={(quote) =>
                            handleQuoteSent(selectedLead.id, quote)
                          }
                          onInfoRequested={handleInfoRequested}
                          onInspectionChange={handleInspectionChange}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 border-t border-ink-900/10 pt-5">
                <button
                  type="button"
                  onClick={() => setPhotosOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-ink-900">
                    Before &amp; after photos
                  </span>
                  <span
                    className={`text-ink-700/50 transition-transform ${
                      photosOpen ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {photosOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <BeforeAfterUploader
                          leadId={selectedLead.id}
                          companyId={companyId}
                          beforeUrl={selectedLead.before_photo_url}
                          afterUrl={selectedLead.after_photo_url}
                          onUploaded={(slot, url) =>
                            handlePhotoUploaded(selectedLead.id, slot, url)
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-ink-900 text-white shadow-tint-sm"
          : "bg-white/60 text-ink-700 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
      {text}
    </div>
  );
}
