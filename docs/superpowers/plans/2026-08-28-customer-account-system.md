# Customer Account System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real customer side to CleanConnect — customer signup, a public company directory, a booking flow with a real status lifecycle, realtime sync of status/photos back to the customer, reviews gated to completed bookings, and Web Push notifications for both sides.

**Architecture:** Extends the existing single-Next.js-app + Supabase (Postgres/Auth/Storage/Realtime) stack — no new services. A new `customers` table sits alongside the existing `companies` table; `leads` becomes the shared booking table with a real `customer_id` and status lifecycle; a `company_directory` view exposes safe public fields for browsing. Web Push is implemented with a Supabase Database Webhook (configured in the dashboard, no CLI) calling a new Vercel API route that sends notifications via the `web-push` library.

**Tech Stack:** Next.js 14 (App Router) + TypeScript strict + Tailwind CSS, @supabase/ssr + @supabase/supabase-js, Supabase Postgres/Auth/Storage/Realtime, `web-push` (new dependency) for Web Push.

**Spec:** `docs/superpowers/specs/2026-08-28-customer-account-system-design.md`

## Global Constraints

- No automated test framework exists in this project (no Jest/Vitest/Playwright, no `test` script in `package.json`). Every "test" step in this plan is a concrete **manual verification** — a SQL query to run in the Supabase SQL Editor, or a browser action with an expected on-screen result — not an automated test. Do not introduce a test framework as a side effect of this plan.
- `npm install` cannot be run from the cloud sandbox this plan may be authored in (registry access is blocked there) — every task that adds a dependency must be verified by running `npm install && npm run build` on Jennifer's Mac (or letting Vercel's build do it), not in the authoring environment.
- Follow the existing code style exactly: Tailwind utility classes inline, `slate`/`brand` color tokens (the dashboard/login/signup pages predate the homepage's `ink`/`foam` redesign and were deliberately left as-is — do not restyle them as part of this plan), the shared `.input` / `.btn-primary` / `.btn-ghost` classes from `app/globals.css`, and Chinese comments only where the existing file already uses them (e.g. `supabase/schema.sql`, `DashboardTabs.tsx`'s realtime comment) — new English-named files can use English comments.
- Every new Supabase table gets Row Level Security enabled and explicit policies — never leave a new table world-readable/writable by accident.
- `supabase/schema.sql` stays a single idempotent file (existing project convention) — no migrations folder. Every statement must be safe to re-run.
- TypeScript strict mode is on (`tsconfig.json`) — no implicit `any`. The project has twice failed Vercel's production build on `react/no-unescaped-entities` (raw `'`/`"` in JSX text) — always use `&apos;` / `&ldquo;` / `&rdquo;` in JSX text, never a raw apostrophe or quote character.

---

## Task 1: Database Schema — Customers, Bookings, Directory, Push Subscriptions

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: table `public.customers(id, full_name, email, phone, created_at)`; `public.leads` gains `customer_id uuid`; `public.reviews` gains `customer_id uuid`, `lead_id uuid`; view `public.company_directory(id, company_name, service_area, created_at, average_rating, review_count)`; table `public.push_subscriptions(id, user_id, endpoint, p256dh, auth_key, created_at)`. All later tasks read/write these.

- [ ] **Step 1: Append the customers table, role-aware signup trigger, and booking/review/directory/push changes to `supabase/schema.sql`**

Add this block to the end of the existing `supabase/schema.sql` (after the current line 171):

