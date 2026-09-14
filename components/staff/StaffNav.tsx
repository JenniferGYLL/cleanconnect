"use client";

import Link from "next/link";
import LogoutButton from "@/app/dashboard/LogoutButton";
import { DotLogo } from "@/components/brand/DotLogo";

export function StaffNav({
  staffName,
  companyName,
}: {
  staffName: string;
  companyName: string;
}) {
  return (
    <header className="sticky top-4 z-40 mx-auto mb-8 w-full max-w-lg px-4">
      <div className="glass-surface spotlight-border flex items-center justify-between gap-3 rounded-xl px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <DotLogo size="sm" />
          <span className="h-4 w-px shrink-0 bg-ink-900/10" />
          <Link href="/staff" className="min-w-0 truncate text-sm font-medium text-ink-800">
            {staffName} <span className="text-ink-700/40">· {companyName}</span>
          </Link>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
