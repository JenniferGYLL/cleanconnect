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