```sql
-- 8. 客户账户表
create table if not exists public.customers (
  id uuid references auth.users (id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Customers can view own row" on public.customers;
create policy "Customers can view own row" on public.customers
  for select using (auth.uid () = id);

drop policy if exists "Customers can update own row" on public.customers;
create policy "Customers can update own row" on public.customers
  for update using (auth.uid () = id);

-- leads 表要先加上 customer_id 这一列,下面"公司查看客户"的策略才能引用到它
-- (顺序很重要:策略里用到的列必须先存在——这一点在实际运行时才发现,
--  初版计划把它放在了"公司查看客户"策略之后,导致 SQL 报错
--  column l.customer_id does not exist,已修正为提前加列)
alter table public.leads
add column if not exists customer_id uuid references public.customers (id);

-- 公司需要能看到"跟自己有过预约"的客户的姓名/电话,
-- 但不能看到平台上所有客户 —— 只有存在一条 leads 记录
-- 把这个客户和这家公司连起来时才允许查看。
drop policy if exists "Companies view customers who booked with them" on public.customers;
create policy "Companies view customers who booked with them" on public.customers
  for select using (
    exists (
      select 1 from public.leads l
      where l.customer_id = customers.id
        and l.company_id = auth.uid ()
    )
  );

-- 9. 注册触发器改成同时支持"公司注册"和"客户注册"
--    (原来的 handle_new_company_user 只认 company_name,
--     现在换成 handle_new_user,同时认 company_name 和 full_name)
drop trigger if exists on_auth_user_created_company on auth.users;
drop function if exists public.handle_new_company_user ();

create or replace function public.handle_new_user () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  if new.raw_user_meta_data ->> 'company_name' is not null then
    insert into public.companies (id, company_name, contact_name, email, phone, service_area)
    values (
      new.id,
      new.raw_user_meta_data ->> 'company_name',
      new.raw_user_meta_data ->> 'contact_name',
      new.email,
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'service_area'
    );
  elsif new.raw_user_meta_data ->> 'full_name' is not null then
    insert into public.customers (id, full_name, email, phone)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      new.email,
      new.raw_user_meta_data ->> 'phone'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- 10. leads 表加上"客户可以查看/创建自己预约"的权限
--     (customer_id 这一列已经在上面第 8 步加过了)
drop policy if exists "Customers view own bookings" on public.leads;
create policy "Customers view own bookings" on public.leads
  for select using (auth.uid () = customer_id);

drop policy if exists "Customers create own bookings" on public.leads;
create policy "Customers create own bookings" on public.leads
  for insert
with
  check (auth.uid () = customer_id);

-- 11. 公开的"公司目录"视图,给客户浏览用
--     只暴露安全的营销字段,不暴露邮箱/电话;顺带算出平均分和评价数
--     注意:average_rating 转成 float8、review_count 转成 int,而不是
--     numeric/bigint —— PostgREST 会把 numeric 和 bigint 序列化成 JSON
--     字符串(避免精度丢失),那样前端调用 .toFixed(1) 会直接报错。
create or replace view public.company_directory as
select
  c.id,
  c.company_name,
  c.service_area,
  c.created_at,
  coalesce(avg(r.rating), 0)::float8 as average_rating,
  count(r.id)::int as review_count
from
  public.companies c
  left join public.reviews r on r.company_id = c.id
where
  c.approved = true
group by
  c.id,
  c.company_name,
  c.service_area,
  c.created_at;

grant select on public.company_directory to anon,
authenticated;

-- 12. reviews 表连上真实客户 + 具体是哪一单服务的评价
alter table public.reviews
add column if not exists customer_id uuid references public.customers (id);

alter table public.reviews
add column if not exists lead_id uuid references public.leads (id);

create unique index if not exists reviews_lead_id_unique on public.reviews (lead_id)
where
  lead_id is not null;

drop policy if exists "Customers review own completed bookings" on public.reviews;
create policy "Customers review own completed bookings" on public.reviews
for insert
with
  check (
    auth.uid () = customer_id
    and exists (
      select 1
      from public.leads l
      where
        l.id = lead_id
        and l.customer_id = auth.uid ()
        and l.company_id = reviews.company_id
        and l.status = 'completed'
    )
  );

-- 13. Web Push 订阅信息表
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);
```

- [ ] **Step 2: Run it in Supabase**

Open the Supabase project → SQL Editor → paste the entire updated `supabase/schema.sql` (the original content plus the new block above) → Run.

- [ ] **Step 3: Verify manually**

In the same SQL Editor, run each of these and confirm the result described:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('customers', 'push_subscriptions');
```
Expected: both rows returned.

```sql
select * from public.company_directory;
```
Expected: runs with no error (empty result is fine — no approved companies exist yet).

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'leads' and column_name = 'customer_id';
```
Expected: one row returned.

- [ ] **Step 4: Commit**

This change lives only in `supabase/schema.sql` (already tracked in git) and the live Supabase database (via the SQL Editor run in Step 2) — there is no separate migration file to commit. Stage and commit the updated `supabase/schema.sql`:

```bash
git add supabase/schema.sql
git commit -m "Add customer accounts, booking status, directory view, push subscriptions"
```

---

## Task 2: Split Signup By Role + Central Post-Login Redirect

