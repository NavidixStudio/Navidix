-- =====================================================================
-- NAVIDIX — نصب کامل، در یک فایل
--
-- ⚠️ این فایل ساخته می‌شود. دستی ویرایشش نکن.
--    سازنده‌اش: python3 tools/build-install-sql.py
--    اگر چیزی را اینجا عوض کنی، اجرای بعدیِ سازنده پاکش می‌کند.
--
-- کل این متن را کپی کن و در Supabase → SQL Editor یک بار Run بزن. بی‌خطر
-- است و دوباره اجرا کردنش هم بی‌خطر است: هر چیزی که ساخته می‌شود
-- «if not exists» یا «or replace» است، پس نه داده‌ای پاک می‌شود و نه خطایی
-- می‌گیری.
--
-- بعد از این، یک قدم دیگر مانده و فقط یکی: خودت را Owner کن. دستورش در
-- انتهای همین فایل است، جدا، چون به ایمیل تو نیاز دارد.
--
-- محتوای این فایل، به ترتیب:
--
--   1. schema.sql           — پایه: پروفایل، پیشرفت درس، بازدید صفحه، نماهای آمار
--   2. users-and-refs.sql   — فهرست کاربران و منابع ورودی
--   3. fix-advisor.sql      — پاسخ به هشدارهای Advisor
--   4. cms-rbac.sql         — نقش‌ها، Permissionها، گزارش فعالیت، تنظیمات، رسانه
--   5. cms-content.sql      — مقاله، پرامپت، دوره/فصل/درس، گالری، ویدیو، جست‌وجو
--   6. cms-ai.sql           — دستیار هوش مصنوعی، انتشار خودکار، ورک‌فلوها
--
-- هر کدام از این شش تا در supabase/ فایل خودشان را هم دارند، با همان
-- توضیحات. این یکی فقط برای راحتیِ یک‌بار اجرا کردن است.
-- =====================================================================




-- #####################################################################
-- بخش 1 از 6 — پایه: پروفایل، پیشرفت درس، بازدید صفحه، نماهای آمار
-- منبع: supabase/schema.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — پایگاه داده‌ی یادگیری
--
-- این فایل را یک بار در Supabase → SQL Editor اجرا کن. دوباره اجرا کردنش
-- بی‌خطر است: هر چیزی که ساخته می‌شود «if not exists» یا «or replace» است،
-- پس اجرای دوباره نه چیزی را پاک می‌کند و نه خطا می‌دهد.
--
-- اصل حاکم بر کل این فایل: هیچ محتوایی اینجا نیست. درس‌ها، عنوان‌ها و مسیر
-- یادگیری همه در گیت می‌مانند (curriculum.js). آنچه اینجا ذخیره می‌شود فقط
-- «وضعیت کاربر» است — چه خوانده، چقدر وقت گذاشته، چند روز پیوسته آمده.
--
-- و اصل دوم: محافظت با RLS انجام می‌شود، نه با مخفی‌کردن صفحه. سایت استاتیک
-- است و هر کسی می‌تواند admin.html را باز کند؛ چیزی که جلویش را می‌گیرد
-- سیاست‌های پایین است، نه نبودِ لینک.
-- =====================================================================


-- ---------------------------------------------------------------- profiles
--
-- یک ردیف برای هر کاربر. `role` تنها چیزی است که ادمین را از بقیه جدا می‌کند
-- و هیچ کاربری اجازه‌ی نوشتن روی آن را ندارد (سیاستش پایین‌تر).

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  role         text not null default 'reader' check (role in ('reader', 'admin')),
  created_at   timestamptz not null default now()
);


-- --------------------------------------------------------- lesson_progress
--
-- همان شکلی که nvx-progress.js در مرورگر نگه می‌دارد، تا همگام‌سازی نیازی به
-- ترجمه نداشته باشد. کلید ترکیبی یعنی هر کاربر برای هر درس فقط یک ردیف دارد
-- و upsert بدون تکرار کار می‌کند.

create table if not exists public.lesson_progress (
  user_id     uuid not null references auth.users on delete cascade,
  lesson_slug text not null,
  done        boolean not null default false,
  done_at     timestamptz,
  seconds     integer not null default 0 check (seconds >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, lesson_slug)
);


-- ----------------------------------------------------------- learning_days
--
-- ثانیه‌های هر روز. «این هفته»، «مجموع زمان» و Learning Streak هر سه از همین
-- یک جدول درمی‌آیند. روز به وقت تهران حساب می‌شود، نه UTC — وگرنه زنجیره‌ی
-- کاربر ساعت سه‌ونیم بامداد می‌شکند.

create table if not exists public.learning_days (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null,
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);


-- --------------------------------------------------------------- page_views
--
-- آمار بازدید سایت، شامل مهمان‌هایی که اصلاً حساب ندارند. عمداً هیچ ستونی که
-- بشود با آن یک نفر را شناسایی کرد ندارد: نه IP، نه شناسه‌ی مرورگر، نه کوکی.
-- فقط اینکه کدام صفحه، چه روزی، و از کجا آمده.

create table if not exists public.page_views (
  id         bigserial primary key,
  path       text not null,
  ref        text,
  day        date not null default (now() at time zone 'Asia/Tehran')::date,
  created_at timestamptz not null default now()
);

create index if not exists page_views_day_idx on public.page_views (day);


-- ------------------------------------------------------------------ is_admin
--
-- `security definer` یعنی این تابع با دسترسی سازنده‌اش اجرا می‌شود و RLS را
-- دور می‌زند. این فقط یک راحتی نیست، لازم است: اگر سیاستِ خودِ profiles بخواهد
-- profiles را بخواند تا نقش را بفهمد، به بازگشت بی‌پایان می‌خورد.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;


-- --------------------------------------------------- ساخت خودکار پروفایل
--
-- بدون این، کاربر ثبت‌نام می‌کند و هیچ ردیفی در profiles ندارد.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- RLS — از اینجا به بعد، امنیت
-- =====================================================================

alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.learning_days   enable row level security;
alter table public.page_views      enable row level security;


-- ---- profiles ----
-- کاربر پروفایل خودش را می‌بیند و نامش را عوض می‌کند. ادمین همه را می‌بیند.
-- هیچ‌کس `role` را نمی‌نویسد: ستون از update کاربر بیرون گذاشته شده، پس
-- ارتقای خود به ادمین از سمت مرورگر ممکن نیست. تنها راهش SQL Editor است.

drop policy if exists profiles_read_own   on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ستون role از دسترس مرورگر بیرون است، در سطح دسترسی و نه در سطح سیاست.
-- Supabase به‌طور پیش‌فرض update کامل می‌دهد؛ اینجا پس گرفته و فقط یک ستون
-- برگردانده می‌شود. ادمین‌شدن فقط از SQL Editor ممکن است.
revoke update on public.profiles from authenticated;
grant  update (display_name) on public.profiles to authenticated;


-- ---- lesson_progress ----

drop policy if exists lp_read on public.lesson_progress;
drop policy if exists lp_write on public.lesson_progress;
drop policy if exists lp_update on public.lesson_progress;

create policy lp_read on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy lp_write on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy lp_update on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---- learning_days ----

drop policy if exists ld_read on public.learning_days;
drop policy if exists ld_write on public.learning_days;
drop policy if exists ld_update on public.learning_days;

create policy ld_read on public.learning_days
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy ld_write on public.learning_days
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy ld_update on public.learning_days
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---- page_views ----
-- مهمان و کاربر هر دو می‌توانند بنویسند و هیچ‌کس جز ادمین نمی‌تواند بخواند.
-- سیاست خواندن لازم است چون نماها با دسترسی خودِ کاربر اجرا می‌شوند و دیگر
-- RLS را دور نمی‌زنند.

drop policy if exists pv_write on public.page_views;

create policy pv_write on public.page_views
  for insert to anon, authenticated
  with check (true);

drop policy if exists pv_read on public.page_views;
create policy pv_read on public.page_views
  for select to authenticated
  using ((select public.is_admin()));


-- =====================================================================
-- نماهای ادمین
--
-- هر کدام `where public.is_admin()` دارند. یعنی اگر کاربر عادی — یا کسی که
-- اصلاً حساب ندارد — این‌ها را صدا بزند، خطا نمی‌گیرد و داده هم نمی‌گیرد:
-- صفر ردیف برمی‌گردد. این عمدی است؛ پیام خطا خودش یک سرنخ است.
-- =====================================================================

create or replace view public.admin_overview as
select
  (select count(*) from public.profiles)                                          as users_total,
  (select count(*) from public.profiles
     where created_at > now() - interval '7 days')                                as users_new_7d,
  (select count(distinct user_id) from public.learning_days
     where day > (current_date - 7))                                              as users_active_7d,
  (select coalesce(sum(seconds), 0) from public.learning_days)                    as seconds_total,
  (select count(*) from public.lesson_progress where done)                        as completions_total
where public.is_admin();


create or replace view public.admin_daily as
select day,
       count(distinct user_id) as active_users,
       sum(seconds)            as seconds
from public.learning_days
where public.is_admin()
group by day
order by day desc;


create or replace view public.admin_lessons as
select lesson_slug,
       count(*)                        as readers,
       count(*) filter (where done)    as completions,
       coalesce(sum(seconds), 0)       as seconds
from public.lesson_progress
where public.is_admin()
group by lesson_slug
order by readers desc;


create or replace view public.admin_signups as
select date(created_at at time zone 'Asia/Tehran') as day,
       count(*)                                    as signups
from public.profiles
where public.is_admin()
group by 1
order by 1 desc;


create or replace view public.admin_traffic as
select day, path, count(*) as views
from public.page_views
where public.is_admin()
group by day, path
order by day desc, views desc;


grant select on public.admin_overview, public.admin_daily, public.admin_lessons,
                public.admin_signups,  public.admin_traffic
  to authenticated;


-- =====================================================================
-- آخرین قدم — خودت را ادمین کن
--
-- این را بعد از ثبت‌نام در سایت اجرا کن، با همان ایمیلی که ثبت‌نام کردی.
-- تا وقتی این اجرا نشود هیچ‌کس ادمین نیست، و این تنها راه ادمین‌شدن است:
-- از مرورگر ممکن نیست.
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'fmarvasti@gmail.com');
--
-- =====================================================================


-- نماها با دسترسی خودِ کاربر اجرا می‌شوند، نه سازنده‌شان. یعنی RLS جدول‌های
-- زیرین اعمال می‌شود و امنیت یک دروازه دارد نه دو تا. شرط is_admin() داخل
-- خودِ نماها هم می‌ماند — حالا اضافی است، و همان اضافه‌بودن نکته‌اش است.
alter view public.admin_overview set (security_invoker = on);
alter view public.admin_daily    set (security_invoker = on);
alter view public.admin_lessons  set (security_invoker = on);
alter view public.admin_signups  set (security_invoker = on);
alter view public.admin_traffic  set (security_invoker = on);


-- فهرست کاربران و منابع ورودی در supabase/users-and-refs.sql هستند.
-- آن فایل را هم یک بار اجرا کن؛ پنل مدیریت بدون آن دو بخش آخرش خالی است.


