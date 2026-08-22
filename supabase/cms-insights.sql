-- =====================================================================
-- NAVIDIX — آمار: یک عدد کلی، و کلیک‌ها (فاز ۹)
--
-- بعد از schema.sql و cms-rbac.sql اجرا کن. دوباره اجرا کردنش بی‌خطر است.
--
-- تا امروز سایت فقط «بازدید صفحه» را می‌شمرد، و پنل هم آن را روزبه‌روز و
-- صفحه‌به‌صفحه نشان می‌داد. سه چیز کم بود:
--
--   ۱. هیچ‌جا نمی‌شد یک عدد دید: «کل سایت تا حالا چند بار باز شده».
--   ۲. کلیک اصلاً ثبت نمی‌شد. هیچ.
--   ۳. نمای admin_traffic هر جفتِ (روز، صفحه) را برمی‌گرداند بدون سقف.
--      PostgREST پیش‌فرض هزار ردیف می‌دهد؛ با ۲۰۰ صفحه‌ی سبک، این سقف
--      ظرف چند روز پر می‌شود و از آن به بعد جمع‌ها بی‌صدا ناقص‌اند —
--      یعنی پنل عدد کمتر از واقعیت نشان می‌دهد و هیچ‌کس نمی‌فهمد.
--
-- هر سه اینجا حل می‌شوند. جمع‌بستن به پایگاه داده منتقل شده: نماهای زیر
-- یک ردیف یا چند ده ردیف برمی‌گردانند، نه چند هزار تا، پس سقف PostgREST
-- دیگر به داده دست نمی‌زند.
--
-- دو تصمیم که در همه‌ی این فایل تکرار می‌شوند:
--
--   بازدیدهای خودِ پنل شمرده نمی‌شوند. هر بار که صاحب سایت admin.html را
--   باز می‌کرد یک بازدید ثبت می‌شد و عدد سایت را باد می‌کرد. این‌جا در
--   خواندن هم فیلتر شده تا داده‌ی گذشته هم درست شود، نه فقط از این به بعد.
--
--   هیچ ستونی که بشود با آن یک نفر را شناخت وجود ندارد — نه IP، نه کوکی،
--   نه شناسه‌ی مرورگر. همان قاعده‌ی page_views، برای کلیک‌ها هم.
-- =====================================================================


-- =====================================================================
-- ۱. کلیک‌ها
--
-- شکلش عمداً همان page_views است: یک ردیف برای هر رویداد، بدون هویت.
-- تفاوتش دو ستون است — چه‌جور کلیکی، و روی چه چیزی.
--
--   out — لینکی که از سایت بیرون می‌برد (یوتیوب، تلگرام، اینستاگرام)
--   in  — لینکی داخل خودِ سایت
--   btn — دکمه‌ای که جایی نمی‌برد (کپی پرامپت، تکمیل درس، حالت روز)
--
-- label برای out دامنه‌ی مقصد است و برای بقیه یک برچسب کوتاه. متن کامل
-- دکمه ذخیره نمی‌شود؛ لازم نیست و بلند است.
-- =====================================================================

create table if not exists public.page_events (
  id         bigserial primary key,
  path       text not null check (char_length(path) <= 300),
  kind       text not null check (kind in ('out', 'in', 'btn')),
  label      text check (char_length(label) <= 120),
  day        date not null default (now() at time zone 'Asia/Tehran')::date,
  created_at timestamptz not null default now()
);

create index if not exists page_events_day_idx   on public.page_events (day);
create index if not exists page_events_label_idx on public.page_events (kind, label);

alter table public.page_events enable row level security;

-- همان قاعده‌ی page_views: همه می‌نویسند، فقط ادمین می‌خواند.
drop policy if exists pe_write on public.page_events;
create policy pe_write on public.page_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists pe_read on public.page_events;
create policy pe_read on public.page_events
  for select to authenticated
  using ((select public.is_admin()));

-- به‌روزرسانی و حذف از کلاینت، هیچ‌وقت.
revoke update, delete on public.page_events from anon, authenticated;
grant insert on public.page_events to anon, authenticated;
grant usage, select on sequence public.page_events_id_seq to anon, authenticated;


-- =====================================================================
-- ۲. چه چیزی «صفحه‌ی سایت» حساب می‌شود
--
-- پنل و صفحه‌ی حساب شخصی، سایت نیستند — کار خودِ صاحب سایت‌اند. یک تابع
-- تا هر سه نمای پایین یک تعریف داشته باشند و نشود یکی‌شان را یادت برود.
-- =====================================================================

create or replace function public.is_public_path(p text)
returns boolean
language sql
immutable
as $$
  select coalesce(p, '') !~ '^/?(admin|me)\.html?$'
     and coalesce(p, '') !~ '^/(admin|me)(/|$)';
$$;


