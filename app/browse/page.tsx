import { createClient } from "@/lib/supabase/server";
import { CompanyCard, type DirectoryCompany } from "@/components/browse/CompanyCard";

export default async function BrowsePage() {
  const supabase = createClient();

  const { data: companies } = await supabase
    .from("company_directory")
    .select("*")
    .order("average_rating", { ascending: false });

  const list = (companies ?? []) as DirectoryCompany[];

  return (
    <main className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Cleaning companies
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse approved companies and request a booking.
        </p>

        <div className="mt-8 space-y-3">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No companies have been approved yet.
            </div>
          ) : (
            list.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