-- #####################################################################
-- بخش 2 از 6 — فهرست کاربران و منابع ورودی
-- منبع: supabase/users-and-refs.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — فهرست کاربران و منابع ورودی
--
-- این را یک بار در SQL Editor اجرا کن. بی‌خطر است و دوباره اجرا کردنش
-- مشکلی ندارد. بعدش پنل مدیریت دو بخش تازه نشان می‌دهد:
--
--   ۱. فهرست کاربران با ایمیل، تاریخ ثبت‌نام و پیشرفتشان
--   ۲. اینکه بازدیدکننده‌ها از کجا آمده‌اند
-- =====================================================================


-- ------------------------------------------------------- فهرست کاربران
--
-- ایمیل در جدول auth.users است، نه در public — و آن جدول عمداً از بیرون
-- خوانده نمی‌شود. راهش یک تابع `security definer` است که با دسترسی سازنده
-- اجرا می‌شود: همان الگویی که خودِ Supabase برای این کار توصیه می‌کند.
--
-- چرا تابع و نه نما: یک نما با دسترسی خودِ کاربر (security_invoker) به
-- auth.users نمی‌رسد، و اگر برایش استثنا بگذاریم دوباره همان هشدار قرمز
-- Advisor برمی‌گردد. یک تابع، اما، جای درست این کار است.
--
-- شرط `where public.is_admin()` داخل خودِ تابع است، پس اگر کاربر عادی
-- صدایش بزند صفر ردیف می‌گیرد — نه خطا، نه داده.

create or replace function public.admin_users()
returns table (
  email       text,
  joined      timestamptz,
  role        text,
  completed   bigint,
  seconds     bigint,
  last_active date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.email::text,
    p.created_at,
    p.role,
    coalesce(l.n, 0),
    coalesce(d.s, 0),
    d.last
  from public.profiles p
  join auth.users u on u.id = p.id
  left join (
    select user_id, count(*) filter (where done) as n
    from public.lesson_progress group by user_id
  ) l on l.user_id = p.id
  left join (
    select user_id, sum(seconds) as s, max(day) as last
    from public.learning_days group by user_id
  ) d on d.user_id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;


-- --------------------------------------------------- از کجا آمده‌اند
--
-- ستون ref فقط نام دامنه است — مرورگر پیش از ارسال، آدرس کامل را به همان
-- تقلیل می‌دهد. خالی‌بودنش یعنی کسی مستقیم آدرس را زده یا از جایی آمده که
-- ارجاع نمی‌فرستد (اپ پیام‌رسان، ایمیل، بوکمارک).
--
-- این یکی نما می‌ماند و نه تابع، چون فقط page_views را می‌خواند و ادمین
-- از طریق سیاست pv_read به آن دسترسی دارد.

create or replace view public.admin_refs as
select ref, count(*) as views
from public.page_views
where public.is_admin()
group by ref
order by count(*) desc;

alter view public.admin_refs set (security_invoker = on);
grant select on public.admin_refs to authenticated;


-- #####################################################################
-- بخش 3 از 6 — پاسخ به هشدارهای Advisor
-- منبع: supabase/fix-advisor.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — پاسخ به هشدارهای Advisor
--
-- این را یک بار در SQL Editor اجرا کن. بی‌خطر است و می‌شود دوباره اجرا کرد.
-- بعدش در Advisor روی Refresh بزن؛ هر پنج هشدار قرمز باید بروند.
--
-- سه چیز عوض می‌شود:
--
--   ۱. نماهای ادمین دیگر RLS را دور نمی‌زنند
--   ۲. auth.uid() در سیاست‌ها یک بار اجرا می‌شود، نه به ازای هر ردیف
--   ۳. ستون role از دسترس مرورگر بیرون می‌رود، با grant سطح‌ستونی
--
-- هیچ‌کدام رفتار سایت را عوض نمی‌کند و هیچ داده‌ای پاک نمی‌شود.
-- =====================================================================


-- ------------------------------------------------------- ۱. page_views
--
-- تا حالا هیچ سیاست خواندنی نداشت و لازم هم نبود: نمای admin_traffic با
-- دسترسی سازنده اجرا می‌شد و RLS را دور می‌زد. حالا که قرار است نماها مثل
-- خودِ کاربر اجرا شوند، ادمین به یک راه صریح برای خواندن نیاز دارد.

drop policy if exists pv_read on public.page_views;
create policy pv_read on public.page_views
  for select to authenticated
  using ((select public.is_admin()));


-- --------------------------------------------- ۲. سیاست‌ها، با initplan
--
-- تنها تفاوت با نسخه‌ی قبل، پرانتزِ (select ...) دور auth.uid() و is_admin()
-- است. Postgres آن را یک بار حساب می‌کند و برای همه‌ی ردیف‌ها نگه می‌دارد،
-- به‌جای اینکه برای هر ردیف دوباره صدایش بزند.

drop policy if exists profiles_read_own   on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- with check دیگر لازم نیست جلوی عوض‌شدن role را بگیرد؛ آن کار را grant
-- پایین انجام می‌دهد، که هم ساده‌تر است و هم دورزدنی نیست.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


drop policy if exists lp_read   on public.lesson_progress;
drop policy if exists lp_write  on public.lesson_progress;
drop policy if exists lp_update on public.lesson_progress;

create policy lp_read on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy lp_write on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy lp_update on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


drop policy if exists ld_read   on public.learning_days;
drop policy if exists ld_write  on public.learning_days;
drop policy if exists ld_update on public.learning_days;

create policy ld_read on public.learning_days
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy ld_write on public.learning_days
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ld_update on public.learning_days
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ------------------------------------------------ ۳. قفل ستون role
--
-- Supabase به‌طور پیش‌فرض به نقش authenticated روی جدول‌های public اجازه‌ی
-- update می‌دهد و همه‌چیز را به RLS می‌سپارد. اینجا آن اجازه پس گرفته و فقط
-- برای یک ستون داده می‌شود. نتیجه: حتی اگر روزی سیاستی اشتباه نوشته شود،
-- درخواستی که بخواهد role را بنویسد در سطح دسترسی رد می‌شود، نه در سطح
-- سیاست. ادمین‌شدن فقط از همین SQL Editor ممکن است.

revoke update on public.profiles from authenticated;
grant  update (display_name) on public.profiles to authenticated;


-- --------------------------------------- ۴. نماها، با دسترسی خودِ کاربر
--
-- این همان چیزی است که Advisor قرمزش کرده بود. با security_invoker روشن،
-- نما با دسترسی کسی اجرا می‌شود که صدایش زده، پس RLS جدول‌های زیرین اعمال
-- می‌شود. ادمین همچنان همه‌چیز را می‌بیند، چون سیاست‌های بالا خودشان
-- is_admin() را قبول دارند.
--
-- شرط `where public.is_admin()` داخل نماها هم سر جایش می‌ماند. حالا اضافی
-- است، ولی اضافه‌بودنش عمدی است: اگر روزی یکی از سیاست‌های بالا شل شود،
-- این هنوز جلوی نما را می‌گیرد.
--
-- security_invoker از Postgres 15 به بعد هست. اگر اینجا خطا گرفتی یعنی
-- پروژه روی نسخه‌ی قدیمی‌تری است — بگو تا راه دیگری برویم.

alter view public.admin_overview set (security_invoker = on);
alter view public.admin_daily    set (security_invoker = on);
alter view public.admin_lessons  set (security_invoker = on);
alter view public.admin_signups  set (security_invoker = on);
alter view public.admin_traffic  set (security_invoker = on);


-- #####################################################################
-- بخش 4 از 6 — نقش‌ها، Permissionها، گزارش فعالیت، تنظیمات، رسانه
-- منبع: supabase/cms-rbac.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — پایه‌ی CMS: نقش‌ها، Permissionها، Audit Log، تنظیمات سایت،
-- کتابخانه‌ی رسانه (فاز ۱)
--
-- این فایل را یک بار، بعد از schema.sql و users-and-refs.sql و fix-advisor.sql،
-- در Supabase → SQL Editor اجرا کن. دوباره اجرا کردنش بی‌خطر است: هر چیزی
-- «if not exists» یا «or replace» است.
--
-- این فایل فقط زیرساخت را می‌سازد — نه جدول مقاله، نه پرامپت، نه گالری. آن‌ها
-- فاز بعدی‌اند و روی همین پایه سوار می‌شوند. چیزی که اینجا تمام می‌شود:
--
--   ۱. نقش‌ها از یک ستون دوتایی (reader/admin) به شش نقش واقعی می‌رسند
--   ۲. هر Permission به‌صورت جدا در دیتابیس تعریف و به نقش‌ها وصل می‌شود
--   ۳. غیرفعال‌کردن یک کاربر همین الان اثر دارد، حتی قبل از اینکه چیزی برای
--      غیرفعال‌کردن داشته باشیم
--   ۴. هر تغییر نقش یا وضعیت، در audit_log ثبت می‌شود — فقط برای Owner قابل‌دیدن
--   ۵. تنظیمات سایت یک جدول key/value با دسترسی نوشتنِ کنترل‌شده می‌شود
--   ۶. یک Storage bucket برای رسانه، با Policy روشن: خواندن عمومی،
--      نوشتن فقط برای کسی که media.manage دارد
--
-- اصل بدون تغییر: امنیت در DB enforce می‌شود، نه در UI. هر تابع جدید همان
-- الگوی is_admin() قبلی را دارد — security definer، و revoke/grant صریح.
-- =====================================================================


-- =====================================================================
-- ۱. نقش‌ها
--
-- شش نقش، نه دو. «reader» همان کاربر عادی سایت است (پیشرفت درس، بدون هیچ
-- دسترسی پنل) — در جدول می‌ماند چون profiles.role به همین جا وصل می‌شود.
-- پنج‌تای دیگر پلکان دسترسی پنل مدیریت‌اند.
-- =====================================================================

create table if not exists public.roles (
  id      text primary key,
  name_fa text not null,
  rank    int  not null    -- فقط برای ترتیب نمایش در پنل؛ خودِ امنیت را تعیین نمی‌کند
);

insert into public.roles (id, name_fa, rank) values
  ('reader', 'خواننده',        0),
  ('viewer', 'مشاهده‌گر',      1),
  ('writer', 'نویسنده',        2),
  ('editor', 'ویراستار',       3),
  ('admin',  'ادمین',          4),
  ('owner',  'مالک',           5)
on conflict (id) do update set name_fa = excluded.name_fa, rank = excluded.rank;


-- =====================================================================
-- ۲. Permissionها
--
-- فهرست دقیقاً همان کلیدهایی است که در طرح CMS خواسته شد، به‌علاوه چند
-- کلید که برای پوشش کامل پنل لازم بودند: media.manage (کتابخانه‌ی رسانه)،
-- roles.manage (ویرایش نقشه‌ی نقش→Permission، فقط برای Owner معنا دارد)،
-- audit.view (خواندن گزارش، فقط Owner) و videos.manage (چون ویدیوها در
-- درخواست از گالری جدا ذکر شدند).
-- =====================================================================

create table if not exists public.permissions (
  key          text primary key,
  description_fa text not null
);

insert into public.permissions (key, description_fa) values
  ('content.create',  'ایجاد محتوای تازه (مقاله و مشابه)'),
  ('content.edit',    'ویرایش محتوای موجود'),
  ('content.delete',  'حذف محتوا'),
  ('content.publish', 'انتشار یا زمان‌بندی محتوا'),
  ('users.manage',    'مدیریت کاربران عادی سایت'),
  ('admins.manage',   'ایجاد/غیرفعال‌کردن ادمین و تعیین نقش'),
  ('roles.manage',    'ویرایش اینکه هر نقش چه Permissionهایی دارد'),
  ('gallery.manage',  'مدیریت گالری تصاویر'),
  ('prompts.manage',  'مدیریت کتابخانه‌ی پرامپت'),
  ('lessons.manage',  'مدیریت درس‌ها و دوره‌ها'),
  ('videos.manage',   'مدیریت ویدیوها و مستندها'),
  ('media.manage',    'آپلود/حذف در کتابخانه‌ی رسانه'),
  ('settings.manage', 'ویرایش تنظیمات عمومی سایت'),
  ('audit.view',      'دیدن گزارش فعالیت ادمین‌ها')
on conflict (key) do update set description_fa = excluded.description_fa;


-- =====================================================================
-- ۳. نقشه‌ی نقش → Permission
--
-- پیش‌فرض‌ها طبق منطق خودِ درخواست: Writer فقط ایجاد/ویرایش می‌کند و به
-- رسانه دسترسی دارد (برای گذاشتن تصویر در متنش)، نه حذف و نه انتشار. Editor
-- همه‌ی کارهای محتوایی را دارد. Admin همه‌چیز به‌جز مدیریت خودِ ادمین‌ها و
-- نقش‌ها را دارد — آن دو مخصوص Owner می‌مانند. Viewer فقط پنل را می‌بیند،
-- کاری نمی‌کند.
--
-- این جدول را بعداً خودِ Owner از پنل می‌تواند عوض کند (روی همین جدول با
-- roles.manage)؛ این‌جا فقط نقطه‌ی شروع است.
-- =====================================================================

create table if not exists public.role_permissions (
  role_id         text not null references public.roles(id) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

insert into public.role_permissions (role_id, permission_key)
select 'owner', key from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key) values
  ('admin', 'content.create'), ('admin', 'content.edit'), ('admin', 'content.delete'),
  ('admin', 'content.publish'), ('admin', 'users.manage'), ('admin', 'gallery.manage'),
  ('admin', 'prompts.manage'), ('admin', 'lessons.manage'), ('admin', 'videos.manage'),
  ('admin', 'media.manage'), ('admin', 'settings.manage'),

  ('editor', 'content.create'), ('editor', 'content.edit'), ('editor', 'content.delete'),
  ('editor', 'content.publish'), ('editor', 'gallery.manage'), ('editor', 'prompts.manage'),
  ('editor', 'lessons.manage'), ('editor', 'videos.manage'), ('editor', 'media.manage'),

  ('writer', 'content.create'), ('writer', 'content.edit'), ('writer', 'media.manage')
on conflict do nothing;

-- viewer و reader عمداً هیچ ردیفی ندارند: viewer فقط داشبورد را می‌بیند،
-- reader اصلاً وارد پنل نمی‌شود.


-- =====================================================================
-- ۴. profiles — از چک دوتایی به نقش‌های واقعی
--
-- ستون role همان می‌ماند، فقط منبعش عوض می‌شود: از یک CHECK ثابت به FK روی
-- roles، که هم دامنه‌ی مقدار را تضمین می‌کند و هم یعنی نقش تازه فقط از همین
-- فایل (یا SQL Editor) اضافه می‌شود، نه از کلاینت.
--
-- is_active برای غیرفعال‌کردن است — یک ستون ساده، نه دست‌کاری auth.users:
-- کاربر غیرفعال هنوز می‌تواند وارد شود (session‌اش زنده است)، اما is_admin،
-- is_staff و has_permission همه false برمی‌گردانند، پس همان لحظه هر چیزی
-- که با یکی از این سه گیت شده برایش بسته می‌شود.
-- =====================================================================

alter table public.profiles add column if not exists is_active boolean not null default true;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_fkey;
alter table public.profiles
  add constraint profiles_role_fkey foreign key (role) references public.roles(id);


-- =====================================================================
-- ۵. توابع دسترسی
--
-- is_admin() همان امضای قبلی را دارد و جای قبلی‌اش (پنج view و یک RPC در
-- schema.sql و users-and-refs.sql) بدون هیچ تغییری کار می‌کند — فقط حالا
-- «admin» یا «owner»ی که is_active است را قبول می‌کند، نه فقط رشته‌ی دقیق
-- 'admin'. یعنی همین یک تابع، امنیت پنل آماری فعلی را هم به‌روز می‌کند.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'owner')
      and is_active
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner' and is_active
  );
