#!/usr/bin/env python3
# =====================================================================
# NAVIDIX — ساختن supabase/install.sql
#
# شش فایل SQL را به ترتیب درست پشت هم می‌گذارد تا در Supabase فقط یک بار
# copy/paste لازم باشد — که روی گوشی تفاوت بین «شدنی» و «نشدنی» است.
#
# چرا سازنده و نه کپی دستی: یک فایل ادغام‌شده‌ی دستی، همان لحظه که یکی از
# شش فایل اصلی عوض شود کهنه می‌شود و هیچ‌کس نمی‌فهمد. این را هر بار بعد از
# تغییر یکی از آن‌ها اجرا کن:
#
#     python3 tools/build-install-sql.py
#
# ترتیب پایین اهمیت دارد و دلبخواه نیست: cms-rbac به توابعی که schema
# ساخته تکیه دارد، cms-content به has_permission، و cms-ai به
# stamp_updated_at و audit_trigger. عوض کردن ترتیب یعنی خطا در اجرا.
# =====================================================================

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'supabase'
OUT = SRC / 'install.sql'

ORDER = [
    ('schema.sql',         'پایه: پروفایل، پیشرفت درس، بازدید صفحه، نماهای آمار'),
    ('users-and-refs.sql', 'فهرست کاربران و منابع ورودی'),
    ('fix-advisor.sql',    'پاسخ به هشدارهای Advisor'),
    ('cms-rbac.sql',       'نقش‌ها، Permissionها، گزارش فعالیت، تنظیمات، رسانه'),
    ('cms-content.sql',    'مقاله، پرامپت، دوره/فصل/درس، گالری، ویدیو، جست‌وجو'),
    ('cms-ai.sql',         'دستیار هوش مصنوعی، انتشار خودکار، ورک‌فلوها'),
    ('cms-site.sql',       'معرفی، خدمات، شبکه‌های اجتماعی'),
    ('cms-comments.sql',   'دیدگاه‌ها: جدول، تابع نوشتن، محدودیت نرخ، مودریشن'),
]

HEAD = """-- =====================================================================
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
{index}--
-- هر کدام از این {count} تا در supabase/ فایل خودشان را هم دارند، با همان
-- توضیحات. این یکی فقط برای راحتیِ یک‌بار اجرا کردن است.
-- =====================================================================


"""

TAIL = """

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
"""


def main() -> int:
    missing = [n for n, _ in ORDER if not (SRC / n).exists()]
    if missing:
        print('این فایل‌ها پیدا نشدند: ' + ', '.join(missing), file=sys.stderr)
        return 1

    index = ''.join(
        '--   {}. {:<20} — {}\n'.format(i, name, why)
        for i, (name, why) in enumerate(ORDER, 1)
    )

    # عدد از خودِ فهرست می‌آید، نه از یک کلمه‌ی ثابت — وگرنه با اضافه‌شدن
    # هر فایل تازه، متن بالای install.sql یک عدد قدیمی را تکرار می‌کند.
    fa = lambda n: str(n).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
    parts = [HEAD.format(index=index, count=fa(len(ORDER)))]

    for i, (name, why) in enumerate(ORDER, 1):
        text = (SRC / name).read_text(encoding='utf-8').strip()
        parts.append(
            '\n\n-- #####################################################################\n'
            '-- بخش {} از {} — {}\n'
            '-- منبع: supabase/{}\n'
            '-- #####################################################################\n\n'
            .format(i, len(ORDER), why, name)
        )
        parts.append(text)
        parts.append('\n')

    parts.append(TAIL)

    out = ''.join(parts)
    OUT.write_text(out, encoding='utf-8')

    lines = out.count('\n') + 1
    print('نوشته شد: supabase/install.sql')
    print('  {} خط، {:.0f} کیلوبایت، از {} فایل'.format(
        lines, len(out.encode('utf-8')) / 1024, len(ORDER)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
