"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-10 block text-center font-display text-lg font-semibold tracking-tight text-slate-900"
        >
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter the email on your account and we&apos;ll send you a link to
            reset your password.
          </p>

          {sent ? (
            <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Check your inbox — we&apos;ve sent a password reset link to{" "}
              {email}.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
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

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
