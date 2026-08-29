"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StatusPill } from "@/components/dashboard/StatusPill";

type TimelineLead = {
  id: string;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
};

type CustomerReview = {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export type CustomerSummary = {
  key: string;
  displayName: string;
  phone: string | null;
  leads: TimelineLead[];
  reviews: CustomerReview[];
  lastActivity: string;
};

export function CustomersBoard({
  customers,
}: {
  customers: CustomerSummary[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [openPhotos, setOpenPhotos] = useState<Record<string, boolean>>({});

  const selected = customers.find((c) => c.key === selectedKey) ?? null;

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
        No customers yet — once someone requests a quote, they&apos;ll show
        up here with their full history.
      </div>
    );
  }

  return (
    <div>
      <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
        {customers.map((customer) => {
          const completed = customer.leads.filter(
            (l) => l.status === "completed"
          ).length;
          const avgRating =
            customer.reviews.length > 0
              ? customer.reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
                customer.reviews.length
              : null;

          return (
            <li key={customer.key}>
              <button
                type="button"
                onClick={() => setSelectedKey(customer.key)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {customer.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-700/50">
                    {customer.leads.length} job
                    {customer.leads.length === 1 ? "" : "s"}
                    {completed > 0 && ` · ${completed} completed`}
                    {avgRating != null && ` · ★ ${avgRating.toFixed(1)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-ink-700/40">
                    {new Date(customer.lastActivity).toLocaleDateString()}
                  </span>
                  <span className="text-ink-700/30">›</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {selected && (
          <>
            <motion.button
              aria-label="Close"
              onClick={() => setSelectedKey(null)}
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
                    Customer
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink-900">
                    {selected.displayName}
                  </h2>
                  {selected.phone && (
                    <p className="mt-0.5 text-xs text-ink-700/60">
                      {selected.phone}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="rounded-full p-1.5 text-ink-700/50 hover:bg-white/60 hover:text-ink-900"
                  aria-label="Close customer panel"
                >
                  ✕
                </button>
              </div>

              {selected.reviews.length > 0 && (
                <div className="mt-5 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                    Feedback
                  </p>
                  {selected.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl bg-white/60 p-3 text-sm"
                    >
                      {review.rating != null && (
                        <span className="text-xs text-gold-500">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                      )}
                      {review.comment && (
                        <p className="mt-1 text-ink-800">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                  History
                </p>
                <div className="mt-3 space-y-0">
                  {selected.leads.map((lead, index) => (
                    <div key={lead.id} className="relative pb-6 pl-6">
                      {index < selected.leads.length - 1 && (
                        <span className="absolute left-[5px] top-3 h-full w-px bg-ink-900/10" />
                      )}
                      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-gold-400" />

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-ink-900">
                          {lead.service_type ?? "Enquiry"}
                        </p>
                        <StatusPill status={lead.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-ink-700/50">
                        {new Date(lead.created_at).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                      {lead.message && (
                        <p className="mt-1.5 text-sm text-ink-700/80">
                          {lead.message}
                        </p>
                      )}

                      {(lead.before_photo_url || lead.after_photo_url) && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPhotos((prev) => ({
                                ...prev,
                                [lead.id]: !prev[lead.id],
                              }))
                            }
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            {openPhotos[lead.id]
                              ? "Hide photos"
                              : "View before & after photos"}
                          </button>
                          <AnimatePresence initial={false}>
                            {openPhotos[lead.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {lead.before_photo_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={lead.before_photo_url}
                                      alt="Before"
                                      className="aspect-video w-full rounded-lg object-cover"
                                    />
                                  )}
                                  {lead.after_photo_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={lead.after_photo_url}
                                      alt="After"
                                      className="aspect-video w-full rounded-lg object-cover"
                                    />
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