**Files:**
- Create: `app/signup/company/page.tsx` (existing company signup form, moved as-is)
- Modify: `app/signup/page.tsx` (becomes a two-button role chooser)
- Create: `app/signup/customer/page.tsx` (new customer signup form)
- Create: `app/account/page.tsx` (server component: checks role, redirects)
- Modify: `app/login/page.tsx` (redirect target `/dashboard` → `/account`)

**Interfaces:**
- Consumes: Task 1's `customers` table and role-aware trigger.
- Produces: routes `/signup/company`, `/signup/customer`, `/account` that later tasks link to.

- [ ] **Step 1: Move the existing company signup form to `app/signup/company/page.tsx`**

Copy the current full content of `app/signup/page.tsx` (unchanged) into a new file `app/signup/company/page.tsx`. Do not modify its contents — it is a straight move.

- [ ] **Step 2: Replace `app/signup/page.tsx` with a role chooser**

```tsx
import Link from "next/link";

export default function SignupChooserPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 block text-center font-display text-lg font-semibold tracking-tight text-slate-900"
        >
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Are you looking for a cleaning company, or do you run one?
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/signup/customer"
              className="btn-primary block w-full py-2.5 text-center"
            >
              I&apos;m a customer
            </Link>
            <Link
              href="/signup/company"
              className="btn-ghost block w-full py-2.5 text-center"
            >
              I run a cleaning company
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `app/signup/customer/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CustomerSignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            You&apos;re almost in
          </h1>
          <p className="mt-3 text-slate-500">
            Check your email to verify your address, then sign in to browse
            cleaning companies and request a booking.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block font-medium text-brand-600"
          >
            Go to sign in →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 block text-center font-display text-lg font-semibold tracking-tight text-slate-900"
        >
          Clean<span className="text-brand-600">Connect</span>
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Create your customer account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse cleaning companies and book with confidence.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Phone (optional)
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? "Submitting…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create `app/account/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Update `app/login/page.tsx` to redirect to `/account`**

In `app/login/page.tsx`, change line 33 from:

```tsx
    router.push("/dashboard");
```

to:

