import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SERVICE_CATEGORIES, CATEGORY_LABEL, type ServiceCategory } from "@/lib/buildings/categories";

type RawRecord = {
  id: string;
  category: ServiceCategory;
  contractor_name: string | null;
  notes: string | null;
  completed_at: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default async function ResidentBuildingPage({
  params,
}: {
  params: { buildingId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: customer }, { data: access }] = await Promise.all([
    supabase.from("customers").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("building_residents")
      .select("id")
      .eq("building_id", params.buildingId)
      .eq("customer_id", user.id)
      .maybeSingle(),
  ]);

  if (!customer) {
    redirect("/login");
  }
  if (!access) {
    notFound();
  }

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, address, suburb, postcode")
    .eq("id", params.buildingId)
    .maybeSingle();

  if (!building) {
    notFound();
  }

  const { data: recordRows } = await supabase
    .from("service_records")
    .select("id, category, contractor_name, notes, completed_at")
    .eq("building_id", building.id)
    .eq("visible_to_residents", true)
    .order("completed_at", { ascending: false })
    .limit(15);

  const records = (recordRows ?? []) as RawRecord[];
  const countByCategory = new Map<ServiceCategory, number>();
  for (const record of records) {
    countByCategory.set(record.category, (countByCategory.get(record.category) ?? 0) + 1);
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav active="home" customerName={customer.full_name} email={user.email ?? ""} />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <Link href="/home" className="text-sm font-medium text-ink-700/60 hover:text-ink-900">
              ← My Building
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {building.name}
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">
              {building.address}
              {building.suburb ? `, ${building.suburb}` : ""}
              {building.postcode ? ` ${building.postcode}` : ""}
            </p>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SERVICE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.key}
                  href={`/building/${building.id}/${cat.key}`}
                  className="glass-surface flex flex-col items-center gap-1.5 rounded-2xl px-3 py-5 text-center transition hover:shadow-tint-sm active:scale-[0.98]"
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-sm font-medium text-ink-800">{cat.label}</span>
                  <span className="text-[11px] text-ink-700/50">
                    {countByCategory.get(cat.key) ?? 0} logged
                  </span>
                </Link>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
              Recent activity
            </p>
            {records.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Nothing logged yet for this building.
              </div>
            ) : (
              <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
                {records.map((record) => (
                  <li key={record.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink-900">
                        {CATEGORY_LABEL[record.category]}
                      </span>
                      <span className="shrink-0 text-xs text-ink-700/50">
                        {timeAgo(record.completed_at)}
                      </span>
                    </div>
                    {record.contractor_name && (
                      <p className="mt-1 text-xs text-ink-700/50">{record.contractor_name}</p>
                    )}
                    {record.notes && (
                      <p className="mt-1 text-sm text-ink-700/70">{record.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
