// Deterministic quote estimation engine — Phase 1 (MVP).
//
// This is intentionally NOT a model call. Every number here traces back to
// a rule a human can read and a company can configure. "AI" in the product
// means this reasoning layer over the company's own rates — not a black
// box. Phase 2 will replace the fixed heuristic constants below (condition
// factors, hours-per-bathroom, etc.) with numbers calibrated from each
// company's own completed-job history; the shape of this function and its
// inputs/outputs should not need to change when that happens.

export type Category = "residential" | "commercial" | "garden";
export type Condition = "light" | "moderate" | "heavy";
export type JobType = "standard" | "deep" | "end_of_lease";
export type Frequency = "one_off" | "recurring";
export type Confidence = "high" | "medium" | "low";

export type PricingRule = {
  base_rate: number; // $/hour for this category
  size_multiplier: number; // extra hours per bedroom
  frequency_discount_percent: number;
};

export type PricingProfile = {
  min_job_charge: number;
  min_cleaners: number;
  labour_cost_per_hour: number;
  margin_target_percent: number;
  gst_included: boolean;
  travel_fee: number;
  addon_oven: number;
  addon_fridge: number;
  addon_windows: number;
  addon_carpet: number;
  addon_other_label: string | null;
  addon_other_price: number;
};

export type QuoteInput = {
  category: Category;
  bedrooms: number | null;
  bathrooms: number | null;
  condition: Condition | null;
  jobType: JobType;
  frequency: Frequency;
  addons: Array<"oven" | "fridge" | "windows" | "carpet" | "other">;
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
  labourCostEstimate: number;
  otherCostEstimate: number;
  profitEstimate: number;
  marginPercent: number;
  belowMarginTarget: boolean;
  addonsTotal: number;
  breakdown: { label: string; amount: number }[];
  reasons: string[];
};

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

const MAX_SINGLE_CLEANER_HOURS = 5;
const SUPPLIES_COST_PER_HOUR = 5;
const GST_RATE = 0.1;

function hoursForBedroomsBathrooms(
  bedrooms: number,
  bathrooms: number,
  rule: PricingRule
) {
  const base = 2; // smallest realistic job
  return base + bedrooms * rule.size_multiplier + bathrooms * 0.5;
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
  rule: PricingRule,
  profile: PricingProfile,
  addonsTotal: number
) {
  const labourCharge = hours * rule.base_rate;
  const beforeDiscount = labourCharge + addonsTotal + profile.travel_fee;
  const discount =
    input.frequency === "recurring"
      ? beforeDiscount * (rule.frequency_discount_percent / 100)
      : 0;
  const subtotal = beforeDiscount - discount;
  const gst = profile.gst_included ? subtotal * GST_RATE : 0;
  const total = Math.max(subtotal + gst, profile.min_job_charge);
  return { total, subtotal, gst, discount, labourCharge };
}

export function estimateQuote(
  input: QuoteInput,
  rule: PricingRule,
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

  const rawHours =
    hoursForBedroomsBathrooms(bedrooms, bathrooms, rule) *
    CONDITION_FACTOR[condition] *
    JOB_TYPE_FACTOR[input.jobType];

  // Uncertainty band: wider when we had to guess at inputs.
  const missingCount = [bedroomsKnown, bathroomsKnown, conditionKnown].filter(
    (known) => !known
  ).length;
  const bandPercent = 0.08 + missingCount * 0.12; // 8% band, +12% per unknown field

  const hoursMid = rawHours;
  const hoursMin = Math.max(1, rawHours * (1 - bandPercent));
  const hoursMax = rawHours * (1 + bandPercent);

  const cleaners = Math.max(
    profile.min_cleaners,
    Math.ceil(hoursMid / MAX_SINGLE_CLEANER_HOURS)
  );
  const perCleanerHoursMin = hoursMin / cleaners;
  const perCleanerHoursMax = hoursMax / cleaners;

  const { total: addonsTotal, lines: addonLines } = addonsTotalFor(
    input,
    profile
  );

  const priceMid = priceForHours(hoursMid, input, rule, profile, addonsTotal);
  const priceMin = priceForHours(hoursMin, input, rule, profile, addonsTotal);
  const priceMax = priceForHours(hoursMax, input, rule, profile, addonsTotal);

  // Confidence: purely a function of input completeness and range width in
  // Phase 1 — there is no historical-similarity signal yet (that's Phase 2).
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

  const labourCostEstimate = hoursMid * profile.labour_cost_per_hour;
  const otherCostEstimate = hoursMid * SUPPLIES_COST_PER_HOUR;
  const revenueExGst = priceMid.subtotal;
  const profitEstimate =
    revenueExGst - labourCostEstimate - otherCostEstimate;
  const marginPercent =
    revenueExGst > 0 ? (profitEstimate / revenueExGst) * 100 : 0;

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
    labourCostEstimate: round0(labourCostEstimate),
    otherCostEstimate: round0(otherCostEstimate),
    profitEstimate: round0(profitEstimate),
    marginPercent: round1(marginPercent),
    belowMarginTarget: marginPercent < profile.margin_target_percent,
    addonsTotal,
    breakdown,
    reasons,
  };
}

function round0(n: number) {
  return Math.round(n);
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
