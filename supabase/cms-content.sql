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
