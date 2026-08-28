import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:hello@cleanconnect.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type LeadRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
};

type ReviewRow = {
  company_id: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

type Notification = { userId: string; title: string; body: string };

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as WebhookPayload;
  const supabase = serviceClient();

  const notification = resolveNotification(payload);
  if (!notification) {
    return NextResponse.json({ skipped: true });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", notification.userId);

  await Promise.all(
    (subscriptions ?? []).map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ title: notification.title, body: notification.body })
        )
        .catch(() => {
          // 订阅可能已经失效(比如用户清了浏览器数据),忽略单条失败即可
        })
    )
  );

  return NextResponse.json({ notified: subscriptions?.length ?? 0 });
}

function resolveNotification(payload: WebhookPayload): Notification | null {
  if (payload.table === "leads") {
    const lead = payload.record as unknown as LeadRow;
    const old = payload.old_record as unknown as
      | (Partial<LeadRow> | null);

    if (payload.type === "INSERT") {
      return {
        userId: lead.company_id,
        title: "New booking request",
        body: "A customer just requested a booking — open CleanConnect to respond.",
      };
    }

    if (payload.type === "UPDATE" && lead.customer_id) {
      if (old && old.status !== lead.status) {
        const statusLabel: Record<string, string> = {
          accepted: "was accepted",
          declined: "was declined",
          in_progress: "is now in progress",
          completed: "is complete",
        };
        const label = statusLabel[lead.status];
        if (label) {
          return {
            userId: lead.customer_id,
            title: "Booking update",
            body: `Your booking ${label}.`,
          };
        }
      }

      const newPhoto =
        (lead.before_photo_url &&
          lead.before_photo_url !== old?.before_photo_url) ||
        (lead.after_photo_url && lead.after_photo_url !== old?.after_photo_url);
      if (newPhoto) {
        return {
          userId: lead.customer_id,
          title: "New photo added",
          body: "Your cleaning company just added a photo to your booking.",
        };
      }
    }

    return null;
  }

  if (payload.table === "reviews" && payload.type === "INSERT") {
    const review = payload.record as unknown as ReviewRow;
    return {
      userId: review.company_id,
      title: "New review",
      body: "A customer just left you a review.",
    };
  }

  return null;
}
