import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { CATEGORY_LABEL, CATEGORY_EMOJI, isServiceCategory } from "@/lib/buildings/categories";

type RecordPhoto = { id: string; url: string; kind: string };
type ServiceRecordWithPhotos = {
  id: string;
  contractor_name: string | null;
  notes: string | null;
  completed_at: string;
  issue_status: "none" | "flagged" | "resolved";
  service_record_photos: RecordPhoto[];
};

type FeedbackRow = {
  id: string;
  liked: boolean;
  status: "good" | "needs_attention" | null;
  comment: string | null;
  is_anonymous: boolean;
  customers: { full_name: string } | { full_name: string }[] | null;
};

export default async function CategoryHistoryPage({
  params,
}: {
  params: { buildingId: string; category: string };
}) {
  const { supabase, company } = await requireCompany();

  if (company.org_type !== "property_manager") {
    redirect("/dashboard");
  }

  if (!isServiceCategory(params.category)) {
    notFound();
  }
  const category = params.category;

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("id", params.buildingId)
    .eq("org_id", company.id)
    .maybeSingle();

  if (!building) {
    notFound();
  }

  const { data } = await supabase
    .from("service_records")
    .select(
      "id, contractor_name, notes, completed_at, issue_status, service_record_photos(id, url, kind)"
    )
    .eq("building_id", building.id)
    .eq("category", category)
    .order("completed_at", { ascending: false });

  const records = (data ?? []) as unknown as ServiceRecordWithPhotos[];

  const recordIds = records.map((r) => r.id);
  let feedbackByRecord = new Map<string, FeedbackRow[]>();
  if (recordIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from("service_record_feedback")
      .select("id, service_record_id, liked, status, comment, is_anonymous, customers(full_name)")
      .in("service_record_id", recordIds);

    feedbackByRecord = new Map();
    for (const row of (feedbackRows ?? []) as (FeedbackRow & { service_record_id: string })[]) {
      const list = feedbackByRecord.get(row.service_record_id) ?? [];
      list.push(row);
      feedbackByRecord.set(row.service_record_id, list);
    }
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="buildings"
          companyName={company.company_name}
          email={company.email}
          orgType="property_manager"
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <Link
              href={`/dashboard/buildings/${building.id}`}
              className="text-sm font-medium text-ink-700/60 hover:text-ink-900"
            >
              ← {building.name}
            </Link>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {CATEGORY_EMOJI[category]} {CATEGORY_LABEL[category]} history
            </h1>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-8">
            {records.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                No {CATEGORY_LABEL[category].toLowerCase()} visits logged yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {records.map((record) => {
                  const feedback = feedbackByRecord.get(record.id) ?? [];
                  const likeCount = feedback.filter((f) => f.liked).length;
                  const goodCount = feedback.filter((f) => f.status === "good").length;
                  const needsAttentionCount = feedback.filter(
                    (f) => f.status === "needs_attention"
                  ).length;
                  const comments = feedback.filter((f) => f.comment);

                  return (
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
                      {record.issue_status === "flagged" && (
                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Needs attention
                        </span>
                      )}
                      {record.issue_status === "resolved" && (
                        <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          Resolved
                        </span>
                      )}
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
                      {(likeCount > 0 || goodCount > 0 || needsAttentionCount > 0) && (
                        <p className="mt-3 text-xs text-ink-700/50">
                          {likeCount > 0 ? `👍 ${likeCount} · ` : ""}
                          {goodCount > 0 ? `${goodCount} said Good · ` : ""}
                          {needsAttentionCount > 0
                            ? `${needsAttentionCount} flagged Needs Attention`
                            : ""}
                        </p>
                      )}
                      {comments.length > 0 && (
                        <ul className="mt-2 space-y-1.5 border-t border-ink-900/5 pt-2">
                          {comments.map((c) => {
                            const resident = Array.isArray(c.customers)
                              ? c.customers[0]
                              : c.customers;
                            return (
                              <li key={c.id} className="text-sm text-ink-700/70">
                                <span className="font-medium text-ink-800">
                                  {c.is_anonymous
                                    ? "Anonymous resident"
                                    : resident?.full_name ?? "A resident"}
                                  :
                                </span>{" "}
                                {c.comment}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
