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
