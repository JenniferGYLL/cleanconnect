"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BeforeAfterUploader } from "@/components/dashboard/BeforeAfterUploader";

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

export default function DashboardTabs({
  companyId,
  leads: initialLeads,
  reviews: initialReviews,
}: {
  companyId: string;
  leads: Lead[];
  reviews: Review[];
}) {
  const [tab, setTab] = useState<"leads" | "reviews">("leads");
  const [leads, setLeads] = useState(initialLeads);
  const [reviews, setReviews] = useState(initialReviews);
  const [toast, setToast] = useState<string | null>(null);

  // 实时监听:客户一提交新的线索/评价,这里立刻自动更新,不用刷新页面
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`company-${companyId}-live`)
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
          setToast(
            `New review from ${review.customer_name ?? "a customer"}`
          );
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

      <div className="flex gap-2 border-b border-slate-100">
        <TabButton
          active={tab === "leads"}
          onClick={() => setTab("leads")}
          label={`Leads (${leads.length})`}
        />
        <TabButton
          active={tab === "reviews"}
          onClick={() => setTab("reviews")}
          label={`Reviews (${reviews.length})`}
        />
      </div>

      <div className="mt-6">
        {tab === "leads" ? (
          leads.length === 0 ? (
            <EmptyState text="No leads yet — once the customer side launches, quote requests will show up here instantly." />
          ) : (
            <ul className="space-y-3">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-xl border border-slate-100 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">
                      {lead.customers?.full_name ??
                        lead.customer_name ??
                        "Anonymous customer"}
                    </span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {lead.status}
                    </span>
                  </div>
                  {lead.service_type && (
                    <p className="mt-1 text-sm text-slate-500">
                      Service: {lead.service_type}
                    </p>
                  )}
                  {lead.message && (
                    <p className="mt-2 text-sm text-slate-700">
                      {lead.message}
                    </p>
                  )}
                  {lead.customer_contact && (
                    <p className="mt-2 text-xs text-slate-400">
                      Contact: {lead.customer_contact}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    {lead.status === "requested" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(lead.id, "accepted")}
                          className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(lead.id, "declined")}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-300"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {lead.status === "accepted" && (
                      <button
                        onClick={() => handleStatusChange(lead.id, "in_progress")}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        Start job
                      </button>
                    )}
                    {lead.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(lead.id, "completed")}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>

                  <BeforeAfterUploader
                    leadId={lead.id}
                    companyId={companyId}
                    beforeUrl={lead.before_photo_url}
                    afterUrl={lead.after_photo_url}
                    onUploaded={(slot, url) =>
                      handlePhotoUploaded(lead.id, slot, url)
                    }
                  />
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
                className="rounded-xl border border-slate-100 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    {review.customer_name ?? "Anonymous customer"}
                  </span>
                  {review.rating != null && (
                    <span className="text-sm text-amber-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-slate-700">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton({
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
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
