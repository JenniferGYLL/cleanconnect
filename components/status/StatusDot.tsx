// DOT's own status language: a small mark + a plain-language label, never
// a green/red/yellow pill. "Flagged" is a filled signal dot (something
// needs a look), "resolved" is the same dot hollowed out into a ring
// (the issue is still on record, but closed), "good" is a small neutral
// ink dot (a quiet positive, not an alert). Deliberately typographic and
// restrained rather than color-coded.
export type Status = "flagged" | "resolved" | "good";

const CONFIG: Record<Status, { label: string; textClass: string }> = {
  flagged: { label: "Needs attention", textClass: "text-ink-900" },
  resolved: { label: "Resolved", textClass: "text-ink-700/60" },
  good: { label: "Good", textClass: "text-ink-700/70" },
};

export function StatusDot({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  const config = CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.textClass} ${className ?? ""}`}
    >
      {status === "resolved" ? (
        <span
          aria-hidden
          className="h-[7px] w-[7px] shrink-0 rounded-full border-[1.4px] border-brand-500"
        />
      ) : status === "flagged" ? (
        <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-brand-500" />
      ) : (
        <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-ink-700/50" />
      )}
      {label ?? config.label}
    </span>
  );
}
