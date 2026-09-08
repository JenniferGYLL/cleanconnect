"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { BeforeAfterUploader } from "@/components/dashboard/BeforeAfterUploader";

export type StaffJob = {
  id: string;
  company_id: string;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  scheduled_date: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  customers: { full_name: string } | null;
};

export function StaffJobsList({ jobs: initialJobs }: { jobs: StaffJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openPhotosId, setOpenPhotosId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markComplete(jobId: string) {
    setCompletingId(jobId);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "completed" })
      .eq("id", jobId);

    setCompletingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setError(null);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  function handlePhotoUploaded(
    jobId: string,
    slot: "before" | "after",
    url: string
  ) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              [slot === "before" ? "before_photo_url" : "after_photo_url"]:
                url,
            }
          : j
      )
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
        No jobs assigned to you right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {jobs.map((job) => (
        <div key={job.id} className="glass-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-ink-900">
              {job.customers?.full_name ?? job.customer_name ?? "Customer"}
            </p>
            <StatusPill status={job.status} />
          </div>
          {job.service_type && (
            <p className="mt-1 text-sm text-ink-700/60">{job.service_type}</p>
          )}
          {job.customer_contact && (
            <p className="mt-0.5 text-xs text-ink-700/50">
              {job.customer_contact}
            </p>
          )}
          {job.scheduled_date && (
            <p className="mt-2 text-xs font-medium text-brand-700">
              {new Date(`${job.scheduled_date}T00:00:00`).toLocaleDateString(
                undefined,
                { weekday: "long", day: "numeric", month: "short" }
              )}
            </p>
          )}
          {job.message && (
            <p className="mt-3 rounded-xl bg-white/60 p-3 text-sm text-ink-800">
              {job.message}
            </p>
          )}

          <div className="mt-4 border-t border-ink-900/10 pt-4">
            <button
              type="button"
              onClick={() =>
                setOpenPhotosId((prev) => (prev === job.id ? null : job.id))
              }
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-ink-900">
                Before &amp; after photos
              </span>
              <span
                className={`text-ink-700/50 transition-transform ${
                  openPhotosId === job.id ? "rotate-180" : ""
                }`}
              >
                ⌄
              </span>
            </button>
            {openPhotosId === job.id && (
              <div className="pt-3">
                <BeforeAfterUploader
                  leadId={job.id}
                  companyId={job.company_id}
                  beforeUrl={job.before_photo_url}
                  afterUrl={job.after_photo_url}
                  onUploaded={(slot, url) =>
                    handlePhotoUploaded(job.id, slot, url)
                  }
                />
              </div>
            )}
          </div>

          {job.status !== "completed" && (
            <button
              type="button"
              onClick={() => markComplete(job.id)}
              disabled={completingId === job.id}
              className="btn-primary mt-4 w-full py-2 text-sm disabled:opacity-60"
            >
              {completingId === job.id ? "Saving…" : "Mark job complete"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
