// Deterministic quote estimation engine — Phase 1 (MVP), now category-aware (V3).
//
// This is intentionally NOT a model call. Every number here traces back to
// a rule a human can read. But the company is never asked to configure that
// rule directly — they only ever tell us plain business facts: how they
// charge, their usual rate, their minimum job price, and their add-on
// prices. Everything else (how bedrooms/bathrooms/condition — or garden
// area/services, floor area, window count, carpet size, etc. — turn into
// hours, how many cleaners a job needs, the recurring-job discount) is a
// hidden, sensible default the company never has to see. Phase 2 will
// replace these hidden defaults with numbers calibrated from each
// company's own completed-job history; the shape of this function and its
// inputs/outputs should not need to change when that happens.
//
// IMPORTANT: the residential branch below (estimateResidential) reproduces
// the original Phase-1 formula byte-for-byte — same hidden constants, same
// reasons text, same rounding — so existing residential quotes/behaviour
// are unaffected by this rewrite. Every other category is new.

import type { Category, Answers } from "@/lib/quoting/categories";

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

// Category-specific structured answers captured by the dynamic booking
// form (garden services, commercial floor area, window count, etc.).
export type ServiceDetails = Answers;

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
  category: Category;
  // Residential-specific — only meaningful (and only read) when
  // category === "residential", to keep that path's behaviour unchanged.
  bedrooms: number | null;
  bathrooms: number | null;
  condition: Condition | null;
  jobType: JobType;
  // Shared across every category — drives the recurring-job discount.
  frequency: Frequency;
  addons: AddonKey[];
  // Category-specific structured answers for every non-residential
  // category (and, going forward, extra residential detail too).
  serviceDetails: ServiceDetails;
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
  // How many "key" signals for this category were missing/unconfirmed —
  // exposed so risk.ts doesn't need its own category-specific logic.
  missingFieldCount: number;
};

// ---------------------------------------------------------------------
// Hidden defaults — residential (unchanged from Phase 1).
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// Hidden defaults — commercial.
// ---------------------------------------------------------------------
const COMMERCIAL_HOURS_PER_100SQM = 1.1;
const COMMERCIAL_HOURS_PER_ROOM = 0.4;
const COMMERCIAL_TYPE_FACTOR: Record<string, number> = {
  general: 1.0,
  deep: 1.4,
  end_of_lease: 1.5,
  after_renovation: 1.6,
  pre_post_event: 1.2,
  other: 1.1,
};
const COMMERCIAL_AREA_MIDPOINT: Record<string, number> = {
  "<100": 75,
  "100-250": 175,
  "250-500": 375,
  "500-1000": 750,
  "1000-2500": 1750,
  "2500+": 3000,
};

// ---------------------------------------------------------------------
// Hidden defaults — garden.
// ---------------------------------------------------------------------
const GARDEN_AREA_MIDPOINT: Record<string, number> = {
  "<50": 35,
  "50-100": 75,
  "100-250": 175,
  "250-500": 375,
  "500-1000": 750,
  "1000+": 1200,
};
const GARDEN_SERVICE_HOURS: Record<string, number> = {
  lawn_mowing: 0.5,
  edging: 0.3,
  hedge_trimming: 1,
  pruning: 1,
  weeding: 1,
  leaf_removal: 0.5,
  green_waste_removal: 0.5,
  garden_cleanup: 1.5,
  pressure_washing: 1.5,
  other: 1,
};
const GARDEN_CONDITION_FACTOR: Record<string, number> = {
  light: 0.9,
  moderate: 1.15,
  heavy_overgrown: 1.5,
};

// ---------------------------------------------------------------------
// Hidden defaults — windows.
// ---------------------------------------------------------------------
const WINDOW_SIZE_BAND_HOURS: Record<string, number> = {
  small: 1.5,
  medium: 3,
  large_property: 5,
};
const WINDOW_HOURS_PER_WINDOW = 0.08;
const WINDOW_SCOPE_FACTOR: Record<string, number> = {
  inside_only: 1,
  outside_only: 0.85,
  inside_and_outside: 1.6,
};
const WINDOW_FLOORS_FACTOR: Record<string, number> = {
  "1": 1,
  "2": 1.15,
  "3+": 1.35,
};

// ---------------------------------------------------------------------
// Hidden defaults — carpet.
// ---------------------------------------------------------------------
const CARPET_HOURS_PER_ROOM = 0.5;
const CARPET_HOURS_PER_SQM = 0.05;
const CARPET_CONDITION_FACTOR: Record<string, number> = {
  light: 0.9,
  moderate: 1.1,
  heavy: 1.4,
};
const CARPET_STAIRS_HOURS = 0.5;
const CARPET_STAINS_HOURS: Record<string, number> = {
  none: 0,
  some: 0.2,
  heavy: 0.6,
};

// ---------------------------------------------------------------------
// Hidden defaults — other (unstructured / custom jobs).
// ---------------------------------------------------------------------
const OTHER_DEFAULT_HOURS = 3;

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

