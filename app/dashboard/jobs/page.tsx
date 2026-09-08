import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { JobsBoard, type JobLead, type StaffOption } from "@/components/dashboard/JobsBoard";
import {
  RecurringReminders,
  type RecurringReminder,
} from "@/components/dashboard/RecurringReminders";
import {
  getRecurrenceKey,
  nextOccurrenceDate,
  toDateInputValue,
} from "@/lib/quoting/recurrence";

const REMINDER_WINDOW_DAYS = 3;

export default async function JobsPage() {
  const { supabase, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const [{ data: jobs }, { data: staff }, { data: completedRecurring }, { data: renewedRows }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*, customers(full_name)")
        .eq("company_id", company.id)
        .in("status", ["accepted", "in_progress"])
        .order("scheduled_date", { ascending: true, nullsFirst: true }),
      supabase
        .from("staff")
        .select("id, full_name, active")
        .eq("company_id", company.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("leads")
        .select("*, customers(full_name)")
        .eq("company_id", company.id)
        .eq("status", "completed")
        .eq("job_frequency", "recurring")
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("recurring_parent_id")
        .eq("company_id", company.id)
        .not("recurring_parent_id", "is", null),
    ]);

  // A completed recurring job only counts as "due for renewal" once —
  // as soon as a follow-up lead points back to it (recurring_parent_id),
  // it's been actioned and drops out permanently.
  const renewedIds = new Set(
    (renewedRows ?? []).map((r) => r.recurring_parent_id as string)
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + REMINDER_WINDOW_DAYS);

  const reminders: RecurringReminder[] = [];
  for (const lead of completedRecurring ?? []) {
    if (renewedIds.has(lead.id)) continue;

    const recurrenceKey = getRecurrenceKey(lead.service_details);
    if (!recurrenceKey) continue;

    const fromDate = lead.scheduled_date
      ? new Date(`${lead.scheduled_date}T00:00:00`)
      : new Date(lead.created_at);
    const nextDate = nextOccurrenceDate(fromDate, recurrenceKey);
    if (!nextDate || nextDate > cutoff) continue;

    reminders.push({
      id: lead.id,
      companyId: company.id,
      customerId: lead.customer_id,
      customerName: lead.customer_name,
      customerContact: lead.customer_contact,
      message: lead.message,
      serviceType: lead.service_type,
      category: lead.category,
      bedrooms: lead.bedrooms,
      bathrooms: lead.bathrooms,
      propertyCondition: lead.property_condition,
      jobType: lead.job_type,
      jobFrequency: lead.job_frequency,
      serviceDetails: lead.service_details,
      assignedStaffId: lead.assigned_staff_id,
      nextDueDate: toDateInputValue(nextDate),
      displayName:
        lead.customers?.full_name ?? lead.customer_name ?? "Customer",
    });
  }
  reminders.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="jobs"
          companyName={company.company_name}
          email={company.email}
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Jobs
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              Scheduling, in one simple list
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Every accepted job, grouped by day — set a date and assign a
              cleaner. Mark a job complete from its card on the Leads tab.
            </p>
          </FadeIn>

          {reminders.length > 0 && (
            <div className="mt-8">
              <RecurringReminders reminders={reminders} />
            </div>
          )}

          <div className="mt-8">
            <JobsBoard
              jobs={(jobs ?? []) as JobLead[]}
              staff={(staff ?? []) as StaffOption[]}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
