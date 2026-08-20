-- =====================================================================
-- NAVIDIX — سه بخشی که تا حالا فقط داخل HTML بودند (فاز ۷)
--
-- بعد از cms-rbac.sql و cms-content.sql اجرا کن. دوباره اجرا کردنش
-- بی‌خطر است.
--
-- معرفی خودت، خدمات استودیو، و شبکه‌های اجتماعی تا امروز داخل فایل‌های
-- HTML نوشته شده بودند. یعنی عوض‌کردن یک آیدی اینستاگرام کار کسی بود که
-- بتواند HTML را ویرایش کند و پوش بزند. اینجا هر سه به جدول می‌آیند تا از
-- پنل عوض شوند.
--
-- سه چیز:
--
--   ۱. site_profile — یک ردیف، معرفی محمد نویدی
--   ۲. services     — خدمات، هرچندتا که بخواهی
--   ۳. social_links — شبکه‌های اجتماعی، هرچندتا که بخواهی
--
-- هیچ‌کدام چیزی را از صفحه‌ها پاک نمی‌کنند. متن فعلی صفحه‌ها سر جایش
-- می‌ماند و فقط وقتی جدول چیزی داشته باشد جایش را می‌گیرد — پس اگر پایگاه
-- داده خالی یا دور از دسترس باشد، سایت همان است که بود.
-- =====================================================================


-- =====================================================================
-- ۱. معرفی — یک ردیف و نه بیشتر
--
-- singleton با یک ستون ثابت که فقط یک مقدار می‌پذیرد. بدون آن، یک روز دو
-- ردیف «معرفی» پیدا می‌شود و هیچ‌کس نمی‌داند کدام روی سایت است.
-- =====================================================================

create table if not exists public.site_profile (
  id           boolean primary key default true check (id),
  display_name text not null default 'محمد نویدی',
  role_fa      text,
  role_en      text,
  bio          text,
  photo_path   text,
  email        text,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users on delete set null
);

insert into public.site_profile (id) values (true) on conflict (id) do nothing;

alter table public.site_profile enable row level security;

drop policy if exists profile_read on public.site_profile;
create policy profile_read on public.site_profile
  for select to anon, authenticated using (true);

-- نوشتن فقط برای کسی که settings.manage دارد. این معرفیِ روی صفحه‌ی
-- درباره است، نه یک مقاله — هر نویسنده‌ای نباید بتواند عوضش کند.
drop policy if exists profile_update on public.site_profile;
create policy profile_update on public.site_profile
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));


-- =====================================================================
-- ۲. خدمات
-- =====================================================================

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  title_en    text,
  summary     text,
  body        text,
  icon        text,
  price_note  text,
  cta_label   text,
  cta_url     text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users on delete set null
);

create index if not exists services_order_idx on public.services (sort_order, created_at);

alter table public.services enable row level security;

-- بازدیدکننده فقط ردیف فعال را می‌بیند. غیرفعال‌کردن یک خدمت یعنی از سایت
-- برود، بدون اینکه پاک شود.
drop policy if exists services_read on public.services;
create policy services_read on public.services
  for select to anon using (is_active);

drop policy if exists services_read_staff on public.services;
create policy services_read_staff on public.services
  for select to authenticated
  using (is_active or (select public.is_staff()));

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for insert to authenticated
  with check ((select public.has_permission('settings.manage')));

drop policy if exists services_update on public.services;
create policy services_update on public.services
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

drop policy if exists services_delete on public.services;
create policy services_delete on public.services
  for delete to authenticated
  using ((select public.has_permission('settings.manage')));


-- =====================================================================
-- ۳. شبکه‌های اجتماعی
--
-- platform فقط یک برچسب است و فهرست بسته‌ای ندارد: اگر فردا شبکه‌ی تازه‌ای
-- خواستی، همان‌جا در پنل اضافه می‌شود بدون اینکه این فایل عوض شود. آیکون
-- هم از روی همین برچسب انتخاب می‌شود و اگر ناشناس بود یک آیکون عمومی
-- می‌گیرد — یعنی شبکه‌ی تازه بدون آیکون هم درست می‌نشیند.
-- =====================================================================

