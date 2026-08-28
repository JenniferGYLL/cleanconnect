import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/browse/BookingForm";

export default async function CompanyProfilePage({
  params,
}: {
  params: { companyId: string };
}) {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("company_directory")
    .select("*")
    .eq("id", params.companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, comment, created_at")
    .eq("company_id", params.companyId)
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let customerId: string | null = null;
  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    customerId = customer?.id ?? null;
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          {company.company_name}
        </h1>
        {company.service_area && (
          <p className="mt-1 text-sm text-slate-500">{company.service_area}</p>
        )}
        {company.review_count > 0 ? (
          <p className="mt-2 text-sm text-amber-500">
            ★ {company.average_rating.toFixed(1)}{" "}
            <span className="text-slate-400">
              ({company.review_count} reviews)
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No reviews yet</p>
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Request a booking
            </h2>
            <div className="mt-4">
              <BookingForm companyId={company.id} customerId={customerId} />
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Reviews
            </h2>
            <div className="mt-4 space-y-3">
              {(reviews ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              ) : (
                (reviews ?? []).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {review.customer_name ?? "Anonymous customer"}
                      </span>
                      {review.rating != null && (
                        <span className="text-sm text-amber-500">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-slate-700">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