// A field counts as "known" only when it's a non-empty, meaningful value —
// shared helpers so each category's missing-field count is computed the
// same way.
function countMissing(flags: boolean[]) {
  return flags.filter((present) => !present).length;
}

type CategoryHoursResult = {
  hours: number;
  missingCount: number;
  reasons: string[];
};

function commercialEstimate(d: ServiceDetails): CategoryHoursResult {
  const areaKey = typeof d.floor_area_band === "string" ? d.floor_area_band : undefined;
  const area = areaKey ? COMMERCIAL_AREA_MIDPOINT[areaKey] : undefined;
  const rooms = Number(d.rooms_work_areas) || 0;
  const typeKey = typeof d.cleaning_type === "string" ? d.cleaning_type : undefined;
  const factor = COMMERCIAL_TYPE_FACTOR[typeKey ?? "general"] ?? 1;
  const baseArea = ((area ?? 175) / 100) * COMMERCIAL_HOURS_PER_100SQM;
  const roomsHours = rooms * COMMERCIAL_HOURS_PER_ROOM;
  const hours = Math.max(1, (baseArea + roomsHours + 1) * factor);
  return {
    hours,
    missingCount: countMissing([area != null, !!typeKey]),
    reasons: [
      area != null ? `~${areaKey} sqm commercial space` : "Floor area not confirmed",
      typeKey ? `${typeKey.replace(/_/g, " ")} clean` : "Cleaning type not confirmed",
    ],
  };
}

function gardenEstimate(d: ServiceDetails): CategoryHoursResult {
  const areaKey = typeof d.area_band === "string" ? d.area_band : undefined;
  const area = areaKey ? GARDEN_AREA_MIDPOINT[areaKey] : undefined;
  const services = Array.isArray(d.services) ? (d.services as string[]) : [];
  const conditionKey = typeof d.condition === "string" ? d.condition : undefined;
  const factor = GARDEN_CONDITION_FACTOR[conditionKey ?? "moderate"] ?? 1;
  const baseArea = ((area ?? 175) / 100) * 0.6;
  let serviceHours = services.reduce(
    (sum, s) => sum + (GARDEN_SERVICE_HOURS[s] ?? 0.5),
    0
  );
  const hedgeLength = Number(d.hedge_length_m) || 0;
  if (services.includes("hedge_trimming") && hedgeLength > 0) {
    // A known hedge length is a better signal than the flat per-service
    // default — swap it in.
    serviceHours = serviceHours - GARDEN_SERVICE_HOURS.hedge_trimming + Math.max(0.5, hedgeLength / 10);
  }
  const hours = Math.max(1, (baseArea + serviceHours) * factor);
  return {
    hours,
    missingCount: countMissing([area != null, services.length > 0]),
    reasons: [
      area != null ? `~${areaKey} sqm garden` : "Garden size not confirmed",
      services.length > 0
        ? `${services.length} service${services.length === 1 ? "" : "s"} requested`
        : "Services not specified",
    ],
  };
}

function windowsEstimate(d: ServiceDetails): CategoryHoursResult {
  const count = Number(d.window_count) || 0;
  const sizeKey = typeof d.size_band === "string" ? d.size_band : undefined;
  const scopeKey = typeof d.scope === "string" ? d.scope : undefined;
  const floorsKey = typeof d.floors === "string" ? d.floors : undefined;
  const base =
    count > 0 ? count * WINDOW_HOURS_PER_WINDOW : WINDOW_SIZE_BAND_HOURS[sizeKey ?? "medium"] ?? 3;
  const scopeFactor = WINDOW_SCOPE_FACTOR[scopeKey ?? "inside_and_outside"] ?? 1.6;
  const floorsFactor = WINDOW_FLOORS_FACTOR[floorsKey ?? "1"] ?? 1;
  const hours = Math.max(1, base * scopeFactor * floorsFactor);
  return {
    hours,
    missingCount: countMissing([count > 0 || sizeKey != null, scopeKey != null]),
    reasons: [
      count > 0
        ? `~${count} windows`
        : sizeKey
        ? `${sizeKey.replace(/_/g, " ")} job`
        : "Job size not confirmed",
      scopeKey ? scopeKey.replace(/_/g, " ") : "Inside/outside scope not confirmed",
    ],
  };
}

function carpetEstimate(d: ServiceDetails): CategoryHoursResult {
  const rooms = Number(d.rooms) || 0;
  const sqm = Number(d.carpet_area_sqm) || 0;
  const conditionKey = typeof d.condition === "string" ? d.condition : undefined;
  const stairsKey = typeof d.stairs === "string" ? d.stairs : undefined;
  const stainsKey = typeof d.stains === "string" ? d.stains : undefined;
  const base = sqm > 0 ? sqm * CARPET_HOURS_PER_SQM : rooms > 0 ? rooms * CARPET_HOURS_PER_ROOM : 2;
  const factor = CARPET_CONDITION_FACTOR[conditionKey ?? "moderate"] ?? 1;
  const stairsHours = stairsKey === "yes" ? CARPET_STAIRS_HOURS : 0;
  const stainsHours = CARPET_STAINS_HOURS[stainsKey ?? "none"] ?? 0;
  const hours = Math.max(1, base * factor + stairsHours + stainsHours);
  return {
    hours,
    missingCount: countMissing([rooms > 0 || sqm > 0, !!conditionKey]),
    reasons: [
      sqm > 0
        ? `~${sqm} sqm of carpet`
        : rooms > 0
        ? `${rooms} room${rooms === 1 ? "" : "s"}`
        : "Carpet area not confirmed",
      conditionKey ? `${conditionKey} condition` : "Condition not confirmed",
    ],
  };
}

