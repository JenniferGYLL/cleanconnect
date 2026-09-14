"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DotLogo } from "@/components/brand/DotLogo";

export function SiteNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-ink-900/8 bg-foam-50/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <DotLogo />
        </Link>

        <Link href="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    </motion.header>
  );
}
