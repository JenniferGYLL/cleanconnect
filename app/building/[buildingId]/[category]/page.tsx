import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, isServiceCategory } from "@/lib/buildings/categories";

type RecordPhoto = { id: string; url: string };
type ServiceRecordWithPhotos = {
  id: string;
  contractor_name: string | null;
  notes: string | null;
  completed_at: string;
  service_record_photos: RecordPhoto[];
};

export default async function ResidentCategoryPage({
  params,
}: {
  params: { buildingId: string; category: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isServiceCategory(params.category)) {
    notFound();
  }
  const category = params.category;

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
    .select("id, name")
    .eq("id", params.buildingId)
    .maybeSingle();

  if (!building) {
    notFound();
  }

  const { data } = await supabase
    .from("service_records")
    .select("id, contractor_name, notes, completed_at, service_record_photos(id, url)")
    .eq("building_id", building.id)
    .eq("category", category)
    .eq("visible_to_residents", true)
    .order("completed_at", { ascending: false });

  const records = (data ?? []) as unknown as ServiceRecordWithPhotos[];

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav active="home" customerName={customer.full_name} email={user.email ?? ""} />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <Link
              href={`/building/${building.id}`}
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← {building.name}
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {CATEGORY_EMOJI[category]} {CATEGORY_LABEL[category]}
            </h1>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            {records.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                No {CATEGORY_LABEL[category].toLowerCase()} visits logged yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {records.map((record) => (
                  <li key={record.id} className="glass-surface rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink-900">
                        {record.contractor_name ?? "Contractor"}
                      </span>
                      <span className="shrink-0 text-xs text-ink-700/50">
                        {new Date(record.completed_at).toLocaleString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="mt-2 text-sm text-ink-700/70">{record.notes}</p>
                    )}
                    {record.service_record_photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {record.service_record_photos.map((photo) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={photo.id}
                            src={photo.url}
                            alt="Service record photo"
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ))}
                      </div>
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
