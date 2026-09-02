-- CleanConnect 数据库结构
-- 使用方法:登录 supabase.com -> 打开你的项目 -> 左侧 SQL Editor -> 新建查询
-- 把这个文件的全部内容粘贴进去,点击 Run 运行一次即可

-- 1. 清洁公司账号表
create table if not exists public.companies (
  id uuid references auth.users (id) on delete cascade primary key,
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  service_area text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

drop policy if exists "Companies can view own row" on public.companies;
create policy "Companies can view own row" on public.companies
  for select using (auth.uid () = id);

drop policy if exists "Companies can update own row" on public.companies;
create policy "Companies can update own row" on public.companies
  for update using (auth.uid () = id);

-- 2. 客户线索表(消费者端上线后,由后台/表单写入)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid (),
  company_id uuid references public.companies (id) on delete cascade,
  customer_name text,
  customer_contact text,
  service_type text,
  message text,
  status text not null default 'new',
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz not null default now()
);

alter table public.leads
add column if not exists before_photo_url text;

alter table public.leads
add column if not exists after_photo_url text;

alter table public.leads enable row level security;

drop policy if exists "Companies view own leads" on public.leads;
create policy "Companies view own leads" on public.leads
  for select using (auth.uid () = company_id);

drop policy if exists "Companies update own leads" on public.leads;
create policy "Companies update own leads" on public.leads
  for update using (auth.uid () = company_id);

-- 3. 客户评价表(面向未来的公开展示,所以允许所有人查看)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid (),
  company_id uuid references public.companies (id) on delete cascade,
  customer_name text,
  rating int check (
    rating between 1 and 5
  ),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can view reviews" on public.reviews;
create policy "Anyone can view reviews" on public.reviews
  for select using (true);

-- 4. 新用户注册时,自动在 companies 表里创建一行
-- (注册表单会把 company_name / contact_name / phone / service_area 存进
--  auth.users 的 metadata 里,这个触发器负责把它们同步过来)
create or replace function public.handle_new_company_user () returns trigger language plpgsql security definer
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
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_company on auth.users;

create trigger on_auth_user_created_company
after insert on auth.users for each row
execute function public.handle_new_company_user ();

-- 5. 图片存储桶:清洁公司给每单线索上传"服务前 / 服务后"对比照片
insert into
  storage.buckets (id, name, public)
values
  ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

drop policy if exists "Companies upload own job photos" on storage.objects;

create policy "Companies upload own job photos" on storage.objects
for insert
  to authenticated
