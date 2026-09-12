// The fixed set of building service categories. Kept as a plain checked
// list (matching the `category` column's check constraint in
// supabase/schema.sql) rather than a database table — the list rarely
// changes and this keeps every consumer (job creation, service tiles,
// history pages) reading from one place instead of a lookup query.

export type ServiceCategory =
  | "cleaning"
  | "gardening"
  | "lift"
  | "fire_safety"
  | "car_park"
  | "maintenance"
  | "pool"
  | "landscaping"
  | "pest_control"
  | "other";

export const SERVICE_CATEGORIES: {
  key: ServiceCategory;
  label: string;
  emoji: string;
}[] = [
  { key: "cleaning", label: "Cleaning", emoji: "🧹" },
  { key: "gardening", label: "Gardening", emoji: "🌿" },
  { key: "lift", label: "Lift", emoji: "🛗" },
  { key: "fire_safety", label: "Fire Safety", emoji: "🔥" },
  { key: "car_park", label: "Car Park", emoji: "🚗" },
  { key: "maintenance", label: "Maintenance", emoji: "🔧" },
  { key: "pool", label: "Pool", emoji: "🏊" },
  { key: "landscaping", label: "Landscaping", emoji: "🌳" },
  { key: "pest_control", label: "Pest Control", emoji: "🐜" },
  { key: "other", label: "Other", emoji: "📋" },
];

export const CATEGORY_LABEL: Record<ServiceCategory, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.key, c.label])
) as Record<ServiceCategory, string>;

export const CATEGORY_EMOJI: Record<ServiceCategory, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.key, c.emoji])
) as Record<ServiceCategory, string>;

export function isServiceCategory(value: string): value is ServiceCategory {
  return SERVICE_CATEGORIES.some((c) => c.key === value);
}
