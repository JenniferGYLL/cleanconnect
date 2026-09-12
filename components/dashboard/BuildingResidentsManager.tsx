"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ResidentRow = {
  id: string;
  email: string;
  customer_id: string | null;
  full_name: string | null;
  created_at: string;
};

export function BuildingResidentsManager({
  buildingId,
  initialResidents,
}: {
  buildingId: string;
  initialResidents: ResidentRow[];
}) {
  const [residents, setResidents] = useState(initialResidents);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);

    const res = await fetch("/api/buildings/residents/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId, email }),
    });
    const body = await res.json();

    setAdding(false);

    if (!res.ok) {
      setError(body.error ?? "Couldn't add that resident.");
      return;
    }

    setResidents((prev) => [body.resident as ResidentRow, ...prev]);
    setEmail("");
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("building_residents")
      .delete()
      .eq("id", id);

    setRemovingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setResidents((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="glass-surface spotlight-border rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Add a resident
        </p>
        <p className="mt-1 text-sm text-ink-700/60">
          Enter their email. If they already have an account it links
          instantly — otherwise their building is waiting the moment they
          sign up with this same address.
        </p>
        <form
          onSubmit={handleAdd}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="block flex-1">
            <span className="mb-1 block text-sm font-medium text-ink-800">
              Resident email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="resident@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={adding}
            className="btn-primary shrink-0 px-6 py-2.5 disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add resident"}
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
          Residents ({residents.length})
        </p>
        {residents.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
            No residents added yet — add the first one above.
          </div>
        ) : (
          <ul className="glass-surface mt-3 divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
            {residents.map((resident) => (
              <li
                key={resident.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {resident.full_name ?? resident.email}
                  </p>
                  {resident.full_name && (
                    <p className="truncate text-xs text-ink-700/50">
                      {resident.email}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      resident.customer_id
                        ? "bg-brand-50 text-brand-700"
                        : "bg-ink-900/5 text-ink-700/50"
                    }`}
                  >
                    {resident.customer_id ? "Active" : "Pending signup"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(resident.id)}
                    disabled={removingId === resident.id}
                    className="rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-ink-900/30 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
