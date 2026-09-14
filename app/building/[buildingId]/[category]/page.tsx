import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { FeedbackWidget, type OwnFeedback } from "@/components/resident/FeedbackWidget";
import { StatusDot } from "@/components/status/StatusDot";
import { CATEGORY_LABEL, CATEGORY_EMOJI, isServiceCategory } from "@/lib/buildings/categories";

type RecordPhoto = { id: string; url: string };
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
  service_record_id: string;
  resident_id: string;
  liked: boolean;
  status: "good" | "needs_attention" | null;
  comment: string | null;
  is_anonymous: boolean;
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
    .select(
      "id, contractor_name, notes, completed_at, issue_status, service_record_photos(id, url)"
    )
    .eq("building_id", building.id)
    .eq("category", category)
    .eq("visible_to_residents", true)
    .order("completed_at", { ascending: false });

  const records = (data ?? []) as unknown as ServiceRecordWithPhotos[];

  const recordIds = records.map((r) => r.id);
  let feedbackByRecord = new Map<string, FeedbackRow[]>();
  if (recordIds.length > 0) {
    const { data: feedbackRows } = await supabase
      .from("service_record_feedback")
      .select("id, service_record_id, resident_id, liked, status, comment, is_anonymous")
      .in("service_record_id", recordIds);

    feedbackByRecord = new Map();
    for (const row of (feedbackRows ?? []) as FeedbackRow[]) {
      const list = feedbackByRecord.get(row.service_record_id) ?? [];
      list.push(row);
      feedbackByRecord.set(row.service_record_id, list);
    }
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
                {records.map((record) => {
                  const feedback = feedbackByRecord.get(record.id) ?? [];
                  const own = feedback.find((f) => f.resident_id === user.id) ?? null;
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
                        <StatusDot
                          status="flagged"
                          label="Needs attention — being looked at"
                          className="mt-2"
                        />
                      )}
                      {record.issue_status === "resolved" && (
                        <StatusDot status="resolved" label="Issue resolved" className="mt-2" />
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

                      <FeedbackWidget
                        serviceRecordId={record.id}
                        residentId={user.id}
                        initialOwn={own as OwnFeedback | null}
                        likeCount={feedback.filter((f) => f.liked).length}
                        goodCount={feedback.filter((f) => f.status === "good").length}
                        needsAttentionCount={
                          feedback.filter((f) => f.status === "needs_attention").length
                        }
                        commentCount={comments.length}
                      />

                      {comments.length > 0 && (
                        <ul className="mt-3 space-y-1.5 border-t border-ink-900/5 pt-3">
                          {comments.map((c) => (
                            <li key={c.id} className="text-sm text-ink-700/70">
                              <span className="font-medium text-ink-800">
                                {c.resident_id === user.id
                                  ? "You"
                                  : c.is_anonymous
                                  ? "Anonymous resident"
                                  : "A resident"}
                                :
                              </span>{" "}
                              {c.comment}
                            </li>
                          ))}
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