$$;

-- هر نقشی به‌جز reader — برای چیزهایی که «هر عضو تیم می‌بیند، خواننده‌ی
-- عادی نمی‌بیند»، مثل فهرست کتابخانه‌ی رسانه برای انتخاب تصویر.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role <> 'reader' and is_active
  );
$$;

create or replace function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role
    where p.id = (select auth.uid())
      and p.is_active
      and rp.permission_key = p_key
  );
$$;


-- =====================================================================
-- ۶. Audit Log — فقط Owner می‌بیند
--
-- دو راه برای نوشتن در آن هست:
--   الف) audit_trigger() — برای جدول‌های محتوایی فاز بعد؛ خودکار و
--        جعل‌ناپذیر است چون از کلاینت صدا زده نمی‌شود.
--   ب)  log_audit() — یک RPC برای رویدادهایی که به یک جدول وصل نیستند
--        (تغییر نقش، فعال/غیرفعال‌کردن). actor همیشه از خودِ توکن گرفته
--        می‌شود، پس کسی نمی‌تواند به‌جای کس دیگری در گزارش ثبت شود.
-- =====================================================================

create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references auth.users on delete set null,
  actor_email  text,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  entity_label text,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx  on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;

drop policy if exists audit_read_owner on public.audit_log;
create policy audit_read_owner on public.audit_log
  for select to authenticated
  using ((select public.is_owner()));

-- نوشتن مستقیم از کلاینت هیچ‌وقت مجاز نیست؛ فقط از توابع security definer
-- زیر، که همیشه actor واقعی را خودشان تعیین می‌کنند.
revoke insert, update, delete on public.audit_log from authenticated, anon;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(case when TG_OP = 'DELETE' then old else new end);
begin
  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, before, after)
  values (
    (select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(v_row->>'id', v_row->>'key', v_row->>'path', ''),
    coalesce(v_row->>'title', v_row->>'name', v_row->>'key', v_row->>'filename', v_row->>'display_name', ''),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id text, p_entity_label text,
  p_before jsonb, p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, before, after)
  values (
    (select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    p_action, p_entity_type, p_entity_id, p_entity_label, p_before, p_after
  );
end;
$$;

revoke all on function public.log_audit(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, text, text, jsonb, jsonb) to authenticated;


-- =====================================================================
-- ۷. تعیین نقش و فعال/غیرفعال‌کردن — تنها راه از کلاینت
--
-- profiles.role و profiles.is_active همچنان از UPDATE مستقیم کلاینت بیرون
-- می‌مانند (همان revoke قبلی در schema.sql). این دو تابع تنها دری‌اند که
-- به آن دو ستون می‌رسند، و هرکدام سه قفل دارند: خودت را عوض نمی‌کنی، فقط
-- کسی با admins.manage صدا می‌زند، و ساختن/دست‌زدن به یک Owner فقط از خودِ
-- Owner ممکن است.
-- =====================================================================

create or replace function public.set_user_role(p_user_id uuid, p_role_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_role text;
begin
  if not (select public.has_permission('admins.manage')) then
    raise exception 'دسترسی نداری';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'نمی‌توانی نقش خودت را از همین‌جا عوض کنی';
  end if;

  if p_role_id = 'owner' and not (select public.is_owner()) then
    raise exception 'فقط Owner می‌تواند نقش Owner بدهد';
  end if;

  select role into v_old_role from public.profiles where id = p_user_id;

  if v_old_role = 'owner' and not (select public.is_owner()) then
    raise exception 'فقط Owner می‌تواند نقش یک Owner را عوض کند';
  end if;

  update public.profiles set role = p_role_id where id = p_user_id;

  perform public.log_audit('update_role', 'profiles', p_user_id::text,
    (select email from auth.users where id = p_user_id),
    jsonb_build_object('role', v_old_role), jsonb_build_object('role', p_role_id));
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;


create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  if not (select public.has_permission('admins.manage')) then
    raise exception 'دسترسی نداری';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'نمی‌توانی خودت را غیرفعال کنی';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;

  if v_target_role = 'owner' and not (select public.is_owner()) then
    raise exception 'فقط Owner می‌تواند یک Owner را غیرفعال کند';
  end if;

  update public.profiles set is_active = p_active where id = p_user_id;

  perform public.log_audit(case when p_active then 'activate' else 'deactivate' end,
    'profiles', p_user_id::text, (select email from auth.users where id = p_user_id),
    null, jsonb_build_object('is_active', p_active));
end;
$$;

revoke all on function public.set_user_active(uuid, boolean) from public, anon;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;


-- =====================================================================
-- ۸. تنظیمات سایت — یک جدول key/value
--
-- خواندن برای همه باز است (anon هم)، چون بیشتر این مقدارها همان چیزی است
-- که همین الان بی‌واسطه در HTML صفحات هست (عنوان، توضیح، لینک‌های اجتماعی).
-- نوشتن فقط با settings.manage. هر ردیف موقع UPDATE خودش را با
-- updated_at/updated_by مهر می‌زند و در audit_log ثبت می‌شود.
-- =====================================================================

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.site_settings enable row level security;

drop policy if exists settings_read_public on public.site_settings;
create policy settings_read_public on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists settings_write on public.site_settings;
create policy settings_write on public.site_settings
  for insert to authenticated
  with check ((select public.has_permission('settings.manage')));

drop policy if exists settings_update on public.site_settings;
create policy settings_update on public.site_settings
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

drop policy if exists settings_delete on public.site_settings;
create policy settings_delete on public.site_settings
  for delete to authenticated
  using ((select public.has_permission('settings.manage')));

create or replace function public.stamp_setting_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

drop trigger if exists site_settings_stamp on public.site_settings;
create trigger site_settings_stamp
  before update on public.site_settings
  for each row execute function public.stamp_setting_update();

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit
  after insert or update or delete on public.site_settings
  for each row execute function public.audit_trigger();

-- مقدارهای شروع، از همان چیزی که همین الان در index.html هست — تا جدول
-- خالی شروع نشود و پنل از همان روز اول چیزی برای نمایش داشته باشد.
insert into public.site_settings (key, value) values
  ('site_title',       '"نویدیکس — رسانه مستقل علم و فناوری"'),
  ('site_description', '"رسانه مستقل علم و فناوری — استودیو نویدیکس، تلاقی پژوهش، سینما و هوش مصنوعی."'),
  ('seo_defaults',      '{"title_suffix": " | Navidix", "default_og_image": "/og-home.png"}'),
  ('social_links',      '{}'),
  ('contact',           '{}'),
  ('maintenance_mode',  'false'),
  ('homepage_sections', '[]')
on conflict (key) do nothing;


-- =====================================================================
-- ۹. کتابخانه‌ی رسانه — metadata + Storage bucket
--
-- خودِ فایل در Supabase Storage است؛ این جدول فقط اطلاعاتش را نگه می‌دارد.
-- sha256 یکتا یعنی آپلود دوباره‌ی همان فایل خطا می‌دهد به‌جای اینکه نسخه‌ی
-- تکراری بسازد — همان «جلوگیری از آپلود تکراری» که خواسته شده بود.
--
-- خواندن برای هر عضو تیم (is_staff)، چون Writer هم برای گذاشتن تصویر در
-- مقاله‌اش باید بتواند رسانه‌ی موجود را ببیند. نوشتن/حذف فقط media.manage.
-- =====================================================================

create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null default 'media',
  path        text not null unique,
  filename    text not null,
  mime_type   text,
  size_bytes  bigint,
  width       int,
  height      int,
  sha256      text not null,
  alt_text    text,
  uploaded_by uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists media_assets_sha256_idx   on public.media_assets (sha256);
create index if not exists        media_assets_created_idx  on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

drop policy if exists media_read on public.media_assets;
create policy media_read on public.media_assets
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists media_insert on public.media_assets;
create policy media_insert on public.media_assets
  for insert to authenticated
  with check ((select public.has_permission('media.manage')));

drop policy if exists media_update on public.media_assets;
create policy media_update on public.media_assets
  for update to authenticated
  using (uploaded_by = (select auth.uid()) or (select public.has_permission('media.manage')))
  with check (uploaded_by = (select auth.uid()) or (select public.has_permission('media.manage')));

drop policy if exists media_delete on public.media_assets;
create policy media_delete on public.media_assets
  for delete to authenticated
  using ((select public.has_permission('media.manage')));

drop trigger if exists media_assets_audit on public.media_assets;
create trigger media_assets_audit
  after insert or update or delete on public.media_assets
  for each row execute function public.audit_trigger();

-- خودِ bucket. public=true یعنی URL نهایی فایل بدون هیچ توکنی خوانده
-- می‌شود — همان چیزی که برای عکس داخل یک صفحه‌ی عمومی لازم است. کنترل
-- واقعی روی این است که «چه کسی می‌تواند در آن بنویسد»، نه روی خواندن.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_bucket_read on storage.objects;
create policy media_bucket_read on storage.objects
  for select to public
  using (bucket_id = 'media');

drop policy if exists media_bucket_insert on storage.objects;
create policy media_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.has_permission('media.manage')));

drop policy if exists media_bucket_update on storage.objects;
create policy media_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.has_permission('media.manage')))
  with check (bucket_id = 'media' and (select public.has_permission('media.manage')));

