import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/dashboard/requireCompany";
import { CompanyNav } from "@/components/dashboard/CompanyNav";
import { FadeIn } from "@/components/motion/FadeIn";

type Quote = {
  id: string;
  ai_price_min: number | null;
  ai_price_max: number | null;
  final_price: number | null;
  price_adjustment_reason: string | null;
  confidence: string | null;
  risk_level: string | null;
  quote_mode: string | null;
  created_at: string;
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const QUOTE_MODE_LABEL: Record<string, string> = {
  instant: "Instant estimate",
  verification: "May be verified",
  inspection: "Inspection required",
};

function money(n: number) {
  return `$${n.toFixed(0)}`;
}

export default async function InsightsPage() {
  const { supabase, company } = await requireCompany();

  if (!company.approved) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("quotes")
    .select(
      "id, ai_price_min, ai_price_max, final_price, price_adjustment_reason, confidence, risk_level, quote_mode, created_at"
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as Quote[];

  // How the price the company actually sent compares to what the AI
  // suggested — the "AI proposed X, business sent Y" pattern the raw
  // quotes table already records via price_adjustment_reason, just
  // never aggregated anywhere until now.
  const withDelta = quotes
    .filter(
      (q) =>
        q.ai_price_min != null && q.ai_price_max != null && q.final_price != null
    )
    .map((q) => {
      const aiMid = (q.ai_price_min! + q.ai_price_max!) / 2;
      const deltaPct = aiMid > 0 ? ((q.final_price! - aiMid) / aiMid) * 100 : 0;
      return { ...q, aiMid, deltaPct };
    });

  const raised = withDelta.filter((q) => q.deltaPct > 1).length;
  const lowered = withDelta.filter((q) => q.deltaPct < -1).length;
  const keptAsIs = withDelta.length - raised - lowered;
  const avgDeltaPct =
    withDelta.length > 0
      ? withDelta.reduce((sum, q) => sum + q.deltaPct, 0) / withDelta.length
      : null;

  const countBy = (key: keyof Quote, labels: Record<string, string>) => {
    const counts = new Map<string, number>();
    for (const q of quotes) {
      const value = q[key] as string | null;
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ label: labels[value] ?? value, count }))
      .sort((a, b) => b.count - a.count);
  };

  const confidenceBreakdown = countBy("confidence", CONFIDENCE_LABEL);
  const modeBreakdown = countBy("quote_mode", QUOTE_MODE_LABEL);

  const recentReasons = quotes
    .filter((q) => q.price_adjustment_reason)
    .slice(0, 8);

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24 pt-6">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <CompanyNav
          active="home"
          companyName={company.company_name}
          email={company.email}
        />

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Quote insights
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              How you actually price against the AI estimate
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-ink-700/70">
              Every quote already records what the AI suggested and what you
              actually sent — this just adds it up. Nothing here is a new AI
              prediction, it&rsquo;s a summary of your own past decisions.
            </p>
          </FadeIn>

          {quotes.length === 0 ? (
            <FadeIn delay={0.05} className="mt-8">
              <div className="glass-surface rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
                Send a few quotes and your pricing patterns will show up
                here.
              </div>
            </FadeIn>
          ) : (
            <div className="mt-8 space-y-6">
              <FadeIn delay={0.05}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Quotes sent" value={String(quotes.length)} />
                  <Stat
                    label="Avg. vs AI estimate"
                    value={
                      avgDeltaPct == null
                        ? "—"
                        : `${avgDeltaPct > 0 ? "+" : ""}${avgDeltaPct.toFixed(
                            0
                          )}%`
                    }
                  />
                  <Stat label="Raised the price" value={String(raised)} />
                  <Stat label="Lowered the price" value={String(lowered)} />
                </div>
              </FadeIn>

              {withDelta.length > 0 && (
                <FadeIn delay={0.08}>
                  <div className="glass-surface spotlight-border rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                      Adjustment pattern
                    </p>
                    <p className="mt-2 text-sm text-ink-800">
                      {avgDeltaPct != null && Math.abs(avgDeltaPct) <= 1
                        ? "You typically send the AI's estimate as-is."
                        : avgDeltaPct != null && avgDeltaPct > 1
                        ? `You typically send ${avgDeltaPct.toFixed(
                            0
                          )}% above the AI's estimate.`
                        : avgDeltaPct != null
                        ? `You typically send ${Math.abs(avgDeltaPct).toFixed(
                            0
                          )}% below the AI's estimate.`
                        : null}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs text-ink-700/60">
                      <span>{raised} raised</span>
                      <span>{keptAsIs} kept as-is</span>
                      <span>{lowered} lowered</span>
                    </div>
                  </div>
                </FadeIn>
              )}

              {(confidenceBreakdown.length > 0 || modeBreakdown.length > 0) && (
                <FadeIn delay={0.1}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {confidenceBreakdown.length > 0 && (
                      <div className="glass-surface rounded-2xl p-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                          AI confidence
                        </p>
                        <ul className="mt-3 space-y-1.5 text-sm text-ink-800">
                          {confidenceBreakdown.map((row) => (
                            <li
                              key={row.label}
                              className="flex items-center justify-between"
                            >
                              <span>{row.label}</span>
                              <span className="font-medium">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {modeBreakdown.length > 0 && (
                      <div className="glass-surface rounded-2xl p-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                          Quote mode
                        </p>
                        <ul className="mt-3 space-y-1.5 text-sm text-ink-800">
                          {modeBreakdown.map((row) => (
                            <li
                              key={row.label}
                              className="flex items-center justify-between"
                            >
                              <span>{row.label}</span>
                              <span className="font-medium">{row.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FadeIn>
              )}

              {recentReasons.length > 0 && (
                <FadeIn delay={0.12}>
                  <div className="glass-surface rounded-2xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
                      Recent adjustment notes
                    </p>
                    <ul className="mt-3 space-y-3">
                      {recentReasons.map((q) => (
                        <li
                          key={q.id}
                          className="border-b border-ink-900/5 pb-3 text-sm text-ink-800 last:border-0 last:pb-0"
                        >
                          <p>{q.price_adjustment_reason}</p>
                          <p className="mt-1 text-xs text-ink-700/50">
                            {q.ai_price_min != null && q.ai_price_max != null
                              ? `AI suggested ${money(
                                  q.ai_price_min
                                )}–${money(q.ai_price_max)}`
                              : null}
                            {q.final_price != null &&
                              ` · sent ${money(q.final_price)}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-surface rounded-2xl p-4 text-center">
      <p className="font-display text-xl font-semibold text-ink-900">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-700/50">{label}</p>
    </div>
  );
}
