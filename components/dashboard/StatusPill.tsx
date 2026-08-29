const STYLES: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  accepted: "bg-brand-50 text-brand-700",
  in_progress: "bg-accent-500/10 text-accent-700",
  completed: "bg-ink-900/5 text-ink-700",
  declined: "bg-red-50 text-red-600",
};

const LABELS: Record<string, string> = {
  requested: "New enquiry",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[status] ?? "bg-ink-900/5 text-ink-700"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