with
  check (
    bucket_id = 'job-photos'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

drop policy if exists "Companies update own job photos" on storage.objects;

create policy "Companies update own job photos" on storage.objects
for update
  to authenticated using (
    bucket_id = 'job-photos'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

drop policy if exists "Anyone can view job photos" on storage.objects;

create policy "Anyone can view job photos" on storage.objects
for select using (bucket_id = 'job-photos');

-- 6. 打开 leads / reviews 两张表的实时推送(Realtime)
-- 这样客户反馈一提交,清洁公司的后台页面就能立刻自动更新,不用刷新页面
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;

-- 7. (可选)想快速测试仪表盘效果,可以把下面几行的注释去掉,
--    并把 'YOUR-COMPANY-UUID' 换成你自己账号的 id(在 Supabase 的
--    Table Editor -> companies 表里能看到),然后单独运行这几行:

-- update public.companies set approved = true where id = 'YOUR-COMPANY-UUID';
--
-- insert into public.leads (company_id, customer_name, customer_contact, service_type, message)
-- values ('YOUR-COMPANY-UUID', '张先生', '0412 345 678', '商务清洁', '需要每周两次的办公室清洁报价');
--
-- insert into public.reviews (company_id, customer_name, rating, comment)
-- values ('YOUR-COMPANY-UUID', '李女士', 5, '服务很专业,准时又仔细!');

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
-- (顺序很重要:策略里用到的列必须先存在)
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

-- 14. 报价定价规则表 —— 公司在"定价设置"里为每个服务类别设置的
--     基础价 / 面积系数 / 频次折扣,是 AI 报价建议的计算依据。
--     category 目前固定三选一: residential / commercial / garden
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid (),
  company_id uuid references public.companies (id) on delete cascade,
  category text not null,
  base_rate numeric not null default 0,
  size_multiplier numeric not null default 1,
  frequency_discount_percent numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (company_id, category)
);

alter table public.pricing_rules enable row level security;

drop policy if exists "Companies manage own pricing rules" on public.pricing_rules;
create policy "Companies manage own pricing rules" on public.pricing_rules for all using (auth.uid () = company_id)
with
  check (auth.uid () = company_id);

-- 15. AI 报价引擎 —— 客户需求结构化字段 + 公司完整定价档案 + 报价单表
--     阶段一(MVP)范围:确定性计算,不接历史数据、不接图片、不接自然语言。

-- leads 表加上结构化字段,客户预约的时候直接选,而不是靠自由文本猜
alter table public.leads
add column if not exists category text;

alter table public.leads
add column if not exists bedrooms int;

alter table public.leads
add column if not exists bathrooms int;

alter table public.leads
add column if not exists property_condition text;

alter table public.leads
add column if not exists job_frequency text;

alter table public.leads
add column if not exists job_type text;

-- 公司的完整定价档案(每家公司一行):最低收费、最少清洁工人数、
-- 实际人工成本(用来算利润,不等于对客户收的钱)、目标利润率、
-- GST、上门费、四项常见附加服务价格
create table if not exists public.company_pricing_profiles (
  company_id uuid references public.companies (id) on delete cascade primary key,
  min_job_charge numeric not null default 0,
  min_cleaners int not null default 1,
  labour_cost_per_hour numeric not null default 0,
  margin_target_percent numeric not null default 30,
  gst_included boolean not null default true,
  travel_fee numeric not null default 0,
  addon_oven numeric not null default 0,
  addon_fridge numeric not null default 0,
  addon_windows numeric not null default 0,
  addon_carpet numeric not null default 0,
  addon_other_label text,
  addon_other_price numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.company_pricing_profiles enable row level security;

drop policy if exists "Companies manage own pricing profile" on public.company_pricing_profiles;
create policy "Companies manage own pricing profile" on public.company_pricing_profiles for all using (auth.uid () = company_id)
with
  check (auth.uid () = company_id);

-- 报价单表:AI 原始建议和公司最终确认的数字分开存,方便审计
-- (谁批准的、什么时候批准的、跟 AI 原本建议的差多少,都能查到)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid (),
  company_id uuid references public.companies (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  customer_id uuid references public.customers (id),
  ai_hours_min numeric,
  ai_hours_max numeric,
  ai_price_min numeric,
  ai_price_max numeric,
  confidence text,
  confidence_reason text,
  final_cleaners int,
  final_hours numeric,
  final_price numeric,
  margin_percent numeric,
  addons jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

alter table public.quotes enable row level security;

drop policy if exists "Companies manage own quotes" on public.quotes;
create policy "Companies manage own quotes" on public.quotes for all using (auth.uid () = company_id)
with
  check (auth.uid () = company_id);

-- Customers can only ever see a quote once the company has sent it —
-- never a draft the company is still working on.
drop policy if exists "Customers view own quotes" on public.quotes;
create policy "Customers view own quotes" on public.quotes
  for select using (auth.uid () = customer_id and status <> 'draft');

-- Customers are allowed to update their own quote row (to accept it), but
-- RLS alone can't stop them changing the price in the same request — so a
-- trigger enforces that a customer-initiated update can only ever flip a
-- 'sent' quote to 'accepted', with every other column pinned to its old
-- value. The company's own "manage own quotes" policy is untouched by this.
drop policy if exists "Customers accept own quotes" on public.quotes;
create policy "Customers accept own quotes" on public.quotes for update using (auth.uid () = customer_id)
with
  check (auth.uid () = customer_id);

create or replace function public.protect_customer_quote_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.uid() = OLD.customer_id and auth.uid() <> OLD.company_id then
    if OLD.status <> 'sent' or NEW.status <> 'accepted' then
      raise exception 'Customers can only accept a quote that has been sent';
    end if;
    NEW.company_id := OLD.company_id;
    NEW.lead_id := OLD.lead_id;
    NEW.customer_id := OLD.customer_id;
    NEW.ai_hours_min := OLD.ai_hours_min;
    NEW.ai_hours_max := OLD.ai_hours_max;
    NEW.ai_price_min := OLD.ai_price_min;
    NEW.ai_price_max := OLD.ai_price_max;
    NEW.confidence := OLD.confidence;
    NEW.confidence_reason := OLD.confidence_reason;
    NEW.final_cleaners := OLD.final_cleaners;
    NEW.final_hours := OLD.final_hours;
    NEW.final_price := OLD.final_price;
    NEW.margin_percent := OLD.margin_percent;
    NEW.addons := OLD.addons;
    NEW.created_at := OLD.created_at;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_customer_quote_update on public.quotes;
create trigger protect_customer_quote_update before update on public.quotes for each row
execute function public.protect_customer_quote_update();

-- 16. 简化定价设置 —— 公司只提供普通商业事实(怎么收费/最低收费/附加服务价格),
--     不再要求公司理解 base rate / size multiplier / margin 这些定价模型概念。
--     这些"隐藏默认值"由 estimateQuote() 内部处理,公司完全看不到也不用配置。

alter table public.company_pricing_profiles
add column if not exists pricing_model text not null default 'hourly';

alter table public.company_pricing_profiles
add column if not exists hourly_rate numeric not null default 0;

alter table public.company_pricing_profiles
add column if not exists flat_job_rate numeric not null default 0;

alter table public.company_pricing_profiles
add column if not exists addon_high_access numeric not null default 0;

-- 这几个字段是旧版"自己配置定价模型"留下的,公司从未真正理解过,
-- 现在的估价逻辑也不再读取它们了 —— 直接去掉。
alter table public.company_pricing_profiles
drop column if exists labour_cost_per_hour;

alter table public.company_pricing_profiles
drop column if exists margin_target_percent;

alter table public.company_pricing_profiles
drop column if exists min_cleaners;

-- 公司手动改价格时,可以选填"为什么改"——留痕,以后校准要用
alter table public.quotes
add column if not exists price_adjustment_reason text;

-- 公司在AI报价页可以直接问客户要更多信息,而不用先建一个完整的消息系统
alter table public.leads
add column if not exists info_requested_note text;

alter table public.leads
add column if not exists info_requested_at timestamptz;

-- 17. AI报价系统 Phase 1:客户上传照片、风险评级(不看照片内容,只看信息完整度)、
--     验房流程、报价调整(需要客户重新确认)、完整的审计日志。
--     明确不做的事(留到以后):真正会"看"照片内容的AI —— 那需要新的API key和
--     每次报价的真实调用成本,现在先不做。

-- 17a. 客户下单时最多可以上传 6 张照片(和公司上传的完工前后照片是分开的)
alter table public.leads
add column if not exists request_photos text[] not null default '{}';

-- 新建一个单独的 Storage 桶给客户上传照片用,和公司的 job-photos 桶分开,
-- 权限模型完全一样:自己的文件夹自己传,任何人都能查看(报价页要显示)
insert into
  storage.buckets (id, name, public)
values
  ('lead-photos', 'lead-photos', true) on conflict (id) do nothing;

drop policy if exists "Customers upload own request photos" on storage.objects;

create policy "Customers upload own request photos" on storage.objects for insert
with
  check (
    bucket_id = 'lead-photos'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

drop policy if exists "Anyone can view lead photos" on storage.objects;

create policy "Anyone can view lead photos" on storage.objects for select using (bucket_id = 'lead-photos');

-- 17b. quotes 表新增:风险等级、报价模式、验房后的追加费用(原报价 + 追加费用 = 最终报价)
alter table public.quotes
add column if not exists risk_level text;

alter table public.quotes
add column if not exists quote_mode text;

alter table public.quotes
add column if not exists additional_charge numeric;

alter table public.quotes
add column if not exists additional_charge_reason text;

alter table public.quotes
add column if not exists final_quote_accepted_at timestamptz;

-- 17c. 验房记录 —— 公司可以在报价前(或报价后)申请验房,填写验房结果
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid (),
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  requested_at timestamptz not null default now(),
  requested_by uuid,
  findings text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.inspections enable row level security;

drop policy if exists "Companies manage own inspections" on public.inspections;

create policy "Companies manage own inspections" on public.inspections for all using (auth.uid () = company_id)
with
  check (auth.uid () = company_id);

drop policy if exists "Customers view own inspections" on public.inspections;

create policy "Customers view own inspections" on public.inspections for select using (auth.uid () = customer_id);

-- 17d. 实际完工数据 —— 公司标记完工时顺手记录实际工时/人数,
--      现在只收集、不使用,Phase 2 校准的时候才会用到这些真实数据
create table if not exists public.job_outcomes (
  id uuid primary key default gen_random_uuid (),
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  company_id uuid not null references public.companies (id) on delete cascade,
  actual_hours numeric,
  actual_cleaners int,
  note text,
  created_at timestamptz not null default now()
);

alter table public.job_outcomes enable row level security;

drop policy if exists "Companies manage own job outcomes" on public.job_outcomes;

create policy "Companies manage own job outcomes" on public.job_outcomes for all using (auth.uid () = company_id)
with
  check (auth.uid () = company_id);

-- 17e. 报价审计日志 —— 每一次状态变化都留一条记录(谁、什么时候、做了什么、为什么),
--      而不是把所有信息都塞进 quotes 表的几个字段里
create table if not exists public.quote_events (
  id uuid primary key default gen_random_uuid (),
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  event_type text not null,
  actor_role text not null,
  actor_id uuid,
  note text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.quote_events enable row level security;

drop policy if exists "Related parties view quote events" on public.quote_events;

create policy "Related parties view quote events" on public.quote_events for select using (
  exists (
    select 1
    from public.leads l
    where
      l.id = quote_events.lead_id
      and (
        l.company_id = auth.uid ()
        or l.customer_id = auth.uid ()
      )
  )
);

drop policy if exists "Related parties log quote events" on public.quote_events;

create policy "Related parties log quote events" on public.quote_events for insert
with
  check (
    actor_id = auth.uid ()
    and exists (
      select 1
      from public.leads l
      where
        l.id = quote_events.lead_id
        and (
          l.company_id = auth.uid ()
          or l.customer_id = auth.uid ()
        )
    )
  );

-- 17f. 更新客户确认报价的触发器:现在客户不仅能把 'sent' 变成 'accepted',
--      验房后追加费用的 'adjusted' 状态也能被客户确认成 'accepted'。
--      新增的字段(risk_level / quote_mode / additional_charge 等)客户一样改不了,
--      final_quote_accepted_at 由触发器自己盖时间戳,不用客户端传。
create or replace function public.protect_customer_quote_update () returns trigger language plpgsql security definer as $$
begin
  if auth.uid() = OLD.customer_id and auth.uid() <> OLD.company_id then
    if OLD.status not in ('sent', 'adjusted') or NEW.status <> 'accepted' then
      raise exception 'Customers can only accept a quote that has been sent or adjusted';
    end if;
    NEW.company_id := OLD.company_id;
    NEW.lead_id := OLD.lead_id;
    NEW.customer_id := OLD.customer_id;
    NEW.ai_hours_min := OLD.ai_hours_min;
    NEW.ai_hours_max := OLD.ai_hours_max;
    NEW.ai_price_min := OLD.ai_price_min;
    NEW.ai_price_max := OLD.ai_price_max;
    NEW.confidence := OLD.confidence;
    NEW.confidence_reason := OLD.confidence_reason;
    NEW.final_cleaners := OLD.final_cleaners;
    NEW.final_hours := OLD.final_hours;
    NEW.final_price := OLD.final_price;
    NEW.margin_percent := OLD.margin_percent;
    NEW.addons := OLD.addons;
    NEW.created_at := OLD.created_at;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.price_adjustment_reason := OLD.price_adjustment_reason;
    NEW.risk_level := OLD.risk_level;
    NEW.quote_mode := OLD.quote_mode;
    NEW.additional_charge := OLD.additional_charge;
    NEW.additional_charge_reason := OLD.additional_charge_reason;
    NEW.final_quote_accepted_at := now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_customer_quote_update on public.quotes;

create trigger protect_customer_quote_update before update on public.quotes for each row
execute function public.protect_customer_quote_update ();

-- =========================================================
-- 18. Dynamic booking form — flexible per-category answers
-- =========================================================
-- One jsonb column holds every category-specific structured answer
-- (garden services, commercial floor area, window count, carpet
-- condition, etc.) instead of adding a new fixed column per cleaning
-- type. Existing columns (bedrooms/bathrooms/property_condition/
-- job_frequency/job_type) are untouched — residential bookings keep
-- writing them exactly as before, so nothing about existing bookings
-- or the existing AI quote formula for residential jobs changes.
alter table public.leads
add column if not exists service_details jsonb not null default '{}'::jsonb;