drop policy if exists media_bucket_delete on storage.objects;
create policy media_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.has_permission('media.manage')));


-- =====================================================================
-- ۱۰. آنچه پنل صدا می‌زند
--
-- سه تابع، و هر سه عمداً تابع‌اند نه نما: هر کدام باید چیزی را بشمارند یا
-- بخوانند که سیاست‌های RLS برای بعضی نقش‌ها می‌بندند. یک نمای
-- security_invoker اینجا جواب نمی‌داد — مثلاً «تعداد کل کاربران» برای یک
-- Editor عدد ۱ برمی‌گشت، چون سیاست profiles فقط ردیف خودش را به او
-- می‌دهد. تابع security definer شمارش را درست انجام می‌دهد و گیتِ دسترسی
-- را خودش، یک‌جا، در سطر اول می‌گذارد.
-- =====================================================================

-- ---------------------------------------------------- من چه کسی هستم
--
-- اولین چیزی که پنل می‌پرسد. تا این جواب نیامده باشد هیچ بخشی رسم نمی‌شود،
-- و آنچه رسم می‌شود از روی همین فهرست permissions تعیین می‌شود. برای یک
-- reader هم جواب می‌دهد — با فهرست خالی، که همان «هیچ بخشی» است.

create or replace function public.my_admin_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id',      p.id,
    'email',        u.email,
    'display_name', p.display_name,
    'role',         p.role,
    'is_active',    p.is_active,
    'permissions',  coalesce((
      select jsonb_agg(rp.permission_key order by rp.permission_key)
      from public.role_permissions rp
      where rp.role_id = p.role and p.is_active
    ), '[]'::jsonb)
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = (select auth.uid());
$$;

revoke all on function public.my_admin_context() from public, anon;
grant execute on function public.my_admin_context() to authenticated;


-- ------------------------------------------------- فهرست کاربران پنل
--
-- admin_users() قبلی سر جایش می‌ماند و دست‌نخورده است — پنل آماری هنوز
-- همان را صدا می‌زند. این یکی جداست چون دو ستون تازه لازم داشت که آن یکی
-- ندارد: id (برای صدا زدن set_user_role) و is_active. تغییر شکل خروجی یک
-- تابع موجود در Postgres ممکن نیست، پس تابع تازه، نه جانشین.
--
-- ترتیب: اول اعضای تیم، بعد خواننده‌های عادی — چون در پنل مدیریت کاربران،
-- کسی که نقش دارد آن چیزی است که دنبالش می‌گردی.

create or replace function public.admin_user_list()
returns table (
  id           uuid,
  email        text,
  display_name text,
  role         text,
  is_active    boolean,
  joined       timestamptz,
  completed    bigint,
  seconds      bigint,
  last_active  date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.is_active,
    p.created_at,
    coalesce(l.n, 0),
    coalesce(d.s, 0),
    d.last
  from public.profiles p
  join auth.users u on u.id = p.id
  left join (
    select user_id, count(*) filter (where done) as n
    from public.lesson_progress group by user_id
  ) l on l.user_id = p.id
  left join (
    select user_id, sum(seconds) as s, max(day) as last
    from public.learning_days group by user_id
  ) d on d.user_id = p.id
  where public.has_permission('users.manage')
     or public.has_permission('admins.manage')
  order by (p.role <> 'reader') desc, p.created_at desc;
$$;

revoke all on function public.admin_user_list() from public, anon;
grant execute on function public.admin_user_list() to authenticated;


-- --------------------------------------------- اعداد بالای داشبورد
--
-- شمارش محتوا (مقاله، پرامپت، درس، گالری) عمداً اینجا نیست: آن جدول‌ها هنوز
-- ساخته نشده‌اند و فاز بعدی‌اند. وقتی ساخته شدند، همین تابع با or replace
-- کلیدهای تازه می‌گیرد و پنل بدون تغییر آن‌ها را نشان می‌دهد.
--
-- شمارش audit فقط برای Owner معنا دارد و برای بقیه null برمی‌گردد، نه صفر:
-- صفر یعنی «چیزی ثبت نشده»، null یعنی «به تو مربوط نیست». پنل این دو را
-- جور دیگری نشان می‌دهد.

create or replace function public.admin_cms_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_staff() then jsonb_build_object(
    'users_total',     (select count(*) from public.profiles),
    'users_active_7d', (select count(distinct user_id) from public.learning_days
                          where day > (current_date - 7)),
    'staff_total',     (select count(*) from public.profiles
                          where role <> 'reader' and is_active),
    'media_total',     (select count(*) from public.media_assets),
    'media_bytes',     (select coalesce(sum(size_bytes), 0) from public.media_assets),
    'settings_total',  (select count(*) from public.site_settings),
    'audit_7d',        case when public.is_owner()
                         then (select count(*) from public.audit_log
                                 where created_at > now() - interval '7 days')
                         else null end
  ) else null end;
$$;

revoke all on function public.admin_cms_overview() from public, anon;
grant execute on function public.admin_cms_overview() to authenticated;


-- =====================================================================
-- آخرین قدم — خودت را Owner کن
--
-- تا اینجا اجرای این فایل هیچ Owner‌ای نساخته؛ حساب فعلی‌ات همچنان همان
-- role='admin' قبلی را دارد که schema.sql با همین ایمیل تنظیم کرده بود.
-- این را یک بار در SQL Editor اجرا کن تا به بالای پلکان برسی — تنها راهش
-- همین‌جاست، از مرورگر ممکن نیست:
--
--   update public.profiles set role = 'owner'
--   where id = (select id from auth.users where email = 'fmarvasti@gmail.com');
--
-- =====================================================================


-- #####################################################################
-- بخش 5 از 6 — مقاله، پرامپت، دوره/فصل/درس، گالری، ویدیو، جست‌وجو
-- منبع: supabase/cms-content.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — جدول‌های محتوا (فاز ۳)
--
-- بعد از cms-rbac.sql اجرا کن. دوباره اجرا کردنش بی‌خطر است.
--
-- اینجا جایی است که سایت از «محتوا در گیت» به «محتوا در پایگاه داده»
-- می‌رسد. اما نه یک‌شبه و نه با پاک‌کردن چیزی: هیچ‌کدام از این جدول‌ها
-- جای فایل‌های tools/ را نمی‌گیرند. آن‌ها سر جایشان می‌مانند و ۲۷۰ صفحه‌ی
-- style/ همچنان از styles.py ساخته می‌شوند. این جدول‌ها برای محتوایی
-- هستند که از این به بعد ساخته می‌شود، و برای روزی که بخواهیم قدیمی‌ها را
-- هم به اینجا بیاوریم.
--
-- شش چیز اینجا تعریف می‌شود:
--
--   ۱. دسته‌بندی مشترک، با یک ستون kind به‌جای پنج جدول جدا
--   ۲. مقاله‌ها
--   ۳. پرامپت‌ها
--   ۴. دوره → فصل → درس
--   ۵. گالری و ویدیوها
--   ۶. انتشار زمان‌بندی‌شده
--
-- و یک قاعده که روی هر شش‌تا اعمال می‌شود: «چه کسی می‌تواند منتشر کند» با
-- تریگر جدا از «چه کسی می‌تواند بنویسد» کنترل می‌شود. یک Writer می‌تواند
-- مقاله بسازد و ویرایش کند و هرگز نتواند منتشرش کند — و این در پایگاه داده
-- اجرا می‌شود، نه با غیرفعال‌کردن یک دکمه.
-- =====================================================================


-- =====================================================================
-- ۰. قطعه‌های مشترک
-- =====================================================================

-- ------------------------------------------- گزارش فعالیت، با نام درست
--
-- audit_trigger فاز دو دنبال ستون title می‌گشت و آن را در جدول‌های اینجا
-- همیشه پیدا نمی‌کند: پرامپت title_fa دارد و دسته‌بندی name_fa. بدون این،
-- گزارش برای آن دو نوع «حذف — (بی‌نام)» می‌نوشت، که بی‌فایده‌ترین شکل ممکن
-- برای یک سطر گزارش است.
--
-- با or replace نوشته شده، پس اگر cms-rbac.sql را قبلاً اجرا کرده باشی هم
-- همین‌جا درست می‌شود.

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(case when TG_OP = 'DELETE' then old else new end);
begin
  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, before, after)
  values (
    (select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(v_row->>'id', v_row->>'key', v_row->>'path', ''),
    coalesce(v_row->>'title', v_row->>'title_fa', v_row->>'name_fa', v_row->>'name',
             v_row->>'key', v_row->>'filename', v_row->>'display_name', ''),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------- updated_at
create or replace function public.stamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ------------------------------------------------------ published_at
--
-- وقتی چیزی برای اولین بار منتشر می‌شود، تاریخ انتشارش همان لحظه است و
-- کسی نباید مجبور باشد دستی بنویسدش. بار دوم دست نمی‌خورد: «تاریخ انتشار»
-- یعنی اولین بار، نه آخرین ویرایش — آن یکی updated_at است.

create or replace function public.stamp_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := coalesce(new.scheduled_for, now());
  end if;
  return new;
end;
$$;


-- ------------------------------------------------- گیتِ انتشار
--
-- این تنها جایی است که content.publish معنا پیدا می‌کند. جدا از سیاست‌های
-- insert/update است، چون آن‌ها درباره‌ی «این ردیف» تصمیم می‌گیرند و این
-- درباره‌ی «این ستون». یک Writer به هر دو سیاست جواب مثبت می‌گیرد و اینجا
-- متوقف می‌شود.
--
-- وقتی auth.uid() خالی است یعنی درخواست از مرورگر نیامده — SQL Editor،
-- cron، یا service role. آن‌ها همین حالا هم RLS را کامل دور می‌زنند، پس
-- متوقف‌کردنشان اینجا نه امنیتی اضافه می‌کند و نه publish_due() را
-- می‌گذارد کار کند.

create or replace function public.enforce_publish_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    if new.status <> 'draft' and not (select public.has_permission('content.publish')) then
      raise exception 'برای انتشار یا زمان‌بندی، دسترسی content.publish لازم است';
    end if;

  elsif new.status is distinct from old.status
        and new.status <> 'draft'
        and not (select public.has_permission('content.publish')) then
    raise exception 'برای انتشار یا زمان‌بندی، دسترسی content.publish لازم است';
  end if;

  return new;
end;
$$;


-- --------------------------------------- «هر کسی که محتوایی را می‌چرخاند»
--
-- برای دسته‌بندی‌ها، که مشترک‌اند: کسی که پرامپت مدیریت می‌کند باید بتواند
-- دسته‌ی پرامپت بسازد، بدون اینکه دسترسی مقاله لازم داشته باشد.

create or replace function public.can_manage_any_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select public.has_permission('content.edit'))
      or (select public.has_permission('prompts.manage'))
      or (select public.has_permission('lessons.manage'))
      or (select public.has_permission('gallery.manage'))
      or (select public.has_permission('videos.manage'));
$$;

revoke all on function public.can_manage_any_content() from public, anon;
grant execute on function public.can_manage_any_content() to authenticated;


-- =====================================================================
-- ۱. دسته‌بندی
--
-- یک جدول برای هر پنج نوع محتوا، با ستون kind که آن‌ها را از هم جدا
-- می‌کند. پنج جدول جداگانه همان ستون‌ها را پنج بار تکرار می‌کرد و پنج بار
-- هم باید سیاست برایشان نوشته می‌شد.
--
-- تگ‌ها اما جدول ندارند: روی خود ردیف، به شکل text[]. یک تگ آزاد است و
-- تاریخچه و ترتیب ندارد، پس جدولی که فقط نام را نگه دارد چیزی اضافه
-- نمی‌کرد جز یک join.
-- =====================================================================

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('article', 'prompt', 'lesson', 'gallery', 'video')),
  slug       text not null,
  name_fa    text not null,
  name_en    text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, slug)
);

