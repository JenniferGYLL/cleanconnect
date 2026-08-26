"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function SiteNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/70 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-slate-900"
        >
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <Link href="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    </motion.header>
  );
}
