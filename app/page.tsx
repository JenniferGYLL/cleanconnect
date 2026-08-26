"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/layout/SiteNav";
import { FadeIn } from "@/components/motion/FadeIn";

const steps = [
  {
    number: "01",
    title: "Create your profile",
    copy: "Cleaning companies sign up in minutes and set their service area and specialties.",
  },
  {
    number: "02",
    title: "Get matched with leads",
    copy: "Customers looking for commercial cleaning, gardening or general cleaning reach out directly.",
  },
  {
    number: "03",
    title: "Grow with reviews",
    copy: "Every completed job builds a public track record that wins the next customer.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface">
      <SiteNav />

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-mesh-1" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-3xl"
          animate={{ y: [0, 24, 0], x: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-40 left-[-8%] h-[360px] w-[360px] rounded-full bg-accent-400/20 blur-3xl"
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-28 pt-24 sm:pt-32">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              A cleaner way to find cleaning
            </span>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="mt-8 max-w-3xl font-display text-5xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl">
              Connecting cleaning
              <br />
              companies with the
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                customers who need them.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
              From commercial cleaning to garden maintenance, CleanConnect
              gives small and mid-sized cleaning businesses a steady stream of
              leads — and gives customers a simple way to find someone they
              can trust.
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="btn-primary px-7 py-3 text-[15px]">
                List your company
              </Link>
              <a href="#how-it-works" className="btn-ghost px-7 py-3 text-[15px]">
                See how it works
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Two paths */}
      <section className="relative border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FadeIn>
              <div className="group h-full rounded-2xl border border-slate-100 bg-surface/60 p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-600">
                  For customers
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-slate-900">
                  Find a cleaner you can trust
                </h3>
                <p className="mt-3 text-slate-500">
                  Browse cleaning companies, compare reviews and get quotes —
                  launching soon.
                </p>
                <span className="mt-6 inline-block text-sm font-medium text-slate-400">
                  Coming soon
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="group h-full rounded-2xl border border-slate-100 bg-surface/60 p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-600">
                  For cleaning companies
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-slate-900">
                  Turn visibility into bookings
                </h3>
                <p className="mt-3 text-slate-500">
                  Register your business, then log in to see customer leads
                  and reviews in one place.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 transition group-hover:gap-2"
                >
                  Get started <span aria-hidden>→</span>
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <span className="text-xs font-medium uppercase tracking-widest text-brand-600">
              How it works
            </span>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Built to get you working, not waiting.
            </h2>
          </FadeIn>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent sm:block" />
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.1}>
                <div className="relative">
                  <div className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white font-display text-sm font-semibold text-slate-900">
                    {step.number}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-slate-500">{step.copy}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 sm:flex-row">
          <span className="font-display font-semibold text-slate-500">
            CleanConnect
          </span>
          <span>© {new Date().getFullYear()} CleanConnect. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