create index if not exists categories_kind_idx on public.categories (kind, sort_order);

alter table public.categories enable row level security;

drop policy if exists cat_read on public.categories;
create policy cat_read on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists cat_write on public.categories;
create policy cat_write on public.categories
  for insert to authenticated
  with check ((select public.can_manage_any_content()));

drop policy if exists cat_update on public.categories;
create policy cat_update on public.categories
  for update to authenticated
  using ((select public.can_manage_any_content()))
  with check ((select public.can_manage_any_content()));

drop policy if exists cat_delete on public.categories;
create policy cat_delete on public.categories
  for delete to authenticated
  using ((select public.can_manage_any_content()));


-- =====================================================================
-- ۲. مقاله‌ها
--
-- body متن خام است — Markdown. نه HTML، چون HTMLی که از یک ویرایشگر
-- مرورگری بیرون بیاید باید قبل از نمایش پاک‌سازی شود و آن کار در یک سایت
-- استاتیک جای امنی برای انجام‌دادن ندارد.
--
-- cover_path مسیر داخل bucket رسانه است، نه یک URL کامل. اگر روزی دامنه‌ی
-- ذخیره‌سازی عوض شود، هیچ ردیفی لازم نیست به‌روز شود.
-- =====================================================================

create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  body            text,
  cover_path      text,
  category_id     uuid references public.categories on delete set null,
  tags            text[] not null default '{}',
  seo_title       text,
  seo_description text,
  seo_keywords    text[] not null default '{}',
  author_id       uuid references auth.users on delete set null,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'scheduled')),
  published_at    timestamptz,
  scheduled_for   timestamptz,
  sort_order      int  not null default 0,
  created_by      uuid references auth.users on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists articles_status_idx on public.articles (status, published_at desc);
create index if not exists articles_order_idx  on public.articles (sort_order, created_at desc);
create index if not exists articles_tags_idx   on public.articles using gin (tags);


-- =====================================================================
-- ۳. پرامپت‌ها
--
-- سه ستون پرامپت دارد چون کتابخانه‌ی فعلی سایت هم دارد: تصویر، ویدیو، و
-- منفی. یک ستون واحد یعنی هر بار که کسی پرامپت ویدیو بخواهد باید متن را
-- دستی تکه کند.
-- =====================================================================

create table if not exists public.prompts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title_fa        text not null,
  title_en        text,
  prompt_image    text,
  prompt_video    text,
  prompt_negative text,
  recipe          text,
  model           text,
  cover_path      text,
  category_id     uuid references public.categories on delete set null,
  tags            text[] not null default '{}',
  featured        boolean not null default false,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'scheduled')),
  published_at    timestamptz,
  scheduled_for   timestamptz,
  sort_order      int  not null default 0,
  created_by      uuid references auth.users on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists prompts_status_idx   on public.prompts (status, sort_order);
create index if not exists prompts_featured_idx on public.prompts (featured) where featured;
create index if not exists prompts_tags_idx     on public.prompts using gin (tags);


-- =====================================================================
-- ۴. دوره → فصل → درس
--
-- هر سه سطح جدا، و هر دو پیوند بالادستی اختیاری: یک درس می‌تواند بدون فصل
-- زیر یک دوره بنشیند، یا اصلاً بدون دوره باشد. چهارده درس فعلی سایت دقیقاً
-- همین شکل‌اند — یک مسیر صاف، بدون فصل — و ساختاری که آن‌ها را نپذیرد
-- ساختاری است که روز اول باید دورش زد.
--
-- حذف یک دوره درس‌هایش را پاک نمی‌کند (set null)، ولی فصل‌هایش را چرا
-- (cascade): یک فصلِ بی‌دوره هیچ معنایی ندارد، یک درسِ بی‌دوره دارد.
-- =====================================================================

create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  cover_path    text,
  level         text check (level in ('beginner', 'intermediate', 'advanced')),
  category_id   uuid references public.categories on delete set null,
  tags          text[] not null default '{}',
  status        text not null default 'draft'
                  check (status in ('draft', 'published', 'scheduled')),
  published_at  timestamptz,
  scheduled_for timestamptz,
  sort_order    int  not null default 0,
  created_by    uuid references auth.users on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses on delete cascade,
  title       text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chapters_course_idx on public.chapters (course_id, sort_order);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  course_id        uuid references public.courses on delete set null,
  chapter_id       uuid references public.chapters on delete set null,
  title            text not null,
  description      text,
  thumbnail_path   text,
  video_url        text,
  level            text check (level in ('beginner', 'intermediate', 'advanced')),
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  category_id      uuid references public.categories on delete set null,
  tags             text[] not null default '{}',
  status           text not null default 'draft'
                     check (status in ('draft', 'published', 'scheduled')),
  published_at     timestamptz,
  scheduled_for    timestamptz,
  sort_order       int  not null default 0,
  created_by       uuid references auth.users on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lessons_course_idx on public.lessons (course_id, sort_order);
create index if not exists lessons_status_idx on public.lessons (status, sort_order);


-- =====================================================================
-- ۵. گالری و ویدیوها
--
-- گالری به media_path اشاره می‌کند و نه به یک URL: تصویر در همان bucket
-- فاز دو می‌نشیند و اینجا فقط مسیرش می‌آید. ویدیو برعکس — youtube_url یک
-- نشانی بیرونی است و چیزی برای ذخیره‌کردن ندارد، فقط کاور محلی دارد.
-- =====================================================================

create table if not exists public.gallery_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  media_path    text not null,
  alt_text      text,
  category_id   uuid references public.categories on delete set null,
  tags          text[] not null default '{}',
  featured      boolean not null default false,
  status        text not null default 'draft'
                  check (status in ('draft', 'published', 'scheduled')),
  published_at  timestamptz,
  scheduled_for timestamptz,
  sort_order    int  not null default 0,
  created_by    uuid references auth.users on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists gallery_status_idx on public.gallery_items (status, sort_order);
create index if not exists gallery_tags_idx   on public.gallery_items using gin (tags);

create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  thumbnail_path text,
  youtube_url    text not null,
  category_id    uuid references public.categories on delete set null,
  tags           text[] not null default '{}',
  featured       boolean not null default false,
  status         text not null default 'draft'
                   check (status in ('draft', 'published', 'scheduled')),
  published_at   timestamptz,
  scheduled_for  timestamptz,
  sort_order     int  not null default 0,
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists videos_status_idx on public.videos (status, sort_order);
create index if not exists videos_tags_idx   on public.videos using gin (tags);


