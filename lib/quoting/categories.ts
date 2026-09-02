// Declarative config for the "type of clean" dynamic booking form and for
// how each category's answers get labeled back to the company. Adding a
// new service type later means adding one entry here — BookingForm and the
// company-side summary both read from this, nothing is hard-coded per
// category in the UI components themselves.

export type Category =
  | "residential"
  | "commercial"
  | "garden"
  | "windows"
  | "carpet"
  | "other";

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "residential", label: "Residential" },
  { key: "commercial", label: "Commercial / Office" },
  { key: "garden", label: "Garden / Outdoor" },
  { key: "windows", label: "Windows" },
  { key: "carpet", label: "Carpet" },
  { key: "other", label: "Other" },
];

export type FieldOption = { value: string; label: string };

export type Answers = Record<string, string | number | boolean | string[] | undefined>;

type BaseField = {
  key: string;
  label: string;
  optional?: boolean;
  showIf?: (answers: Answers) => boolean;
};

export type FieldDef =
  | (BaseField & { type: "select"; options: FieldOption[] })
  | (BaseField & { type: "multiselect"; options: FieldOption[] })
  | (BaseField & { type: "number"; placeholder?: string })
  | (BaseField & { type: "checkbox" });

export const CATEGORY_FIELDS: Record<Category, FieldDef[]> = {
  residential: [
    {
      key: "property_type",
      label: "Property type",
      type: "select",
      optional: true,
      options: [
        { value: "house", label: "House" },
        { value: "apartment", label: "Apartment" },
        { value: "townhouse", label: "Townhouse" },
        { value: "unit", label: "Unit" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "bedrooms",
      label: "Bedrooms",
      type: "select",
      optional: true,
      options: ["1", "2", "3", "4", "5", "6+"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "bathrooms",
      label: "Bathrooms",
      type: "select",
      optional: true,
      options: ["1", "2", "3", "4+"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "living_areas",
      label: "Living areas",
      type: "select",
      optional: true,
      options: ["1", "2", "3", "4+"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "property_size_sqm",
      label: "Property size (sqm, approximate)",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
    {
      key: "cleaning_type",
      label: "Cleaning type",
      type: "select",
      optional: true,
      options: [
        { value: "regular", label: "Regular clean" },
        { value: "deep", label: "Deep clean" },
        { value: "end_of_lease", label: "End of lease" },
        { value: "move_in", label: "Move in" },
        { value: "move_out", label: "Move out" },
      ],
    },
    {
      key: "frequency",
      label: "Frequency",
      type: "select",
      optional: true,
      options: [
        { value: "one_off", label: "One-off" },
        { value: "weekly", label: "Weekly" },
        { value: "fortnightly", label: "Fortnightly" },
        { value: "monthly", label: "Monthly" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      optional: true,
      options: [
        { value: "light", label: "Light — regularly maintained" },
        { value: "moderate", label: "Moderate — average wear" },
        { value: "heavy", label: "Heavy — hasn't been cleaned in a while" },
      ],
    },
    { key: "pets", label: "There are pets in the home", type: "checkbox", optional: true },
    { key: "stairs", label: "Property has stairs", type: "checkbox", optional: true },
    {
      key: "needs_oven",
      label: "Oven needs cleaning",
      type: "checkbox",
      optional: true,
      showIf: (a) => a.cleaning_type === "end_of_lease",
    },
    {
      key: "needs_windows",
      label: "Windows need cleaning",
      type: "checkbox",
      optional: true,
      showIf: (a) => a.cleaning_type === "end_of_lease",
    },
    {
      key: "needs_carpet",
      label: "Carpets need cleaning",
      type: "checkbox",
      optional: true,
      showIf: (a) => a.cleaning_type === "end_of_lease",
    },
    {
      key: "has_garage",
      label: "Garage included",
      type: "checkbox",
      optional: true,
      showIf: (a) => a.cleaning_type === "end_of_lease",
    },
    {
      key: "has_balcony",
      label: "Balcony included",
      type: "checkbox",
      optional: true,
      showIf: (a) => a.cleaning_type === "end_of_lease",
    },
  ],

  commercial: [
    {
      key: "business_type",
      label: "Business / property type",
      type: "select",
      optional: true,
      options: [
        { value: "office", label: "Office" },
        { value: "retail", label: "Retail" },
        { value: "warehouse", label: "Warehouse" },
        { value: "medical", label: "Medical" },
        { value: "restaurant", label: "Restaurant / hospitality" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "floor_area_band",
      label: "Approximate floor area",
      type: "select",
      optional: true,
      options: [
        { value: "<100", label: "< 100 sqm" },
        { value: "100-250", label: "100–250 sqm" },
        { value: "250-500", label: "250–500 sqm" },
        { value: "500-1000", label: "500–1,000 sqm" },
        { value: "1000-2500", label: "1,000–2,500 sqm" },
        { value: "2500+", label: "2,500+ sqm" },
      ],
    },
    {
      key: "floors",
      label: "Number of floors",
      type: "select",
      optional: true,
      options: ["1", "2", "3", "4+"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "rooms_work_areas",
      label: "Number of rooms / work areas",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
    {
      key: "bathrooms_amenities",
      label: "Bathrooms / amenities",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
    {
      key: "cleaning_frequency",
      label: "Cleaning frequency",
      type: "select",
      optional: true,
      options: [
        { value: "one_off", label: "One-off" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "fortnightly", label: "Fortnightly" },
        { value: "monthly", label: "Monthly" },
        { value: "custom", label: "Custom" },
      ],
    },
    {
      key: "cleaning_type",
      label: "Cleaning type",
      type: "select",
      optional: true,
      options: [
        { value: "general", label: "General office cleaning" },
        { value: "deep", label: "Deep cleaning" },
        { value: "end_of_lease", label: "End of lease" },
        { value: "after_renovation", label: "After renovation" },
        { value: "pre_post_event", label: "Pre/post event" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "preferred_time",
      label: "Operating hours / preferred cleaning time",
      type: "select",
      optional: true,
      options: [
        { value: "business_hours", label: "Business hours" },
        { value: "after_hours", label: "After hours" },
        { value: "weekend", label: "Weekend" },
        { value: "flexible", label: "Flexible" },
      ],
    },
    {
      key: "employees_occupants",
      label: "Number of employees / occupants",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
  ],

  garden: [
    {
      key: "property_type",
      label: "Property type",
      type: "select",
      optional: true,
      options: [
        { value: "residential", label: "Residential" },
        { value: "commercial", label: "Commercial" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "area_band",
      label: "Approximate garden / outdoor area",
      type: "select",
      optional: true,
      options: [
        { value: "<50", label: "< 50 sqm" },
        { value: "50-100", label: "50–100 sqm" },
        { value: "100-250", label: "100–250 sqm" },
        { value: "250-500", label: "250–500 sqm" },
        { value: "500-1000", label: "500–1,000 sqm" },
        { value: "1000+", label: "1,000+ sqm" },
      ],
    },
    {
      key: "services",
      label: "Services required",
      type: "multiselect",
      optional: true,
      options: [
        { value: "lawn_mowing", label: "Lawn mowing" },
        { value: "edging", label: "Edging" },
        { value: "hedge_trimming", label: "Hedge trimming" },
        { value: "pruning", label: "Pruning" },
        { value: "weeding", label: "Weeding" },
        { value: "leaf_removal", label: "Leaf removal" },
        { value: "green_waste_removal", label: "Green waste removal" },
        { value: "garden_cleanup", label: "Garden clean-up" },
        { value: "pressure_washing", label: "Pressure washing" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "hedge_length_m",
      label: "Approximate hedge length (metres)",
      type: "number",
      optional: true,
      placeholder: "Optional",
      showIf: (a) => Array.isArray(a.services) && a.services.includes("hedge_trimming"),
    },
    {
      key: "condition",
      label: "Garden condition",
      type: "select",
      optional: true,
      options: [
        { value: "light", label: "Light" },
        { value: "moderate", label: "Moderate" },
        { value: "heavy_overgrown", label: "Heavy / overgrown" },
      ],
    },
    {
      key: "green_waste",
      label: "Green waste",
      type: "select",
      optional: true,
      showIf: (a) => Array.isArray(a.services) && a.services.length > 0,
      options: [
        { value: "none", label: "None" },
        { value: "small", label: "Small amount" },
        { value: "medium", label: "Medium amount" },
        { value: "large", label: "Large amount" },
      ],
    },
  ],

  windows: [
    {
      key: "size_band",
      label: "Approximate job size",
      type: "select",
      optional: true,
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large_property", label: "Large property" },
      ],
    },
    {
      key: "window_count",
      label: "Approximate number of windows",
      type: "number",
      optional: true,
      placeholder: "Optional — if you know it",
    },
    {
      key: "window_type",
      label: "Window type",
      type: "select",
      optional: true,
      options: [
        { value: "standard", label: "Standard" },
        { value: "floor_to_ceiling", label: "Floor-to-ceiling" },
        { value: "high_access", label: "High access" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    {
      key: "scope",
      label: "Inside / outside",
      type: "select",
      optional: true,
      options: [
        { value: "inside_only", label: "Inside only" },
        { value: "outside_only", label: "Outside only" },
        { value: "inside_and_outside", label: "Inside + outside" },
      ],
    },
    {
      key: "floors",
      label: "Number of floors",
      type: "select",
      optional: true,
      options: ["1", "2", "3+"].map((v) => ({ value: v, label: v })),
    },
  ],

  carpet: [
    {
      key: "rooms",
      label: "Number of rooms",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
    {
      key: "carpet_area_sqm",
      label: "Approximate carpet area (sqm)",
      type: "number",
      optional: true,
      placeholder: "Optional",
    },
    {
      key: "condition",
      label: "Carpet condition",
      type: "select",
      optional: true,
      options: [
        { value: "light", label: "Light" },
        { value: "moderate", label: "Moderate" },
        { value: "heavy", label: "Heavy" },
      ],
    },
    {
      key: "stairs",
      label: "Stairs",
      type: "select",
      optional: true,
      options: [
        { value: "none", label: "None" },
        { value: "yes", label: "Yes" },
      ],
    },
    {
      key: "stains",
      label: "Stains",
      type: "select",
      optional: true,
      options: [
        { value: "none", label: "None" },
        { value: "some", label: "Some" },
        { value: "heavy", label: "Heavy" },
      ],
    },
  ],

  other: [],
};

// Categories/situations where a photo is worth actively encouraging —
// used to change the hint text above the photo picker, never to require it.
export function photosStronglyEncouraged(
  category: Category,
  answers: Answers
): boolean {
  if (["garden", "commercial", "windows", "carpet"].includes(category)) return true;
  if (category === "residential") {
    if (answers.cleaning_type === "end_of_lease" || answers.cleaning_type === "deep") return true;
    if (answers.condition === "heavy") return true;
  }
  if (category === "garden" && answers.condition === "heavy_overgrown") return true;
  return false;
}

// Human-readable label/value pairs for the company side — replaces
// assuming every lead has bedrooms/bathrooms just because residential
// leads do.
export function describeAnswers(
  category: Category,
  answers: Answers
): { label: string; value: string }[] {
  const fields = CATEGORY_FIELDS[category] ?? [];
  const lines: { label: string; value: string }[] = [];
  for (const field of fields) {
    const raw = answers[field.key];
    if (raw === undefined || raw === null || raw === "" || raw === false) continue;
    if (Array.isArray(raw) && raw.length === 0) continue;
    if (field.type === "select") {
      const opt = field.options.find((o) => o.value === raw);
      lines.push({ label: field.label, value: opt?.label ?? String(raw) });
    } else if (field.type === "multiselect" && Array.isArray(raw)) {
      const labels = raw.map(
        (v) => field.options.find((o) => o.value === v)?.label ?? v
      );
      lines.push({ label: field.label, value: labels.join(", ") });
    } else if (field.type === "checkbox") {
      lines.push({ label: field.label, value: "Yes" });
    } else {
      lines.push({ label: field.label, value: String(raw) });
    }
  }
  return lines;
}
