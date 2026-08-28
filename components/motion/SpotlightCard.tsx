"use client";

import type { ReactNode, MouseEvent } from "react";

export function SpotlightCard({
  children,
  className = "",
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`spotlight-border ${
        dark ? "glass-surface-dark" : "glass-surface"
      } ${className}`}
    >
      {children}
    </div>
  );
}
