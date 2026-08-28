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
--    beg把 'YOUR-COMPANY-UUID' 换成你自己账号的 id(在 Supabase 的
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
--     order 注意:average_rating 转成 float8、review_count 转成 int,而不是
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
