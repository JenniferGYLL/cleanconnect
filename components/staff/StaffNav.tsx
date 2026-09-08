"use client";

import Link from "next/link";
import LogoutButton from "@/app/dashboard/LogoutButton";

export function StaffNav({
  staffName,
  companyName,
}: {
  staffName: string;
  companyName: string;
}) {
  return (
    <header className="sticky top-4 z-40 mx-auto mb-8 w-full max-w-lg px-4">
      <div className="glass-surface spotlight-border flex items-center justify-between gap-3 rounded-full px-4 py-2.5">
        <Link
          href="/staff"
          className="min-w-0 truncate font-display text-sm font-semibold text-ink-900"
        >
          {staffName} <span className="text-ink-700/40">· {companyName}</span>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
