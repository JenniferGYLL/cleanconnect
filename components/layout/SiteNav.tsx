"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function SiteNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-ink-900/5 bg-foam-50/70 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-900"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="text-brand-600"
          >
            <path
              d="M12 2C8 8.5 5 12.2 5 15.5C5 19.6 8.13 22 12 22C15.87 22 19 19.6 19 15.5C19 12.2 16 8.5 12 2Z"
              fill="currentColor"
              fillOpacity="0.16"
            />
            <path
              d="M12 2C8 8.5 5 12.2 5 15.5C5 19.6 8.13 22 12 22C15.87 22 19 19.6 19 15.5C19 12.2 16 8.5 12 2Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <Link href="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    </motion.header>
  );
}
