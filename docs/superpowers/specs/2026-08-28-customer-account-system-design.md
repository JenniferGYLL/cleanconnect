# Customer Account System — Design

**Date:** 2026-08-28
**Status:** Approved by Jennifer, ready for implementation planning
**Classification:** Architectural (new subsystem — customer accounts do not exist today)

## 1. Purpose

CleanConnect currently supports only one side of the marketplace: cleaning
companies can sign up, get approved, and see a dashboard of `leads` and
`reviews`. Those `leads`/`reviews` rows are free-text fields with no real
customer identity behind them — there is no way for an actual person to log
in, browse companies, book a job, watch its progress in real time, and leave
a review tied to their own account.

This spec adds the customer side: account creation, a company directory,
a booking flow with a real status lifecycle, real-time sync of job status
and before/after photos back to the customer, reviews that can only be left
after a completed job, and web push notifications for both sides.

This is the foundation that makes "customer feedback" in the company
dashboard real instead of empty. It also gives Jennifer a way to dogfood the
whole loop end-to-end using her own CGC company plus a self-created test
customer account, before inviting any other cleaning company onto the
platform.

Out of scope for this spec (deliberately deferred, YAGNI):
- Native push notifications (Capacitor/APNs/FCM) — this spec implements
  **Web Push** only; native push is added later when the app is packaged,
  reusing the same "when to notify" logic.
- Payments/commission/subscriptions — monetization comes after the core
  loop is validated with Jennifer's own company.
- Company-side self-service directory management beyond what already
  exists (company_name, service_area) — richer profile fields (bio, logo,
  services list, pricing) are a future enhancement, not required for the
  first working loop.
- Automated test suite / CI — the project has none today; verification is
  manual end-to-end testing (detailed in section 7).

## 2. Data Model Changes

### 2.1 New table: `public.customers`

Mirrors the existing `companies` table pattern.

```sql
create table if not exists public.customers (
  id uuid references auth.users (id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Customers can view own row" on public.customers
  for select using (auth.uid() = id);

create policy "Customers can update own row" on public.customers
  for update using (auth.uid() = id);
```

### 2.2 Signup trigger becomes role-aware

The existing `handle_new_company_user()` trigger only fires when
`raw_user_meta_data ->> 'company_name'` is present. It's extended (renamed
`handle_new_user`) to also handle a customer path when
`raw_user_meta_data ->> 'full_name'` is present and `company_name` is not:

- company_name present → insert into `companies` (existing behavior,
  unchanged).
- full_name present, company_name absent → insert into `customers`.

The signup form UI gains a role toggle ("我是客户" / "我是清洁公司") that
sets the right metadata keys before calling `supabase.auth.signUp()`.

### 2.3 `leads` table becomes a real booking table

```sql
alter table public.leads
  add column if not exists customer_id uuid references public.customers(id);

alter table public.leads
  add column if not exists status text not null default 'requested';
  -- allowed values: requested | accepted | declined | in_progress | completed
```

`customer_name` / `customer_contact` stay as columns (for the handful of
existing demo rows and as a display fallback) but new bookings created
through the customer flow always populate `customer_id`. The dashboard
query for a company's leads is unchanged in shape — it still filters on
`company_id`; it additionally joins/display the customer's name from
`customers` when `customer_id` is set.

RLS additions:

```sql
create policy "Customers view own bookings" on public.leads
  for select using (auth.uid() = customer_id);

create policy "Customers create own bookings" on public.leads
  for insert with check (auth.uid() = customer_id);
```

(Existing company-side select/update policies are untouched.)

### 2.4 Public company directory

The `companies` table's existing RLS only allows a company to see its own
row — correct for private fields (email, phone) but unusable for a
customer-facing directory. Rather than loosen `companies` RLS directly, add
a narrow public view exposing only safe marketing fields:

```sql
create or replace view public.company_directory as
select id, company_name, service_area, created_at
from public.companies
where approved = true;

grant select on public.company_directory to anon, authenticated;
```

Average rating per company for the directory/profile page is computed from
`reviews` (existing table, already public-select).

### 2.5 `reviews` table becomes tied to a real completed booking

```sql
alter table public.reviews
  add column if not exists customer_id uuid references public.customers(id);

alter table public.reviews
  add column if not exists lead_id uuid references public.leads(id);
```

Insert policy replaces the (currently nonexistent, since reviews had no
insert policy defined for public use) rule with one that enforces:
the reviewer is the authenticated customer, and the referenced `lead_id`
belongs to that customer, targets the same `company_id`, and has
`status = 'completed'`.

