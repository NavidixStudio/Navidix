# -*- coding: utf-8 -*-
"""منابع یوتیوب هر درس — منبع حقیقت و سازنده‌اش.

    python3 tools/resources.py            # ساختن، با عنوان‌های کش‌شده
    python3 tools/resources.py --fetch    # اول عنوان و کانال را از یوتیوب بگیر

بخش «منابع رایگان یوتیوب» را در انتهای هر درسی که منبع دارد می‌سازد. درسی که
منبع ندارد اصلاً بخشی نمی‌گیرد، پس این فایل با فهرست خالی هیچ صفحه‌ای را
عوض نمی‌کند.


اضافه‌کردن یک ویدیو
-------------------
یک خط به `RESOURCES` اضافه کن و `--fetch` را بزن:

    R('ai-start', 'https://youtu.be/XXXXXXXXXXX', 'beginner',
      'چرا این را می‌گذاریم — یک جمله، برای خواننده'),

عنوان و نام کانال را ننویس؛ `--fetch` خودش از یوتیوب می‌گیرد و در
`tools/resources.json` ذخیره می‌کند. مدت ویدیو را اگر خواستی دستی بده
(`dur='12:35'`) — یوتیوب آن را بدون کلید API نمی‌دهد.

اگر جمله‌ی «چرا این را می‌گذاریم» را نتوانی بنویسی، آن منبع را نگذار. این
تنها فیلتری است که واقعاً کار می‌کند.


معیارهای انتخاب
---------------
سایت قرار است منابع پراکنده را غربال کند، نه فهرست کند. پیش از افزودن:

  ۱. دقیقاً همین درس را توضیح می‌دهد، نه موضوع کلی‌اش
  ۲. ساختار دارد — نه یک نفر که بلندبلند فکر می‌کند
  ۳. کانال در همین حوزه سابقه دارد
  ۴. تازه است. در هوش مصنوعی، بالای ۱۸ ماه مشکوک است
  ۵. کاری یاد می‌دهد که بشود همان شب انجامش داد
  ۶. حداکثر دو ویدیو از یک کانال در یک درس
  ۷. حداکثر پنج منبع در یک درس — بیشتر یعنی فلج انتخاب

`level` یکی از `beginner` / `intermediate` / `advanced` است و برای خواننده
نوشته می‌شود، نه برای بایگانی: یعنی «برای دیدن این چه می‌خواهد».
"""

import io
import json
import os
import re
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(REPO, 'tools', 'resources.json')

LEVELS = {
    'beginner':     'مقدماتی',
    'intermediate': 'متوسط',
    'advanced':     'پیشرفته',
}


def R(lesson, url, level, why, dur=None):
    assert level in LEVELS, level
    return dict(lesson=lesson, url=url, level=level, why=why, dur=dur)


# ---------------------------------------------------------------- the list
#
# خالی است تا وقتی ویدیوها را خودت انتخاب کنی. هیچ شناسه‌ای اینجا حدس زده
# نشده و نباید بشود: شناسه‌ی حدسی یا به ویدیوی مرده می‌رود یا به ویدیویی
# که هیچ ربطی به درس ندارد، و هر دو بدتر از نبودنِ این بخش‌اند.

RESOURCES = [
    # R('ai-start', 'https://youtu.be/XXXXXXXXXXX', 'beginner',
    #   'در بیست دقیقه نشان می‌دهد یک مدل زبانی واقعاً چه می‌کند و چه نمی‌کند.'),
]


# ------------------------------------------------------------------ youtube

def vid(url):
    """شناسه‌ی ویدیو از هر شکلی که یوتیوب می‌دهد."""
    m = (re.search(r'(?:youtu\.be/|v=|/embed/|/shorts/)([\w-]{11})', url)
         or re.search(r'^([\w-]{11})$', url.strip()))
    if not m:
        raise ValueError('لینک یوتیوب شناخته نشد: %s' % url)
    return m.group(1)


def fetch(v):
    """عنوان و نام کانال، از oEmbed. بدون کلید API و بدون سهمیه."""
    u = ('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v='
         + v + '&format=json')
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    d = json.loads(urllib.request.urlopen(req, timeout=15).read())
    return {'title': d.get('title', ''), 'channel': d.get('author_name', '')}


def cache():
    if os.path.exists(CACHE):
        return json.load(io.open(CACHE, encoding='utf-8'))
    return {}


# -------------------------------------------------------------------- build

CSS_MARK = '/* nvx-resources */'

