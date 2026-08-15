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
