import Link from "next/link";

export type DirectoryCompany = {
  id: string;
  company_name: string;
  service_area: string | null;
  average_rating: number;
  review_count: number;
};

export function CompanyCard({ company }: { company: DirectoryCompany }) {
  return (
    <Link
      href={`/browse/${company.id}`}
      className="block rounded-xl border border-slate-100 bg-white p-5 transition hover:border-brand-200 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.25)]"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-semibold text-slate-900">
          {company.company_name}
        </span>
        {company.review_count > 0 ? (
          <span className="text-sm text-amber-500">
            ★ {company.average_rating.toFixed(1)}{" "}
            <span className="text-slate-400">({company.review_count})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">No reviews yet</span>
        )}
      </div>
      {company.service_area && (
        <p className="mt-2 text-sm text-slate-500">{company.service_area}</p>
      )}
    </Link>
  );
}
