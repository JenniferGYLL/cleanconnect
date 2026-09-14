"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DotLogo } from "@/components/brand/DotLogo";

export default function CustomerSignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            You&apos;re almost in
          </h1>
          <p className="mt-3 text-ink-700/60">
            Check your email to verify your address, then sign in. If your
            building manager has already added you, your building will be
            waiting for you.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block font-medium text-brand-600"
          >
            Go to sign in →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex justify-center">
          <DotLogo />
        </Link>

        <div className="rounded-2xl border border-ink-900/8 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(23,25,27,0.15)]">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            Create your resident account
          </h1>
          <p className="mt-1 text-sm text-ink-700/60">
            See what&apos;s actually been done in your building.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Full name
              </span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Phone (optional)
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
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

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-800">
                Password
              </span>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Submitting…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-700/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
