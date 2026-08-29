"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a new password for your account.
          </p>

          {done ? (
            <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated — redirecting you to sign in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
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
                <span className="mb-1 block text-sm font-medium text-slate-700">
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

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
