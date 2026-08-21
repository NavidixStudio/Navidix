#!/usr/bin/env python3
# =====================================================================
# NAVIDIX — مقاله‌های داخل مخزن
#
# هر فایل content/articles/*.md را می‌خواند و همه را در یک
# content/articles.json می‌ریزد که سایت مستقیم می‌خواندش.
#
#     python3 tools/build-content.py
#
# ---------------------------------------------------------------------
# چرا این وجود دارد
#
# پنل مدیریت محتوا را در پایگاه داده نگه می‌دارد، که برای آدم عالی است و
# برای یک عامل خودکار بی‌فایده: کسی که فقط به مخزن دسترسی دارد نمی‌تواند
# در آن پایگاه داده بنویسد. نتیجه‌اش این شد که «یک مقاله بذار» از یک
# کارِ یک‌مرحله‌ای به کاری تبدیل شد که آخرش دست صاحب سایت بود.
#
# پس دو مسیر انتشار داریم و هر دو به یک فهرست می‌رسند:
#
#   مخزن       → content/articles/*.md → این اسکریپت → JSON → سایت
#   پنل مدیریت → جدول articles         → PostgREST         → سایت
#
# nvx-content.js هر دو را می‌خواند و با هم نشان می‌دهد. اگر یک slug در هر
# دو باشد، نسخه‌ی پایگاه داده برنده است — چون آن یکی را یک آدم آگاهانه
# ویرایش کرده و این یکی فقط آنجا مانده.
# =====================================================================

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'content' / 'articles'
OUT = ROOT / 'content' / 'articles.json'

# فهرست‌هایی که به آرایه تبدیل می‌شوند، نه رشته
LISTS = {'tags', 'seo_keywords'}

# چیزی که حتماً باید باشد
NEEDED = ('title', 'slug', 'date')


def parse(path: pathlib.Path) -> dict:
    """یک فایل Markdown با سربرگ --- را به یک dict تبدیل می‌کند."""
    raw = path.read_text(encoding='utf-8')

    m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', raw, re.S)
    if not m:
        raise ValueError('سربرگ --- ندارد')

    head, body = m.group(1), m.group(2).strip()

    meta = {}
    for line in head.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            raise ValueError('خط بدون دونقطه در سربرگ: ' + line)
        # فقط اولین دونقطه جدا می‌کند — عنوان‌ها خودشان دونقطه دارند
        key, _, value = line.partition(':')
        key, value = key.strip(), value.strip()

        if key in LISTS:
            meta[key] = [v.strip() for v in re.split(r'[,،]', value) if v.strip()]
        else:
            meta[key] = value

    missing = [k for k in NEEDED if not meta.get(k)]
    if missing:
        raise ValueError('این‌ها در سربرگ نیستند: ' + ', '.join(missing))

    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', meta['slug']):
        raise ValueError('slug فقط حروف کوچک انگلیسی، عدد و خط تیره: ' + meta['slug'])

    # ساعت اختیاری است، ولی وقتی دو مقاله در یک روز منتشر شوند تنها چیزی
    # است که ترتیبشان را معنادار می‌کند. بدون آن، مرتب‌سازی روی تاریخِ تنها
    # مساوی می‌شود و ترتیب نهایی به نام فایل می‌افتد — که هیچ ربطی به
    # «تازه‌ترین» ندارد.
    m = re.fullmatch(r'(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?', meta['date'])
    if not m:
        raise ValueError('date باید YYYY-MM-DD یا YYYY-MM-DD HH:MM باشد: ' + meta['date'])
    day, hh, mm = m.group(1), m.group(2) or '00', m.group(3) or '00'

    return {
        'slug':            meta['slug'],
        'title':           meta['title'],
        'excerpt':         meta.get('excerpt') or None,
        'body':            body,
        'cover_path':      meta.get('cover') or None,
        'tags':            meta.get('tags', []),
        'seo_title':       meta.get('seo_title') or None,
        'seo_description': meta.get('seo_description') or None,
        'seo_keywords':    meta.get('seo_keywords', []),
        # همان شکلی که ستون published_at در پایگاه داده دارد، تا سایت
        # مجبور نباشد دو جور تاریخ را از هم تشخیص بدهد
        'published_at':    '%sT%s:%s:00Z' % (day, hh, mm),
        'source':          'repo',
    }


def main() -> int:
    if not SRC.exists():
        SRC.mkdir(parents=True)

    rows, bad = [], []
    for path in sorted(SRC.glob('*.md')):
        try:
            rows.append(parse(path))
        except ValueError as e:
            bad.append('%s — %s' % (path.name, e))

    if bad:
        print('این فایل‌ها ساخته نشدند:', file=sys.stderr)
        for b in bad:
            print('  ✗ ' + b, file=sys.stderr)
        return 1

    seen = {}
    for r in rows:
        if r['slug'] in seen:
            print('slug تکراری: ' + r['slug'], file=sys.stderr)
            return 1
        seen[r['slug']] = True

    # تازه‌ترین اول، همان ترتیبی که سایت می‌خواهد
    # تازه‌ترین اول. slug به‌عنوان شکنندهٔ تساوی می‌آید تا اگر دو مقاله
    # دقیقاً یک زمان داشتند، ترتیب بین دو بار ساختن عوض نشود.
    rows.sort(key=lambda r: (r['published_at'], r['slug']), reverse=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n',
                   encoding='utf-8')

    print('نوشته شد: content/articles.json')
    for r in rows:
        print('  · %s — %s' % (r['published_at'][:10], r['title']))
    print('  %d مقاله' % len(rows))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
