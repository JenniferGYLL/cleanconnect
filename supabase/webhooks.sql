-- Supabase 项目里 Database Webhooks 那个可视化界面依赖的 supabase_functions
-- schema 缺失(报错 "schema supabase_functions does not exist"),这是该项目本身的
-- 一个环境问题,不是我们代码的问题。绕过办法:不用 Webhooks 界面,改成直接用
-- pg_net 扩展自己写一个触发器,效果完全一样(leads/reviews 表一有变化就给
-- /api/notify 发 HTTP POST 请求)。

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  perform net.http_post(
    url := 'https://cleanconnect-one.vercel.app/api/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'ff769151eb53931f44201c096b3d0b8c17c975294d8abc71e71ced9b03c72a40'
    ),
    body := payload
  );

  return NEW;
end;
$$;

-- leads 表:新建预约(INSERT)和状态/照片变化(UPDATE)都要通知
drop trigger if exists notify_leads_webhook on public.leads;
create trigger notify_leads_webhook
  after insert or update on public.leads
  for each row execute function public.notify_webhook();

-- reviews 表:只在客户提交新评价(INSERT)时通知
drop trigger if exists notify_reviews_webhook on public.reviews;
create trigger notify_reviews_webhook
  after insert on public.reviews
  for each row execute function public.notify_webhook();
