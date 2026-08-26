"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CompanySignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
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
          company_name: companyName,
          contact_name: contactName,
          phone,
          service_area: serviceArea,
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
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            You're almost in
          </h1>
          <p className="mt-3 text-slate-500">
            Check your email to verify your address. Once your account is
            approved, you'll be able to sign in and see your leads.
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
        <Link
          href="/"
          className="mb-10 block text-center font-display text-lg font-semibold tracking-tight text-slate-900"
        >
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Register your company
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Get set up to receive leads and manage reviews.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Company name">
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input"
                placeholder="e.g. Bright Spark Cleaning"
              />
            </Field>

            <Field label="Contact name">
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Service area">
                <input
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="input"
                  placeholder="e.g. East Melbourne"
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Password">
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </Field>

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

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
