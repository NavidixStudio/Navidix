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
