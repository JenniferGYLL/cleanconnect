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

const MAX_PHOTOS = 6;

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handlePhotoSelect(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    if (incoming.length === 0) return;
    setPhotos((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
    setPhotoPreviews((prev) =>
      [...prev, ...incoming.map((f) => URL.createObjectURL(f))].slice(
        0,
        MAX_PHOTOS
      )
    );
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

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

    const supabase = createClient();

    // Photos upload to the customer's own folder first — the lead insert
    // just stores the resulting public URLs, so a failed upload doesn't
    // half-write a lead.
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${customerId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("lead-photos")
        .upload(path, file);
      if (uploadError) {
        setLoading(false);
        setError(`Couldn't upload a photo: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage.from("lead-photos").getPublicUrl(path);
      photoUrls.push(data.publicUrl);
    }

    const serviceType = `${CATEGORY_LABEL[category]} · ${JOB_TYPE_LABEL[jobType]}${
      frequency === "recurring" ? " · Recurring" : ""
    }`;

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
      request_photos: photoUrls,
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

      <div className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Photos of the property (optional, up to {MAX_PHOTOS})
        </span>
        <p className="mb-2 text-xs text-slate-400">
          A few photos help the company give you a more accurate quote.
        </p>
        <div className="flex flex-wrap gap-2">
          {photoPreviews.map((src, i) => (
            <div
              key={i}
              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Upload preview ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600">
              + Add
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoSelect(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I understand this gives me an estimate, not a final price — the
          company may follow up or ask to inspect the property before
          confirming.
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !confirmed}
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Request a booking"}
      </button>
    </form>
  );
}
