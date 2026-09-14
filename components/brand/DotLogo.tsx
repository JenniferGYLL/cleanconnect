import { DotMark } from "./DotMark";

// Mark + wordmark lockup. The wordmark is set in the mono face at a wide,
// deliberate tracking — a small technical/precise counterpoint to the
// editorial display serif used for headlines, so the brand mark itself
// reads as an instrument, not a headline.
export function DotLogo({
  theme = "light",
  size = "md",
  className,
}: {
  theme?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}) {
  const markSize = size === "sm" ? 20 : 24;
  const textClass = size === "sm" ? "text-xs" : "text-sm";
  const textColor = theme === "dark" ? "text-foam-50" : "text-ink-900";

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <DotMark size={markSize} theme={theme} />
      <span
        className={`font-mono ${textClass} font-medium uppercase tracking-[0.2em] ${textColor}`}
      >
        Dot
      </span>
    </span>
  );
}