```tsx
    router.push("/account");
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`. Visit `/signup` — confirm two buttons appear. Click "I'm a customer" — confirm the customer form renders at `/signup/customer`. Submit it with a test email/password — confirm the "You're almost in" screen appears. In the Supabase Table Editor, confirm a new row appeared in `customers` (not `companies`) with the right `full_name`. Go to `/signup/company` directly and confirm the original company form still renders unchanged. Log in with the test customer account at `/login` — confirm it lands on `/account` then immediately redirects (since `/my-bookings` doesn't exist until Task 6, this will 404 for now — that 404 is expected and confirms the redirect logic worked; it will resolve once Task 6 ships).

- [ ] **Step 7: Commit**

```bash
git add app/signup app/account app/login/page.tsx
git commit -m "Split signup by role (customer/company) and add post-login redirect"
```

---

## Task 3: Company Directory Listing Page

**Files:**
- Create: `app/browse/page.tsx`
- Create: `components/browse/CompanyCard.tsx`

**Interfaces:**
- Consumes: Task 1's `public.company_directory` view.
- Produces: route `/browse`; `CompanyCard` component reused nowhere else yet.

- [ ] **Step 1: Create `components/browse/CompanyCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `app/browse/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify manually**

In Supabase Table Editor, temporarily set `approved = true` on the CGC company row you signed up earlier (same manual step already documented in `supabase/schema.sql`'s comments). Visit `/browse` — confirm CGC appears in the list with "No reviews yet". Set `approved` back to whatever state you actually want before moving on if you were only testing.

- [ ] **Step 4: Commit**

```bash
git add app/browse/page.tsx components/browse/CompanyCard.tsx
git commit -m "Add public company directory page"
```

---

## Task 4: Company Profile Page + Booking Form

**Files:**
- Create: `app/browse/[companyId]/page.tsx`
- Create: `components/browse/BookingForm.tsx`

**Interfaces:**
- Consumes: Task 1's `company_directory` view and `reviews`/`customers` tables, Task 3's route structure.
- Produces: route `/browse/[companyId]`; `BookingForm` inserts into `public.leads`, consumed nowhere else.

- [ ] **Step 1: Create `components/browse/BookingForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function BookingForm({
  companyId,
  customerId,
}: {
  companyId: string;
  customerId: string | null;
}) {
  const [serviceType, setServiceType] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!customerId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/signup/customer" className="font-medium text-brand-600">
          create a customer account
        </Link>{" "}
        to request a booking.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center text-sm text-brand-700">
        Request sent — track it from{" "}
        <Link href="/my-bookings" className="font-semibold underline">
          My bookings
        </Link>
        .
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("leads").insert({
      company_id: companyId,
      customer_id: customerId,
      service_type: serviceType,
      customer_contact: address,
      message,
      status: "requested",
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Service type
        </span>
        <input
          required
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="input"
          placeholder="e.g. Office cleaning, twice weekly"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </span>
        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Message (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input"
          rows={3}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5"
      >
        {loading ? "Sending…" : "Request a booking"}
      </button>
    </form>
  );
}
```

Note: this reuses the existing `leads.customer_contact` text column to store the booking address (the column already exists and this plan does not add a separate `address` column — YAGNI, one text field is enough for v1).

- [ ] **Step 2: Create `app/browse/[companyId]/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify manually**

With CGC's company row `approved = true` (from Task 3's verification), visit `/browse/<CGC's id>` directly (copy the id from the Supabase Table Editor) — confirm the company name, "No reviews yet", and the booking form's sign-in prompt (since you're not logged in) all render. Log in as the test customer created in Task 2 — revisit the same URL — confirm the real booking form (service type / address / message) now renders instead of the sign-in prompt. Submit it — confirm the "Request sent" confirmation appears. In Supabase Table Editor, confirm a new row appeared in `leads` with `customer_id` set to the test customer's id and `status = 'requested'`.

- [ ] **Step 4: Commit**

```bash
git add app/browse/[companyId] components/browse/BookingForm.tsx
git commit -m "Add company profile page with booking request form"
```

---

## Task 5: Company Dashboard Booking Status Actions + Customer Name Join

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/DashboardTabs.tsx`

**Interfaces:**
- Consumes: Task 1's `customers` table + the "Companies view customers who booked with them" policy, Task 4's `leads` rows.
- Produces: nothing new consumed by later tasks (the status values `requested`/`accepted`/`declined`/`in_progress`/`completed` are referenced by Task 6/7's UI, which read them directly from the `leads` rows rather than importing anything from this task).

- [ ] **Step 1: Modify `app/dashboard/page.tsx` to join customer info**

Change the leads query (currently `.select("*")` on line 46) to embed the linked customer:

```tsx
    supabase
      .from("leads")
      .select("*, customers(full_name, phone)")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false }),
```

- [ ] **Step 2: Modify `app/dashboard/DashboardTabs.tsx` to add status actions and display the joined customer**

Update the `Lead` type (lines 8-18) to include the embedded customer and drop nothing existing:

```tsx
type Lead = {
  id: string;
  customer_name: string | null;
  customer_contact: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  customers: { full_name: string; phone: string | null } | null;
};
```

Add a status-update handler right after `handlePhotoUploaded` (after line 107):

```tsx
  async function handleStatusChange(leadId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId);

    if (error) {
      setToast(`Couldn't update status: ${error.message}`);
      return;
    }

    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
    );
  }
```

Replace the lead name display (line 151, currently `{lead.customer_name ?? "Anonymous customer"}`) with:

```tsx
                    <span className="font-medium text-slate-900">
                      {lead.customers?.full_name ??
                        lead.customer_name ??
                        "Anonymous customer"}
                    </span>
```

Add status action buttons right after the `customer_contact` block (after line 171, before `<BeforeAfterUploader`):

```tsx
                  <div className="mt-3 flex gap-2">
                    {lead.status === "requested" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(lead.id, "accepted")}
                          className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(lead.id, "declined")}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-300"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {lead.status === "accepted" && (
                      <button
                        onClick={() => handleStatusChange(lead.id, "in_progress")}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        Start job
                      </button>
                    )}
                    {lead.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(lead.id, "completed")}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
```

- [ ] **Step 3: Verify manually**

Log in to `/dashboard` as CGC. Confirm the booking submitted in Task 4 now shows the test customer's real name (not "Anonymous customer") and an "Accept" / "Decline" button pair. Click "Accept" — confirm the button row changes to "Start job" with no page reload. Click "Start job", then "Mark complete" — confirm each transition updates immediately. In the Supabase Table Editor, confirm the `leads.status` column reflects `completed`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/DashboardTabs.tsx
git commit -m "Add booking status actions and real customer name to company dashboard"
```

---

## Task 6: Customer Bookings Dashboard