```sql
create policy "Customers review own completed bookings" on public.reviews
  for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.customer_id = auth.uid()
        and l.company_id = reviews.company_id
        and l.status = 'completed'
    )
  );
```

A unique index on `(lead_id)` where `lead_id is not null` prevents a second
review on the same booking.

### 2.6 Realtime

`leads` and `reviews` are already added to the `supabase_realtime`
publication — no change needed there. The customer dashboard subscribes
with a filter on `customer_id=eq.<uid>` instead of the company dashboard's
`company_id=eq.<uid>` filter; same mechanism, different filter column.

### 2.7 Web Push

```sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

A VAPID key pair is generated once and stored as Vercel environment
variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). A Supabase Database
Webhook on `leads` (insert, and update of `status`/`before_photo_url`/
`after_photo_url`) and on `reviews` (insert) calls a Supabase Edge Function
that looks up the right `push_subscriptions` rows and sends a
notification via the `web-push` library.

Notification triggers:
- Customer notified: booking accepted/declined, status → in_progress,
  status → completed, new before/after photo added.
- Company notified: new booking request (insert), new review (insert).

## 3. Application Flow

**Signup:** `/signup` gains a role choice. Customer signup collects
full name, email, password, phone (optional). Company signup is unchanged.

**Customer directory:** `/browse` (new) lists `company_directory` rows with
average rating. `/browse/[companyId]` (new) shows the company's public
profile — name, service area, rating, list of public reviews — with a
"Request a booking" form (service type, address, preferred time, message).
Submitting creates a `leads` row with `status = 'requested'` and
`customer_id = auth.uid()`.

**Company dashboard (existing, extended):** the leads list already renders
per-lead status; it gains action buttons Accept / Decline (when
`requested`), Start job (when `accepted` → `in_progress`), Mark complete
(when `in_progress` → `completed`, prompts to attach before/after photos if
not already attached).

**Customer dashboard:** `/my-bookings` (new) lists the logged-in customer's
`leads` rows in real time, each showing current status and any uploaded
photos. Once a booking is `completed` and has no review yet, a "Leave a
review" action appears; submitting inserts into `reviews` with `lead_id`
set.

**Push opt-in:** both dashboards prompt once for notification permission
(standard browser prompt) and store the resulting subscription.

## 4. Error Handling

- Duplicate review attempts are blocked at the database level (unique
  index) — the UI hides the "leave a review" action once one exists, but
  the DB constraint is the actual guarantee.
- A customer cannot see or act on another customer's booking — enforced by
  RLS on `leads`/`reviews`, not just UI hiding.
- If push permission is denied or unsupported (e.g. iOS Safari without
  home-screen install), the app degrades silently to realtime-only
  updates — no error shown, just no subscription row created.
- Company directory only ever shows `approved = true` companies, so an
  unapproved signup never appears to customers even if `/browse` is hit
  directly.

## 5. Testing Plan (manual, no CI today)

End-to-end walkthrough Jennifer can run herself once built:

1. Sign up a company account as CGC (existing flow), get it approved
   (via Supabase table editor, same as today).
2. Sign up a second, separate account as a test customer.
3. As the customer: open `/browse`, confirm CGC appears with 0 reviews;
   open its profile, submit a booking request.
4. As CGC (different browser/incognito or logout-login): confirm the new
   booking appears in the dashboard in real time without refreshing;
   accept it, mark in-progress, upload before/after photos, mark
   completed.
5. As the customer: confirm status and photos updated in `/my-bookings`
   in real time; leave a review; confirm it appears on CGC's public
   profile.
6. Confirm a second review attempt on the same booking is rejected.
7. Confirm push: accept the browser notification prompt on both accounts,
   trigger step 4/5 events, confirm a browser notification appears for
   the other party.
8. Spot-check RLS by trying (via Supabase SQL editor, as an authenticated
   test role) to select another customer's `leads` row and confirming it
   returns nothing.

## 6. Open Items For The Implementation Plan

- Exact page/component file layout (follows existing `app/` conventions).
- Migration file vs. appending to `supabase/schema.sql` (existing project
  convention is a single idempotent `schema.sql` — plan should keep that
  pattern rather than introducing a migrations folder).
- Copy/UI polish for the new pages, using the same design system
  (ink/foam/brand palette, SpotlightCard, etc.) established in the
  homepage redesign.
