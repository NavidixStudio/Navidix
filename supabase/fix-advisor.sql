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
