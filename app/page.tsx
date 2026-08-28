"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/layout/SiteNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { WaveDivider } from "@/components/motion/WaveDivider";

const steps = [
  {
    number: "01",
    title: "Create your profile",
    copy: "Cleaning companies sign up in minutes and set their service area and specialties.",
    offset: "",
  },
  {
    number: "02",
    title: "Get matched with leads",
    copy: "Customers looking for commercial cleaning, gardening or general cleaning reach out directly.",
    offset: "sm:mt-12",
  },
  {
    number: "03",
    title: "Grow with reviews",
    copy: "Every completed job builds a public track record that wins the next customer.",
    offset: "sm:mt-3",
  },
];

const whyItems = [
  {
    label: "Live sync",
    title: "Reviews land the moment they're submitted",
    copy: "No refreshing, no polling your inbox — a new review or lead appears on your dashboard in real time, with a quiet notification instead of a page reload.",
  },
  {
    label: "Visual proof",
    title: "Before-and-after photos, attached to the job",
    copy: "Upload a before and after shot straight from the lead card. It becomes part of your track record, not a separate folder you forget to send anyone.",
  },
  {
    label: "Compounding trust",
    title: "Every completed job strengthens the next quote",
    copy: "Your review history stays attached to your profile, so the work you've already done keeps working for you on the next lead.",
  },
];

function RippleRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-16 top-24 hidden h-72 w-72 sm:block"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-brand-500/25"
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 1.3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto hidden max-w-sm sm:block lg:mx-0">
      <RippleRings />

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <SpotlightCard className="rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 12.5l5 5L20 6.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                New review — Priya K.
              </p>
              <p className="text-xs text-amber-500">★★★★★</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-700/70">
            &ldquo;Showed up on time and the office looked better than it has
            in months.&rdquo;
          </p>
        </SpotlightCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative -mt-6 ml-10 w-64"
      >
        <SpotlightCard className="rounded-2xl p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-brand-700">
            Job #204 — office fit-out
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 py-6 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Before
            </div>
            <div className="rounded-lg bg-gradient-to-br from-brand-200 to-accent-300 py-6 text-center text-[10px] font-medium uppercase tracking-wide text-brand-900">
              After
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-foam-50">
      <SiteNav />

      {/* Hero */}
      <section className="bg-grain relative overflow-hidden">
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

        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-28 pt-24 sm:pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-900/10 bg-white/80 px-4 py-1.5 text-xs font-medium tracking-wide text-ink-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                A cleaner way to find cleaning
              </span>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h1 className="mt-8 max-w-xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Connecting cleaning companies with the{" "}
                <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
                  customers who need them
                </span>
                .
              </h1>
            </FadeIn>

            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-700/70">
                From commercial cleaning to garden maintenance, CleanConnect
                gives small and mid-sized cleaning businesses a steady stream
                of leads — and gives customers a simple way to find someone
                they can trust.
              </p>
            </FadeIn>

            <FadeIn delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="btn-primary px-7 py-3 text-[15px]"
                >
                  List your company
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-ghost px-7 py-3 text-[15px]"
                >
                  See how it works
                </a>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <HeroMockup />
          </FadeIn>
        </div>
      </section>

      {/* Two paths */}
      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <FadeIn className="lg:col-span-2">
              <SpotlightCard className="h-full rounded-2xl p-8 sm:mt-10">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
                  For customers
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                  Find a cleaner you can trust
                </h3>
                <p className="mt-3 text-ink-700/70">
                  Browse cleaning companies, compare reviews and get quotes —
                  launching soon.
                </p>
                <div className="mt-8 flex items-end">
                  <span className="inline-block text-sm font-medium text-ink-700/40">
                    Coming soon
                  </span>
                </div>
              </SpotlightCard>
            </FadeIn>

            <FadeIn delay={0.1} className="lg:col-span-3">
              <SpotlightCard className="group h-full rounded-2xl p-8 sm:p-10">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
                  For cleaning companies
                </span>
                <h3 className="mt-4 font-display text-3xl font-semibold text-ink-900">
                  Turn visibility into bookings
                </h3>
                <p className="mt-3 max-w-md text-ink-700/70">
                  Register your business, then log in to see customer leads
                  and reviews arrive on your dashboard as they happen.
                </p>
                <div className="mt-8 flex items-end">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 transition group-hover:gap-2"
                  >
                    Get started <span aria-hidden>→</span>
                  </Link>
                </div>
              </SpotlightCard>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative bg-foam-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
              How it works
            </span>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Built to get you working, not waiting.
            </h2>
          </FadeIn>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
            <svg
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-6 hidden w-full sm:block"
              height="24"
              viewBox="0 0 900 24"
              preserveAspectRatio="none"
            >
              <path
                d="M0,12 C150,-4 200,28 320,12 C440,-4 480,28 600,12 C700,-2 750,26 900,10"
                stroke="#0a8f76"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                strokeDasharray="2 8"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.1} className={step.offset}>
                <div className="relative">
                  <div className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-900/10 bg-white font-display text-sm font-semibold text-ink-900 shadow-tint-sm">
                    {step.number}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-ink-700/70">{step.copy}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <WaveDivider
          fill="#061b15"
          className="absolute -bottom-px left-0 right-0"
        />
      </section>

      {/* Why CleanConnect — dark band */}
      <section className="bg-grain relative overflow-hidden bg-ink-900 pb-24 pt-20 text-white">
        <div className="pointer-events-none absolute inset-0 bg-mesh-dark opacity-70" />

        <div className="relative mx-auto max-w-6xl px-6">
          <FadeIn>
            <span className="text-xs font-medium uppercase tracking-widest text-brand-300">
              Why CleanConnect
            </span>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Details that make the dashboard worth opening.
            </h2>
          </FadeIn>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {whyItems.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <SpotlightCard dark className="h-full rounded-2xl p-7">
                  <span className="text-xs font-medium uppercase tracking-widest text-accent-300">
                    {item.label}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    {item.copy}
                  </p>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer — continues the dark band for a committed transition */}
      <footer className="bg-ink-950 py-10 text-white/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm sm:flex-row">
          <span className="font-display font-semibold text-white/80">
            CleanConnect
          </span>
          <span>
            © {new Date().getFullYear()} CleanConnect. All rights reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}
