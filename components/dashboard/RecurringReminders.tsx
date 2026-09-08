"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RecurringReminder = {
  id: string;
  companyId: string;
  customerId: string | null;
  customerName: string | null;
  customerContact: string | null;
  message: string | null;
  serviceType: string | null;
  category: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyCondition: string | null;
  jobType: string | null;
  jobFrequency: string | null;
  serviceDetails: Record<string, unknown> | null;
  assignedStaffId: string | null;
  nextDueDate: string;
  displayName: string;
};

function formatDue(dateStr: string): { label: string; urgent: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return { label: "Overdue", urgent: true };
  if (dateStr === today) return { label: "Due today", urgent: true };
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    label: `Due ${date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    })}`,
    urgent: false,
  };
}

export function RecurringReminders({
  reminders: initialReminders,
}: {
  reminders: RecurringReminder[];
}) {
  const [reminders, setReminders] = useState(initialReminders);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (reminders.length === 0) return null;

  async function createNext(reminder: RecurringReminder) {
    setCreatingId(reminder.id);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("leads").insert({
      company_id: reminder.companyId,
      customer_id: reminder.customerId,
      customer_name: reminder.customerName,
      customer_contact: reminder.customerContact,
      message: reminder.message,
      service_type: reminder.serviceType,
      category: reminder.category,
      bedrooms: reminder.bedrooms,
      bathrooms: reminder.bathrooms,
      property_condition: reminder.propertyCondition,
      job_type: reminder.jobType,
      job_frequency: reminder.jobFrequency,
      service_details: reminder.serviceDetails ?? {},
      assigned_staff_id: reminder.assignedStaffId,
      scheduled_date: reminder.nextDueDate,
      recurring_parent_id: reminder.id,
      status: "accepted",
    });

    setCreatingId(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
        Recurring cleans due ({reminders.length})
      </p>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="glass-surface spotlight-border mt-3 divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
        {reminders.map((reminder) => {
          const due = formatDue(reminder.nextDueDate);
          return (
            <li
              key={reminder.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {reminder.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-700/50">
                  {reminder.serviceType ?? "Recurring clean"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    due.urgent
                      ? "bg-amber-50 text-amber-700"
                      : "bg-ink-900/5 text-ink-700/60"
                  }`}
                >
                  {due.label}
                </span>
                <button
                  type="button"
                  onClick={() => createNext(reminder)}
                  disabled={creatingId === reminder.id}
                  className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {creatingId === reminder.id
                    ? "Creating…"
                    : "Create next booking"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-700/50">
        Nothing books itself — this just flags when a recurring customer is
        due, so you can create their next visit in one click.
      </p>
    </div>
  );
}
