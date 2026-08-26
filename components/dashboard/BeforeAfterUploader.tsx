"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Slot = "before" | "after";

export function BeforeAfterUploader({
  leadId,
  companyId,
  beforeUrl,
  afterUrl,
  onUploaded,
}: {
  leadId: string;
  companyId: string;
  beforeUrl: string | null;
  afterUrl: string | null;
  onUploaded: (slot: Slot, url: string) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <PhotoSlot
        label="Before"
        leadId={leadId}
        companyId={companyId}
        slot="before"
        url={beforeUrl}
        onUploaded={onUploaded}
      />
      <PhotoSlot
        label="After"
        leadId={leadId}
        companyId={companyId}
        slot="after"
        url={afterUrl}
        onUploaded={onUploaded}
      />
    </div>
  );
}

function PhotoSlot({
  label,
  leadId,
  companyId,
  slot,
  url,
  onUploaded,
}: {
  label: string;
  leadId: string;
  companyId: string;
  slot: Slot;
  url: string | null;
  onUploaded: (slot: Slot, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${companyId}/${leadId}/${slot}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
    const column = slot === "before" ? "before_photo_url" : "after_photo_url";

    const { error: updateError } = await supabase
      .from("leads")
      .update({ [column]: data.publicUrl })
      .eq("id", leadId);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onUploaded(slot, data.publicUrl);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50 disabled:opacity-60"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${label} photo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-slate-400 group-hover:text-slate-600">
            {uploading ? "Uploading…" : `+ Add ${label.toLowerCase()} photo`}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
          {label}
        </span>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
