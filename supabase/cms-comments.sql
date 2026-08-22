-- =====================================================================
-- NAVIDIX — دیدگاه‌ها (فاز ۸)
--
-- بعد از cms-rbac.sql و cms-content.sql اجرا کن. دوباره اجرا کردنش
-- بی‌خطر است.
--
-- یک جدول برای همه‌ی صفحه‌های سایت: مقاله، درس، صفحه‌ی سبک، هر چیز
-- دیگری. به‌جای یک جدول برای هر نوع، هر ردیف می‌گوید روی چه چیزی نشسته
-- (target_type + target_slug). دلیلش ساده است: سایت ۲۰۰ صفحه‌ی سبک دارد
-- و هیچ‌کدام در پایگاه داده ردیفی ندارند — پس کلید خارجی به یک جدول
-- محتوا اصلاً ممکن نیست. مسیر بر اساس آدرس صفحه است، همان چیزی که
-- nvx-progress.js هم برای درس‌ها استفاده می‌کند.
--
-- دو نوع نویسنده، طبق تصمیم صاحب سایت:
--
--   مهمان         — فقط یک اسم می‌نویسد، حساب نمی‌سازد
--   کاربر واردشده — اسمش از پروفایل خودش می‌آید و نشان تأیید می‌گیرد
--
-- و انتشار فوری است: دیدگاه همان لحظه روی سایت می‌نشیند و از پنل
-- پنهان یا پاک می‌شود. یعنی همه‌ی دفاع باید پیش از نوشتن انجام شود، نه
-- بعدش — که کل بخش ۳ همین است.
--
-- سه نکته‌ی امنیتی که شکل این فایل را تعیین کرده‌اند:
--
--   ۱. کلاینت حق INSERT مستقیم ندارد. هیچ. نوشتن فقط از راه
--      post_comment() که security definer است، پس user_id و status و
--      نام نویسنده را خودِ سرور تعیین می‌کند نه مرورگر. بدون این، یک
--      مهمان می‌توانست ردیفی بنویسد که user_id صاحب سایت را دارد.
--
--   ۲. آی‌پی هیچ‌وقت ذخیره نمی‌شود. برای محدودکردن نرخ، به چیزی نیاز
--      هست که دو درخواستِ یک نفر را به هم وصل کند — که همان hash است،
--      نه خود آدرس. از روی hash نمی‌شود به آی‌پی رسید، و برای شمردن
--      «چند تا در دقیقه» هم لازم نیست.
--
--   ۳. نام صاحب سایت رزرو است. مهمان نمی‌تواند خودش را «محمد نویدی»
--      معرفی کند — این تنها جای این فایل است که یک نام خاص را می‌شناسد،
--      و از site_profile می‌خواندش نه از یک رشته‌ی ثابت.
-- =====================================================================


-- =====================================================================
-- ۱. Permission تازه
--
-- جدا از content.* عمداً: کسی که مقاله می‌نویسد لزوماً کسی نیست که باید
-- بتواند دیدگاه دیگران را پاک کند.
-- =====================================================================

insert into public.permissions (key, description_fa) values
  ('comments.manage', 'دیدن، پنهان‌کردن و پاک‌کردن دیدگاه‌ها')
on conflict (key) do update set description_fa = excluded.description_fa;

insert into public.role_permissions (role_id, permission_key) values
  ('owner', 'comments.manage'),
  ('admin', 'comments.manage'),
  ('editor', 'comments.manage')
on conflict do nothing;


