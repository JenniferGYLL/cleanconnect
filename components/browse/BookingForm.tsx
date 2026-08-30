"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Category = "residential" | "commercial" | "garden";
type Condition = "light" | "moderate" | "heavy";
type JobType = "standard" | "deep" | "end_of_lease";
type Frequency = "one_off" | "recurring";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "residential", label: "Residential / Personal" },
  { key: "commercial", label: "Commercial / Office" },
  { key: "garden", label: "Garden / Outdoor" },
];

const JOB_TYPES: { key: JobType; label: string }[] = [
  { key: "standard", label: "Standard clean" },
  { key: "deep", label: "Deep clean" },
  { key: "end_of_lease", label: "End-of-lease clean" },
];

const CONDITIONS: { key: Condition; label: string }[] = [
  { key: "light", label: "Light — regularly maintained" },
  { key: "moderate", label: "Moderate — average wear" },
  { key: "heavy", label: "Heavy — hasn't been cleaned in a while" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  residential: "Residential",
  commercial: "Commercial",
  garden: "Garden",
};

const JOB_TYPE_LABEL: Record<JobType, string> = {
  standard: "Standard clean",
  deep: "Deep clean",
  end_of_lease: "End-of-lease clean",
};

export function BookingForm({
  companyId,
  customerId,
}: {
  companyId: string;
  customerId: string | null;
}) {
  const [category, setCategory] = useState<Category>("residential");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [jobType, setJobType] = useState<JobType>("standard");
  const [frequency, setFrequency] = useState<Frequency>("one_off");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!customerId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/signup/customer" className="font-medium text-brand-600">
          create a customer account
        </Link>{" "}
        to request a booking.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center text-sm text-brand-700">
        Request sent — track it from{" "}
        <Link href="/my-bookings" className="font-semibold underline">
          My bookings
        </Link>
        .
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const serviceType = `${CATEGORY_LABEL[category]} · ${JOB_TYPE_LABEL[jobType]}${
      frequency === "recurring" ? " · Recurring" : ""
    }`;

    const supabase = createClient();
    const { error: insertError } = await supabase.from("leads").insert({
      company_id: companyId,
      customer_id: customerId,
      service_type: serviceType,
      category,
      bedrooms: bedrooms === "" ? null : Number(bedrooms),
      bathrooms: bathrooms === "" ? null : Number(bathrooms),
      property_condition: condition === "" ? null : condition,
      job_type: jobType,
      job_frequency: frequency,
      customer_contact: address,
      message,
      status: "requested",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          What type of clean?
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="input"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Bedrooms
          </span>
          <input
            type="number"
            min="0"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="input"
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Bathrooms
          </span>
          <input
            type="number"
            min="0"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            className="input"
            placeholder="Optional"
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Leave blank if this doesn&apos;t apply — the company will follow up
        for details.
      </p>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          How would you describe the property&apos;s current condition?
        </span>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as Condition | "")}
          className="input"
        >
          <option value="">Not sure</option>
          {CONDITIONS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Type of job
          </span>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value as JobType)}
            className="input"
          >
            {JOB_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Frequency
          </span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="input"
          >
            <option value="one_off">One-off</option>
            <option value="recurring">Recurring</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </span>
        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Anything else the company should know? (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input"
          rows={3}
          placeholder="e.g. please include the oven, key is with the neighbour…"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5"
      >
        {loading ? "Sending…" : "Request a booking"}
      </button>
    </form>
  );
}
