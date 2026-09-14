"use client";

import { motion } from "framer-motion";

// The DOT background system: "dot -> line -> surface" drawn literally, but
// atmospherically — a sparse field of points, some joined by faint lines,
// that reveals itself slowly once on mount and then holds still. No loop,
// no parallax, nothing continuous: this is texture, not decoration.
//
// Node positions are a fixed, hand-placed constant (not Math.random at
// render time) so server and client render identically — a random field
// regenerated per-render would both thrash on every re-render and mismatch
// during hydration.
type Node = { x: number; y: number; r: number };

const NODES: Node[] = [
  { x: 6, y: 20, r: 0.5 },
  { x: 21, y: 8, r: 0.7 },
  { x: 34, y: 26, r: 0.45 },
  { x: 14, y: 44, r: 0.6 },
  { x: 47, y: 11, r: 0.45 },
  { x: 59, y: 34, r: 0.8 },
  { x: 43, y: 49, r: 0.5 },
  { x: 69, y: 19, r: 0.55 },
  { x: 79, y: 45, r: 0.65 },
  { x: 29, y: 63, r: 0.45 },
  { x: 63, y: 61, r: 0.55 },
  { x: 87, y: 10, r: 0.45 },
  { x: 93, y: 56, r: 0.6 },
  { x: 9, y: 71, r: 0.45 },
  { x: 51, y: 80, r: 0.5 },
  { x: 96, y: 30, r: 0.4 },
  { x: 76, y: 78, r: 0.5 },
];

function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const EDGES: [number, number][] = (() => {
  const edges: [number, number][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      if (dist(NODES[i], NODES[j]) < 21) edges.push([i, j]);
    }
  }
  return edges;
})();

// Every 5th node is drawn as the accent — a few small "signal" points in an
// otherwise neutral field, echoing the mark without repeating it.
const ACCENT_EVERY = 5;

export function DotField({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dotColor = tone === "dark" ? "rgba(245,244,240,0.45)" : "rgba(23,25,27,0.35)";
  const lineColor = tone === "dark" ? "rgba(245,244,240,0.12)" : "rgba(23,25,27,0.1)";
  const accentColor = "#c07a33";

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={`e-${a}-${b}`}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke={lineColor}
          strokeWidth={0.12}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 1.6,
            delay: 0.3 + i * 0.045,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
      {NODES.map((n, i) => (
        <motion.circle
          key={`n-${i}`}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={i % ACCENT_EVERY === 0 ? accentColor : dotColor}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
