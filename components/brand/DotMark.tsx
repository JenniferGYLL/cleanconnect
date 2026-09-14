// The DOT mark: "Orbital Dot".
//
// Not a literal atom/planet/orbit-ring icon — three unevenly-sized points
// joined by straight connecting lines, with a faint triangular fill behind
// them. This is a direct, literal drawing of the brand idea stated in the
// brief: a dot connects to another dot; dots create lines; lines create a
// surface. Deliberately asymmetric (not a centered, equilateral glyph) so
// it reads as considered rather than a generated "network" stock icon.
export function DotMark({
  size = 24,
  theme = "light",
  className,
}: {
  size?: number;
  theme?: "light" | "dark";
  className?: string;
}) {
  // theme = "light": mark sits on a light/foam surface -> secondary
  // geometry drawn in ink.
  // theme = "dark": mark sits on ink/graphite -> secondary geometry drawn
  // in a soft off-white.
  const line = theme === "dark" ? "rgba(245,244,240,0.55)" : "rgba(23,25,27,0.55)";
  const secondaryFill = theme === "dark" ? "#f5f4f0" : "#17191b";
  const surfaceFill = "#c07a33";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <polygon
        points="13,13 24,9.5 20.5,23"
        fill={surfaceFill}
        fillOpacity={theme === "dark" ? 0.14 : 0.08}
      />
      <line x1="13" y1="13" x2="24" y2="9.5" stroke={line} strokeWidth="1" />
      <line x1="13" y1="13" x2="20.5" y2="23" stroke={line} strokeWidth="1" />
      <circle cx="20.5" cy="23" r="1.8" fill="none" stroke={secondaryFill} strokeWidth="1.3" />
      <circle cx="24" cy="9.5" r="2" fill={secondaryFill} />
      <circle cx="13" cy="13" r="4.2" fill={surfaceFill} />
    </svg>
  );
}
