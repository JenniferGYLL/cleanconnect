"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ServiceCategory } from "@/lib/buildings/categories";

export function SubmitServiceRecordForm({
  jobId,
  buildingId,
  category,
  jobType,
  contractorOrgId,
  submittedBy,
  contractorName,
  backHref,
}: {
  jobId: string;
  buildingId: string;
  category: ServiceCategory;
  jobType: "recurring" | "one_off";
  contractorOrgId: string | null;
  submittedBy: string | null;
  contractorName: string;
  backHref: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    const { data: record, error: insertError } = await supabase
      .from("service_records")
      .insert({
        job_id: jobId,
        building_id: buildingId,
        category,
        contractor_org_id: contractorOrgId,
        contractor_name: contractorName || null,
        submitted_by: submittedBy,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (insertError || !record) {
      setSubmitting(false);
      setError(insertError?.message ?? "Couldn't submit this job.");
      return;
    }

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${buildingId}/${record.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("service-record-photos")
        .upload(path, file);

      if (uploadError) {
        setSubmitting(false);
        setError(`Record saved, but a photo failed to upload: ${uploadError.message}`);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("service-record-photos")
        .getPublicUrl(path);

      await supabase.from("service_record_photos").insert({
        service_record_id: record.id,
        url: publicUrl.publicUrl,
      });
    }

    if (jobType === "one_off") {
      await supabase.from("jobs").update({ status: "completed" }).eq("id", jobId);
    }

    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="glass-surface spotlight-border rounded-2xl p-8 text-center">
        <p className="text-3xl">✓</p>
        <p className="mt-3 font-display text-lg font-semibold text-ink-900">
          Filed automatically
        </p>
        <p className="mt-1 text-sm text-ink-700/60">
          This visit is now in the building&apos;s history — nothing else to
          do.
        </p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="btn-primary mt-5 px-6 py-2.5"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <span className="mb-2 block text-sm font-medium text-ink-800">
          Photos
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative aspect-square overflow-hidden rounded-xl border border-ink-900/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-ink-900/20 text-2xl text-ink-700/40 hover:border-ink-900/40 hover:text-ink-700/70"
          >
            +
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-800">
          Notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
          placeholder="Anything worth flagging about this visit"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full py-3 text-base disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
