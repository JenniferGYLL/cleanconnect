// Deterministic parsing of a spoken booking description — deliberately
// NOT an LLM call (Jennifer's explicit choice: free, rule-based, works
// today with no API key). The browser's own speech recognition turns
// voice into a text transcript; this file turns that transcript into
// best-guess form answers. It is intentionally conservative: it only ever
// *pre-fills* fields, the customer always sees and can correct every field
// before submitting, and it never invents values it isn't reasonably sure
// about.

import type { Category, Answers } from "@/lib/quoting/categories";

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const NUMBER_PATTERN = `(\\d+|${Object.keys(WORD_NUMBERS).join("|")})`;

function extractNumberBefore(text: string, keywordAlternation: string): number | null {
  const match = text.match(new RegExp(`${NUMBER_PATTERN}\\s*-?\\s*(?:${keywordAlternation})`, "i"));
  if (!match) return null;
  const raw = match[1].toLowerCase();
  const value = WORD_NUMBERS[raw] ?? parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export type VoiceParseResult = {
  category: Category | null;
  answers: Partial<Answers>;
  matchedCategory: boolean;
};

export function parseVoiceTranscript(transcriptRaw: string): VoiceParseResult {
  const text = transcriptRaw.toLowerCase();
  const answers: Partial<Answers> = {};

  let category: Category | null = null;
  if (/\boffice\b|\bcommercial\b|\bworkplace\b|\bwarehouse\b|\bretail\b|\bshop\b/.test(text)) {
    category = "commercial";
  } else if (/\bgarden\b|\blawn\b|\byard\b|\bhedge\b|\boutdoor\b|\bmowing\b/.test(text)) {
    category = "garden";
  } else if (/\bwindows?\b/.test(text)) {
    category = "windows";
  } else if (/\bcarpet\b|\brug\b/.test(text)) {
    category = "carpet";
  } else if (
    /\bhouse\b|\bapartment\b|\bhome\b|\bflat\b|\bunit\b|\btownhouse\b|\bbedroom|\bbathroom/.test(
      text
    )
  ) {
    category = "residential";
  }

  if (category === "residential" || category === null) {
    const bedrooms = extractNumberBefore(text, "bed(?:room)?s?");
    const bathrooms = extractNumberBefore(text, "bath(?:room)?s?");
    if (bedrooms != null) answers.bedrooms = bedrooms >= 6 ? "6+" : String(bedrooms);
    if (bathrooms != null) answers.bathrooms = bathrooms >= 4 ? "4+" : String(bathrooms);

    if (/\bapartment\b|\bflat\b|\bunit\b/.test(text)) answers.property_type = "apartment";
    else if (/\btownhouse\b/.test(text)) answers.property_type = "townhouse";
    else if (/\bhouse\b/.test(text)) answers.property_type = "house";

    if (/\bend of lease\b|\bmove(?:d|ing)? out\b|\bbond clean/.test(text)) {
      answers.cleaning_type = "end_of_lease";
    } else if (/\bmove(?:d|ing)? in\b/.test(text)) {
      answers.cleaning_type = "move_in";
    } else if (/\bdeep clean/.test(text)) {
      answers.cleaning_type = "deep";
    } else if (/\bregular\b|\bstandard\b/.test(text)) {
      answers.cleaning_type = "regular";
    }

    if (/\bweekly\b/.test(text)) answers.frequency = "weekly";
    else if (/\bfortnightly\b|\bevery (?:two|2) weeks\b/.test(text)) answers.frequency = "fortnightly";
    else if (/\bmonthly\b/.test(text)) answers.frequency = "monthly";
    else if (/\bone[- ]off\b|\bjust once\b|\bonce off\b/.test(text)) answers.frequency = "one_off";

    if (/\bheavy\b|\bhasn'?t been cleaned\b|\bvery dirty\b|\bfilthy\b/.test(text)) {
      answers.condition = "heavy";
    } else if (/\blight\b|\bwell maintained\b|\bpretty clean\b/.test(text)) {
      answers.condition = "light";
    } else if (/\bmoderate\b|\baverage\b/.test(text)) {
      answers.condition = "moderate";
    }

    if (/\bpets?\b|\bdog\b|\bcat\b/.test(text)) answers.pets = true;
    if (/\bstairs?\b|\btwo stor(?:y|ey)\b|\bdouble stor(?:y|ey)\b/.test(text)) answers.stairs = true;
  }

  if (category === "garden") {
    const services: string[] = [];
    if (/\bmow/.test(text)) services.push("lawn_mowing");
    if (/\bedg/.test(text)) services.push("edging");
    if (/\bhedge/.test(text)) services.push("hedge_trimming");
    if (/\bprun/.test(text)) services.push("pruning");
    if (/\bweed/.test(text)) services.push("weeding");
    if (/\bleaf|leaves\b/.test(text)) services.push("leaf_removal");
    if (/\bgreen waste\b/.test(text)) services.push("green_waste_removal");
    if (/\bclean ?up\b/.test(text)) services.push("garden_cleanup");
    if (/\bpressure wash/.test(text)) services.push("pressure_washing");
    if (services.length > 0) answers.services = services;

    if (/\bovergrown\b|\bhasn'?t been (?:touched|done)\b/.test(text)) {
      answers.condition = "heavy_overgrown";
    } else if (/\blight\b/.test(text)) {
      answers.condition = "light";
    } else if (/\bmoderate\b/.test(text)) {
      answers.condition = "moderate";
    }
  }

  if (category === "windows") {
    const windowCount = extractNumberBefore(text, "windows?");
    if (windowCount != null) answers.window_count = windowCount;
    if (/\binside and outside\b|\bboth sides\b/.test(text)) answers.scope = "inside_and_outside";
    else if (/\boutside\b/.test(text)) answers.scope = "outside_only";
    else if (/\binside\b/.test(text)) answers.scope = "inside_only";
  }

  if (category === "commercial") {
    const employees = extractNumberBefore(text, "(?:employees|staff|people)");
    if (employees != null) answers.employees_occupants = employees;
    if (/\boffice\b/.test(text)) answers.business_type = "office";
    else if (/\bretail\b|\bshop\b/.test(text)) answers.business_type = "retail";
    else if (/\bwarehouse\b/.test(text)) answers.business_type = "warehouse";
    else if (/\brestaurant\b|\bcafe\b/.test(text)) answers.business_type = "restaurant";
  }

  if (category === "carpet") {
    const rooms = extractNumberBefore(text, "rooms?");
    if (rooms != null) answers.rooms = rooms;
    if (/\bstain/.test(text)) answers.stains = "some";
    if (/\bheavy stain|\blots of stains\b/.test(text)) answers.stains = "heavy";
  }

  return { category, answers, matchedCategory: category != null };
}