-- =====================================================================
-- ۲. جدول
-- =====================================================================

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),

  -- روی چه چیزی نشسته. target_slug همان اسم فایل صفحه است بدون .html،
  -- یا برای مقاله همان slug مقاله.
  target_type  text not null check (target_type in ('article', 'lesson', 'style', 'prompt', 'page')),
  target_slug  text not null check (target_slug ~ '^[a-z0-9][a-z0-9._-]{0,120}$'),

  -- پاسخ به یک دیدگاه دیگر. یک سطح، نه بیشتر — بخش ۳ این را نگه می‌دارد.
  parent_id    uuid references public.comments(id) on delete cascade,

  -- برای مهمان NULL است. برای کاربر واردشده هیچ‌وقت از کلاینت نمی‌آید.
  user_id      uuid references auth.users on delete set null,

  -- نامِ لحظه‌ی نوشتن، نه یک join به profiles. دو دلیل: profiles را فقط
  -- خودِ کاربر می‌تواند بخواند (سیاستش در fix-advisor.sql)، پس یک
  -- بازدیدکننده هرگز نمی‌توانست نام نویسنده را ببیند؛ و یک دیدگاه باید
  -- همان نامی را نشان بدهد که موقع نوشتنش زیرش بود.
  author_name  text not null,

  body         text not null,

  status       text not null default 'visible'
               check (status in ('visible', 'hidden', 'spam')),

  -- برای بالا نگه‌داشتن یک پاسخ مهم
  is_pinned    boolean not null default false,

  -- sha256(آی‌پی + نمک). فقط برای شمردن نرخ. بخش ۳ و بخش ۴.
  client_hash  text,

  -- ستون تولیدشده، فقط برای اینکه سایت بتواند «نشان کاربر» را نشان بدهد
  -- بدون اینکه user_id به دست کسی برسد. بخش ۴ توضیحش می‌دهد.
  is_member    boolean generated always as (user_id is not null) stored,

  created_at   timestamptz not null default now(),
  hidden_at    timestamptz,
  hidden_by    uuid references auth.users on delete set null
);

-- پرس‌وجوی اصلی سایت: «دیدگاه‌های visible این صفحه، قدیمی به جدید».
create index if not exists comments_target_idx
  on public.comments (target_type, target_slug, created_at)
  where status = 'visible';

