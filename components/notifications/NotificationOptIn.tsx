"use client";

import { useState } from "react";
import { subscribeToPush } from "@/lib/push/subscribe";

export function NotificationOptIn() {
  const [status, setStatus] = useState<
    "idle" | "subscribed" | "denied" | "unsupported" | "loading"
  >("idle");

  async function handleClick() {
    setStatus("loading");
    const result = await subscribeToPush();
    setStatus(result);
  }

  if (status === "subscribed" || status === "unsupported") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
    >
      {status === "denied"
        ? "Notifications blocked in your browser"
        : status === "loading"
          ? "Requesting…"
          : "Turn on notifications"}
    </button>
  );
}
