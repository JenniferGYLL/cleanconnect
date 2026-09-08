// Recurring-cleaning renewal reminders. Deliberately NOT a background job
// that silently creates bookings — a customer's recurring arrangement
// should never quietly multiply without a person choosing that. This
// just computes "when is the next clean due" so the dashboard can prompt
// the company to create it with one click.

const INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  fortnightly: 14,
};

// Both residential ("frequency") and commercial ("cleaning_frequency")
// answers use the same value set, just under a different key.
export function getRecurrenceKey(
  serviceDetails: Record<string, unknown> | null | undefined
): string | null {
  if (!serviceDetails) return null;
  const value = (serviceDetails.frequency ??
    serviceDetails.cleaning_frequency) as string | undefined;
  if (!value) return null;
  if (!(value in INTERVAL_DAYS) && value !== "monthly") return null;
  return value;
}

// Returns null for "custom"/"other"/"one_off" — those don't have a
// well-defined interval to schedule automatically.
export function nextOccurrenceDate(from: Date, intervalKey: string): Date | null {
  const next = new Date(from);
  if (intervalKey === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  const days = INTERVAL_DAYS[intervalKey];
  if (!days) return null;
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
