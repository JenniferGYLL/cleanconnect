import { FadeIn } from "@/components/motion/FadeIn";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export function ComingNext({
  eyebrow,
  title,
  description,
  points,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
          {description}
        </p>
      </FadeIn>

      <FadeIn delay={0.05} className="mt-8">
        <SpotlightCard className="max-w-xl rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Coming in the next phase
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-ink-800">
            {points.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}
