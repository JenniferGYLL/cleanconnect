"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { COMPANY_SERVICES } from "@/lib/company/services";

const MAX_PHOTOS = 8;

export type CompanyProfileForm = {
  logo_url: string | null;
  description: string;
  services: string[];
  photos: string[];
  abn: string;
  years_in_business: number | null;
  team_size: number | null;
};

export function CompanyProfileSettings({
  companyId,
  initialProfile,
}: {
  companyId: string;
  initialProfile: CompanyProfileForm;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof CompanyProfileForm>(
    field: K,
    value: CompanyProfileForm[K]
  ) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function toggleService(service: string) {
    setProfile((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
    setSaved(false);
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${companyId}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("company-media")
      .upload(path, file, { upsert: true });
    setUploadingLogo(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("company-media").getPublicUrl(path);
    update("logo_url", data.publicUrl);
  }

  async function uploadPhoto(file: File) {
    if (profile.photos.length >= MAX_PHOTOS) return;
    setUploadingPhoto(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${companyId}/photo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("company-media")
      .upload(path, file);
    setUploadingPhoto(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("company-media").getPublicUrl(path);
    update("photos", [...profile.photos, data.publicUrl]);
  }

  function removePhoto(index: number) {
    update(
      "photos",
      profile.photos.filter((_, i) => i !== index)
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        logo_url: profile.logo_url,
        description: profile.description.trim() || null,
        services: profile.services,
        photos: profile.photos,
        abn: profile.abn.trim() || null,
        years_in_business: profile.years_in_business,
        team_size: profile.team_size,
      })
      .eq("id", companyId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <SpotlightCard className="rounded-2xl p-6">
      <h3 className="font-display text-sm font-semibold text-ink-900">
        Your public profile
      </h3>
      <p className="mt-1 max-w-lg text-xs text-ink-700/50">
        This is what customers see before they request a booking. Everything
        here is optional — fill in what you have, add the rest later.
      </p>

      {/* Logo */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Logo
        </p>
        <div className="mt-2 flex items-center gap-4">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo(file);
            }}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-dashed border-ink-900/15 bg-white/60 text-xs text-ink-700/50 hover:border-ink-900/30 disabled:opacity-60"
          >
            {profile.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt="Company logo"
                className="h-full w-full object-cover"
              />
            ) : uploadingLogo ? (
              "…"
            ) : (
              "+ Logo"
            )}
          </button>
          {profile.logo_url && (
            <button
              type="button"
              onClick={() => update("logo_url", null)}
              className="text-xs font-medium text-ink-700/50 underline underline-offset-2 hover:text-ink-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* About */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          About
        </p>
        <label className="mt-2 block">
          <span className="mb-1 block text-sm font-medium text-ink-900">
            A short description of your business
          </span>
          <textarea
            value={profile.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="input text-sm"
            placeholder="e.g. Family-run cleaning business serving Melbourne's eastern suburbs since 2015. We specialise in end-of-lease and recurring residential cleans."
          />
        </label>
      </div>

      {/* Services */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Services
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          What do you offer?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPANY_SERVICES.map((service) => {
            const active = profile.services.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleService(service)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-900/15 text-ink-700 hover:border-ink-900/30"
                }`}
              >
                {service}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work photos */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          Work photos
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          Show customers your work (up to {MAX_PHOTOS})
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.photos.map((url, i) => (
            <div
              key={i}
              className="group relative h-20 w-20 overflow-hidden rounded-xl border border-ink-900/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Work photo ${i + 1}`}
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
          {profile.photos.length < MAX_PHOTOS && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-ink-900/15 text-xs text-ink-700/50 hover:border-ink-900/30">
              {uploadingPhoto ? "…" : "+ Add"}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhoto(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Credentials */}
      <div className="mt-6 border-t border-ink-900/10 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          A few more details
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              ABN
            </span>
            <input
              value={profile.abn}
              onChange={(e) => update("abn", e.target.value)}
              className="input text-sm"
              placeholder="Optional"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              Years in business
            </span>
            <input
              type="number"
              min="0"
              value={profile.years_in_business ?? ""}
              onChange={(e) =>
                update(
                  "years_in_business",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="input text-sm"
              placeholder="Optional"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700/70">
              Team size
            </span>
            <input
              type="number"
              min="0"
              value={profile.team_size ?? ""}
              onChange={(e) =>
                update(
                  "team_size",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="input text-sm"
              placeholder="Optional"
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary mt-6 px-6 py-2 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
      </button>
    </SpotlightCard>
  );
}
