// Deterministic quote estimation engine — Phase 1 (MVP).
//
// This is intentionally NOT a model call. Every number here traces back to
// a rule a human can read. But the company is never asked to configure that
// rule directly — they only ever tell us plain business facts: how they
// charge, their usual rate, their minimum job price, and their add-on
// prices. Everything else (how bedrooms/bathrooms/condition turn into
// hours, how many cleaners a job needs, the recurring-job discount) is a
// hidden, sensible default the company never has to see. Phase 2 will
// replace these hidden defaults with numbers calibrated from each
// company's own completed-job history; the shape of this function and its
// inputs/outputs should not need to change when that happens.

export type PricingModel = "hourly" | "per_job";
export type Condition = "light" | "moderate" | "heavy";
export type JobType = "standard" | "deep" | "end_of_lease";
export type Frequency = "one_off" | "recurring";
export type Confidence = "high" | "medium" | "low";
export type AddonKey =
  | "oven"
  | "fridge"
  | "windows"
  | "carpet"
  | "high_access"
  | "other";

export type PricingProfile = {
  pricing_model: PricingModel;
  hourly_rate: number; // "Your usual rate" ($/cleaner/hour) — used when pricing_model === "hourly".
  flat_job_rate: number; // "Your usual price for a standard job" — used when pricing_model === "per_job".
  min_job_charge: number;
  gst_included: boolean;
  travel_fee: number;
  addon_oven: number;
  addon_fridge: number;
  addon_windows: number;
  addon_carpet: number;
  addon_high_access: number;
  addon_other_label: string | null;
  addon_other_price: number;
};

export type QuoteInput = {
  bedrooms: number | null;
  bathrooms: number | null;
  condition: Condition | null;
  jobType: JobType;
  frequency: Frequency;
  addons: AddonKey[];
};

export type QuoteEstimate = {
  hoursMid: number;
  hoursMin: number;
  hoursMax: number;
  perCleanerHoursMin: number;
  perCleanerHoursMax: number;
  cleaners: number;
  priceMid: number;
  priceMin: number;
  priceMax: number;
  confidence: Confidence;
  confidenceReason: string;
  addonsTotal: number;
  breakdown: { label: string; amount: number }[];
  reasons: string[];
  summary: string;
};

// Hidden defaults — the company never sees or configures these.
const HOURS_BASE = 2;
const HOURS_PER_BEDROOM = 0.9;
const HOURS_PER_BATHROOM = 0.5;
const CONDITION_FACTOR: Record<Condition, number> = {
  light: 0.9,
  moderate: 1.15,
  heavy: 1.35,
};
const JOB_TYPE_FACTOR: Record<JobType, number> = {
  standard: 1.0,
  deep: 1.3,
  end_of_lease: 1.5,
};
const RECURRING_DISCOUNT_PERCENT = 10;
const MAX_SINGLE_CLEANER_HOURS = 5;
const GST_RATE = 0.1;

// A "standard job" baseline, used only to translate a per-job flat rate
// into an equivalent hourly rate so both pricing models share one formula.
const BASELINE_BEDROOMS = 3;
const BASELINE_BATHROOMS = 1;
const BASELINE_CONDITION: Condition = "moderate";

function rawHoursFor(
  bedrooms: number,
  bathrooms: number,
  condition: Condition,
  jobType: JobType
) {
  const base = HOURS_BASE + bedrooms * HOURS_PER_BEDROOM + bathrooms * HOURS_PER_BATHROOM;
  return base * CONDITION_FACTOR[condition] * JOB_TYPE_FACTOR[jobType];
}

function effectiveHourlyRate(profile: PricingProfile): number {
  if (profile.pricing_model === "hourly") return profile.hourly_rate;
  const baselineHours = rawHoursFor(
    BASELINE_BEDROOMS,
    BASELINE_BATHROOMS,
    BASELINE_CONDITION,
    "standard"
  );
  return baselineHours > 0 ? profile.flat_job_rate / baselineHours : profile.flat_job_rate;
}

function addonsTotalFor(input: QuoteInput, profile: PricingProfile) {
  let total = 0;
  const lines: { label: string; amount: number }[] = [];
  if (input.addons.includes("oven") && profile.addon_oven > 0) {
    total += profile.addon_oven;
    lines.push({ label: "Oven", amount: profile.addon_oven });
  }
  if (input.addons.includes("fridge") && profile.addon_fridge > 0) {
    total += profile.addon_fridge;
    lines.push({ label: "Fridge", amount: profile.addon_fridge });
  }
  if (input.addons.includes("windows") && profile.addon_windows > 0) {
    total += profile.addon_windows;
    lines.push({ label: "Windows", amount: profile.addon_windows });
  }
  if (input.addons.includes("carpet") && profile.addon_carpet > 0) {
    total += profile.addon_carpet;
    lines.push({ label: "Carpet", amount: profile.addon_carpet });
  }
  if (input.addons.includes("high_access") && profile.addon_high_access > 0) {
    total += profile.addon_high_access;
    lines.push({ label: "High-access cleaning", amount: profile.addon_high_access });
  }
  if (input.addons.includes("other") && profile.addon_other_price > 0) {
    total += profile.addon_other_price;
    lines.push({
      label: profile.addon_other_label || "Other",
      amount: profile.addon_other_price,
    });
  }
  return { total, lines };
}