-- پرس‌وجوی پنل: «همه‌چیز، جدید به قدیم».
create index if not exists comments_recent_idx on public.comments (created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- پنجره‌ی محدودیت نرخ در بخش ۳ روی همین می‌نشیند.
create index if not exists comments_rate_idx on public.comments (client_hash, created_at desc);
create index if not exists comments_user_idx  on public.comments (user_id, created_at desc);


-- =====================================================================
-- ۳. نوشتن — تنها راه
--
-- توضیح چرا این یک تابع است و نه یک سیاست INSERT:
--
-- با سیاست INSERT، هر ستونی که کلاینت بفرستد وارد ردیف می‌شود مگر اینکه
-- CHECK جلویش را بگیرد. برای user_id می‌شود چک نوشت، برای status هم،
-- ولی برای «این نفر ۳۰ ثانیه پیش هم نوشته» نمی‌شود — چون سیاست به ردیف
-- نگاه می‌کند نه به تاریخچه. و انتشار فوری یعنی محدودیت نرخ تنها چیزی
-- است که بین یک ربات و صفحه‌ی مقاله ایستاده.
--
-- پس: هیچ INSERTی از کلاینت، و همه چیز از اینجا.
-- =====================================================================

-- نمکِ hash. مقدارش عوض شود، پنجره‌ی نرخ ریست می‌شود و بس — هیچ داده‌ای
-- خراب نمی‌شود، چون client_hash فقط برای شمردن است.
create table if not exists public.comment_config (
  id             boolean primary key default true check (id),
  hash_salt      text not null default md5(random()::text || clock_timestamp()::text),
  min_seconds    int  not null default 20,     -- فاصله‌ی دو دیدگاه پشت‌سرهم
  max_per_hour   int  not null default 10,
  max_length     int  not null default 2000,
  is_open        boolean not null default true -- بستن کل دیدگاه‌ها با یک کلید
);

insert into public.comment_config (id) values (true) on conflict (id) do nothing;

alter table public.comment_config enable row level security;

-- کلاینت هیچ‌وقت نمک را نمی‌بیند. is_open را هم از راه یک view می‌خواند.
revoke all on public.comment_config from anon, authenticated;

drop policy if exists ccfg_write on public.comment_config;
create policy ccfg_write on public.comment_config
  for all to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

grant select, update on public.comment_config to authenticated;


create or replace function public.comment_client_hash()
returns text
language sql
stable
security definer
set search_path = public
as $$
  -- sha256 و gen_random_uuid هر دو در خودِ پستگرس هستند، پس این فایل به
  -- هیچ افزونه‌ای وابسته نیست. نمک است که hash را برگشت‌ناپذیر می‌کند:
  -- بدون آن، md5/sha256 یک آی‌پی نسخه‌ی چهار فقط ۲^۳۲ حالت دارد و در
  -- چند دقیقه برگردانده می‌شود. نمک از anon گرفته شده (بخش بالا).
  select encode(
    sha256(convert_to(
      coalesce(
        nullif(split_part(
          coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
          ',', 1), ''),
        'unknown'
      ) || (select hash_salt from public.comment_config),
      'UTF8')),
    'hex');
$$;


create or replace function public.post_comment(
  p_target_type text,
  p_target_slug text,
  p_body        text,
  p_guest_name  text default null,
  p_parent_id   uuid default null
)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg    public.comment_config;
  v_uid    uuid := (select auth.uid());
  v_hash   text := public.comment_client_hash();
  v_name   text;
  v_body   text;
  v_owner  text;
  v_recent int;
  v_last   timestamptz;
  v_root   uuid;
  v_row    public.comments;
begin
  select * into v_cfg from public.comment_config;

  if not v_cfg.is_open then
    raise exception 'comments_closed' using errcode = '42501';
  end if;

  -- ---- مقصد ----
  -- همان دو شرطی که روی خودِ جدول CHECK هستند، اینجا هم و پیش از INSERT.
  -- تکرار نیست: وقتی CHECK جدول از یک ورودیِ کلاینت بیفتد، پستگرس در
  -- DETAIL کل ردیف را برمی‌گرداند و PostgREST همان را به مرورگر می‌دهد —
  -- یعنی هر کسی با فرستادن یک slug خراب، client_hash خودش را می‌دید.
  -- این دو if، آن پیام را هیچ‌وقت اتفاق نمی‌اندازند.
  if p_target_type is null or
     p_target_type not in ('article', 'lesson', 'style', 'prompt', 'page') then
    raise exception 'target_invalid' using errcode = '22023';
  end if;
  if p_target_slug is null or p_target_slug !~ '^[a-z0-9][a-z0-9._-]{0,120}$' then
    raise exception 'target_invalid' using errcode = '22023';
  end if;

  -- ---- متن ----
  -- سه پاک‌سازی، به همین ترتیب. هیچ‌کدام «ضد اسپم» نیست؛ هر سه برای این
  -- است که یک دیدگاه نتواند چیدمان صفحه‌ی زیرش را خراب کند.
  v_body := coalesce(p_body, '');
  v_body := replace(replace(v_body, E'\r\n', E'\n'), E'\r', E'\n');
  v_body := replace(v_body, E'\t', ' ');
  -- کاراکترهای کنترلی، به‌جز خط جدید که تازه نگهش داشتیم.
  v_body := regexp_replace(v_body, '[\x01-\x09\x0B-\x1F\x7F]', '', 'g');
  -- و کاراکترهای جهت‌دهیِ یونیکد. روی یک سایت فارسی این‌ها مهم‌ترین‌اند:
  -- یک RLO تنها کافی است تا بقیه‌ی پاراگراف — و هر چیزی که بعدش می‌آید —
  -- برعکس رندر شود.
  v_body := regexp_replace(v_body, '[\u202A-\u202E\u2066-\u2069\u200E\u200F]', '', 'g');
  v_body := btrim(v_body);
  -- بیش از دو خط خالی پشت‌سرهم یعنی کسی دارد صفحه را هل می‌دهد پایین.
  v_body := regexp_replace(v_body, '(\n){3,}', E'\n\n', 'g');

  if char_length(v_body) < 2 then
    raise exception 'body_too_short' using errcode = '22023';
  end if;
  if char_length(v_body) > v_cfg.max_length then
    raise exception 'body_too_long' using errcode = '22023';
  end if;

  -- ---- نام ----
  if v_uid is not null then
    -- از پروفایل خودش. هرچه کلاینت فرستاده باشد نادیده گرفته می‌شود.
    select nullif(btrim(display_name), '') into v_name
      from public.profiles where id = v_uid;
    v_name := coalesce(v_name, split_part(
      (select email from auth.users where id = v_uid), '@', 1));
  else
    v_name := btrim(regexp_replace(coalesce(p_guest_name, ''), '\s+', ' ', 'g'));
    if char_length(v_name) < 2 or char_length(v_name) > 40 then
      raise exception 'name_invalid' using errcode = '22023';
    end if;
    -- نام صاحب سایت رزرو است. یک مهمان نباید بتواند به‌جای او حرف بزند.
    select btrim(display_name) into v_owner from public.site_profile;
    if v_owner is not null and lower(v_name) = lower(v_owner) then
      raise exception 'name_reserved' using errcode = '22023';
    end if;
  end if;
  v_name := coalesce(nullif(v_name, ''), 'مهمان');

  -- ---- نرخ ----
  -- برای کاربر واردشده هم اعمال می‌شود؛ حساب داشتن مجوز سیل نیست.
  select max(created_at), count(*)
    into v_last, v_recent
    from public.comments
   where created_at > now() - interval '1 hour'
     and ((v_uid is not null and user_id = v_uid) or
          (v_uid is null and user_id is null and client_hash = v_hash));

  if v_last is not null and v_last > now() - make_interval(secs => v_cfg.min_seconds) then
    raise exception 'too_fast' using errcode = '53400';
  end if;
  if v_recent >= v_cfg.max_per_hour then
    raise exception 'too_many' using errcode = '53400';
  end if;

  -- ---- پاسخ ----
  -- یک سطح و نه بیشتر: پاسخ به یک پاسخ، زیر همان ریشه می‌نشیند. بدون
  -- این، یک رشته‌ی عمیق روی موبایل به یک ستون یک‌کلمه‌ای می‌رسد.
  if p_parent_id is not null then
    select coalesce(parent_id, id) into v_root
      from public.comments
     where id = p_parent_id
       and status = 'visible'
       and target_type = p_target_type
       and target_slug = p_target_slug;
    if v_root is null then
      raise exception 'parent_not_found' using errcode = '23503';
    end if;
  end if;

  insert into public.comments
    (target_type, target_slug, parent_id, user_id, author_name, body, client_hash)
  values
    (p_target_type, p_target_slug, v_root, v_uid, v_name, v_body, v_hash)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.post_comment(text, text, text, text, uuid) from public;
grant execute on function public.post_comment(text, text, text, text, uuid) to anon, authenticated;


-- =====================================================================
-- ۴. خواندن
--
-- بازدیدکننده فقط visible را می‌بیند و client_hash را اصلاً نمی‌بیند —
-- که چرایش این است: hash پایدار است، پس اگر عمومی بود می‌شد دو دیدگاه
-- بی‌نام را در دو صفحه‌ی مختلف به یک نفر نسبت داد. برای همین ستون از
-- کلاینت گرفته شده و سایت از یک view می‌خواند.
-- =====================================================================

alter table public.comments enable row level security;

-- هیچ نوشتنِ مستقیمی از کلاینت. INSERT فقط از post_comment().
revoke insert on public.comments from anon, authenticated;

-- و حالا مهم‌ترین سطر این فایل.
--
-- RLS می‌گوید «کدام ردیف»، نه «کدام ستون». سیاست پایین یعنی هر کسی
-- می‌تواند ردیف‌های visible را بخواند — و PostgREST اجازه می‌دهد در همان
-- درخواست بنویسد select=client_hash. یعنی بدون این چند خط، هرکسی
-- می‌توانست hashها را برداشت کند و دو دیدگاهِ بی‌نام را در دو صفحه‌ی
-- مختلف به یک نفر نسبت بدهد. hash نباید هیچ‌وقت از سرور بیرون برود.
--
-- user_id هم به هیچ‌کس داده نمی‌شود، حتی به پنل: پنل برای کارش لازمش
-- ندارد و is_member همان چیزی را می‌گوید که صفحه باید نشان بدهد.
--
-- روی Supabase این revoke اختیاری نیست: پروژه‌ی تازه default privileges
-- دارد که به هر جدول تازه‌ی public، همه‌چیز را به anon می‌دهد.
revoke select on public.comments from anon, authenticated;

-- status در فهرست هست، و لازم است: نمای comments_public با
-- security_invoker اجرا می‌شود، یعنی بدنه‌اش با دسترسیِ خودِ بازدیدکننده
-- ارزیابی می‌شود — و شرط `where status = 'visible'` هم یک ارجاع به ستون
-- است. بدون این grant، نما برای anon با «permission denied» می‌افتاد.
-- خطری هم ندارد: RLS از قبل فقط ردیف visible را نشان می‌دهد، پس تنها
-- مقداری که anon می‌تواند در این ستون ببیند همان 'visible' است.
grant select (id, target_type, target_slug, parent_id, author_name,
              is_member, body, is_pinned, created_at, status)
  on public.comments to anon;

grant select (id, target_type, target_slug, parent_id, author_name,
              is_member, body, is_pinned, created_at,
              status, hidden_at, hidden_by)
  on public.comments to authenticated;

drop policy if exists comments_read_public on public.comments;
create policy comments_read_public on public.comments
  for select to anon, authenticated
  using (status = 'visible');

drop policy if exists comments_read_admin on public.comments;
create policy comments_read_admin on public.comments
  for select to authenticated
  using ((select public.has_permission('comments.manage')));

-- پنهان‌کردن، برگرداندن، سنجاق‌کردن
drop policy if exists comments_update_admin on public.comments;
create policy comments_update_admin on public.comments
  for update to authenticated
  using ((select public.has_permission('comments.manage')))
  with check ((select public.has_permission('comments.manage')));

drop policy if exists comments_delete_admin on public.comments;
create policy comments_delete_admin on public.comments
  for delete to authenticated
  using ((select public.has_permission('comments.manage')));

-- نویسنده می‌تواند دیدگاه خودش را پاک کند، تا ده دقیقه. بعد از آن نه —
-- چون تا آن‌وقت کسی به آن پاسخ داده و پاک‌کردنش گفت‌وگو را می‌شکند.
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) and created_at > now() - interval '10 minutes');


