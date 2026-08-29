import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase 的密码重置邮件链接最终会跳转到这里,带着一个一次性 code。
// 用这个 code 换成正式 session 后,再跳转到调用方指定的 next 页面
// (忘记密码流程里传的是 /reset-password)。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