-- =====================================================================
-- ۳. عدد کلی — یک ردیف، همه‌ی چیزی که یک نگاه لازم دارد
--
-- «گوگل چقدر معرفی کرده» تا جایی که این پایگاه داده می‌داند یعنی: چند
-- بازدید با ارجاع از گوگل آمده. تعداد نمایش در نتایج جست‌وجو و رتبه،
-- داده‌ی Search Console است و از اینجا در دسترس نیست — پنل همین را
-- می‌گوید تا عددی که نداریم، جای عددی که داریم جا نزند.
-- =====================================================================

create or replace view public.admin_totals as
select
  (select count(*) from public.page_views v
     where public.is_public_path(v.path))                                   as views_total,
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and v.day = (now() at time zone 'Asia/Tehran')::date)                as views_today,
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and v.day > (now() at time zone 'Asia/Tehran')::date - 7)            as views_7d,
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and v.day > (now() at time zone 'Asia/Tehran')::date - 30)           as views_30d,
  (select count(distinct v.path) from public.page_views v
     where public.is_public_path(v.path))                                   as pages_seen,
  (select min(v.day) from public.page_views v)                              as since_day,

  (select count(*) from public.page_events e
     where public.is_public_path(e.path))                                   as clicks_total,
  (select count(*) from public.page_events e
     where public.is_public_path(e.path)
       and e.day > (now() at time zone 'Asia/Tehran')::date - 7)            as clicks_7d,
  (select count(*) from public.page_events e
     where public.is_public_path(e.path) and e.kind = 'out')                as clicks_out,

  -- از کجا آمده‌اند. ref فقط نام دامنه است؛ مرورگر پیش از ارسال آدرس
  -- کامل را به همان تقلیل می‌دهد.
  (select count(*) from public.page_views v
     where public.is_public_path(v.path) and v.ref ~* 'google')             as from_google,
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and v.ref ~* '(google|bing|duckduckgo|yandex|yahoo|ecosia|brave)')    as from_search,
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and v.ref ~* '(instagram|telegram|t\.me|youtube|twitter|x\.com|linkedin|facebook|aparat|pinterest|reddit)')
                                                                            as from_social,
  -- «مستقیم» یعنی ارجاعی نبوده: آدرس را خودش زده، یا از جایی آمده که
  -- ارجاع نمی‌فرستد — تلگرام دسکتاپ، ایمیل، بوکمارک.
  (select count(*) from public.page_views v
     where public.is_public_path(v.path)
       and (v.ref is null or v.ref = '' or v.ref = 'internal'))             as from_direct
where public.is_admin();

alter view public.admin_totals set (security_invoker = on);
grant select on public.admin_totals to authenticated;


-- =====================================================================
-- ۴. پربازدیدترین صفحه‌ها — جمع‌شده و سقف‌دار
--
-- جای admin_traffic، که هر جفتِ (روز، صفحه) را می‌داد. جمع‌بستن این‌جا
-- انجام می‌شود نه در مرورگر، پس هرچقدر هم سایت بزرگ شود این نما صد ردیف
-- برمی‌گرداند و عددهایش کامل‌اند.
-- =====================================================================

create or replace view public.admin_pages as
select v.path,
       count(*)                                  as views,
       max(v.day)                                as last_day,
       (select count(*) from public.page_events e
          where e.path = v.path)                 as clicks
from public.page_views v
where public.is_admin() and public.is_public_path(v.path)
group by v.path
order by count(*) desc
limit 100;

alter view public.admin_pages set (security_invoker = on);
grant select on public.admin_pages to authenticated;


-- =====================================================================
-- ۵. بازدید روزانه — یک ردیف در روز، برای نمودار
-- =====================================================================

create or replace view public.admin_views_daily as
select v.day, count(*) as views
from public.page_views v
where public.is_admin() and public.is_public_path(v.path)
group by v.day
order by v.day desc
limit 120;

alter view public.admin_views_daily set (security_invoker = on);
grant select on public.admin_views_daily to authenticated;


-- =====================================================================
-- ۶. بیشترین کلیک‌ها
-- =====================================================================

create or replace view public.admin_clicks as
select e.kind, coalesce(e.label, '—') as label, count(*) as clicks
from public.page_events e
where public.is_admin() and public.is_public_path(e.path)
group by e.kind, coalesce(e.label, '—')
order by count(*) desc
limit 60;

alter view public.admin_clicks set (security_invoker = on);
grant select on public.admin_clicks to authenticated;


-- =====================================================================
-- ۷. admin_refs — همان نمای قبلی، با دو اصلاح
--
-- بازدید پنل از آن بیرون می‌رود، و ارجاع داخلی جدا می‌شود از «مستقیم».
-- بدون این دو، بزرگ‌ترین ردیفِ «از کجا آمده‌اند» همیشه خودِ سایت بود.
-- =====================================================================

create or replace view public.admin_refs as
select coalesce(nullif(v.ref, ''), 'direct') as ref, count(*) as views
from public.page_views v
where public.is_admin()
  and public.is_public_path(v.path)
  and coalesce(v.ref, '') <> 'internal'
group by coalesce(nullif(v.ref, ''), 'direct')
order by count(*) desc
limit 60;

alter view public.admin_refs set (security_invoker = on);
grant select on public.admin_refs to authenticated;