create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  label       text not null,
  handle      text,
  url         text not null,
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users on delete set null
);

create index if not exists social_order_idx on public.social_links (sort_order, created_at);

alter table public.social_links enable row level security;

drop policy if exists social_read on public.social_links;
create policy social_read on public.social_links
  for select to anon using (is_active);

drop policy if exists social_read_staff on public.social_links;
create policy social_read_staff on public.social_links
  for select to authenticated
  using (is_active or (select public.is_staff()));

drop policy if exists social_write on public.social_links;
create policy social_write on public.social_links
  for insert to authenticated
  with check ((select public.has_permission('settings.manage')));

drop policy if exists social_update on public.social_links;
create policy social_update on public.social_links
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

drop policy if exists social_delete on public.social_links;
create policy social_delete on public.social_links
  for delete to authenticated
  using ((select public.has_permission('settings.manage')));


-- =====================================================================
-- ۴. تاریخ ویرایش و گزارش فعالیت
-- =====================================================================

drop trigger if exists site_profile_touch on public.site_profile;
create trigger site_profile_touch before update on public.site_profile
  for each row execute function public.stamp_updated_at();

drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function public.stamp_updated_at();

drop trigger if exists social_touch on public.social_links;
create trigger social_touch before update on public.social_links
  for each row execute function public.stamp_updated_at();

drop trigger if exists site_profile_audit on public.site_profile;
create trigger site_profile_audit after insert or update or delete on public.site_profile
  for each row execute function public.audit_trigger();

drop trigger if exists services_audit on public.services;
create trigger services_audit after insert or update or delete on public.services
  for each row execute function public.audit_trigger();

drop trigger if exists social_audit on public.social_links;
create trigger social_audit after insert or update or delete on public.social_links
  for each row execute function public.audit_trigger();


-- =====================================================================
-- ۵. مقدار اولیه — همان چیزی که همین حالا روی سایت است
--
-- تا وقتی پنل خالی است صفحه‌ها همان متن HTML خودشان را نشان می‌دهند. این
-- ردیف‌ها همان‌ها را وارد جدول می‌کنند تا از همان اولین باز کردن پنل، چیزی
-- برای ویرایش باشد و کسی مجبور نباشد از صفر بنویسد.
-- =====================================================================

-- فقط وقتی جدول خالی است. «on conflict do nothing» اینجا هیچ کاری نمی‌کرد
-- چون هیچ محدودیت یکتایی روی platform نیست — و نباید هم باشد، چون ممکن است
-- روزی دو کانال یوتیوب داشته باشی. بدون این شرط، هر بار اجرای دوباره‌ی این
-- فایل چهار ردیف تکراری می‌ساخت. آزمایش شد: می‌ساخت.
insert into public.social_links (platform, label, handle, url, description, sort_order)
select * from (values
  ('youtube',   'YouTube',   '@navidix',
   'https://youtube.com/@navidix?sub_confirmation=1',
   'مستندهای فارسی درباره‌ی هوش مصنوعی، علم، فناوری، فضا و دفاع. کارِ تمام‌شده اینجا منتشر می‌شود.', 1),
  ('telegram',  'Telegram',  '@NavidixMedia',
   'https://t.me/NavidixMedia',
   'ابزار و پرامپت روزانه، و یادداشت‌های کوتاه از میانه‌ی کار.', 2),
  ('instagram', 'Instagram', '@navidi__ai',
   'https://www.instagram.com/navidi__ai',
   'تصویر، قاب و نمونه‌های کوتاه از کارهای استودیو.', 3),
  ('linkedin',  'LinkedIn',  'mohammad-navidi',
   'https://www.linkedin.com/in/mohammad-navidi-7b8b75381',
   'سابقه‌ی حرفه‌ای و همکاری‌های استودیو.', 4)
) as seed (platform, label, handle, url, description, sort_order)
where not exists (select 1 from public.social_links);