function otherEstimate(): CategoryHoursResult {
  return {
    hours: OTHER_DEFAULT_HOURS,
    missingCount: 3,
    reasons: [
      "Custom job — no structured details captured, worth a closer look before quoting",
    ],
  };
}

// Shared finishing pipeline: turns a category's raw hours + missing-field
// count into the full priced estimate (band width, cleaners, addons,
// pricing, confidence, breakdown). Used by every category so the pricing
// math itself never diverges between residential and everything else.
function finalizeEstimate(
  rawHours: number,
  missingCount: number,
  input: QuoteInput,
  profile: PricingProfile,
  reasons: string[],
  summary: string
): QuoteEstimate {
  const rate = effectiveHourlyRate(profile);

  // Uncertainty band: wider when we had to guess at inputs.
  const bandPercent = 0.08 + missingCount * 0.12; // 8% band, +12% per unknown field

  const hoursMid = rawHours;
  const hoursMin = Math.max(1, rawHours * (1 - bandPercent));
  const hoursMax = rawHours * (1 + bandPercent);

  const cleaners = Math.max(1, Math.ceil(hoursMid / MAX_SINGLE_CLEANER_HOURS));
  const perCleanerHoursMin = hoursMin / cleaners;
  const perCleanerHoursMax = hoursMax / cleaners;

  const { total: addonsTotal, lines: addonLines } = addonsTotalFor(input, profile);

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
    missingFieldCount: missingCount,
  };
}

function estimateResidential(input: QuoteInput, profile: PricingProfile): QuoteEstimate {
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

  const rawHours = rawHoursFor(bedrooms, bathrooms, condition, input.jobType);
  const missingCount = [bedroomsKnown, bathroomsKnown, conditionKnown].filter(
    (known) => !known
  ).length;

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

  return finalizeEstimate(rawHours, missingCount, input, profile, reasons, summary);
}

function estimateNonResidential(input: QuoteInput, profile: PricingProfile): QuoteEstimate {
  const details = input.serviceDetails ?? {};
  const categoryResult =
    input.category === "commercial"
      ? commercialEstimate(details)
      : input.category === "garden"
      ? gardenEstimate(details)
      : input.category === "windows"
      ? windowsEstimate(details)
      : input.category === "carpet"
      ? carpetEstimate(details)
      : otherEstimate();

  const reasons = [...categoryResult.reasons];
  if (input.frequency === "recurring") reasons.push("Recurring — discount applied");
  reasons.push(
    categoryResult.missingCount === 0
      ? "All details confirmed by customer"
      : `${categoryResult.missingCount} detail${
          categoryResult.missingCount === 1 ? "" : "s"
        } estimated`
  );

  const rateLabel =
    profile.pricing_model === "hourly"
      ? `your usual $${round0(profile.hourly_rate)}/hour rate`
      : "your usual job rate";
  const jobLabel = input.category === "other" ? "this job" : `this ${input.category} job`;
  const summary = `Based on ${rateLabel} and the details provided for ${jobLabel}.`;

  return finalizeEstimate(
    categoryResult.hours,
    categoryResult.missingCount,
    input,
    profile,
    reasons,
    summary
  );
}

export function estimateQuote(
  input: QuoteInput,
  profile: PricingProfile
): QuoteEstimate {
  if (input.category && input.category !== "residential") {
    return estimateNonResidential(input, profile);
  }
  return estimateResidential(input, profile);
}

// Encodes which self-reported signals warrant extra company scrutiny —
// still never anything to do with photo *content*, just facts the
// customer themselves reported. Kept here (next to the category
// formulas) so risk.ts can stay a plain, category-agnostic scorer.
export function isHighScrutiny(input: QuoteInput): boolean {
  const d = input.serviceDetails ?? {};
  switch (input.category) {
    case "residential":
      return input.jobType === "end_of_lease" || input.condition === "heavy";
    case "garden":
      return d.condition === "heavy_overgrown";
    case "commercial":
      return d.cleaning_type === "end_of_lease" || d.cleaning_type === "after_renovation";
    case "carpet":
      return d.condition === "heavy" || d.stains === "heavy";
    case "windows":
      return d.window_type === "high_access";
    case "other":
      return true;
    default:
      return false;
  }
}

function round0(n: number) {
  return Math.round(n);
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
