"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export type PricingProfileForm = {
  min_job_charge: number;
  min_cleaners: number;
  labour_cost_per_hour: number;
  margin_target_percent: number;
  gst_included: boolean;
  travel_fee: number;
  addon_oven: number;
  addon_fridge: number;
  addon_windows: number;
  addon_carpet: number;
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
        min_job_charge: profile.min_job_charge,
        min_cleaners: profile.min_cleaners,
        labour_cost_per_hour: profile.labour_cost_per_hour,
        margin_target_percent: profile.margin_target_percent,
        gst_included: profile.gst_included,
        travel_fee: profile.travel_fee,
        addon_oven: profile.addon_oven,
        addon_fridge: profile.addon_fridge,
        addon_windows: profile.addon_windows,
        addon_carpet: profile.addon_carpet,
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
        AI quote settings
      </h3>
      <p className="mt-1 max-w-lg text-xs text-ink-700/50">
        These numbers are what let the AI suggest a real, profitable price
        instead of guessing — your labour cost stays private and is never
        shown to customers.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Minimum job charge ($)"
          value={profile.min_job_charge}
          onChange={(v) => updateNumber("min_job_charge", v)}
        />
        <Field
          label="Minimum cleaners per job"
          value={profile.min_cleaners}
          min="1"
          onChange={(v) => updateNumber("min_cleaners", v)}
        />
        <Field
          label="Your labour cost ($/hour, per cleaner)"
          value={profile.labour_cost_per_hour}
          onChange={(v) => updateNumber("labour_cost_per_hour", v)}
        />
        <Field
          label="Target profit margin (%)"
          value={profile.margin_target_percent}
          onChange={(v) => updateNumber("margin_target_percent", v)}
        />
        <Field
          label="Travel / call-out fee ($)"
          value={profile.travel_fee}
          onChange={(v) => updateNumber("travel_fee", v)}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-ink-800">
        <input
          type="checkbox"
          checked={profile.gst_included}
          onChange={(e) => update("gst_included", e.target.checked)}
          className="h-4 w-4 rounded border-ink-900/20"
        />
        Add 10% GST to quotes
      </label>

      <div className="mt-6 border-t border-ink-900/10 pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-700/50">
          Add-ons
        </h4>
        <p className="mt-1 text-xs text-ink-700/50">
          Set a price to offer an add-on in quotes — leave at $0 to hide it.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Oven clean ($)"
            value={profile.addon_oven}
            onChange={(v) => updateNumber("addon_oven", v)}
          />
          <Field
            label="Fridge clean ($)"
            value={profile.addon_fridge}
            onChange={(v) => updateNumber("addon_fridge", v)}
          />
          <Field
            label="Window clean ($)"
            value={profile.addon_windows}
            onChange={(v) => updateNumber("addon_windows", v)}
          />
          <Field
            label="Carpet clean ($)"
            value={profile.addon_carpet}
            onChange={(v) => updateNumber("addon_carpet", v)}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              Custom add-on name
            </span>
            <input
              value={profile.addon_other_label}
              onChange={(e) => update("addon_other_label", e.target.value)}
              placeholder="e.g. Balcony clean"
              className="input text-sm"
            />
          </label>
          <Field
            label="Custom add-on price ($)"
            value={profile.addon_other_price}
            onChange={(v) => updateNumber("addon_other_price", v)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary mt-6 px-6 py-2 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save quote settings"}
      </button>
    </SpotlightCard>
  );
}

function Field({
  label,
  value,
  onChange,
  min = "0",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700/70">
        {label}
      </span>
      <input
        type="number"
        min={min}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-sm"
      />
    </label>
  );
}
