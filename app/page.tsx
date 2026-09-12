"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/layout/SiteNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { WaveDivider } from "@/components/motion/WaveDivider";

const loopSteps = [
  {
    number: "01",
    title: "Do",
    copy: "A contractor completes a real visit — cleaning, gardening, lift maintenance, fire safety, and more.",
    offset: "",
  },
  {
    number: "02",
    title: "Prove",
    copy: "They upload photos and a few notes on the spot. Takes seconds, not a checklist.",
    offset: "sm:mt-8",
  },
  {
    number: "03",
    title: "See",
    copy: "The manager and residents see it immediately — no phone calls, no chasing an email.",
    offset: "sm:mt-16",
  },
  {
    number: "04",
    title: "Feedback",
    copy: "Residents mark it Good or flag it Needs Attention — simple, not a star rating.",
    offset: "sm:mt-8",
  },
  {
    number: "05",
    title: "Improve",
    copy: "If something needs fixing, the contractor corrects it and documents the fix too.",
    offset: "",
  },
];

const whyItems = [
  {
    label: "Evidence, not promises",
    title: "Every visit becomes a permanent record",
    copy: "Photos and notes are filed the moment a job is done — automatically added to the building's history, the manager's dashboard and the resident feed. Nothing is re-entered twice.",
  },
  {
    label: "Built for everyone",
    title: "No training required, for anyone",
    copy: "A resident opens their building and taps a tile. A contractor opens a job, takes a photo, and submits. A manager opens a dashboard and sees what happened today — that's the whole learning curve.",
  },
  {
    label: "One-off contractors welcome",
    title: "No account needed to log a job",
    copy: "A one-time contractor gets a secure link by text or email, opens it in any browser, adds photos and notes, and submits. No sign-up, no app.",
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
              🧹
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Common area cleaning — Level 3
              </p>
              <p className="text-xs text-ink-700/50">Logged 12 minutes ago</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-700/70">
            &ldquo;Bins emptied, lobby glass cleaned, mopped throughout.&rdquo;
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
            Resident feedback
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              👍 Good
            </span>
            <span className="text-[11px] text-ink-700/50">from 2 residents</span>
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
                A building service transparency platform
              </span>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h1 className="mt-8 max-w-xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                See what has been{" "}
                <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
                  done in your building.
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.16}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-700/70">
                No chasing. No guessing. Every cleaning, garden visit, lift
                check and fire inspection gets logged with a photo the
                moment it happens — so managers, residents and contractors
                all see the same simple record.
              </p>
            </FadeIn>

            <FadeIn delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup/company"
                  className="btn-primary px-7 py-3 text-[15px]"
                >
                  For Building Managers
                </Link>
                <Link
                  href="/signup/customer"
                  className="btn-ghost px-7 py-3 text-[15px]"
                >
                  I&apos;m a Resident
                </Link>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <HeroMockup />
          </FadeIn>
        </div>
      </section>

      {/* Three paths */}
      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <FadeIn>
              <SpotlightCard className="group h-full rounded-2xl p-8">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
                  For property managers
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                  See, don&apos;t search
                </h3>
                <p className="mt-3 text-ink-700/70">
                  Every building you manage, every service, every completed
                  visit — one dashboard, filed automatically.
                </p>
                <div className="mt-8 flex items-end">
                  <Link
                    href="/signup/company"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 transition group-hover:gap-2"
                  >
                    Register your buildings <span aria-hidden>→</span>
                  </Link>
                </div>
              </SpotlightCard>
            </FadeIn>

            <FadeIn delay={0.08}>
              <SpotlightCard className="group h-full rounded-2xl p-8">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
                  For contractors
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                  Open job, snap photos, submit
                </h3>
                <p className="mt-3 text-ink-700/70">
                  No long checklists. No account needed for a one-off job —
                  just a secure link sent straight to your phone.
                </p>
                <div className="mt-8 flex items-end">
                  <Link
                    href="/signup/company"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 transition group-hover:gap-2"
                  >
                    Register as a contractor <span aria-hidden>→</span>
                  </Link>
                </div>
              </SpotlightCard>
            </FadeIn>

            <FadeIn delay={0.16}>
              <SpotlightCard className="group h-full rounded-2xl p-8">
                <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
                  For residents
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">
                  My Building, nothing else
                </h3>
                <p className="mt-3 text-ink-700/70">
                  Tap a service, see what was actually done, and say Good or
                  Needs Attention. That&apos;s the whole app.
                </p>
                <div className="mt-8 flex items-end">
                  <Link
                    href="/signup/customer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 transition group-hover:gap-2"
                  >
                    Create your account <span aria-hidden>→</span>
                  </Link>
                </div>
              </SpotlightCard>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* The loop */}
      <section id="how-it-works" className="relative bg-foam-100 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <span className="text-xs font-medium uppercase tracking-widest text-brand-700">
              How it works
            </span>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Do. Prove. See. Feedback. Improve.
            </h2>
          </FadeIn>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-5">
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
            {loopSteps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.08} className={step.offset}>
                <div className="relative">
                  <div className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-900/10 bg-white font-display text-sm font-semibold text-ink-900 shadow-tint-sm">
                    {step.number}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-700/70">{step.copy}</p>
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
              A simple front end. A record-keeping backend that never forgets.
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