**Files:**
- Create: `app/my-bookings/page.tsx`
- Create: `components/dashboard/CustomerBookingsList.tsx`

**Interfaces:**
- Consumes: Task 1's `leads` RLS policies (customer can select own), Task 2's `/account` redirect target.
- Produces: route `/my-bookings`; `CustomerBookingsList` renders reviews via Task 7's `ReviewForm` (added in that task — this task renders the list without a review action yet).

- [ ] **Step 1: Create `components/dashboard/CustomerBookingsList.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Booking = {
  id: string;
  company_id: string;
  service_type: string | null;
  message: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
  companies: { company_name: string } | null;
};

export default function CustomerBookingsList({
  customerId,
  bookings: initialBookings,
}: {
  customerId: string;
  bookings: Booking[];
}) {
  const [bookings, setBookings] = useState(initialBookings);

  // 实时监听:公司一更新预约状态或上传照片,这里立刻自动更新,不用刷新页面
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`customer-${customerId}-live`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const updated = payload.new as Omit<Booking, "companies">;
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === updated.id
                ? { ...booking, ...updated }
                : booking
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No bookings yet — browse companies to request one.
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    requested: "Requested",
    accepted: "Accepted",
    declined: "Declined",
    in_progress: "In progress",
    completed: "Completed",
  };

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="rounded-xl border border-slate-100 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">
              {booking.companies?.company_name ?? "Cleaning company"}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {statusLabel[booking.status] ?? booking.status}
            </span>
          </div>
          {booking.service_type && (
            <p className="mt-1 text-sm text-slate-500">
              Service: {booking.service_type}
            </p>
          )}
          {(booking.before_photo_url || booking.after_photo_url) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {booking.before_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.before_photo_url}
                  alt="Before"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
              {booking.after_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.after_photo_url}
                  alt="After"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create `app/my-bookings/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerBookingsList from "@/components/dashboard/CustomerBookingsList";
import LogoutButton from "@/app/dashboard/LogoutButton";