-- آنچه سایت می‌خواند. بدون client_hash، بدون ردیف پنهان.
create or replace view public.comments_public
with (security_invoker = true) as
  select id, target_type, target_slug, parent_id, author_name,
         is_member, body, is_pinned, created_at
    from public.comments
   where status = 'visible';

grant select on public.comments_public to anon, authenticated;

-- شمارنده، برای «۳ دیدگاه» کنار عنوان بدون کشیدن کل متن‌ها.
create or replace view public.comment_counts
with (security_invoker = true) as
  select target_type, target_slug, count(*)::int as total
    from public.comments
   where status = 'visible'
   group by target_type, target_slug;

grant select on public.comment_counts to anon, authenticated;


-- =====================================================================
-- ۵. مهر و گزارش
-- =====================================================================

create or replace function public.stamp_comment_hide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status <> 'visible' then
    new.hidden_at := now();
    new.hidden_by := (select auth.uid());
  elsif new.status = 'visible' then
    new.hidden_at := null;
    new.hidden_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_stamp on public.comments;
create trigger comments_stamp
  before update on public.comments
  for each row execute function public.stamp_comment_hide();

drop trigger if exists comments_audit on public.comments;
create trigger comments_audit
  after update or delete on public.comments
  for each row execute function public.audit_trigger();