-- =====================================================================
-- ۶. RLS و تریگرها، یک بار برای همه
--
-- شش جدول، همان شش سیاست، و نوشتنشان دستی یعنی شش فرصت برای اینکه یکی
-- از قلم بیفتد. حلقه‌ی زیر همان‌ها را از روی یک نگاشت می‌سازد، پس اگر
-- جدول هفتمی اضافه شود فقط یک سطر به نگاشت اضافه می‌شود.
--
-- خواندنِ عمومی شرط دارد: منتشرشده، و اگر تاریخ انتشار در آینده است هنوز
-- نه. یعنی محتوای زمان‌بندی‌شده حتی اگر کسی status را دستی عوض کند، تا
-- رسیدن موعدش از بیرون دیده نمی‌شود.
-- =====================================================================

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('articles',      'content.create', 'content.edit',   'content.delete'),
      ('prompts',       'prompts.manage', 'prompts.manage', 'prompts.manage'),
      ('courses',       'lessons.manage', 'lessons.manage', 'lessons.manage'),
      ('lessons',       'lessons.manage', 'lessons.manage', 'lessons.manage'),
      ('gallery_items', 'gallery.manage', 'gallery.manage', 'gallery.manage'),
      ('videos',        'videos.manage',  'videos.manage',  'videos.manage')
    ) as v(tbl, p_create, p_edit, p_delete)
  loop
    execute format('alter table public.%I enable row level security', t.tbl);

    execute format('drop policy if exists %I on public.%I', t.tbl || '_read', t.tbl);
    execute format($f$
      create policy %I on public.%I
        for select to anon, authenticated
        using (
          (status = 'published'
             and (published_at is null or published_at <= now()))
          or (select public.is_staff())
        )$f$, t.tbl || '_read', t.tbl);

    execute format('drop policy if exists %I on public.%I', t.tbl || '_insert', t.tbl);
    execute format($f$
      create policy %I on public.%I
        for insert to authenticated
        with check ((select public.has_permission(%L)))$f$,
      t.tbl || '_insert', t.tbl, t.p_create);

    execute format('drop policy if exists %I on public.%I', t.tbl || '_update', t.tbl);
    execute format($f$
      create policy %I on public.%I
        for update to authenticated
        using ((select public.has_permission(%L)))
        with check ((select public.has_permission(%L)))$f$,
      t.tbl || '_update', t.tbl, t.p_edit, t.p_edit);

    execute format('drop policy if exists %I on public.%I', t.tbl || '_delete', t.tbl);
    execute format($f$
      create policy %I on public.%I
        for delete to authenticated
        using ((select public.has_permission(%L)))$f$,
      t.tbl || '_delete', t.tbl, t.p_delete);

    -- سه تریگر: مهرِ ویرایش، مهرِ انتشار، و گیتِ content.publish
    execute format('drop trigger if exists %I on public.%I', t.tbl || '_updated', t.tbl);
    execute format('create trigger %I before update on public.%I
                      for each row execute function public.stamp_updated_at()',
                   t.tbl || '_updated', t.tbl);

    execute format('drop trigger if exists %I on public.%I', t.tbl || '_pubstamp', t.tbl);
    execute format('create trigger %I before insert or update on public.%I
                      for each row execute function public.stamp_published_at()',
                   t.tbl || '_pubstamp', t.tbl);

    execute format('drop trigger if exists %I on public.%I', t.tbl || '_pubgate', t.tbl);
    execute format('create trigger %I before insert or update on public.%I
                      for each row execute function public.enforce_publish_permission()',
                   t.tbl || '_pubgate', t.tbl);

    -- و گزارش فعالیت، همان تابعی که فاز دو ساخت
    execute format('drop trigger if exists %I on public.%I', t.tbl || '_audit', t.tbl);
    execute format('create trigger %I after insert or update or delete on public.%I
                      for each row execute function public.audit_trigger()',
                   t.tbl || '_audit', t.tbl);
  end loop;
end $$;


-- ---- فصل‌ها، که وضعیت انتشار ندارند ----
--
-- یک فصل ظرف است، نه محتوا: چیزی برای منتشرکردن ندارد و دیده‌شدنش تابع
-- دوره‌ی خودش است. پس نه status دارد و نه گیت انتشار — فقط باید دوره‌اش
-- برای خواننده قابل دیدن باشد.

alter table public.chapters enable row level security;

drop policy if exists chapters_read on public.chapters;
create policy chapters_read on public.chapters
  for select to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = chapters.course_id
      and ((c.status = 'published' and (c.published_at is null or c.published_at <= now()))
           or (select public.is_staff()))
  ));

drop policy if exists chapters_write on public.chapters;
create policy chapters_write on public.chapters
  for insert to authenticated
  with check ((select public.has_permission('lessons.manage')));

drop policy if exists chapters_update on public.chapters;
create policy chapters_update on public.chapters
  for update to authenticated
  using ((select public.has_permission('lessons.manage')))
  with check ((select public.has_permission('lessons.manage')));

drop policy if exists chapters_delete on public.chapters;
create policy chapters_delete on public.chapters
  for delete to authenticated
  using ((select public.has_permission('lessons.manage')));

drop trigger if exists chapters_updated on public.chapters;
create trigger chapters_updated before update on public.chapters
  for each row execute function public.stamp_updated_at();

drop trigger if exists chapters_audit on public.chapters;
create trigger chapters_audit after insert or update or delete on public.chapters
  for each row execute function public.audit_trigger();

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();


-- =====================================================================
-- ۷. انتشار زمان‌بندی‌شده
--
-- publish_due() هر ردیفی را که موعدش رسیده از scheduled به published
-- می‌برد. خودش هیچ زمان‌بندی‌ای ندارد — یک تابع است، نه یک سرویس. چیزی
-- که صدایش می‌زند در پایین توضیح داده شده.
--
-- تا وقتی این اجرا نشود، محتوای زمان‌بندی‌شده هم از بیرون دیده نمی‌شود:
-- سیاست خواندن شرط published_at <= now() را دارد. یعنی بدترین حالتِ
-- نرسیدنِ cron «دیر منتشر شد» است، نه «زودتر از موعد لو رفت».
-- =====================================================================

create or replace function public.publish_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t    text;
  n    integer := 0;
  c    integer;
begin
  foreach t in array array['articles', 'prompts', 'courses', 'lessons', 'gallery_items', 'videos']
  loop
    execute format($f$
      update public.%I
         set status = 'published',
             published_at = coalesce(published_at, scheduled_for, now())
       where status = 'scheduled'
         and scheduled_for is not null
         and scheduled_for <= now()$f$, t);
    get diagnostics c = row_count;
    n := n + c;
  end loop;

  if n > 0 then
    insert into public.audit_log (actor_email, action, entity_type, entity_label, after)
    values ('system', 'publish', 'scheduler', 'انتشار زمان‌بندی‌شده',
            jsonb_build_object('count', n));
  end if;

  return n;
end;
$$;

revoke all on function public.publish_due() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- برای فعال‌کردن زمان‌بندی، یک بار این دو خط را جدا اجرا کن. عمداً اینجا
-- کامنت‌اند: pg_cron باید اول در Database → Extensions روشن شود، وگرنه
-- اجرای کل این فایل روی همین خط خطا می‌دهد و بقیه‌اش هم اعمال نمی‌شود.
--
--   create extension if not exists pg_cron;
--   select cron.schedule('nvx-publish-due', '*/5 * * * *',
--                        $$select public.publish_due()$$);
--
-- هر پنج دقیقه. دقیق‌تر از این برای یک سایت محتوایی معنا ندارد و فقط
-- بیدارباشِ بی‌دلیل برای پایگاه داده است.
-- ---------------------------------------------------------------------


-- =====================================================================
-- ۷.۵ ترتیب نمایش
--
-- پنل کل ترتیب تازه را در یک آرایه می‌فرستد و اینجا در یک تراکنش نوشته
-- می‌شود. جای دیگرِ ممکن این بود که مرورگر برای هر ردیفِ جابه‌جاشده یک
-- PATCH بفرستد؛ آن‌وقت یک اتصال قطع‌شده وسط کار، فهرستی با ترتیب نیمه
-- به‌جا می‌گذاشت.
--
-- security definer است، پس RLS را دور می‌زند — و دقیقاً به همین دلیل
-- بررسی دسترسی داخل خودش است و برای هر جدول جدا: کسی که گالری را
-- می‌چرخاند نباید بتواند ترتیب مقاله‌ها را عوض کند.
-- =====================================================================

