"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BuildingRow = {
  id: string;
  name: string;
  address: string;
  suburb: string | null;
  postcode: string | null;
  created_at: string;
};

export function BuildingsManager({
  orgId,
  initialBuildings,
}: {
  orgId: string;
  initialBuildings: BuildingRow[];
}) {
  const [buildings, setBuildings] = useState(initialBuildings);
  const [showForm, setShowForm] = useState(initialBuildings.length === 0);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("buildings")
      .insert({
        org_id: orgId,
        name,
        address,
        suburb: suburb || null,
        postcode: postcode || null,
      })
      .select("id, name, address, suburb, postcode, created_at")
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't add that building.");
      return;
    }

    setBuildings((prev) => [data as BuildingRow, ...prev]);
    setName("");
    setAddress("");
    setSuburb("");
    setPostcode("");
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Your buildings ({buildings.length})
        </p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add building
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-surface spotlight-border space-y-4 rounded-2xl p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink-800">
              Building name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Harbourfront Apartments"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink-800">
              Address
            </span>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
              placeholder="123 Example Street"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Suburb
              </span>
              <input
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Postcode
              </span>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="input"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6 py-2.5 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add building"}
            </button>
            {buildings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-700 hover:border-ink-900/30"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {buildings.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/40 p-8 text-center text-sm text-ink-700/60">
          No buildings yet — add your first one above.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {buildings.map((building) => (
            <li key={building.id}>
              <Link
                href={`/dashboard/buildings/${building.id}`}
                className="glass-surface block rounded-2xl p-5 transition hover:shadow-tint-sm"
              >
                <p className="font-display font-medium text-ink-900">
                  {building.name}
                </p>
                <p className="mt-1 text-sm text-ink-700/60">
                  {building.address}
                  {building.suburb ? `, ${building.suburb}` : ""}
                  {building.postcode ? ` ${building.postcode}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
