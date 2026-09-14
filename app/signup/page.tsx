import Link from "next/link";
import { DotLogo } from "@/components/brand/DotLogo";

export default function SignupChooserPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex justify-center">
          <DotLogo />
        </Link>

        <div className="rounded-2xl border border-ink-900/8 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(23,25,27,0.15)]">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-ink-700/60">
            Are you a resident, or do you manage or provide services for a
            building?
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/signup/customer"
              className="btn-primary block w-full py-2.5 text-center"
            >
              I&apos;m a resident
            </Link>
            <Link
              href="/signup/company"
              className="btn-ghost block w-full py-2.5 text-center"
            >
              I manage a building or provide a service
            </Link>
          </div>
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
