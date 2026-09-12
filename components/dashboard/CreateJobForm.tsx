"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/buildings/categories";

export type ContractorOption = { id: string; company_name: string };

export function CreateJobForm({
  buildingId,
  contractors,
}: {
  buildingId: string;
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<ServiceCategory>("cleaning");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [jobType, setJobType] = useState<"recurring" | "one_off">("recurring");
  const [scheduleNote, setScheduleNote] = useState("");
  const [contractorOrgId, setContractorOrgId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<{ id: string; jobType: string } | null>(null);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("You've been signed out — please refresh and try again.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("jobs")
      .insert({
        building_id: buildingId,
        category,
        title,
        notes: notes || null,
        job_type: jobType,
        schedule_note: jobType === "recurring" ? scheduleNote || null : null,
        contractor_org_id: contractorOrgId || null,
        created_by: user.id,
      })
      .select("id, job_type")
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create that job.");
      return;
    }

    setCreatedJob({ id: data.id, jobType: data.job_type });
  }

  async function handleGenerateLink() {
    if (!createdJob) return;
    setGeneratingLink(true);
    setError(null);

    const res = await fetch("/api/buildings/jobs/one-off-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: createdJob.id }),
    });
    const body = await res.json();

    setGeneratingLink(false);

    if (!res.ok) {
      setError(body.error ?? "Couldn't generate a link.");
      return;
    }

    setLink(body);
  }

  if (createdJob) {
    return (
      <div className="glass-surface spotlight-border rounded-2xl p-6">
        <p className="font-display font-medium text-ink-900">Job created</p>
        <p className="mt-1 text-sm text-ink-700/60">
          It&apos;s now visible to any contractor you assigned, in their
          Service Jobs list.
        </p>

        {createdJob.jobType === "one_off" && (
          <div className="mt-5 border-t border-ink-900/5 pt-5">
            <p className="text-sm font-medium text-ink-800">
              No account for this contractor? Send a secure link instead.
            </p>
            <p className="mt-1 text-xs text-ink-700/50">
              They open it in any browser, add photos and notes, and submit
              — no sign-up, no app. The link expires in 14 days.
            </p>
            {!link ? (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-60"
              >
                {generatingLink ? "Generating…" : "Generate secure link"}
              </button>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={link.url}
                  className="input flex-1 text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(link.url);
                    setCopied(true);
                  }}
                  className="shrink-0 rounded-full border border-ink-900/15 px-4 py-2 text-xs font-medium text-ink-700 hover:border-ink-900/30"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push(`/dashboard/buildings/${buildingId}`)}
          className="mt-5 text-sm font-medium text-ink-900 underline underline-offset-2"
        >
          ← Back to building
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-surface spotlight-border space-y-5 rounded-2xl p-6"
    >
      <div>
        <span className="mb-2 block text-sm font-medium text-ink-800">
          Service category
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition ${
                category === cat.key
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-900/10 text-ink-700 hover:border-ink-900/30"
              }`}
            >
              <span className="block text-lg">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-800">
          Job title
        </span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Weekly common area clean"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-800">
          Notes for the contractor (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input"
        />
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium text-ink-800">
          Schedule
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setJobType("recurring")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              jobType === "recurring"
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-900/10 text-ink-700 hover:border-ink-900/30"
            }`}
          >
            Recurring
          </button>
          <button
            type="button"
            onClick={() => setJobType("one_off")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              jobType === "one_off"
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-900/10 text-ink-700 hover:border-ink-900/30"
            }`}
          >
            One-off
          </button>
        </div>
      </div>

      {jobType === "recurring" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-800">
            Schedule note (optional)
          </span>
          <input
            value={scheduleNote}
            onChange={(e) => setScheduleNote(e.target.value)}
            className="input"
            placeholder="e.g. Every Tuesday and Friday morning"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-800">
          Assign to a registered contractor (optional)
        </span>
        <select
          value={contractorOrgId}
          onChange={(e) => setContractorOrgId(e.target.value)}
          className="input"
        >
          <option value="">Unassigned{jobType === "one_off" ? " — send a secure link instead" : ""}</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create job"}
      </button>
    </form>
  );
}
