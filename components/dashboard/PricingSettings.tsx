"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

type Category = "residential" | "commercial" | "garden";

type Rule = {
  base_rate: number;
  size_multiplier: number;
  frequency_discount_percent: number;
};

const CATEGORIES: { key: Category; label: string; hint: string }[] = [
  {
    key: "residential",
    label: "Residential / Personal",
    hint: "Homes, apartments, one-off or regular",
  },
  {
    key: "commercial",
    label: "Commercial / Office",
    hint: "Offices, retail, end-of-lease",
  },
  {
    key: "garden",
    label: "Garden / Outdoor",
    hint: "Yards, exteriors, windows",
  },
];

export function PricingSettings({
  companyId,
  initialRules,
}: {
  companyId: string;
  initialRules: Record<Category, Rule>;
}) {
  const [rules, setRules] = useState(initialRules);
  const [savingKey, setSavingKey] = useState<Category | null>(null);
  const [savedKey, setSavedKey] = useState<Category | null>(null);

  function update(category: Category, field: keyof Rule, value: string) {
    const numeric = value === "" ? 0 : Number(value);
    setRules((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: numeric },
    }));
    setSavedKey(null);
  }

  async function save(category: Category) {
    setSavingKey(category);
    const supabase = createClient();
    const rule = rules[category];

    const { error } = await supabase.from("pricing_rules").upsert(
      {
        company_id: companyId,
        category,
        base_rate: rule.base_rate,
        size_multiplier: rule.size_multiplier,
        frequency_discount_percent: rule.frequency_discount_percent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,category" }
    );

    setSavingKey(null);

    if (!error) {
      setSavedKey(category);
      setTimeout(() => setSavedKey(null), 2500);
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const rule = rules[cat.key];
        return (
          <SpotlightCard key={cat.key} className="rounded-2xl p-5">
            <h3 className="font-display text-sm font-semibold text-ink-900">
              {cat.label}
            </h3>
            <p className="mt-1 text-xs text-ink-700/50">{cat.hint}</p>

            <div className="mt-4 space-y-3">
              <Field
                label="Base rate ($)"
                value={rule.base_rate}
                onChange={(v) => update(cat.key, "base_rate", v)}
              />
              <Field
                label="Size multiplier (per room/100sqm)"
                value={rule.size_multiplier}
                step="0.1"
                onChange={(v) => update(cat.key, "size_multiplier", v)}
              />
              <Field
                label="Recurring discount (%)"
                value={rule.frequency_discount_percent}
                onChange={(v) =>
                  update(cat.key, "frequency_discount_percent", v)
                }
              />
            </div>

            <button
              type="button"
              onClick={() => save(cat.key)}
              disabled={savingKey === cat.key}
              className="btn-ghost mt-4 w-full py-2 text-xs disabled:opacity-60"
            >
              {savingKey === cat.key
                ? "Saving…"
                : savedKey === cat.key
                  ? "Saved ✓"
                  : "Save"}
            </button>
          </SpotlightCard>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700/70">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-sm"
      />
    </label>
  );
}
