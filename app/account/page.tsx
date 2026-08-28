import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 登录之后统一先到这里,根据这个账户是"公司"还是"客户"分流。
export default async function AccountRedirectPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (company) {
    redirect("/dashboard");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (customer) {
    redirect("/my-bookings");
  }

  redirect("/login");
}
