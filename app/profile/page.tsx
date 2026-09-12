import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/dashboard/CustomerNav";
import { FadeIn } from "@/components/motion/FadeIn";
import { NotificationOptIn } from "@/components/notifications/NotificationOptIn";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default async function CustomerProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!customer) {
    redirect("/login");
  }

  return (
    <main className="bg-grain relative min-h-dvh overflow-hidden bg-foam-50 pb-24">
      <div className="bg-mesh-1 pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <CustomerNav
            active="profile"
            customerName={customer.full_name}
            email={user.email ?? ""}
          />
        </div>

        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              Profile
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {customer.full_name}
            </h1>
          </FadeIn>

          <FadeIn delay={0.05} className="mt-6">
            <div className="glass-surface rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Personal details
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-700/60">Email</dt>
                  <dd className="font-medium text-ink-900">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-700/60">Phone</dt>
                  <dd className="font-medium text-ink-900">
                    {customer.phone || "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-4">
            <div className="glass-surface rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/40">
                Notifications
              </p>
              <div className="mt-3">
                <NotificationOptIn />
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-4">
            <div className="glass-surface flex items-center justify-between rounded-2xl p-5">
              <p className="text-sm text-ink-700/60">Signed in as {customer.full_name}</p>
              <LogoutButton />
            </div>
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
