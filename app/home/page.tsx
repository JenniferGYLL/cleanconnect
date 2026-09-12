import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, type ServiceCategory } from "@/lib/buildings/categories";

type BuildingLink = {
  building_id: string;
  buildings: { id: string; name: string; address: string; suburb: string | null } | { id: string; name: string; address: string; suburb: string | null }[] | null;
};

type RecentRecord = {
  id: string;
  category: ServiceCategory;
  contractor_name: string | null;
  notes: string | null;
  completed_at: string;
  building_id: string;
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

export default async function ResidentHomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!customer) {
    redirect("/login");
  }

  const { data: linkRows } = await supabase
    .from("building_residents")
    .select("building_id, buildings(id, name, address, suburb)")
    .eq("customer_id", user.id);

  const buildings = (linkRows ?? [])
    .map((row) => {
      const r = row as unknown as BuildingLink;
      return Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    })
    .filter((b): b is NonNullable<typeof b> => !!b);

  const buildingIds = buildings.map((b) => b.id);

  let recentRecords: RecentRecord[] = [];
  if (buildingIds.length > 0) {
    const { data } = await supabase
      .from("service_records")
      .select("id, category, contractor_name, notes, completed_at, building_id")
      .in("building_id", buildingIds)
      .eq("visible_to_residents", true)
      .order("completed_at", { ascending: false })
      .limit(10);
    recentRecords = (data ?? []) as RecentRecord[];
  }

  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav
            active="home"
            customerName={customer.full_name}
            email={user.email ?? ""}
          />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              My building
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              See what&apos;s been done
            </h1>
            <p className="mt-1.5 text-sm text-ink-700/70">
              No chasing, no guessing — just what your building manager and
              contractors have actually logged.
            </p>
          </FadeIn>

          {buildings.length === 0 ? (
            <FadeIn delay={0.05} className="mt-10">
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Your building manager hasn&apos;t added you to a building
                yet. Once they do, it&apos;ll show up here automatically.
              </div>
            </FadeIn>
          ) : (
            <>
              {buildings.map((building, i) => (
                <FadeIn key={building.id} delay={0.05 + i * 0.03} className="mt-8">
                  <Link
                    href={`/building/${building.id}`}
                    className="glass-surface spotlight-border block rounded-2xl p-6 transition hover:shadow-tint-sm"
                  >
                    <p className="font-display text-lg font-semibold text-ink-900">
                      {building.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-700/60">
                      {building.address}
                      {building.suburb ? `, ${building.suburb}` : ""}
                    </p>
                    <div className="mt-4 grid grid-cols-5 gap-1.5">
                      {Object.entries(CATEGORY_EMOJI)
                        .slice(0, 5)
                        .map(([key, emoji]) => (
                          <span
                            key={key}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-base"
                          >
                            {emoji}
                          </span>
                        ))}
                    </div>
                    <span className="mt-4 inline-flex text-sm font-semibold text-ink-900 underline underline-offset-2">
                      View building →
                    </span>
                  </Link>
                </FadeIn>
              ))}

              {recentRecords.length > 0 && (
                <FadeIn delay={0.2} className="mt-10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                    Recent activity
                  </p>
                  <ul className="glass-surface divide-y divide-ink-900/5 overflow-hidden rounded-2xl">
                    {recentRecords.map((record) => (
                      <li key={record.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-ink-900">
                            {CATEGORY_EMOJI[record.category]}{" "}
                            {CATEGORY_LABEL[record.category]}
                            {buildings.length > 1
                              ? ` · ${buildingNameById.get(record.building_id) ?? ""}`
                              : ""}
                          </span>
                          <span className="shrink-0 text-xs text-ink-700/50">
                            {timeAgo(record.completed_at)}
                          </span>
                        </div>
                        {record.contractor_name && (
                          <p className="mt-1 text-xs text-ink-700/50">
                            {record.contractor_name}
                          </p>
                        )}
                        {record.notes && (
                          <p className="mt-1 text-sm text-ink-700/70">
                            {record.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
