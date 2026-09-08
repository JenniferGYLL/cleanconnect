import Link from "next/link";

export type DirectoryCompany = {
  id: string;
  company_name: string;
  service_area: string | null;
  average_rating: number;
  review_count: number;
  logo_url: string | null;
  description: string | null;
  services: string[] | null;
  photos: string[] | null;
  abn: string | null;
  years_in_business: number | null;
  team_size: number | null;
};

const MAX_SERVICE_BADGES = 3;

export function CompanyCard({ company }: { company: DirectoryCompany }) {
  const services = company.services ?? [];
  const shownServices = services.slice(0, MAX_SERVICE_BADGES);
  const extraServices = services.length - shownServices.length;
  const initial = company.company_name.trim().charAt(0).toUpperCase() || "C";

  return (
    <div className="glass-surface spotlight-border group flex h-full flex-col rounded-2xl p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={`${company.company_name} logo`}
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-ink-900">
            {company.company_name}
          </p>
          {company.review_count > 0 ? (
            <p className="mt-0.5 text-xs text-ink-700/60">
              <span className="text-gold-500">
                ★ {company.average_rating.toFixed(1)}
              </span>{" "}
              · {company.review_count} Verified Review
              {company.review_count === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-700/40">No reviews yet</p>
          )}
        </div>
      </div>

      {company.description && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-700/70">
          {company.description}
        </p>
      )}

      {shownServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shownServices.map((service) => (
            <span
              key={service}
              className="rounded-full bg-ink-950/[0.04] px-2.5 py-1 text-[11px] font-medium text-ink-700"
            >
              {service}
            </span>
          ))}
          {extraServices > 0 && (
            <span className="rounded-full bg-ink-950/[0.04] px-2.5 py-1 text-[11px] font-medium text-ink-700/50">
              +{extraServices}
            </span>
          )}
        </div>
      )}

      {company.service_area && (
        <p className="mt-3 text-xs text-ink-700/50">{company.service_area}</p>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        <Link
          href={`/browse/${company.id}`}
          className="btn-ghost flex-1 py-2 text-xs"
        >
          View Profile
        </Link>
        <Link
          href={`/browse/${company.id}#request`}
          className="btn-primary flex-1 py-2 text-xs"
        >
          Request Cleaning
        </Link>
      </div>
    </div>
  );
}
