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
    where id = auth.uid() and role = 'admin'
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
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));


-- ---- lesson_progress ----

drop policy if exists lp_read on public.lesson_progress;
drop policy if exists lp_write on public.lesson_progress;
drop policy if exists lp_update on public.lesson_progress;

create policy lp_read on public.lesson_progress
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy lp_write on public.lesson_progress
  for insert to authenticated
  with check (user_id = auth.uid());

create policy lp_update on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ---- learning_days ----

drop policy if exists ld_read on public.learning_days;
drop policy if exists ld_write on public.learning_days;
drop policy if exists ld_update on public.learning_days;

create policy ld_read on public.learning_days
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy ld_write on public.learning_days
  for insert to authenticated
  with check (user_id = auth.uid());

create policy ld_update on public.learning_days
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ---- page_views ----
-- مهمان و کاربر هر دو می‌توانند بنویسند، ولی هیچ‌کس نمی‌تواند بخواند.
-- خواندنش فقط از راه نماهای ادمین پایین ممکن است.

drop policy if exists pv_write on public.page_views;

create policy pv_write on public.page_views
  for insert to anon, authenticated
  with check (true);


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
