export function WaveDivider({
  flip = false,
  className = "",
  fill = "#f4faf8",
}: {
  flip?: boolean;
  className?: string;
  fill?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none ${
        flip ? "rotate-180" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="h-[60px] w-full sm:h-[90px]"
      >
        <path
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,88 1440,40 L1440,90 L0,90 Z"
          fill={fill}
      />
      </svg>
    </div>
  );
}
