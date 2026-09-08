"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoutButton from "@/app/dashboard/LogoutButton";
import { NotificationOptIn } from "@/components/notifications/NotificationOptIn";

export function CustomerNav({
  customerName,
  email,
}: {
  customerName: string;
  email: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = customerName.trim().charAt(0).toUpperCase() || "C";

  return (
    <header className="sticky top-4 z-40 mx-auto mb-10 w-full max-w-3xl px-4">
      <div className="glass-surface spotlight-border flex items-center justify-between gap-4 rounded-full px-3 py-2">
        <Link
          href="/my-bookings"
          className="shrink-0 pl-2 font-display text-sm font-semibold text-ink-900"
        >
          CleanConnect
        </Link>

        <Link
          href="/browse"
          className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 sm:block"
        >
          Browse companies
        </Link>

        <div className="hidden shrink-0 items-center gap-3 pr-1 sm:flex">
          <NotificationOptIn />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white transition hover:bg-brand-600"
            aria-label="Account menu"
          >
            {initial}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <button
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="glass-surface absolute right-0 top-11 z-50 w-56 rounded-2xl p-2 text-sm"
                >
                  <div className="border-b border-ink-900/5 px-3 py-2">
                    <p className="truncate font-medium text-ink-900">
                      {customerName}
                    </p>
                    <p className="truncate text-xs text-ink-700/60">{email}</p>
                  </div>
                  <Link
                    href="/browse"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-ink-800 hover:bg-white/70 sm:hidden"
                  >
                    Browse companies
                  </Link>
                  <div className="px-3 py-2 text-xs text-ink-700/60 sm:hidden">
                    <NotificationOptIn />
                  </div>
                  <div className="mt-1 border-t border-ink-900/5 px-3 py-2">
                    <LogoutButton />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
