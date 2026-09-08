// Marketing service tags a company can select for its public profile —
// separate from lib/quoting/categories.ts, which drives the customer's
// booking-request form. A company might offer "Airbnb Cleaning" as a
// listed specialty without that being its own request category yet.
// Shared between the profile-editing form and every place that displays
// a company's services, so the two never drift out of sync.
export const COMPANY_SERVICES: string[] = [
  "Regular Cleaning",
  "Deep Cleaning",
  "End of Lease",
  "Move In / Move Out",
  "Airbnb Cleaning",
  "Office Cleaning",
  "Commercial Cleaning",
  "Garden / Outdoor",
];