function priceForHours(
  hours: number,
  input: QuoteInput,
  rate: number,
  profile: PricingProfile,
  addonsTotal: number
) {
  const labourCharge = hours * rate;
  const beforeDiscount = labourCharge + addonsTotal + profile.travel_fee;
  const discount =
    input.frequency === "recurring"
      ? beforeDiscount * (RECURRING_DISCOUNT_PERCENT / 100)
      : 0;
  const subtotal = beforeDiscount - discount;
  const gst = profile.gst_included ? subtotal * GST_RATE : 0;
  const total = Math.max(subtotal + gst, profile.min_job_charge);
  return { total, subtotal, gst, discount, labourCharge };
}

export function estimateQuote(
  input: QuoteInput,
  profile: PricingProfile
): QuoteEstimate {
  const reasons: string[] = [];

  const bedroomsKnown = input.bedrooms != null && input.bedrooms >= 0;
  const bathroomsKnown = input.bathrooms != null && input.bathrooms >= 0;
  const conditionKnown = input.condition != null;

  const bedrooms = input.bedrooms ?? 2; // conservative default when missing
  const bathrooms = input.bathrooms ?? 1;
  const condition: Condition = input.condition ?? "moderate";

  reasons.push(
    `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}, ${bathrooms} bathroom${
      bathrooms === 1 ? "" : "s"
    }`
  );
  if (input.jobType !== "standard") {
    reasons.push(
      input.jobType === "end_of_lease" ? "End-of-lease clean" : "Deep clean"
    );
  }
  reasons.push(
    `${condition[0].toUpperCase()}${condition.slice(1)} condition`
  );
  if (input.frequency === "recurring") {
    reasons.push("Recurring — discount applied");
  }

  const rate = effectiveHourlyRate(profile);
  const rawHours = rawHoursFor(bedrooms, bathrooms, condition, input.jobType);

  // Uncertainty band: wider when we had to guess at inputs.
  const missingCount = [bedroomsKnown, bathroomsKnown, conditionKnown].filter(
    (known) => !known
  ).length;
  const bandPercent = 0.08 + missingCount * 0.12; // 8% band, +12% per unknown field

  const hoursMid = rawHours;
  const hoursMin = Math.max(1, rawHours * (1 - bandPercent));
  const hoursMax = rawHours * (1 + bandPercent);

  const cleaners = Math.max(1, Math.ceil(hoursMid / MAX_SINGLE_CLEANER_HOURS));
  const perCleanerHoursMin = hoursMin / cleaners;
  const perCleanerHoursMax = hoursMax / cleaners;

  const { total: addonsTotal, lines: addonLines } = addonsTotalFor(
    input,
    profile
  );

  const priceMid = priceForHours(hoursMid, input, rate, profile, addonsTotal);
  const priceMin = priceForHours(hoursMin, input, rate, profile, addonsTotal);
  const priceMax = priceForHours(hoursMax, input, rate, profile, addonsTotal);

  // Confidence: purely a function of input completeness in Phase 1 — there
  // is no historical-similarity signal yet (that's Phase 2).
  let confidence: Confidence = "high";
  let confidenceReason = "All key details provided.";
  if (missingCount === 1) {
    confidence = "medium";
    confidenceReason = "One detail was estimated rather than confirmed.";
  } else if (missingCount >= 2) {
    confidence = "low";
    confidenceReason =
      "Several details are unconfirmed — the range below is wide on purpose.";
  }

  const breakdown = [
    { label: "Labour", amount: priceMid.labourCharge },
    ...addonLines,
    { label: "Travel", amount: profile.travel_fee },
    ...(priceMid.discount > 0
      ? [{ label: "Recurring discount", amount: -priceMid.discount }]
      : []),
    { label: "GST", amount: priceMid.gst },
  ].filter((line) => line.amount !== 0);

  if (bedroomsKnown && bathroomsKnown && conditionKnown) {
    reasons.push("All details confirmed by customer");
  } else {
    reasons.push(
      `${missingCount} detail${missingCount === 1 ? "" : "s"} estimated`
    );
  }

  const rateLabel =
    profile.pricing_model === "hourly"
      ? `your usual $${round0(profile.hourly_rate)}/hour rate`
      : "your usual job rate";
  const summary = `Based on ${rateLabel} and the property details provided.`;

  return {
    hoursMid: round1(hoursMid),
    hoursMin: round1(hoursMin),
    hoursMax: round1(hoursMax),
    perCleanerHoursMin: round1(perCleanerHoursMin),
    perCleanerHoursMax: round1(perCleanerHoursMax),
    cleaners,
    priceMid: round0(priceMid.total),
    priceMin: round0(priceMin.total),
    priceMax: round0(priceMax.total),
    confidence,
    confidenceReason,
    addonsTotal,
    breakdown,
    reasons,
    summary,
  };
}

function round0(n: number) {
  return Math.round(n);
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
