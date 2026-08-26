import { createBrowserClient } from "@supabase/ssr";

// 用于浏览器端(客户端组件)的 Supabase 实例
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