export default async function MyBookingsPage() {
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
    .single();

  if (!customer) {
    redirect("/login");
  }

  const { data: bookings } = await supabase
    .from("leads")
    .select("*, companies(company_name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">
              {customer.full_name}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-xl font-semibold text-slate-900">
          My bookings
        </h1>
        <div className="mt-6">
          <CustomerBookingsList
            customerId={user.id}
            bookings={bookings ?? []}
          />
        </div>
      </div>
    </main>
  );
}
```

Note: this reuses `app/dashboard/LogoutButton.tsx` directly via import — no need to duplicate it, since it has no company-specific logic (it only calls `supabase.auth.signOut()`).

- [ ] **Step 3: Verify manually**

Log in as the test customer. Confirm redirect via `/account` now lands on `/my-bookings` (the 404 from Task 2's verification is resolved). Confirm the booking created in Task 4 appears with its current status. In a second browser/incognito window logged in as CGC, change the booking's status in `/dashboard` — confirm the status label updates on `/my-bookings` within a couple of seconds without a manual refresh. Upload a before/after photo from the company side — confirm both images appear on the customer's booking card in real time.

- [ ] **Step 4: Commit**

```bash
git add app/my-bookings components/dashboard/CustomerBookingsList.tsx
git commit -m "Add customer bookings dashboard with realtime status and photo sync"
```

---

## Task 7: Review Submission

**Files:**
- Create: `components/dashboard/ReviewForm.tsx`
- Modify: `components/dashboard/CustomerBookingsList.tsx`

**Interfaces:**
- Consumes: Task 1's reviews insert policy (requires `status = 'completed'`), Task 6's `Booking` type and list component.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `components/dashboard/ReviewForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReviewForm({
  leadId,
  companyId,
  customerId,
  customerName,
  onSubmitted,
}: {
  leadId: string;
  companyId: string;
  customerId: string;
  customerName: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reviews").insert({
      company_id: companyId,
      customer_id: customerId,
      lead_id: leadId,
      customer_name: customerName,
      rating,
      comment,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`text-lg ${value <= rating ? "text-amber-500" : "text-slate-300"}`}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="input"
        rows={2}
        placeholder="How did it go?"
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Wire it into `components/dashboard/CustomerBookingsList.tsx`**

Add the import at the top:

```tsx
import { ReviewForm } from "@/components/dashboard/ReviewForm";
```

Extend the `Booking` type with a `has_review` flag and `full_name`/`id` for the customer (both passed in as props from the page, not part of the row itself) — change the component's props signature:

```tsx
export default function CustomerBookingsList({
  customerId,
  customerName,
  bookings: initialBookings,
}: {
  customerId: string;
  customerName: string;
  bookings: (Booking & { hasReview: boolean })[];
}) {
  const [bookings, setBookings] = useState(initialBookings);
```

Add state to track which bookings have just been reviewed (so the form disappears immediately without a full refetch), right after the existing `useState` line:

```tsx
  const [justReviewed, setJustReviewed] = useState<string[]>([]);
```

Add the review action inside each `<li>`, right after the before/after photo block (after the closing `)}` of the photo grid, before `</li>`):

```tsx
          {booking.status === "completed" &&
            !booking.hasReview &&
            !justReviewed.includes(booking.id) && (
              <ReviewForm
                leadId={booking.id}
                companyId={booking.company_id}
                customerId={customerId}
                customerName={customerName}
                onSubmitted={() =>
                  setJustReviewed((prev) => [...prev, booking.id])
                }
              />
            )}
```

- [ ] **Step 3: Pass the new props from `app/my-bookings/page.tsx`**

In `app/my-bookings/page.tsx`, after fetching `bookings`, also fetch which of those bookings already have a review, and pass `customerName`:

```tsx
  const { data: bookings } = await supabase
    .from("leads")
    .select("*, companies(company_name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("lead_id")
    .eq("customer_id", user.id);

  const reviewedLeadIds = new Set(
    (existingReviews ?? []).map((review) => review.lead_id)
  );

  const bookingsWithReviewFlag = (bookings ?? []).map((booking) => ({
    ...booking,
    hasReview: reviewedLeadIds.has(booking.id),
  }));
```

And update the `<CustomerBookingsList` usage to:

```tsx
          <CustomerBookingsList
            customerId={user.id}
            customerName={customer.full_name}
            bookings={bookingsWithReviewFlag}
          />
```

- [ ] **Step 4: Verify manually**

With the test booking already `completed` (from Task 5's verification), reload `/my-bookings` as the test customer — confirm a star-rating form appears under that booking. Submit a 5-star review with a comment — confirm the form disappears immediately. In Supabase Table Editor, confirm a new `reviews` row exists with `lead_id`, `customer_id`, and `company_id` all set correctly. Visit `/browse/<CGC's id>` — confirm the new review now appears in the public reviews list and the average rating updates. Try submitting a second review for the same booking directly via the Supabase SQL Editor (`insert into reviews (company_id, customer_id, lead_id, rating) values (...)` with the same `lead_id`) — confirm it is rejected by the unique index.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ReviewForm.tsx components/dashboard/CustomerBookingsList.tsx app/my-bookings/page.tsx
git commit -m "Let customers review completed bookings"
```

---

## Task 8: Web Push Subscription (Client Side)

**Files:**
- Create: `public/sw.js`
- Create: `lib/push/subscribe.ts`
- Create: `app/api/push/subscribe/route.ts`
- Create: `components/notifications/NotificationOptIn.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/my-bookings/page.tsx`

**Interfaces:**
- Consumes: Task 1's `push_subscriptions` table and RLS policy.
- Produces: `public_subscriptions` rows that Task 9's notify route reads; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var (set in Task 10) that `lib/push/subscribe.ts` reads.

- [ ] **Step 1: Create `public/sw.js`**

```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "CleanConnect";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
```

- [ ] **Step 2: Create `lib/push/subscribe.ts`**

```ts
"use client";

export async function subscribeToPush(): Promise<
  "subscribed" | "denied" | "unsupported"
> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "denied";
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return "unsupported";
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      authKey: json.keys?.auth,
    }),
  });

  return "subscribed";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

- [ ] **Step 3: Create `app/api/push/subscribe/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    p256dh?: string;
    authKey?: string;
  };

  if (!body.endpoint || !body.p256dh || !body.authKey) {
    return NextResponse.json(
      { error: "Missing subscription fields" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth_key: body.authKey,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create `components/notifications/NotificationOptIn.tsx`**

```tsx
"use client";

import { useState } from "react";
import { subscribeToPush } from "@/lib/push/subscribe";

export function NotificationOptIn() {
  const [status, setStatus] = useState<
    "idle" | "subscribed" | "denied" | "unsupported" | "loading"
  >("idle");

  async function handleClick() {
    setStatus("loading");
    const result = await subscribeToPush();
    setStatus(result);
  }

  if (status === "subscribed" || status === "unsupported") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
    >
      {status === "denied"
        ? "Notifications blocked in your browser"
        : status === "loading"
          ? "Requesting…"
          : "Turn on notifications"}
    </button>
  );
}
```

- [ ] **Step 5: Add the opt-in to both dashboards**

In `app/dashboard/page.tsx`, import it:

```tsx
import { NotificationOptIn } from "@/components/notifications/NotificationOptIn";
```

and render it next to `<LogoutButton />` in the header (wrap both in a flex container):

```tsx
          <div className="flex items-center gap-4">
            <NotificationOptIn />
            <LogoutButton />
          </div>
```

Do the same in `app/my-bookings/page.tsx`.

- [ ] **Step 6: Verify manually**

This step needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to exist (Task 10) to fully work — for now, confirm the button renders and clicking it prompts the browser's native notification permission dialog (it will fail after that with no `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set yet — that's expected; full verification happens at the end of Task 10).

- [ ] **Step 7: Commit**

```bash
git add public/sw.js lib/push components/notifications app/dashboard/page.tsx app/my-bookings/page.tsx
git commit -m "Add Web Push subscription opt-in to both dashboards"
```

---

## Task 9: Push Notification Sender API

**Files:**
- Modify: `package.json`
- Create: `app/api/notify/route.ts`

**Interfaces:**
- Consumes: Task 8's `push_subscriptions` rows; env vars `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_WEBHOOK_SECRET` (all set in Task 10).
- Produces: route `/api/notify`, the target Task 10's Database Webhooks call.

- [ ] **Step 1: Add `web-push` to `package.json`**

In `package.json`, add to `dependencies` (alongside the existing entries):

```json
    "web-push": "^3.6.7",
```

and to `devDependencies`:

```json
    "@types/web-push": "^3.6.4",
```

- [ ] **Step 2: Create `app/api/notify/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:hello@cleanconnect.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type LeadRow = {
  id: string;
  company_id: string;
  customer_id: string | null;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
};

type ReviewRow = {
  company_id: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

type Notification = { userId: string; title: string; body: string };

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as WebhookPayload;
  const supabase = serviceClient();

  const notification = resolveNotification(payload);
  if (!notification) {
    return NextResponse.json({ skipped: true });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", notification.userId);

  await Promise.all(
    (subscriptions ?? []).map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ title: notification.title, body: notification.body })
        )
        .catch(() => {
          // 订阅可能已经失效(比如用户清了浏览器数据),忽略单条失败即可
        })
    )
  );

  return NextResponse.json({ notified: subscriptions?.length ?? 0 });
}

function resolveNotification(payload: WebhookPayload): Notification | null {
  if (payload.table === "leads") {
    const lead = payload.record as unknown as LeadRow;
    const old = payload.old_record as unknown as
      | (Partial<LeadRow> | null);

    if (payload.type === "INSERT") {
      return {
        userId: lead.company_id,
        title: "New booking request",
        body: "A customer just requested a booking — open CleanConnect to respond.",
      };
    }

    if (payload.type === "UPDATE" && lead.customer_id) {
      if (old && old.status !== lead.status) {
        const statusLabel: Record<string, string> = {
          accepted: "was accepted",
          declined: "was declined",
          in_progress: "is now in progress",
          completed: "is complete",
        };
        const label = statusLabel[lead.status];
        if (label) {
          return {
            userId: lead.customer_id,
            title: "Booking update",
            body: `Your booking ${label}.`,
          };
        }
      }

      const newPhoto =
        (lead.before_photo_url &&
          lead.before_photo_url !== old?.before_photo_url) ||
        (lead.after_photo_url && lead.after_photo_url !== old?.after_photo_url);
      if (newPhoto) {
        return {
          userId: lead.customer_id,
          title: "New photo added",
          body: "Your cleaning company just added a photo to your booking.",
        };
      }
    }

    return null;
  }

  if (payload.table === "reviews" && payload.type === "INSERT") {
    const review = payload.record as unknown as ReviewRow;
    return {
      userId: review.company_id,
      title: "New review",
      body: "A customer just left you a review.",
    };
  }

  return null;
}
```

- [ ] **Step 3: Verify manually**

Run `npm install` (picks up the new `web-push` dependency), then `npm run build` — confirm it compiles with no TypeScript errors. This route can't be fully exercised until Task 10 sets its env vars and configures the Database Webhooks — full verification happens in Task 11.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/api/notify/route.ts
git commit -m "Add push notification sender API route"
```

---

## Task 10: Manual Configuration — VAPID Keys, Env Vars, Database Webhooks

**Files:** none — this task is operational configuration in the Vercel and Supabase dashboards, done by Jennifer.

**Interfaces:**
- Produces: the env vars and Database Webhooks that Task 9's route depends on.

- [ ] **Step 1: Generate a VAPID key pair**

In a Terminal at `~/Desktop/cleanconnect` (after Task 9's `npm install` has run so `web-push` is installed), run:

```bash
npx web-push generate-vapid-keys
```

This prints a Public Key and a Private Key. Save both somewhere safe — the private key is only shown once.

- [ ] **Step 2: Generate a webhook secret**

Any random string works — for example, run `openssl rand -hex 32` in the same Terminal and copy its output.

- [ ] **Step 3: Set environment variables in Vercel**

In the Vercel dashboard → the `cleanconnect` project → Settings → Environment Variables, add these four (Production environment, same place `NEXT_PUBLIC_SUPABASE_URL` was set earlier):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the Public Key from Step 1 |
| `VAPID_PRIVATE_KEY` | the Private Key from Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard → Project Settings → API → `service_role` secret key |
| `SUPABASE_WEBHOOK_SECRET` | the random string from Step 2 |

Redeploy (Vercel → Deployments → the latest one → "Redeploy") so the new env vars take effect.

- [ ] **Step 4: Configure Database Webhooks in Supabase**

In the Supabase dashboard → Database → Webhooks → "Create a new hook":

- Name: `notify-leads`
- Table: `leads`
- Events: `Insert`, `Update`
- Type: `HTTP Request`
- Method: `POST`
- URL: `https://cleanconnect-one.vercel.app/api/notify`
- HTTP Headers: add `x-webhook-secret` with the same value as `SUPABASE_WEBHOOK_SECRET` from Step 3

Create a second hook the same way:

- Name: `notify-reviews`
- Table: `reviews`
- Events: `Insert`
- Same URL and header as above

- [ ] **Step 5: Verify manually**

Log in as the test customer on `/my-bookings`, click "Turn on notifications", accept the browser prompt. Do the same as CGC on `/dashboard`. From the company side, change a booking's status — confirm a browser notification appears for the customer within a few seconds. Submit a new booking as the customer — confirm CGC gets a notification. Leave a review as the customer — confirm CGC gets a notification for that too.

- [ ] **Step 6: Commit**

Nothing to commit — this task only touches the Vercel and Supabase dashboards, not the git repository.

---

## Task 11: End-to-End Verification

**Files:** none — this is the full walkthrough from the spec's testing plan, run once all prior tasks are deployed.

- [ ] **Step 1: Full loop as a fresh pair of accounts**

Sign up a brand-new test customer (different email than any used above). Visit `/browse`, confirm CGC appears. Open its profile, submit a booking. Log in as CGC in a separate browser/incognito, confirm the booking appears in the dashboard in real time, accept it, mark in-progress, upload before/after photos, mark completed. Back on the customer's `/my-bookings`, confirm status and both photos updated without a manual refresh. Submit a review. Confirm it appears on CGC's public `/browse/<id>` profile and the average rating updates.

- [ ] **Step 2: RLS spot-check**

In the Supabase SQL Editor, run (as the `postgres` role, which bypasses RLS, so instead use the "Run as" / authenticated-role testing feature, or simpler: from the app itself) — log in as one test customer and try navigating to a booking URL that isn't shown to them (there is no direct booking detail route in this plan, so this check is really: confirm `/my-bookings` for customer A never shows customer B's bookings, which the query in Task 6 already guarantees by filtering on `customer_id=eq.<uid>` plus the Task 1 RLS policy). Confirm this holds by comparing what two different test customer accounts see on `/my-bookings`.

- [ ] **Step 3: Push notification confirmation**

Repeat Task 10 Step 5's verification once more end-to-end with the fresh accounts from Step 1, confirming both directions (customer→company on new booking/review, company→customer on status/photo changes).

- [ ] **Step 4: Deploy**

If every prior task's commits haven't already triggered a Vercel deploy (they will have, automatically, since Vercel deploys on every push to `main`), confirm the latest deployment on the Vercel Deployments page shows "Ready".
