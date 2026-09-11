"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

const STEP_LABELS = ["Type of clean", "Details", "Photos & review"];

type VoicePhase = "idle" | "listening" | "processing" | "done";
type PhotoStatus = "uploading" | "done" | "error";
type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: PhotoStatus;
  url?: string;
  error?: string;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
    // Fields whose options are plain counts ("1", "2", "3", "4+"...) get a
    // large +/- stepper instead of a native dropdown — faster to tap on
    // mobile and matches how a person actually thinks about "how many
    // bedrooms", without touching the underlying option values at all, so
    // every existing consumer of these answers (quoting, dashboards) keeps
    // working unchanged.
    const isCounter =
      field.options.length > 0 &&
      field.options.every((o) => /^\d+\+?$/.test(o.value));

    if (isCounter) {
      const currentValue = typeof value === "string" ? value : undefined;
      const idx = field.options.findIndex((o) => o.value === currentValue);
      const display = idx === -1 ? "—" : field.options[idx].label;

      const dec = () => {
        if (idx <= 0) {
          onChange(field.key, undefined);
          return;
        }
        onChange(field.key, field.options[idx - 1].value);
      };
      const inc = () => {
        if (idx === -1) {
          onChange(field.key, field.options[0].value);
          return;
        }
        if (idx < field.options.length - 1) {
          onChange(field.key, field.options[idx + 1].value);
        }
      };

      return (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">
            {field.label}
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={dec}
              disabled={idx === -1}
              aria-label={`Decrease ${field.label}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-900/15 text-lg font-medium text-ink-800 transition active:scale-90 disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center font-display text-lg font-semibold text-ink-900">
              {display}
            </span>
            <button
              type="button"
              onClick={inc}
              disabled={idx === field.options.length - 1}
              aria-label={`Increase ${field.label}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-900/15 text-lg font-medium text-ink-800 transition active:scale-90 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      );
    }

    return (
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-800">
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
        <span className="mb-1 block text-sm font-medium text-ink-800">
          {field.label}
        </span>
        <input
          type="number"
          inputMode="numeric"
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
      <label className="flex items-center gap-2 text-sm text-ink-800">
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
      <span className="mb-1 block text-sm font-medium text-ink-800">
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
              className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-900/15 text-ink-700 hover:border-ink-900/30"
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
  // Answers are kept per-category so switching "type of clean" and coming
  // back never loses what was already entered — no more restarting a
  // request just because you tapped the wrong property type first.
  const [answersByCategory, setAnswersByCategory] = useState<
    Record<Category, Answers>
  >(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.key, {}])) as Record<
      Category,
      Answers
    >
  );
  const answers = answersByCategory[category];
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionCtor);
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // ignore — component is unmounting anyway
      }
    };
  }, []);

  function updateAnswer(key: string, value: Answers[string]) {
    setAnswersByCategory((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  }

  function startVoice() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    setVoiceError(null);
    setVoiceTranscript("");
    setVoiceInterim("");
    // Flip the UI to "listening" immediately, before the browser's async
    // recognition.start() has even resolved, so tapping the mic feels
    // instant instead of waiting on the speech engine to spin up.
    setVoicePhase("listening");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-AU";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Fires as soon as the browser detects the person has stopped talking —
    // there's usually a beat between that and the final transcript coming
    // back, so we surface it as its own "processing" state instead of
    // leaving the mic looking stuck on "Listening".
    recognition.onspeechend = () => {
      setVoicePhase((prev) => (prev === "listening" ? "processing" : prev));
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript as string;
        if (event.results[i].isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }
      if (interimText) setVoiceInterim(interimText);
      if (finalText) {
        setVoiceInterim("");
        setVoiceTranscript(finalText);
        const parsed = parseVoiceTranscript(finalText);
        const targetCategory = parsed.category ?? category;
        if (parsed.category) setCategory(parsed.category);
        setAnswersByCategory((prev) => ({
          ...prev,
          [targetCategory]: { ...prev[targetCategory], ...parsed.answers },
        }));
        setVoicePhase("done");
      }
    };

    recognition.onerror = (event: any) => {
      setVoicePhase("idle");
      setVoiceInterim("");
      const code = event?.error;
      if (code === "no-speech") {
        setVoiceError("We didn't catch that — tap the mic and try again.");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError(
          "Microphone access is blocked — allow it in your browser's site settings, or just fill in the details below."
        );
      } else if (code === "audio-capture") {
        setVoiceError("No microphone found — you can fill in the details below instead.");
      } else {
        setVoiceError(
          "Voice input isn't available right now — you can fill in the details below instead."
        );
      }
    };

    recognition.onend = () => {
      setVoicePhase((prev) => (prev === "listening" || prev === "processing" ? "idle" : prev));
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoicePhase("idle");
      setVoiceError("Couldn't start voice input — you can fill in the details below instead.");
    }
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setVoicePhase("idle");
    setVoiceInterim("");
  }

  function retryVoice() {
    setVoicePhase("idle");
    setVoiceTranscript("");
    setVoiceInterim("");
    setVoiceError(null);
  }

  async function uploadPhotoItem(item: PhotoItem) {
    if (!customerId) return;
    const supabase = createClient();
    const ext = item.file.name.split(".").pop() ?? "jpg";
    const path = `${customerId}/${Date.now()}-${item.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("lead-photos")
      .upload(path, item.file);

    if (uploadError) {
      setPhotoItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: "error", error: uploadError.message } : p
        )
      );
      return;
    }

    const { data } = supabase.storage.from("lead-photos").getPublicUrl(path);
    setPhotoItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, status: "done", url: data.publicUrl } : p))
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photoItems.length;
    if (room <= 0) return;
    const incoming = Array.from(files).slice(0, room);
    const newItems: PhotoItem[] = incoming.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }));
    // Preview + upload starts the instant a photo is picked — the page
    // never waits for this, and each thumbnail tracks its own progress.
    setPhotoItems((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => {
      void uploadPhotoItem(item);
    });
  }

  function removePhoto(id: string) {
    setPhotoItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function retryPhoto(id: string) {
    const item = photoItems.find((p) => p.id === id);
    if (!item) return;
    setPhotoItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "uploading", error: undefined } : p))
    );
    void uploadPhotoItem({ ...item, status: "uploading", error: undefined });
  }

  // Both the camera and the library input are reset to an empty value
  // right before opening, and again right after a selection is handled.
  // That's the fix for the "+ sometimes does nothing" bug: browsers don't
  // fire another change event for the same file (or after a cancel) unless
  // the input's value has actually been cleared, and using an explicit
  // ref + .click() (instead of relying on a <label> wrapping the input)
  // guarantees every tap is a fresh user gesture that reliably reopens the
  // native picker.
  function openCamera() {
    setPhotoSheetOpen(false);
    const input = cameraInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }

  function openLibrary() {
    setPhotoSheetOpen(false);
    const input = libraryInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addPhotos(e.target.files);
    e.target.value = "";
  }

  if (!customerId) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-900/10 bg-white/70 p-6 text-center text-sm text-ink-700/60">
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
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center text-sm text-brand-700">
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

    // Photos already uploaded in the background as they were picked — this
    // just collects the URLs that finished successfully. Anything still
    // uploading blocks the submit button (see disabled= below) rather than
    // this function; anything that failed and wasn't retried is simply
    // left out, since photos are optional.
    const photoUrls = photoItems
      .filter((p) => p.status === "done" && p.url)
      .map((p) => p.url as string);

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
  const photosUploading = photoItems.some((p) => p.status === "uploading");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-ink-700/50">
          <span>
            Step {step} of 3 — {STEP_LABELS[step - 1]}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-900/10">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-800">
                What type of clean?
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const active = category === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm font-medium transition active:scale-[0.98] ${
                        active
                          ? "border-brand-600 bg-brand-600 text-white shadow-tint-sm"
                          : "border-ink-900/10 bg-white/70 text-ink-800 hover:border-ink-900/25"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {voiceSupported && (
              <div className="rounded-2xl border border-dashed border-brand-300/60 bg-brand-50/40 p-4">
                <button
                  type="button"
                  onClick={voicePhase === "listening" ? stopVoice : startVoice}
                  disabled={voicePhase === "processing" || voicePhase === "done"}
                  className={`relative flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium transition active:scale-[0.98] disabled:cursor-default ${
                    voicePhase === "listening"
                      ? "bg-red-500 text-white"
                      : voicePhase === "processing"
                      ? "bg-ink-900/10 text-ink-700"
                      : voicePhase === "done"
                      ? "bg-brand-600 text-white"
                      : "border border-brand-300 text-brand-700 hover:border-brand-500"
                  }`}
                >
                  {voicePhase === "listening" && (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                      Listening… tap to stop
                    </>
                  )}
                  {voicePhase === "processing" && (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-700/30 border-t-ink-700" />
                      Got it — one sec…
                    </>
                  )}
                  {voicePhase === "done" && <>✓ Got it</>}
                  {voicePhase === "idle" && <>🎤 Or just describe it out loud</>}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-ink-700/50">
                  e.g. &ldquo;3 bedroom 2 bathroom apartment, needs a deep
                  clean&rdquo; — we&apos;ll pre-fill what we can, you can still
                  check and edit everything.
                </p>

                {voicePhase === "listening" && voiceInterim && (
                  <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs italic text-ink-700/60">
                    &ldquo;{voiceInterim}&rdquo;
                  </p>
                )}

                {voiceError && (
                  <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
                    {voiceError}
                  </p>
                )}

                {voicePhase === "done" && (
                  <div className="mt-3 rounded-xl bg-white/80 p-3">
                    <p className="text-xs font-medium text-ink-800">
                      Here&apos;s what we understood:
                    </p>
                    <p className="mt-1 text-xs text-ink-700/60">
                      We heard: &ldquo;{voiceTranscript}&rdquo;
                    </p>
                    <div className="mt-2 rounded-lg bg-ink-900/[0.03] px-2.5 py-2 text-xs text-ink-700">
                      <p className="font-medium text-ink-800">
                        {CATEGORY_LABEL[category]}
                      </p>
                      {answerLines.length > 0 ? (
                        answerLines.map((line, i) => (
                          <p key={i} className="mt-0.5">
                            {line.label}: {line.value}
                          </p>
                        ))
                      ) : (
                        <p className="mt-0.5 text-ink-700/50">
                          We caught the type of clean — add the details on the
                          next step.
                        </p>
                      )}
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={retryVoice}
                        className="btn-ghost flex-1 py-2 text-xs"
                      >
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoicePhase("idle");
                          setStep(2);
                        }}
                        className="btn-primary flex-1 py-2 text-xs"
                      >
                        Looks good, continue
                      </button>
                    </div>
                  </div>
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
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            {voiceTranscript && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                From what you said: &ldquo;{voiceTranscript}&rdquo; — check the
                fields below and adjust anything that&apos;s not quite right.
              </p>
            )}
            {fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-900/10 bg-white/70 p-4 text-sm text-ink-700/60">
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
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="rounded-xl bg-ink-900/[0.03] px-3 py-2.5 text-xs text-ink-700/60">
              <p className="mb-1 font-medium text-ink-700/80">
                Review your request — {CATEGORY_LABEL[category]}
              </p>
              {answerLines.length > 0 ? (
                answerLines.map((line, i) => (
                  <p key={i}>
                    {line.label}: {line.value}
                  </p>
                ))
              ) : (
                <p>No extra details added — that&apos;s okay, the company can follow up.</p>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
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
              <span className="mb-1 block text-sm font-medium text-ink-800">
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
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Want to show the cleaner what needs attention? (up to {MAX_PHOTOS})
              </span>
              <p className="mb-2 text-xs text-ink-700/50">
                {encouragePhotos
                  ? "Strongly recommended for this type of job — a few photos help avoid surprises later, but it's still optional."
                  : "Optional — a few photos help the company give you a more accurate quote."}
              </p>
              <div className="flex flex-wrap gap-2">
                {photoItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-900/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt="Upload preview"
                      className="h-full w-full object-cover"
                    />
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      </div>
                    )}
                    {item.status === "error" && (
                      <button
                        type="button"
                        onClick={() => retryPhoto(item.id)}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-600/85 text-center text-[10px] font-medium leading-tight text-white"
                      >
                        Failed
                        <span className="underline">Retry</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(item.id)}
                      aria-label="Remove photo"
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white transition active:scale-90"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoItems.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => setPhotoSheetOpen(true)}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-ink-900/15 text-xs text-ink-700/40 transition active:scale-95 hover:border-ink-900/30 hover:text-ink-700/70"
                  >
                    + Add
                  </button>
                )}
              </div>
              {photosUploading && (
                <p className="mt-1.5 text-[11px] text-ink-700/40">
                  Uploading photo…
                </p>
              )}

              {/* Hidden inputs — always reset to an empty value right before
                  being opened and right after a selection, which is what
                  keeps the "+" button reliable on every tap, including
                  right after a cancel. */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                tabIndex={-1}
                className="hidden"
                onChange={handlePhotoInputChange}
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                multiple
                tabIndex={-1}
                className="hidden"
                onChange={handlePhotoInputChange}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-ink-700/60">
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
                disabled={loading || !confirmed || photosUploading}
                className="btn-primary flex-1 py-2.5 disabled:opacity-60"
              >
                {loading
                  ? "Sending…"
                  : photosUploading
                  ? "Uploading photo…"
                  : "Request Cleaning Quote"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera / library action sheet */}
      <AnimatePresence>
        {photoSheetOpen && (
          <>
            <motion.button
              aria-hidden
              tabIndex={-1}
              onClick={() => setPhotoSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 cursor-default bg-ink-950/30"
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="glass-surface fixed inset-x-4 bottom-4 z-50 rounded-2xl p-2 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-80 sm:-translate-x-1/2 sm:-translate-y-1/2"
            >
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                Add photos
              </p>
              <button
                type="button"
                onClick={openCamera}
                className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-ink-900 transition hover:bg-white/70 active:scale-[0.98]"
              >
                Take Photo
              </button>
              <button
                type="button"
                onClick={openLibrary}
                className="block w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-ink-900 transition hover:bg-white/70 active:scale-[0.98]"
              >
                Choose from Library
              </button>
              <div className="mt-1 border-t border-ink-900/5 pt-1">
                <button
                  type="button"
                  onClick={() => setPhotoSheetOpen(false)}
                  className="block w-full rounded-xl px-3 py-3 text-left text-sm text-ink-700/60 transition hover:bg-white/70 active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </form>
  );
}
