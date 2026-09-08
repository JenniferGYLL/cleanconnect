"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components/dashboard/StatusPill";

export type JobLead = {
  id: string;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  status: string;
  scheduled_date: string | null;
  assigned_staff_id: string | null;
  created_at: string;
  customers: { full_name: string } | null;
};

export type StaffOption = {
  id: string;
  full_name: string;
  active: boolean;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function groupJobs(jobs: JobLead[]) {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  const weekEnd = toDateKey(new Date(Date.now() + 7 * 86400000));

  const groups: { key: string; label: string; jobs: JobLead[] }[] = [
    { key: "unscheduled", label: "Needs a date", jobs: [] },
    { key: "today", label: "Today", jobs: [] },
    { key: "tomorrow", label: "Tomorrow", jobs: [] },
    { key: "week", label: "This week", jobs: [] },
    { key: "later", label: "Later", jobs: [] },
  ];
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));

  for (const job of jobs) {
    if (!job.scheduled_date) {
      byKey.unscheduled.jobs.push(job);
    } else if (job.scheduled_date === today) {
      byKey.today.jobs.push(job);
    } else if (job.scheduled_date === tomorrow) {
      byKey.tomorrow.jobs.push(job);
    } else if (job.scheduled_date <= weekEnd) {
      byKey.week.jobs.push(job);
    } else {
      byKey.later.jobs.push(job);
    }
  }

  return groups.filter((g) => g.jobs.length > 0);
}

export function JobsBoard({
  jobs: initialJobs,
  staff,
}: {
  jobs: JobLead[];
  staff: StaffOption[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState<string | null>(null);
  const staffById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s])),
    [staff]
  );

  async function updateJob(jobId: string, patch: Partial<JobLead>) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", jobId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setError(null);
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job))
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
        No accepted jobs yet — once you accept an enquiry from the Leads
        tab, it&apos;ll show up here for scheduling.
      </div>
    );
  }

  const groups = groupJobs(jobs);

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
            {group.label} ({group.jobs.length})
          </p>
          <ul className="glass-surface mt-3 divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
            {group.jobs.map((job) => (
              <li key={job.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink-900">
                    {job.customers?.full_name ??
                      job.customer_name ??
                      "Customer"}
                  </p>
                  <StatusPill status={job.status} />
                </div>
                {job.service_type && (
                  <p className="mt-1 text-sm text-ink-700/60">
                    {job.service_type}
                  </p>
                )}
                {job.customer_contact && (
                  <p className="mt-0.5 text-xs text-ink-700/50">
                    {job.customer_contact}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-ink-700/50">
                      Date
                    </span>
                    <input
                      type="date"
                      value={job.scheduled_date ?? ""}
                      onChange={(e) =>
                        updateJob(job.id, {
                          scheduled_date: e.target.value || null,
                        })
                      }
                      className="input text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-ink-700/50">
                      Assigned to
                    </span>
                    <select
                      value={job.assigned_staff_id ?? ""}
                      onChange={(e) =>
                        updateJob(job.id, {
                          assigned_staff_id: e.target.value || null,
                        })
                      }
                      className="input text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id} disabled={!s.active}>
                          {s.full_name}
                          {!s.active ? " (inactive)" : ""}
                        </option>
                      ))}
                      {job.assigned_staff_id &&
                        !staffById[job.assigned_staff_id] && (
                          <option value={job.assigned_staff_id}>
                            Former staff member
                          </option>
                        )}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
