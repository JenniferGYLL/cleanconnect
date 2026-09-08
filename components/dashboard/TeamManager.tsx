"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  active: boolean;
  invited_at: string;
};

export function TeamManager({ initialStaff }: { initialStaff: StaffRow[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviting(true);

    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email }),
    });
    const body = await res.json();

    setInviting(false);

    if (!res.ok) {
      setError(body.error ?? "Couldn't send the invite.");
      return;
    }

    setStaff((prev) => [body.staff as StaffRow, ...prev]);
    setFullName("");
    setEmail("");
  }

  async function toggleActive(member: StaffRow) {
    setTogglingId(member.id);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("staff")
      .update({ active: !member.active })
      .eq("id", member.id);

    setTogglingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, active: !s.active } : s))
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass-surface spotlight-border rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Invite a cleaner
        </p>
        <p className="mt-1 text-sm text-ink-700/60">
          They&apos;ll get an email with a secure link to set their own
          password and sign in — same as your own login.
        </p>
        <form
          onSubmit={handleInvite}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-ink-800">
              Full name
            </span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="e.g. Maria Santos"
            />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-ink-800">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="maria@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={inviting}
            className="btn-primary shrink-0 px-6 py-2.5 disabled:opacity-60"
          >
            {inviting ? "Sending…" : "Send invite"}
          </button>
        </form>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Your team ({staff.length})
        </p>
        {staff.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
            No cleaners invited yet — add your first one above.
          </div>
        ) : (
          <ul className="glass-surface mt-3 divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {member.full_name}
                  </p>
                  <p className="truncate text-xs text-ink-700/50">
                    {member.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.active
                        ? "bg-brand-50 text-brand-700"
                        : "bg-ink-900/5 text-ink-700/50"
                    }`}
                  >
                    {member.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(member)}
                    disabled={togglingId === member.id}
                    className="rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-ink-900/30 disabled:opacity-60"
                  >
                    {member.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-700/50">
          Deactivating someone stops them appearing as an option when you
          assign new jobs — it doesn&apos;t remove their account or job
          history.
        </p>
      </div>
    </div>
  );
}
