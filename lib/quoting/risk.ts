// Phase 1 risk assessment — deliberately NOT a vision-model call.
//
// This never looks *inside* a photo. It scores how complete and verifiable
// the customer's request is: how many photos came in, whether a
// description was given, which structured property details are missing,
// and whether the job type is inherently higher-scrutiny. That's a real,
// honest signal — just based on completeness rather than photo content.
// Real photo-content analysis (what's actually visible in the photos) is a
// deliberately separate, later phase that needs a vision-capable model and
// has a real per-call cost — this file must never pretend to do that.

import type { Condition, JobType } from "@/lib/quoting/estimate";

export type RiskLevel = "low" | "medium" | "high";
export type QuoteMode = "instant" | "verification" | "inspection";

export type RiskInput = {
  photoCount: number;
  descriptionLength: number;
  bedroomsKnown: boolean;
  bathroomsKnown: boolean;
  conditionKnown: boolean;
  jobType: JobType;
  condition: Condition | null;
};

export type RiskResult = {
  level: RiskLevel;
  score: number;
  // Company-facing only — never shown to the customer.
  reasons: string[];
  suggestedMode: QuoteMode;
};

const MODE_FOR_LEVEL: Record<RiskLevel, QuoteMode> = {
  low: "instant",
  medium: "verification",
  high: "inspection",
};

export function assessRisk(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.photoCount === 0) {
    score += 2;
    reasons.push("No photos provided with the request");
  } else if (input.photoCount <= 2) {
    score += 1;
    reasons.push("Only 1–2 photos provided");
  }

  if (input.descriptionLength === 0) {
    score += 1;
    reasons.push("No description provided");
  } else if (input.descriptionLength < 15) {
    score += 1;
    reasons.push("Very short description");
  }

  const missingFieldCount = [
    input.bedroomsKnown,
    input.bathroomsKnown,
    input.conditionKnown,
  ].filter((known) => !known).length;
  if (missingFieldCount > 0) {
    score += missingFieldCount;
    reasons.push(
      `${missingFieldCount} property detail${
        missingFieldCount === 1 ? "" : "s"
      } not confirmed`
    );
  }

  if (input.jobType === "end_of_lease") {
    score += 1;
    reasons.push("End-of-lease clean — higher scrutiny job type");
  }

  if (input.condition === "heavy") {
    score += 1;
    reasons.push("Heavy condition self-reported");
  }

  let level: RiskLevel = "low";
  if (score >= 4) level = "high";
  else if (score >= 2) level = "medium";

  if (reasons.length === 0) {
    reasons.push("All details and photos provided");
  }

  return { level, score, reasons, suggestedMode: MODE_FOR_LEVEL[level] };
}
