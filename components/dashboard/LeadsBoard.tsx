"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BeforeAfterUploader } from "@/components/dashboard/BeforeAfterUploader";
import { StatusPill } from "@/components/dashboard/StatusPill";

type Lead = {
  id: string;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
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
}: {
  companyId: string;
  leads: Lead[];
  reviews: Review[];
}) {
  const [tab, setTab] = useState<"enquiries" | "reviews">("enquiries");
  const [leads, setLeads] = useState(initialLeads);
  const [reviews, setReviews] = useState(initialReviews);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photosOpen, setPhotosOpen] = useState(false);

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
                {selectedLead.status === "in_progress" && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedLead.id, "completed")
                    }
                    className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    Mark complete
                  </button>
                )}
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
