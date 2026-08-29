"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { useClickHalo } from "@/components/motion/ClickHalo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { field: haloField, onClick: onHaloClick } = useClickHalo();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <main
      onClick={onHaloClick}
      className="bg-grain relative flex min-h-dvh items-center justify-center overflow-hidden bg-foam-50 px-6 py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-mesh-1 opacity-80"
      />
      {haloField}

      <div className="relative w-full max-w-sm">
        <FadeIn>
          <Link
            href="/"
            className="mb-10 block text-center font-display text-lg font-semibold tracking-tight text-ink-900"
          >
            Clean<span className="text-brand-600">Connect</span>
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <SpotlightCard className="rounded-2xl p-8">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-500">
              Account recovery
            </span>
            <h1 className="mt-2 font-display text-xl font-semibold text-ink-900">
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-ink-900/55">
              Enter the email on your account and we&apos;ll send you a link
              to reset your password.
            </p>

            {sent ? (
              <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Check your inbox — we&apos;ve sent a password reset link to{" "}
                {email}.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-900/80">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                  />
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div className="relative">
                  {loading && (
                    <motion.span
                      aria-hidden
                      className="absolute -inset-2 -z-10 rounded-full bg-gold-400/40 blur-lg"
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [0.96, 1.04, 0.96],
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="btn-primary w-full py-2.5"
                  >
                    {loading ? "Sending…" : "Send reset link"}
                  </motion.button>
                </div>
              </form>
            )}
          </SpotlightCard>
        </FadeIn>

        <FadeIn delay={0.14}>
          <p className="mt-6 text-center text-sm text-ink-900/55">
            <Link href="/login" className="font-medium text-brand-600">
              Back to sign in
            </Link>
          </p>
        </FadeIn>
      </div>
    </main>
  );
}
