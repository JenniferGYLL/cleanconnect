"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { DotField } from "@/components/motion/DotField";
import { DotLogo } from "@/components/brand/DotLogo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <main className="bg-grain relative flex min-h-dvh items-center justify-center overflow-hidden bg-foam-50 px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-mesh-1 opacity-80"
      />
      <DotField
        tone="light"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      />

      <div className="relative w-full max-w-sm">
        <FadeIn>
          <Link href="/" className="mb-10 flex justify-center">
            <DotLogo />
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <SpotlightCard className="rounded-xl p-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-600">
              Account recovery
            </span>
            <h1 className="mt-2 font-display text-xl font-semibold text-ink-900">
              Set a new password
            </h1>
            <p className="mt-1 text-sm text-ink-900/55">
              Choose a new password for your account.
            </p>

            {done ? (
              <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Password updated — redirecting you to sign in…
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-900/80">
                    New password
                  </span>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-900/80">
                    Confirm new password
                  </span>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                  />
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="btn-primary w-full py-2.5"
                >
                  {loading ? "Updating…" : "Update password"}
                </motion.button>
              </form>
            )}
          </SpotlightCard>
        </FadeIn>
      </div>
    </main>
  );
}
