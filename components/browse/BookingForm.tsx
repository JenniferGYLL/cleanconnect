"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  CATEGORY_FIELDS,
  photosStronglyEncouraged,
  describeAnswers,
  type Category,
  type Answers,
  type FieldDef,
} from "@/lib/quoting/categories";
import { parseVoiceTranscript } from "@/lib/quoting/voiceParse";

const MAX_PHOTOS = 6;
const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
) as Record<Category, string>;

// --- Backward-compatible mapping onto the existing fixed leads columns ---
// Residential and commercial keep writing bedrooms/bathrooms/
// property_condition/job_type/job_frequency exactly as before, derived
// from the new, richer answers — so the existing AI-quote formula for
// residential jobs, and every existing dashboard query, keep working
// completely unchanged. Every category (including residential) also
// writes the full structured answers to service_details.
function parseCountValue(value: unknown): number | null {
  if (typeof value !== "string" || value === "") return null;
  const n = parseInt(value.replace("+", ""), 10);
  return Number.isNaN(n) ? null : n;
}

function mapResidentialJobType(cleaningType: unknown): string | null {
  switch (cleaningType) {
    case "end_of_lease":
      return "end_of_lease";
    case "deep":
    case "move_in":
    case "move_out":
      return "deep";
    case "regular":
      return "standard";
    default:
      return "standard";
  }
}

function mapFrequencyToOneOffOrRecurring(frequency: unknown): string {
  if (frequency === undefined || frequency === "one_off") return "one_off";
  return "recurring";
}

function buildServiceTypeLabel(category: Category, answers: Answers): string {
  const label = CATEGORY_LABEL[category];
  const lines = describeAnswers(category, answers);
  return lines[0] ? `${label} · ${lines[0].value}` : label;
}

function FieldControl({
  field,
  answers,
  onChange,
}: {
  field: FieldDef;
  answers: Answers;
  onChange: (key: string, value: Answers[string]) => void;
}) {
  if (field.showIf && !field.showIf(answers)) return null;
  const value = answers[field.key];

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {field.label}
        </span>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value || undefined)}
          className="input"
        >
          <option value="">Not sure</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {field.label}
        </span>
        <input
          type="number"
          min="0"
          value={value === undefined ? "" : (value as number | string)}
          onChange={(e) =>
            onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="input"
          placeholder={field.placeholder ?? "Optional"}
        />
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked ? true : undefined)}
        />
        {field.label}
      </label>
    );
  }

  // multiselect
  const selected = Array.isArray(value) ? (value as string[]) : [];
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}
      </span>
      <div className="flex flex-wrap gap-2">
        {field.options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                const next = active
                  ? selected.filter((v) => v !== o.value)
                  : [...selected, o.value];
                onChange(field.key, next.length ? next : undefined);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingForm({
  companyId,
  customerId,
}: {
  companyId: string;
  customerId: string | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category>("residential");
  const [answers, setAnswers] = useState<Answers>({});
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionCtor);
  }, []);

  function updateAnswer(key: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function startVoice() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setVoiceTranscript(transcript);
      const parsed = parseVoiceTranscript(transcript);
      if (parsed.category) setCategory(parsed.category);
      setAnswers((prev) => ({ ...prev, ...parsed.answers }));
      setStep(2);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

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

    // Residential and commercial keep feeding the existing fixed columns
    // (so the current AI-quote formula and dashboard code keep working
    // unchanged); every category also gets its full structured answers
    // saved to service_details.
    let bedrooms: number | null = null;
    let bathrooms: number | null = null;
    let propertyCondition: string | null = null;
    let jobType: string | null = null;
    let jobFrequency = "one_off";

    if (category === "residential") {
      bedrooms = parseCountValue(answers.bedrooms);
      bathrooms = parseCountValue(answers.bathrooms);
      propertyCondition = (answers.condition as string) || null;
      jobType = mapResidentialJobType(answers.cleaning_type);
      jobFrequency = mapFrequencyToOneOffOrRecurring(answers.frequency);
    } else if (category === "commercial") {
      jobFrequency =
        answers.cleaning_frequency === undefined ||
        answers.cleaning_frequency === "one_off"
          ? "one_off"
          : "recurring";
    }

    const serviceType = buildServiceTypeLabel(category, answers);

    const { error: insertError } = await supabase.from("leads").insert({
      company_id: companyId,
      customer_id: customerId,
      service_type: serviceType,
      category,
      bedrooms,
      bathrooms,
      property_condition: propertyCondition,
      job_type: jobType,
      job_frequency: jobFrequency,
      customer_contact: address,
      message,
      request_photos: photoUrls,
      service_details: answers,
      status: "requested",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
  }

  const fields = CATEGORY_FIELDS[category];
  const encouragePhotos = photosStronglyEncouraged(category, answers);
  const answerLines = describeAnswers(category, answers);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <StepDot active={step >= 1} /> Type of clean
        <span className="text-slate-300">—</span>
        <StepDot active={step >= 2} /> Details
        <span className="text-slate-300">—</span>
        <StepDot active={step >= 3} /> Photos &amp; submit
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              What type of clean?
            </span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as Category);
                setAnswers({});
              }}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {voiceSupported && (
            <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3">
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                className={`w-full rounded-full py-2 text-xs font-medium transition ${
                  listening
                    ? "bg-red-500 text-white"
                    : "border border-brand-300 text-brand-700 hover:border-brand-500"
                }`}
              >
                {listening
                  ? "Listening… tap to stop"
                  : "🎤 Or just describe it out loud"}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                e.g. &ldquo;3 bedroom 2 bathroom apartment, needs a deep
                clean&rdquo; — we&apos;ll pre-fill what we can, you can still
                check and edit everything.
              </p>
              {voiceTranscript && (
                <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs text-slate-500">
                  We heard: &ldquo;{voiceTranscript}&rdquo;
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn-primary w-full py-2.5"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {voiceTranscript && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              From what you said: &ldquo;{voiceTranscript}&rdquo; — check the
              fields below and adjust anything that&apos;s not quite right.
            </p>
          )}
          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              Tell us what you need in the details box on the next step — the
              company will follow up on anything specific.
            </p>
          ) : (
            fields.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                answers={answers}
                onChange={updateAnswer}
              />
            ))
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-ghost flex-1 py-2.5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-primary flex-1 py-2.5"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {answerLines.length > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <p className="mb-1 font-medium text-slate-600">
                {CATEGORY_LABEL[category]}
              </p>
              {answerLines.map((line, i) => (
                <p key={i}>
                  {line.label}: {line.value}
                </p>
              ))}
            </div>
          )}

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
              Anything else the company should know?{" "}
              {category === "other" ? "" : "(optional)"}
            </span>
            <textarea
              required={category === "other"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input"
              rows={3}
              placeholder={
                category === "other"
                  ? "Since this doesn't fit a standard category, please describe what you need in as much detail as you can"
                  : "e.g. please include the oven, key is with the neighbour…"
              }
            />
          </label>

          <div className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Photos of the property (up to {MAX_PHOTOS})
            </span>
            <p className="mb-2 text-xs text-slate-400">
              {encouragePhotos
                ? "Strongly recommended for this type of job — a few photos help avoid surprises later, but it's still optional."
                : "Optional — a few photos help the company give you a more accurate quote."}
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-ghost flex-1 py-2.5"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !confirmed}
              className="btn-primary flex-1 py-2.5 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Request a booking"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function StepDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        active ? "bg-brand-500" : "bg-slate-200"
      }`}
    />
  );
}