SECTION_CSS = '''
/* =====================================================================
   منابع یوتیوب

   کارت همان `.vcard` صفحات مستند و مجموعه است تا چیز تازه‌ای به زبان
   بصری سایت اضافه نشود. تفاوتش دو چیز است: چیپ سطح، و یک جمله که
   می‌گوید چرا این ویدیو اینجاست.
   ===================================================================== */
.ytb{ margin:44px 0 8px; }
.ytb__lead{ font-size:14px; line-height:2.05; color:#C8D0DA; margin:0 0 10px; }
.ytb__sub{ font-size:12.5px; line-height:2; color:#8C939B; margin:0 0 18px; }
.ytb__sub b{ color:#C8D0DA; font-weight:600; }
.ytb__grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(258px,1fr)); gap:14px; }

.ytc{ display:flex; flex-direction:column; border-radius:13px; overflow:hidden;
  border:1px solid #262A31; background:rgba(14,17,22,.6); text-decoration:none;
  transition:border-color .25s, transform .25s; }
.ytc:hover{ border-color:rgba(150,196,255,.42); transform:translateY(-2px); }
.ytc__cover{ position:relative; display:block; aspect-ratio:16/9; background:#0B0D11;
  border:0; padding:0; width:100%; cursor:pointer; }
.ytc__cover img{ width:100%; height:100%; object-fit:cover; display:block; }
.ytc__play{ position:absolute; inset:0; display:grid; place-items:center; }
.ytc__play i{ width:46px; height:46px; border-radius:50%; background:rgba(8,9,11,.72);
  border:1px solid rgba(233,244,255,.3); display:grid; place-items:center;
  transition:background .25s, border-color .25s; }
.ytc__play i::after{ content:''; border-style:solid; border-width:8px 0 8px 13px;
  border-color:transparent transparent transparent #EDF2FA; margin-inline-start:3px; }
.ytc__cover:hover .ytc__play i{ background:#E5202A; border-color:#E5202A; }
.ytc__time{ position:absolute; bottom:8px; inset-inline-start:8px; background:rgba(4,6,10,.84);
  border-radius:5px; padding:1px 6px; font-size:11px; color:#EDF2FA;
  font-family:ui-monospace,Menlo,Vazirmatn,monospace; }
.ytc__lv{ position:absolute; top:8px; inset-inline-end:8px; background:rgba(4,6,10,.84);
  border:1px solid rgba(150,175,215,.28); border-radius:5px; padding:1px 7px;
  font-size:10.5px; color:#C8D0DA; }
.ytc__b{ padding:14px 15px 15px; display:flex; flex-direction:column; gap:7px; flex:1; }
.ytc__b h4{ margin:0; font-size:14px; line-height:1.75; font-weight:600; color:#EDF2FA; }
.ytc__ch{ font-size:11.5px; color:#6B7280; }
.ytc__why{ font-size:12.5px; line-height:1.95; color:#8C939B; flex:1; margin:0; }
.ytc__go{ font-size:12px; color:#7FB8FF; font-weight:600; }

/* the facade, once it has been pressed */
.ytc__cover iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }

.ytb__back{ margin:18px 0 0; font-size:12.5px; line-height:2; color:#6B7280;
  border-top:1px solid #1B2028; padding-top:14px; }
'''


def card(r, meta):
    v = vid(r['url'])
    m = meta.get(v, {})
    title = m.get('title') or ('ویدیوی ' + v)
    chan = m.get('channel') or ''
    time = ('<span class="ytc__time lat">%s</span>' % r['dur']) if r.get('dur') else ''
    return f'''      <div class="ytc">
        <button class="ytc__cover" type="button" data-yt="{v}"
                aria-label="پخش: {title}">
          <img loading="lazy" width="480" height="270" alt=""
               src="https://img.youtube.com/vi/{v}/hqdefault.jpg"
               onerror="this.style.display='none'" />
          <span class="ytc__play" aria-hidden="true"><i></i></span>
          <span class="ytc__lv">{LEVELS[r['level']]}</span>{time}
        </button>
        <div class="ytc__b">
          <h4>{title}</h4>
          <span class="ytc__ch">{chan}</span>
          <p class="ytc__why">{r['why']}</p>
          <a class="ytc__go" href="https://www.youtube.com/watch?v={v}"
             target="_blank" rel="noopener">تماشا در یوتیوب ←</a>
        </div>
      </div>'''


HEAD = '<!-- nvx-resources:start -->'
TAIL = '<!-- nvx-resources:end -->'


