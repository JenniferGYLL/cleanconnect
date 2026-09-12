import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { OneOffSubmitForm } from "@/components/one-off/OneOffSubmitForm";
import { CATEGORY_LABEL, isServiceCategory } from "@/lib/buildings/categories";

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadJob(token: string) {
  const admin = serviceClient();

  const { data: tokenRow } = await admin
    .from("one_off_job_tokens")
    .select("job_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return { status: "not_found" as const };
  if (tokenRow.used_at) return { status: "used" as const };
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return { status: "expired" as const };
  }

  const { data: job } = await admin
    .from("jobs")
    .select("id, category, title, notes, status, buildings(name)")
    .eq("id", tokenRow.job_id)
    .maybeSingle();

  if (!job) return { status: "not_found" as const };
  if (job.status === "completed") return { status: "used" as const };

  const building = Array.isArray(job.buildings) ? job.buildings[0] : job.buildings;
  const category = isServiceCategory(job.category) ? job.category : "other";

  return {
    status: "ok" as const,
    job: {
      title: job.title,
      notes: job.notes,
      categoryLabel: CATEGORY_LABEL[category],
      buildingName: building?.name ?? "this building",
    },
  };
}

export default async function OneOffJobPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await loadJob(params.token);

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 px-4 py-10">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-md">
        <p className="text-center font-display text-sm font-semibold tracking-tight text-ink-900">
          Clean<span className="text-brand-600">Connect</span>
        </p>

        {result.status === "not_found" && (
          <div className="glass-surface mt-8 rounded-2xl p-8 text-center text-sm text-ink-700/60">
            This link isn&apos;t valid. Ask the building manager for a new
            one.
          </div>
        )}

        {result.status === "expired" && (
          <div className="glass-surface mt-8 rounded-2xl p-8 text-center text-sm text-ink-700/60">
            This link has expired. Ask the building manager for a new one.
          </div>
        )}

        {result.status === "used" && (
          <div className="glass-surface mt-8 rounded-2xl p-8 text-center text-sm text-ink-700/60">
            This job has already been submitted — thanks, nothing else to
            do here.
          </div>
        )}

        {result.status === "ok" && (
          <>
            <div className="mt-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                {result.job.categoryLabel} · {result.job.buildingName}
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
                {result.job.title}
              </h1>
              {result.job.notes && (
                <p className="mt-2 text-sm text-ink-700/60">{result.job.notes}</p>
              )}
              <p className="mt-3 text-xs text-ink-700/50">
                Add a few photos and any notes, then submit — no account
                needed.
              </p>
            </div>

            <div className="mt-6">
              <OneOffSubmitForm token={params.token} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