create or replace function public.reorder_content(p_table text, p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perm text;
  i      int;
begin
  v_perm := case p_table
    when 'articles'      then 'content.edit'
    when 'prompts'       then 'prompts.manage'
    when 'courses'       then 'lessons.manage'
    when 'chapters'      then 'lessons.manage'
    when 'lessons'       then 'lessons.manage'
    when 'gallery_items' then 'gallery.manage'
    when 'videos'        then 'videos.manage'
    when 'categories'    then '*'
    else null
  end;

  if v_perm is null then
    raise exception 'جدول نامعتبر: %', p_table;
  end if;

  if v_perm = '*' then
    if not (select public.can_manage_any_content()) then
      raise exception 'دسترسی نداری';
    end if;
  elsif not (select public.has_permission(v_perm)) then
    raise exception 'دسترسی نداری';
  end if;

  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    execute format('update public.%I set sort_order = $1 where id = $2', p_table)
      using i, p_ids[i];
  end loop;

  return coalesce(array_length(p_ids, 1), 0);
end;
$$;

revoke all on function public.reorder_content(text, uuid[]) from public, anon;
grant execute on function public.reorder_content(text, uuid[]) to authenticated;


-- =====================================================================
-- ۸. جست‌وجوی مرکزی پنل
--
-- یک تابع که هر شش جدول را با یک عبارت می‌گردد و همه را در یک شکل
-- برمی‌گرداند، تا پنل مجبور نباشد شش درخواست بفرستد و خودش مرتبشان کند.
-- گیتش is_staff است، پس جست‌وجو هم مثل بقیه‌ی پنل چیزی را لو نمی‌دهد که
-- کاربر حق دیدنش را ندارد.
-- =====================================================================

create or replace function public.admin_search(q text)
returns table (
  kind    text,
  id      uuid,
  label   text,
  status  text,
  updated timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select 'articles'::text,      a.id, a.title,    a.status, a.updated_at from public.articles a
      where a.title ilike '%' || q || '%' or a.slug ilike '%' || q || '%'
    union all
    select 'prompts',             p.id, p.title_fa, p.status, p.updated_at from public.prompts p
      where p.title_fa ilike '%' || q || '%' or coalesce(p.title_en,'') ilike '%' || q || '%'
         or p.slug ilike '%' || q || '%'
    union all
    select 'courses',             c.id, c.title,    c.status, c.updated_at from public.courses c
      where c.title ilike '%' || q || '%' or c.slug ilike '%' || q || '%'
    union all
    select 'lessons',             l.id, l.title,    l.status, l.updated_at from public.lessons l
      where l.title ilike '%' || q || '%' or l.slug ilike '%' || q || '%'
    union all
    select 'gallery_items',       g.id, g.title,    g.status, g.updated_at from public.gallery_items g
      where g.title ilike '%' || q || '%'
    union all
    select 'videos',              v.id, v.title,    v.status, v.updated_at from public.videos v
      where v.title ilike '%' || q || '%'
  ) hits
  where (select public.is_staff()) and length(coalesce(q, '')) >= 2
  order by 5 desc
  limit 60;
$$;

revoke all on function public.admin_search(text) from public, anon;
grant execute on function public.admin_search(text) to authenticated;


-- =====================================================================
-- ۹. اعداد داشبورد، حالا با محتوا
--
-- همان تابع فاز دو، با کلیدهای تازه. جای دیگری لازم نیست عوض شود: پنل هر
-- کلیدی را که برگردد نشان می‌دهد و هر کلیدی را که نباشد رد می‌کند.
-- =====================================================================

create or replace function public.admin_cms_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_staff() then jsonb_build_object(
    'users_total',      (select count(*) from public.profiles),
    'users_active_7d',  (select count(distinct user_id) from public.learning_days
                           where day > (current_date - 7)),
    'staff_total',      (select count(*) from public.profiles
                           where role <> 'reader' and is_active),
    'media_total',      (select count(*) from public.media_assets),
    'media_bytes',      (select coalesce(sum(size_bytes), 0) from public.media_assets),
    'settings_total',   (select count(*) from public.site_settings),
    'articles_total',   (select count(*) from public.articles),
    'prompts_total',    (select count(*) from public.prompts),
    'lessons_total',    (select count(*) from public.lessons),
    'courses_total',    (select count(*) from public.courses),
    'gallery_total',    (select count(*) from public.gallery_items),
    'videos_total',     (select count(*) from public.videos),
    'drafts_total',     (select
                          (select count(*) from public.articles      where status = 'draft') +
                          (select count(*) from public.prompts       where status = 'draft') +
                          (select count(*) from public.lessons       where status = 'draft') +
                          (select count(*) from public.courses       where status = 'draft') +
                          (select count(*) from public.gallery_items where status = 'draft') +
                          (select count(*) from public.videos        where status = 'draft')),
    'scheduled_total',  (select
                          (select count(*) from public.articles      where status = 'scheduled') +
                          (select count(*) from public.prompts       where status = 'scheduled') +
                          (select count(*) from public.lessons       where status = 'scheduled') +
                          (select count(*) from public.courses       where status = 'scheduled') +
                          (select count(*) from public.gallery_items where status = 'scheduled') +
                          (select count(*) from public.videos        where status = 'scheduled')),
    'audit_7d',         case when public.is_owner()
                          then (select count(*) from public.audit_log
                                  where created_at > now() - interval '7 days')
                          else null end
  ) else null end;
$$;

revoke all on function public.admin_cms_overview() from public, anon;
grant execute on function public.admin_cms_overview() to authenticated;


-- =====================================================================
-- دسته‌بندی‌های شروع
--
-- چند دسته‌ی پیش‌فرض تا پنل از روز اول خالی نباشد. هر کدام را می‌شود از
-- پنل عوض کرد یا پاک کرد.
-- =====================================================================

insert into public.categories (kind, slug, name_fa, sort_order) values
  ('article', 'ai',            'هوش مصنوعی',      1),
  ('article', 'tools',         'ابزارها',          2),
  ('article', 'tutorial',      'آموزش',            3),
  ('article', 'news',          'خبر',              4),
  ('prompt',  'style',         'سبک',              1),
  ('prompt',  'light',         'نور',              2),
  ('prompt',  'photo',         'عکاسی',            3),
  ('lesson',  'fundamentals',  'مبانی',            1),
  ('lesson',  'prompting',     'پرامپت‌نویسی',      2),
  ('lesson',  'image',         'تصویر',            3),
  ('lesson',  'video',         'ویدیو',            4),
  ('gallery', 'showcase',      'نمونه‌کار',         1),
  ('video',   'documentary',   'مستند',            1),
  ('video',   'tutorial',      'آموزشی',           2)
on conflict (kind, slug) do nothing;


-- #####################################################################
-- بخش 6 از 6 — دستیار هوش مصنوعی، انتشار خودکار، ورک‌فلوها
-- منبع: supabase/cms-ai.sql
-- #####################################################################

-- =====================================================================
-- NAVIDIX — دستیار هوش مصنوعی و ورک‌فلوها (فاز ۵ و ۶)
--
-- بعد از cms-content.sql اجرا کن. دوباره اجرا کردنش بی‌خطر است.
--
-- دو چیز اینجاست و هر دو یک قاعده‌ی مشترک دارند: **مدل هیچ‌وقت مستقیم
-- منتشر نمی‌کند.** خروجی مدل همیشه اول در یک ردیف پیش‌نویس می‌نشیند و
-- انتشارش از همان دری می‌گذرد که هر محتوای دیگری — یعنی تریگر
-- enforce_publish_permission و دسترسی content.publish.
--
-- استثنایش را خودت روشن می‌کنی، برای هر نوع محتوا جدا، در جدول
-- ai_auto_publish. و حتی آن هم دور نمی‌زند: کاری که می‌کند این است که
-- یک ردیف را از draft به scheduled می‌برد با موعدی چند دقیقه بعد، تا اگر
-- نظرت عوض شد فرصت جلوگیری داشته باشی.
--
--   ۱. ai_jobs        — هر بار که از مدل چیزی خواسته شده
--   ۲. ai_auto_publish — کدام نوع محتوا اجازه‌ی انتشار خودکار دارد
--   ۳. ai_workflows   — Source → Processing → Draft → Review → Publish
--   ۴. ai_runs        — هر بار که یک ورک‌فلو اجرا شده
--
-- کلید مدل در هیچ‌کدام از این‌ها نیست و نباید باشد. جایش در
-- Edge Function است: supabase/functions/ai-assistant/. مرورگر آن تابع را
-- صدا می‌زند، تابع کلید را از محیط خودش برمی‌دارد.
-- =====================================================================


-- =====================================================================
-- ۱. ai_jobs — تاریخچه‌ی درخواست‌ها
--
-- هر درخواست به مدل یک ردیف می‌شود، چه موفق چه ناموفق. سه دلیل: هزینه
-- قابل شمردن می‌شود، خروجی بد قابل ردیابی است، و «چه کسی از مدل چه
-- خواست» بخشی از همان گزارشی است که بقیه‌ی پنل نگه می‌دارد.
--
-- prompt عمداً کامل ذخیره می‌شود. اگر روزی خروجی عجیبی منتشر شد، تنها
-- چیزی که توضیحش می‌دهد همان متنی است که به مدل داده شده.
-- =====================================================================

create table if not exists public.ai_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'article'
                 check (kind in ('article', 'prompt', 'lesson', 'gallery', 'video', 'freeform')),
  prompt       text not null,
  model        text,
  status       text not null default 'pending'
                 check (status in ('pending', 'done', 'failed')),
  output       jsonb,
  error        text,
  tokens_in    int,
  tokens_out   int,
  entity_table text,
  entity_id    uuid,
  workflow_id  uuid,
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists ai_jobs_created_idx on public.ai_jobs (created_at desc);
create index if not exists ai_jobs_status_idx  on public.ai_jobs (status);

alter table public.ai_jobs enable row level security;

-- هر عضو تیم کارهای مدل را می‌بیند. این عمدی است: دستیاری که فقط صاحبش
-- تاریخچه‌اش را ببیند، همان اشتباه را دو نفر دو بار می‌کنند.
drop policy if exists ai_jobs_read on public.ai_jobs;
create policy ai_jobs_read on public.ai_jobs
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists ai_jobs_insert on public.ai_jobs;
create policy ai_jobs_insert on public.ai_jobs
  for insert to authenticated
  with check ((select public.has_permission('content.create')));

drop policy if exists ai_jobs_update on public.ai_jobs;
create policy ai_jobs_update on public.ai_jobs
  for update to authenticated
  using ((select public.has_permission('content.create')))
  with check ((select public.has_permission('content.create')));

drop policy if exists ai_jobs_delete on public.ai_jobs;
create policy ai_jobs_delete on public.ai_jobs
  for delete to authenticated
  using ((select public.has_permission('content.delete')));


-- =====================================================================
-- ۲. ai_auto_publish — کجا اجازه‌ی خودکار داده شده
--
-- یک ردیف برای هر نوع محتوا. پیش‌فرض همه false است و باید دستی روشن شود.
--
-- delay_minutes همان چیزی است که این را از «مدل مستقیم منتشر می‌کند» جدا
-- می‌کند: محتوا به scheduled می‌رود نه published، با موعدی که پیش‌فرضش
-- سی دقیقه است. اگر خروجی بد بود، سی دقیقه فرصت داری. صفر گذاشتنش ممکن
-- است و همان «مستقیم منتشر کن» است — که باید یک انتخاب صریح باشد، نه
-- پیش‌فرض.
-- =====================================================================

create table if not exists public.ai_auto_publish (
  kind          text primary key
                  check (kind in ('article', 'prompt', 'lesson', 'gallery', 'video')),
  enabled       boolean not null default false,
  delay_minutes int not null default 30 check (delay_minutes >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users on delete set null
);

insert into public.ai_auto_publish (kind) values
  ('article'), ('prompt'), ('lesson'), ('gallery'), ('video')
on conflict (kind) do nothing;

alter table public.ai_auto_publish enable row level security;

drop policy if exists aap_read on public.ai_auto_publish;
create policy aap_read on public.ai_auto_publish
  for select to authenticated
  using ((select public.is_staff()));

-- روشن‌کردن انتشار خودکار خودش یک تصمیم انتشاری است، پس همان دسترسی را
-- می‌خواهد که انتشار دستی می‌خواهد.
drop policy if exists aap_update on public.ai_auto_publish;
create policy aap_update on public.ai_auto_publish
  for update to authenticated
  using ((select public.has_permission('content.publish')))
  with check ((select public.has_permission('content.publish')));

drop trigger if exists aap_stamp on public.ai_auto_publish;
create trigger aap_stamp before update on public.ai_auto_publish
  for each row execute function public.stamp_setting_update();

drop trigger if exists aap_audit on public.ai_auto_publish;
create trigger aap_audit after insert or update or delete on public.ai_auto_publish
  for each row execute function public.audit_trigger();


-- =====================================================================
-- ۳. ai_workflows
--
-- Source → AI Processing → Draft → Human Review → Publish، به شکل داده.
--
-- steps یک آرایه‌ی jsonb است و نه ستون‌های ثابت، چون شکل یک ورک‌فلو هنوز
-- در حال کشف‌شدن است و هر ستونی که امروز اضافه شود فردا باید مهاجرت
-- بخورد. وقتی شکلش ثابت شد، همان موقع ستون می‌شود.
--
-- schedule_cron فقط ذخیره می‌شود؛ اجرا کردنش کار pg_cron است و در پایین
-- همین فایل توضیح داده شده.
-- =====================================================================

create table if not exists public.ai_workflows (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  kind          text not null default 'article'
                  check (kind in ('article', 'prompt', 'lesson', 'gallery', 'video')),
  source_type   text not null default 'prompt'
                  check (source_type in ('prompt', 'rss', 'manual')),
  source_config jsonb not null default '{}'::jsonb,
  steps         jsonb not null default '[]'::jsonb,
  auto_publish  boolean not null default false,
  enabled       boolean not null default false,
  schedule_cron text,
  last_run_at   timestamptz,
  sort_order    int not null default 0,
  created_by    uuid references auth.users on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.ai_workflows enable row level security;

drop policy if exists wf_read on public.ai_workflows;
create policy wf_read on public.ai_workflows
  for select to authenticated
  using ((select public.is_staff()));

-- ساختن و ویرایش یک ورک‌فلو یعنی تعیین اینکه ماشین از این به بعد چه
-- بنویسد. این از نوشتن یک مقاله بزرگ‌تر است، پس settings.manage می‌خواهد
-- نه content.create.
drop policy if exists wf_insert on public.ai_workflows;
create policy wf_insert on public.ai_workflows
  for insert to authenticated
  with check ((select public.has_permission('settings.manage')));

drop policy if exists wf_update on public.ai_workflows;
create policy wf_update on public.ai_workflows
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

drop policy if exists wf_delete on public.ai_workflows;
create policy wf_delete on public.ai_workflows
  for delete to authenticated
  using ((select public.has_permission('settings.manage')));

drop trigger if exists wf_updated on public.ai_workflows;
create trigger wf_updated before update on public.ai_workflows
  for each row execute function public.stamp_updated_at();

drop trigger if exists wf_audit on public.ai_workflows;
create trigger wf_audit after insert or update or delete on public.ai_workflows
  for each row execute function public.audit_trigger();


-- =====================================================================
-- ۴. ai_runs
-- =====================================================================

create table if not exists public.ai_runs (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.ai_workflows on delete cascade,
  status      text not null default 'running'
                check (status in ('running', 'done', 'failed', 'awaiting_review')),
  log         jsonb not null default '[]'::jsonb,
  error       text,
  produced    jsonb,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index if not exists ai_runs_wf_idx on public.ai_runs (workflow_id, started_at desc);

alter table public.ai_runs enable row level security;

drop policy if exists runs_read on public.ai_runs;
create policy runs_read on public.ai_runs
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists runs_write on public.ai_runs;
create policy runs_write on public.ai_runs
  for insert to authenticated
  with check ((select public.has_permission('settings.manage')));

drop policy if exists runs_update on public.ai_runs;
create policy runs_update on public.ai_runs
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));


-- =====================================================================
-- ۵. نشاندن خروجی مدل در یک پیش‌نویس
--
-- این تنها راهی است که خروجی یک job به جدول محتوا می‌رسد، و عمداً یک
-- تابع است نه یک insert مستقیم از مرورگر — تا سه چیز در یک جا تضمین شود:
--
--   ۱. ردیف همیشه draft ساخته می‌شود، هرچه مدل گفته باشد
--   ۲. انتشار خودکار فقط اگر برای این نوع روشن باشد، و آن هم به scheduled
--      با تأخیر، نه به published
--   ۳. job به ردیفی که ساخته وصل می‌شود، پس هر مقاله می‌تواند بگوید از
--      کدام درخواست درآمده
--
-- توجه: چون security definer است و RLS را دور می‌زند، بررسی دسترسی در
-- سطر اولش است. و برای انتشار خودکار، content.publish را از خودِ کاربر
-- می‌خواهد — یعنی یک Writer حتی با auto-publish روشن هم چیزی منتشر
-- نمی‌کند.
-- =====================================================================

create or replace function public.ai_apply_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  j        public.ai_jobs;
  o        jsonb;
  auto     public.ai_auto_publish;
  v_status text := 'draft';
  v_when   timestamptz := null;
  v_id     uuid;
  v_slug   text;
begin
  if not (select public.has_permission('content.create')) then
    raise exception 'دسترسی نداری';
  end if;

  select * into j from public.ai_jobs where id = p_job_id;
  if j.id is null then raise exception 'این درخواست پیدا نشد'; end if;
  if j.status <> 'done' then raise exception 'این درخواست هنوز خروجی ندارد'; end if;
  if j.entity_id is not null then raise exception 'خروجی این درخواست قبلاً ثبت شده'; end if;

  o := coalesce(j.output, '{}'::jsonb);

  select * into auto from public.ai_auto_publish where kind = j.kind;
  if auto.enabled and (select public.has_permission('content.publish')) then
    v_status := 'scheduled';
    v_when   := now() + make_interval(mins => coalesce(auto.delay_minutes, 30));
  end if;

  if j.kind = 'article' then
    v_slug := coalesce(nullif(o->>'slug', ''), 'ai-' || substr(p_job_id::text, 1, 8));

    insert into public.articles
      (slug, title, excerpt, body, tags, seo_title, seo_description, seo_keywords,
       status, scheduled_for, created_by, author_id)
    values (
      v_slug,
      coalesce(nullif(o->>'title', ''), 'بدون عنوان'),
      nullif(o->>'excerpt', ''),
      nullif(o->>'body', ''),
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(o->'tags')), '{}'),
      nullif(o->>'seo_title', ''),
      nullif(o->>'seo_description', ''),
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(o->'keywords')), '{}'),
      v_status, v_when, j.created_by, j.created_by
    )
    returning id into v_id;

    update public.ai_jobs
       set entity_table = 'articles', entity_id = v_id
     where id = p_job_id;

  else
    raise exception 'فعلاً فقط مقاله از دستیار ساخته می‌شود';
  end if;

  return jsonb_build_object('id', v_id, 'status', v_status, 'scheduled_for', v_when);