def section(rows, meta):
    cards = '\n'.join(card(r, meta) for r in rows)
    return f'''{HEAD}
<section class="ytb">
  <h2>منابع رایگان یوتیوب</h2>
  <p class="ytb__lead">اگر می‌خواهی این بخش را بهتر بفهمی، این منابع رایگان را در
  یوتیوب ببین. هر کدام را خودمان دیده‌ایم و زیرش نوشته‌ایم چرا انتخاب شده.</p>
  <p class="ytb__sub"><b>انگلیسی بلد نیستی؟ اشکالی ندارد.</b> کافی است زیرنویس فارسی
  را در خود یوتیوب روشن کنی: چرخ‌دنده‌ی ⚙ گوشه‌ی ویدیو ← Subtitles ←
  Auto-translate ← Persian.</p>

  <div class="ytb__grid">
{cards}
  </div>

  <p class="ytb__back">این ویدیوها روی یوتیوب‌اند و مال سازنده‌های خودشان — ما فقط
  انتخاب و مرتبشان کرده‌ایم. وقتی تماشایشان تمام شد، برگرد همین‌جا و درس را
  «تکمیل شد» بزن.</p>
</section>

<script>
/* پوسته‌ی ویدیو: تا وقتی کسی کلیک نکند، هیچ چیزی از یوتیوب بارگذاری نمی‌شود
   جز یک تصویر. iframe یوتیوب نزدیک یک مگابایت اسکریپت و کوکی شخص ثالث
   می‌آورد، و صفحات درس این سایت از قبل سنگین‌اند. با کلیک، نسخه‌ی
   youtube-nocookie جایش می‌نشیند. */
(function () {{
  document.addEventListener('click', function (e) {{
    var b = e.target.closest && e.target.closest('.ytc__cover[data-yt]');
    if (!b) return;
    var v = b.getAttribute('data-yt');
    b.removeAttribute('data-yt');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + v +
            '?autoplay=1&rel=0&cc_load_policy=1';
    f.title = b.getAttribute('aria-label') || 'ویدیو';
    f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    b.textContent = '';
    b.appendChild(f);
  }});
}})();
</script>
{TAIL}'''


def build():
    meta = cache()
    if '--fetch' in sys.argv:
        for r in RESOURCES:
            v = vid(r['url'])
            if v in meta and '--force' not in sys.argv:
                continue
            try:
                meta[v] = fetch(v)
                print('  گرفته شد: %s — %s' % (v, meta[v]['title'][:60]))
            except Exception as e:
                print('  !! %s — %s' % (v, e))
        io.open(CACHE, 'w', encoding='utf-8').write(
            json.dumps(meta, ensure_ascii=False, indent=2))

    # درس‌ها را گروه کن
    by = {}
    for r in RESOURCES:
        by.setdefault(r['lesson'], []).append(r)

    # استایل یک بار به شیت مشترک می‌رود
    css_path = os.path.join(REPO, 'nvx-training.css')
    css = io.open(css_path, encoding='utf-8').read()
    if CSS_MARK not in css:
        io.open(css_path, 'w', encoding='utf-8').write(
            css.rstrip() + '\n\n' + CSS_MARK + SECTION_CSS)
        print('nvx-training.css — استایل منابع اضافه شد')

    touched = 0
    for slug in sorted(set(list(by) + lessons_with_section())):
        path = os.path.join(REPO, slug + '.html')
        if not os.path.exists(path):
            print('  !! صفحه‌ای به نام %s.html نیست' % slug)
            continue
        html = io.open(path, encoding='utf-8').read()

        block = section(by[slug], meta) + '\n\n' if slug in by else ''

        if HEAD in html:
            a = html.index(HEAD)
            b = html.index(TAIL) + len(TAIL)
            # بلوک قبلی و خطوط خالی بعدش را با تازه عوض کن
            new = html[:a] + block.rstrip('\n') + html[b:]
        elif block:
            # قبل از pager می‌نشیند: جایی که خواننده وقتی درس تمام شده ایستاده
            i = html.rindex('<nav class="pager">')
            new = html[:i] + block + html[i:]
        else:
            continue

        if new != html:
            io.open(path, 'w', encoding='utf-8').write(new)
            touched += 1
            print('  %s.html — %d منبع' % (slug, len(by.get(slug, []))))

    print('%d صفحه به‌روز شد، %d منبع در %d درس'
          % (touched, len(RESOURCES), len(by)))


def lessons_with_section():
    """درس‌هایی که الان بخش دارند — تا اگر منبعی حذف شد، بخشش هم برداشته شود."""
    out = []
    for f in os.listdir(REPO):
        if f.endswith('.html'):
            try:
                if HEAD in io.open(os.path.join(REPO, f), encoding='utf-8').read():
                    out.append(f[:-5])
            except Exception:
                pass
    return out


if __name__ == '__main__':
    build()
