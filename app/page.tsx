import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeMarketing } from "@/components/marketing/HomeMarketing";

// The root route doubles as the PWA's install/launch destination. A
// logged-out visitor (or someone who isn't signed in on this device) sees
// the marketing page; anyone already signed in is sent straight to the
// screen that matters to them, so tapping the home-screen icon opens the
// app, not a landing page. Each dashboard route re-checks auth/role itself
// (requireCompany/requireStaff/etc.) — this is just a fast routing hop.
export default async function RootPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: company }, { data: staff }, { data: customer }] =
      await Promise.all([
        supabase.from("companies").select("id").eq("id", user.id).maybeSingle(),
        supabase.from("staff").select("id").eq("id", user.id).maybeSingle(),
        supabase.from("customers").select("id").eq("id", user.id).maybeSingle(),
      ]);

    if (company) redirect("/dashboard");
    if (staff) redirect("/staff");
    if (customer) redirect("/home");
  }

  return <HomeMarketing />;
}