end;
$$;

revoke all on function public.ai_apply_job(uuid) from public, anon;
grant execute on function public.ai_apply_job(uuid) to authenticated;


-- =====================================================================
-- ۶. اجرای ورک‌فلو — چه چیزی اینجا هست و چه چیزی نیست
--
-- این تابع فقط یک اجرا را «باز» می‌کند: یک ردیف در ai_runs می‌سازد و
-- یک job در ai_jobs. خودِ صداکردن مدل اینجا انجام نمی‌شود و نمی‌تواند
-- بشود — Postgres نه به اینترنت وصل است و نه جای نگه‌داشتن کلید مدل.
--
-- کارِ صدا زدن با Edge Function است. تابع زیر صفِ کار را می‌سازد و آن
-- تابع صف را برمی‌دارد. یعنی اگر Edge Function مستقر نشده باشد، ورک‌فلو
-- ردیف می‌سازد و هیچ‌وقت از حالت running بیرون نمی‌آید — که در پنل
-- دیده می‌شود و ساکت نمی‌ماند.
-- =====================================================================

create or replace function public.ai_start_run(p_workflow_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  w      public.ai_workflows;
  v_run  uuid;
begin
  if not (select public.has_permission('settings.manage')) then
    raise exception 'دسترسی نداری';
  end if;

  select * into w from public.ai_workflows where id = p_workflow_id;
  if w.id is null then raise exception 'این ورک‌فلو پیدا نشد'; end if;
  if not w.enabled then raise exception 'این ورک‌فلو خاموش است'; end if;

  insert into public.ai_runs (workflow_id, status, log)
  values (p_workflow_id, 'running',
          jsonb_build_array(jsonb_build_object(
            'at', now(), 'step', 'queued', 'note', 'در صف اجرا')))
  returning id into v_run;

  insert into public.ai_jobs (kind, prompt, status, workflow_id, created_by)
  values (w.kind,
          coalesce(w.source_config->>'prompt', w.description, w.name),
          'pending', p_workflow_id, (select auth.uid()));

  update public.ai_workflows set last_run_at = now() where id = p_workflow_id;

  return v_run;
end;
$$;

revoke all on function public.ai_start_run(uuid) from public, anon;
grant execute on function public.ai_start_run(uuid) to authenticated;


-- =====================================================================
-- ۷. داشبورد، با اعداد AI
-- =====================================================================

create or replace function public.admin_cms_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_staff() then jsonb_build_object(
    'users_total',      (select count(*) from public.profiles),
    'users_active_7d',  (select count(distinct user_id) from public.learning_days
                           where day > (current_date - 7)),
    'staff_total',      (select count(*) from public.profiles
                           where role <> 'reader' and is_active),
    'media_total',      (select count(*) from public.media_assets),
    'media_bytes',      (select coalesce(sum(size_bytes), 0) from public.media_assets),
    'settings_total',   (select count(*) from public.site_settings),
    'articles_total',   (select count(*) from public.articles),
    'prompts_total',    (select count(*) from public.prompts),
    'lessons_total',    (select count(*) from public.lessons),
    'courses_total',    (select count(*) from public.courses),
    'gallery_total',    (select count(*) from public.gallery_items),
    'videos_total',     (select count(*) from public.videos),
    'ai_jobs_7d',       (select count(*) from public.ai_jobs
                           where created_at > now() - interval '7 days'),
    'workflows_on',     (select count(*) from public.ai_workflows where enabled),
    'drafts_total',     (select
                          (select count(*) from public.articles      where status = 'draft') +
                          (select count(*) from public.prompts       where status = 'draft') +
                          (select count(*) from public.lessons       where status = 'draft') +
                          (select count(*) from public.courses       where status = 'draft') +
                          (select count(*) from public.gallery_items where status = 'draft') +
                          (select count(*) from public.videos        where status = 'draft')),
    'scheduled_total',  (select
                          (select count(*) from public.articles      where status = 'scheduled') +
                          (select count(*) from public.prompts       where status = 'scheduled') +
                          (select count(*) from public.lessons       where status = 'scheduled') +
                          (select count(*) from public.courses       where status = 'scheduled') +
                          (select count(*) from public.gallery_items where status = 'scheduled') +
                          (select count(*) from public.videos        where status = 'scheduled')),
    'audit_7d',         case when public.is_owner()
                          then (select count(*) from public.audit_log
                                  where created_at > now() - interval '7 days')
                          else null end
  ) else null end;
$$;

revoke all on function public.admin_cms_overview() from public, anon;
grant execute on function public.admin_cms_overview() to authenticated;


-- ---------------------------------------------------------------------
-- زمان‌بندی ورک‌فلوها، وقتی pg_cron روشن باشد. ستون schedule_cron هر
-- ورک‌فلو را خودت اینجا به cron وصل می‌کنی — عمداً خودکار نیست، چون یک
-- ورک‌فلوی خودکارِ اشتباه، هر ساعت اشتباه می‌کند.
--
--   select cron.schedule('nvx-wf-<نام>', '<cron>',
--                        $$select public.ai_start_run('<uuid>')$$);
-- ---------------------------------------------------------------------


-- =====================================================================
-- تمام شد — حالا یک قدم آخر
--
-- تا اینجا پایگاه داده آماده است ولی هیچ‌کس Owner نیست. این تنها راه
-- Owner شدن است و عمداً از مرورگر ممکن نیست.
--
-- ---------------------------------------------------------------------
-- قدم ۱: اول ببین حسابت هست یا نه.
--
-- توجه: حساب Supabase با حساب سایت یکی نیست. باید یک بار در خودِ
-- navidixstudio.com از دکمه‌ی «ورود / ثبت‌نام» حساب ساخته باشی.

select u.id,
       u.email,
       (u.email_confirmed_at is not null) as confirmed,
       (p.id is not null)                 as has_profile,
       p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- اگر صفر ردیف برگشت:  هنوز در سایت ثبت‌نام نکرده‌ای. برو بساز و برگرد.
-- اگر has_profile خالی بود: این یک خط را اجرا کن و بعد برو قدم ۲:
--
--   insert into public.profiles (id)
--   select u.id from auth.users u
--   left join public.profiles p on p.id = u.id
--   where p.id is null;
--
-- ---------------------------------------------------------------------
-- قدم ۲: ایمیل خودت را بگذار و اجرا کن.
--
--   update public.profiles set role = 'owner'
--   where id = (select id from auth.users where email = 'ایمیل-خودت@example.com');
--
-- ---------------------------------------------------------------------
-- قدم ۳: درست شدنش را ببین.
--
--   select u.email, p.role, p.is_active
--   from public.profiles p join auth.users u on u.id = p.id
--   where p.role <> 'reader';
--
-- اگر نقشت owner بود، پنل آماده است.
-- =====================================================================
