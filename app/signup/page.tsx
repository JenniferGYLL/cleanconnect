import Link from "next/link";

export default function SignupChooserPage() {
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
            Create an account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Are you looking for a cleaning company, or do you run one?
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/signup/customer"
              className="btn-primary block w-full py-2.5 text-center"
            >
              I&apos;m a customer
            </Link>
            <Link
              href="/signup/company"
              className="btn-ghost block w-full py-2.5 text-center"
            >
              I run a cleaning company
            </Link>
          </div>
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
