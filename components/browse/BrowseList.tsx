"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyCard, type DirectoryCompany } from "@/components/browse/CompanyCard";

type SortKey = "rated" | "reviewed" | "fastest" | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rated", label: "Highest rated" },
  { value: "reviewed", label: "Most reviews" },
  { value: "fastest", label: "Fastest to respond" },
  { value: "newest", label: "Newest on CleanConnect" },
];

const MIN_RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 3, label: "3+ stars" },
  { value: 4, label: "4+ stars" },
  { value: 4.5, label: "4.5+ stars" },
];

export function BrowseList({ companies }: { companies: DirectoryCompany[] }) {
  // Lets a link like /browse?q=Garden (from the customer Home page's
  // quick category shortcuts) land with the search box already filled in,
  // without needing a separate structured "category" filter.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>("rated");

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const company of companies) {
      for (const service of company.services ?? []) tags.add(service);
    }
    return Array.from(tags).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = companies.filter((company) => {
      if (minRating > 0 && company.average_rating < minRating) return false;
      if (activeTag && !(company.services ?? []).includes(activeTag))
        return false;
      if (!q) return true;
      const haystack = [
        company.company_name,
        company.service_area ?? "",
        company.description ?? "",
        ...(company.services ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "reviewed":
          return b.review_count - a.review_count;
        case "fastest": {
          const aHours = a.avg_response_hours ?? Infinity;
          const bHours = b.avg_response_hours ?? Infinity;
          return aHours - bHours;
        }
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "rated":
        default:
          if (b.average_rating !== a.average_rating)
            return b.average_rating - a.average_rating;
          return b.review_count - a.review_count;
      }
    });

    return list;
  }, [companies, query, activeTag, minRating, sort]);

  return (
    <div>
      <div className="glass-surface spotlight-border rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, suburb or service…"
            className="w-full rounded-full border border-ink-900/10 bg-white/70 px-4 py-2 text-sm text-ink-900 placeholder:text-ink-700/40 focus:border-brand-400 focus:outline-none"
          />
          <div className="flex shrink-0 gap-2 sm:w-auto">
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="rounded-full border border-ink-900/10 bg-white/70 px-3 py-2 text-xs font-medium text-ink-700"
            >
              {MIN_RATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-ink-900/10 bg-white/70 px-3 py-2 text-xs font-medium text-ink-700"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                activeTag === null
                  ? "bg-ink-900 text-white"
                  : "bg-ink-950/[0.04] text-ink-700 hover:bg-ink-950/[0.08]"
              }`}
            >
              All services
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  activeTag === tag
                    ? "bg-ink-900 text-white"
                    : "bg-ink-950/[0.04] text-ink-700 hover:bg-ink-950/[0.08]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-700/50">
        {filtered.length} compan{filtered.length === 1 ? "y" : "ies"} found
      </p>

      {filtered.length === 0 ? (
        <div className="glass-surface mt-4 rounded-2xl border border-dashed border-ink-900/10 p-8 text-center text-sm text-ink-700/60">
          No companies match those filters — try widening your search.
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {filtered.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}
