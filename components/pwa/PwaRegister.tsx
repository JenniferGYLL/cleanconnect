"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "cc-install-prompt-dismissed-until";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const until = window.localStorage.getItem(DISMISS_KEY);
    return until !== null && Date.now() < Number(until);
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    // localStorage unavailable (private mode, etc) — fine to skip
  }
}

// Registers the service worker on every page load (so the app installs
// cleanly and push notifications keep working — lib/push/subscribe.ts
// re-registering the same script is a no-op) and, when it's genuinely
// useful, shows a small "add to your home screen" banner. Chrome/Android
// fire a real `beforeinstallprompt` event we can hook a button to; iOS
// Safari never fires that event, so there we just show the manual
// Share -> Add to Home Screen instructions instead.
export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;
    setDismissed(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIos()) {
      setShowIosBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed) return null;
  if (!installEvent && !showIosBanner) return null;

  const handleDismiss = () => {
    dismiss();
    setInstallEvent(null);
    setShowIosBanner(false);
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:w-80">
      <div className="glass-surface flex items-center gap-3 rounded-2xl border border-ink-900/10 bg-white/95 p-3.5 shadow-tint-sm backdrop-blur-xl">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white">
          CC
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900">
            Install CleanConnect
          </p>
          <p className="mt-0.5 text-xs text-ink-700/60">
            {installEvent
              ? "Add it to your home screen for one-tap access."
              : "Tap Share, then “Add to Home Screen.”"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {installEvent && (
            <button
              onClick={handleInstall}
              className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="rounded-full px-2 py-1.5 text-xs text-ink-700/50 hover:text-ink-900"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
