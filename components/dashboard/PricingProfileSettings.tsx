"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import type { PricingModel } from "@/lib/quoting/estimate";

export type PricingProfileForm = {
  pricing_model: PricingModel;
  hourly_rate: number;
  flat_job_rate: number;
  min_job_charge: number;
  gst_included: boolean;
  travel_fee: number;
  addon_oven: number;
  addon_fridge: number;
  addon_windows: number;
  addon_carpet: number;
  addon_high_access: number;
  addon_other_label: string;
  addon_other_price: number;
};

export function PricingProfileSettings({
  companyId,
  initialProfile,
}: {
  companyId: string;
  initialProfile: PricingProfileForm;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PricingProfileForm>(
    field: K,
    value: PricingProfileForm[K]
  ) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function updateNumber(field: keyof PricingProfileForm, value: string) {
    update(field, (value === "" ? 0 : Number(value)) as never);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("company_pricing_profiles").upsert(
      {
        company_id: companyId,
        pricing_model: profile.pricing_model,
        hourly_rate: profile.hourly_rate,
        flat_job_rate: profile.flat_job_rate,
        min_job_charge: profile.min_job_charge,
        gst_included: profile.gst_included,
        travel_fee: profile.travel_fee,
        addon_oven: profile.addon_oven,
        addon_fridge: profile.addon_fridge,
        addon_windows: profile.addon_windows,
        addon_carpet: profile.addon_carpet,
        addon_high_access: profile.addon_high_access,
        addon_other_label: profile.addon_other_label || null,
        addon_other_price: profile.addon_other_price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <SpotlightCard className="rounded-2xl p-6">
      <h3 className="font-display text-sm font-semibold text-ink-900">
        How you price your jobs
      </h3>
      <p className="mt-1 max-w-lg text-xs text-ink-700/50">
        Just tell us how you normally charge — the AI handles the rest
        (property size, condition, how many cleaners a job needs) in the
        background.
      </p>

      {/* Step 1 */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Step 1
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          How do you usually charge?
        </p>
        <div className="mt-2 flex gap-2">
          <ModeButton
            active={profile.pricing_model === "hourly"}
            onClick={() => update("pricing_model", "hourly")}
            label="Hourly"
          />
          <ModeButton
            active={profile.pricing_model === "per_job"}
            onClick={() => update("pricing_model", "per_job")}
            label="Per job"
          />
        </div>

        <div className="mt-3 max-w-xs">
          {profile.pricing_model === "hourly" ? (
            <Field
              label="Your usual rate ($ / cleaner / hour)"
              value={profile.hourly_rate}
              onChange={(v) => updateNumber("hourly_rate", v)}
              placeholder="e.g. 55"
            />
          ) : (
            <Field
              label="Your usual price for a standard job ($)"
              value={profile.flat_job_rate}
              onChange={(v) => updateNumber("flat_job_rate", v)}
              placeholder="e.g. 250"
            />
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Step 2
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          What&apos;s the minimum you&apos;d normally charge for a job?
        </p>
        <div className="mt-3 max-w-xs">
          <Field
            label="Minimum job charge ($)"
            value={profile.min_job_charge}
            onChange={(v) => updateNumber("min_job_charge", v)}
            placeholder="e.g. 250"
          />
        </div>
      </div>

      {/* Step 3 */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Step 3
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          Do you charge extra for any of these services?
        </p>
        <p className="mt-1 text-xs text-ink-700/50">
          Leave a price at $0 to leave it off quotes entirely.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Oven ($)"
            value={profile.addon_oven}
            onChange={(v) => updateNumber("addon_oven", v)}
          />
          <Field
            label="Windows ($)"
            value={profile.addon_windows}
            onChange={(v) => updateNumber("addon_windows", v)}
          />
          <Field
            label="Fridge ($)"
            value={profile.addon_fridge}
            onChange={(v) => updateNumber("addon_fridge", v)}
          />
          <Field
            label="Carpet ($)"
            value={profile.addon_carpet}
            onChange={(v) => updateNumber("addon_carpet", v)}
          />
          <Field
            label="High-access cleaning ($)"
            value={profile.addon_high_access}
            onChange={(v) => updateNumber("addon_high_access", v)}
          />
          <div />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              Another service (name)
            </span>
            <input
              value={profile.addon_other_label}
              onChange={(e) => update("addon_other_label", e.target.value)}
              placeholder="e.g. Balcony clean"
              className="input text-sm"
            />
          </label>
          <Field
            label="Price ($)"
            value={profile.addon_other_price}
            onChange={(v) => updateNumber("addon_other_price", v)}
          />
        </div>
      </div>

      {/* Optional extras */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-medium text-ink-700/70">
          A couple more billing details
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={profile.gst_included}
              onChange={(e) => update("gst_included", e.target.checked)}
              className="h-4 w-4 rounded border-ink-900/20"
            />
            I charge GST (10%)
          </label>
          <div className="w-40">
            <Field
              label="Travel / call-out fee ($)"
              value={profile.travel_fee}
              onChange={(v) => updateNumber("travel_fee", v)}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary mt-6 px-6 py-2 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save pricing"}
      </button>
    </SpotlightCard>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-ink-900/15 text-ink-700 hover:border-ink-900/30"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700/70">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        className="input text-sm"
      />
    </label>
  );
}
