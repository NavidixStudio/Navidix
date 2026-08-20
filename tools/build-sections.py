# -*- coding: utf-8 -*-
"""Builds the four section pages that used to be overlays on the homepage.

They were panels that opened a fixed layer over the galaxy and pushed a
#hash. Three things were wrong with that. A hash is not a page, so sharing
any of them sent the homepage and its cover instead. Google cannot index a
hash either, so four whole sections of the site were invisible in search.
And opening one meant animating a full-screen layer on top of a live WebGL
canvas, which on a phone is the slowest thing the site can be asked to do.

They are ordinary pages now, built on the same shell every lesson uses, so
they inherit the reading style and the brand hairline along with it.
"""

SRC  = '/home/user/Navidix/brand-content.html'
BASE = 'https://navidixstudio.com/'
OUT  = '/home/user/Navidix/'

# The shell's head is sliced for the icons and the font links. Slicing it by
# line number breaks silently every time that head grows — most recently it
# started pulling in the shell's own twitter:image, so thirty-one pages ended
# up advertising the wrong cover. Bounded by what is actually wanted instead.
src = open(SRC, encoding='utf-8').read().split('\n')
_a = next(i for i, l in enumerate(src) if l.startswith('<link rel="icon"'))
# ends at the </style> closing the local @font-face block, which is the last
# thing in the shell's head-asset run
_b = next(i for i, l in enumerate(src) if i > _a and l == '</style>')
head_assets = '\n'.join(src[_a:_b + 1])
# The shell has two style blocks now — the local @font-face block up in the
# head assets, and the site's stylesheet below it. index() finds the first,
# which is the wrong one, so this takes the block that follows the assets.
_i = next(i for i, l in enumerate(src) if i > _b and l == '<style>')
_j = next(i for i, l in enumerate(src) if i > _i and l == '</style>')
style = '\n'.join(src[_i:_j])

# ---------------------------------------------------------------- content

FILMS = [
    ('kiqO7QZs6X0', '12:35', 'چهار میلیارد سال فرگشت: از زمین مذاب تا پیدایش انسان',
     'چهار میلیارد سال از گذشته‌ی زمین، از سیاره‌ای مذاب تا ظهور هوموساپینس — روایتی پیوسته از آتش تا آگاهی.'),
    ('WT81llGaYdc', None, 'انحصار هزار میلیارد دلاری: چرا آینده‌ی هوش مصنوعی به دو شرکت وابسته است',
     'درون صنعت نیمه‌رسانا، و اینکه چرا تمام محاسبات مدرن روی شانه‌ی چند شرکت انگشت‌شمار ایستاده است.'),
    ('PuDzaBwam4k', '17:33', 'غول دریایی ۱۳ میلیارد دلاری آمریکا: ناو جرالد آر. فورد',
     'پیشرفته‌ترین ناو هواپیمابر هسته‌ای جهان، و فناوری‌هایی که پشت آن ایستاده‌اند.'),
    ('Z4uSg7hwuXE', None, 'انقلاب هوش مصنوعی در جنگ‌های مدرن',
     'چگونه سامانه‌های خودمختار و پردازش داده در مقیاس بزرگ، راهبرد نظامی را از پایه بازتعریف می‌کنند.'),
]

COLLECTIONS = [
    ('imbh6f6kAqA', 'شاهنامه اگر فیلم می‌شد — موزیک ویدیو حماسی',
     'تلفیق شاهکار فردوسی و هوش مصنوعی: رستم، اژدها و میدان، در قابی که تا امروز فقط در ذهن خواننده‌ی شاهنامه وجود داشت.'),
    ('Fg2dXuiQpUQ', 'گلادیاتور ایرانی — موزیک ویدیو رسمی',
     'یک روایت تصویری از نبرد و شرف، ساخته‌شده با همان زبانِ نورِ سینمای حماسی.'),
    ('k35mzpMopyg', 'امپراتوری خورشید — موزیک ویدیو حماسی',
     'شکوه و فروپاشی، در یک قطعه‌ی واحد؛ نه فهرستی از نما، که یک اثر پیوسته.'),
]

PLAYLIST = 'https://www.youtube.com/playlist?list=PL3zymT0LJaw0M3so975uaSt4mcmn3fV9O'

CHANNELS = [
    ('youtube', 'YouTube', '@navidix', 'https://youtube.com/@navidix?sub_confirmation=1',
     'مستندهای فارسی درباره‌ی هوش مصنوعی، علم، فناوری، فضا و دفاع. کارِ تمام‌شده اینجا منتشر می‌شود.',
     '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/>'),
    ('telegram', 'Telegram', 'NavidixMedia', 'https://t.me/NavidixMedia',
     'هر چیزی درباره‌ی هوش مصنوعی — ابزار، پرامپت، یافته‌ها و اطلاعیه‌ها. درس‌های تازه اول اینجا اعلام می‌شوند.',
     '<path d="M21.7 3.4 2.9 10.6c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.2-.5-1.8-1.1-1.9z"/>'),
    ('instagram', 'Instagram', '@navidi__ai', 'https://www.instagram.com/navidi__ai',
     'تصاویر سینمایی هوش مصنوعی، پوستر، تریلر و روایت دیجیتال — گالری روزمره‌ی استودیو.',
     '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 5 5 .06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.15 3.2-1.7 4.8-5 5-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-5-5C2.07 15.6 2.06 15.2 2.06 12s0-3.6.07-4.9c.15-3.3 1.7-4.8 5-5C8.4 2.2 8.8 2.2 12 2.2zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm6.9-11.1a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1z"/>'),
    ('linkedin', 'LinkedIn', 'in/navidi', 'https://www.linkedin.com/in/mohammad-navidi-7b8b75381',
     'پروفایل حرفه‌ای، پژوهش، همکاری‌ها و به‌روزرسانی پروژه‌ها.',
     '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3-.03-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H9z"/>'),
]

# --------------------------------------------------------------- the shell

EXTRA_CSS = '''
/* .lesson section sets its own padding and lands after this in the cascade,
   so the horizontal inset has to be stated at the same specificity or the
   heading runs into the edge of a phone. */
.lesson .sect{ max-width:980px; margin:0 auto; padding:clamp(46px,8vh,92px) 22px 20px; }
.sect h1{ font-size:clamp(27px,5vw,45px); line-height:1.42; margin:0 0 15px;
  font-weight:800; letter-spacing:-.01em; color:#F2F6FB; }
.sect .sub{ color:#98A0A9; font-size:clamp(14px,2vw,16.5px); line-height:2.05;
  max-width:62ch; margin:0; }

/* The furniture all four section pages share: the card grid, the video card
   documentaries and collections are built from, the channel row, and the
   playlist button. It went out by accident with the gallery wall — that cut was
   made by position rather than by rule, and these sat after the wall inside the
   same block. Every one of those pages fell back to unstyled defaults as a
   result, and the channel icons, being inline svg carrying only a viewBox and
   therefore no intrinsic size, grew until they filled a phone edge to edge. */
.sect .eyebrow{ font-size:11.5px; letter-spacing:.06em; color:#7FB8FF;
  margin:0 0 11px; font-weight:600; }

.grid{ max-width:980px; margin:0 auto; padding:clamp(26px,4vh,40px) 22px 0;
  display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(288px,1fr)); }
.vcard{
  display:flex; flex-direction:column; text-decoration:none; border:1px solid #262A31;
  border-radius:8px; overflow:hidden; background:#101216;
  transition:border-color .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1),
             box-shadow .5s cubic-bezier(.16,1,.3,1);
}
.vcard:hover{ transform:translateY(-2px); border-color:rgba(150,196,255,.4);
  box-shadow:0 22px 44px -30px rgba(0,0,0,.95); }
.vcard__cover{ position:relative; display:block; aspect-ratio:16/9; background:#08090B; }
.vcard__cover img{ width:100%; height:100%; object-fit:cover; display:block; }
.vcard__time{ position:absolute; bottom:8px; left:8px; background:rgba(4,6,10,.84);
  color:#D7DEE7; font-size:11px; padding:2px 7px; border-radius:3px; letter-spacing:.02em; }
.vcard__body{ padding:16px 18px 18px; display:flex; flex-direction:column; gap:9px; flex:1; }
.vcard__body h2{ margin:0; font-size:15.5px; line-height:1.75; font-weight:600; color:#EDF2FA; }
.vcard__body p{ margin:0; font-size:13px; line-height:1.95; color:#8C939B; flex:1; }
.vcard__go{ font-size:12.5px; color:#7FB8FF; font-weight:600; }
.vcard:hover .vcard__go{ color:#A9CEFF; }

.chan{ display:flex; align-items:flex-start; gap:14px; text-decoration:none;
  border:1px solid #262A31; border-radius:8px; padding:18px 19px; background:#101216;
  transition:border-color .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1); }
.chan:hover{ transform:translateY(-2px); border-color:rgba(150,196,255,.42); }
.chan svg{ flex:0 0 auto; width:23px; height:23px; margin-top:2px; color:#98A0A9; }
.chan:hover svg{ color:#E4E7EA; }
.chan--yt:hover svg{ color:#E3202A; }
.chan--tg:hover svg{ color:#6EAAFF; }
.chan b{ display:block; font-size:15px; font-weight:600; color:#EDF2FA; margin-bottom:2px; }
.chan .at{ font-size:11.5px; color:#6B7280; display:block; margin-bottom:7px; }
.chan p{ margin:0; font-size:13px; line-height:1.95; color:#8C939B; }

.rowcta{ max-width:980px; margin:0 auto; padding:clamp(22px,3.5vh,32px) 22px 0;
  display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.rowcta h2{ margin:0; font-size:clamp(17px,2.6vw,22px); font-weight:700; color:#EDF2FA; }

/* .hollow — the empty-state panel — was only ever used by the gallery, and the
   gallery has work in it now. Dropped rather than shipped to four pages that
   cannot use it. */

'''

FOLLOWUP = '''<section class="followup">
  <div class="followup__in edge">
    <p class="eyebrow2">این فهرست تمام نمی‌شود</p>
    <h2>قسمت بعدی را از دست نده</h2>
    <p>هر کار تازه‌ای که اینجا اضافه می‌شود، <b>اول در تلگرام</b> اعلام می‌شود — همراه با ابزارها و یافته‌هایی که به یک درس کامل نمی‌رسند ولی همان هفته به کارت می‌آیند. و مستندها و فیلم‌های کوتاه، جایی که این ابزارها در کار واقعی تمام‌شده دیده می‌شوند، <b>در یوتیوب</b> منتشر می‌شوند.</p>
    <div class="follow-row">
      <a class="fbtn fbtn--tg" href="https://t.me/NavidixMedia" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.7 3.4 2.9 10.6c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.2-.5-1.8-1.1-1.9z"/></svg>
        <span>کانال تلگرام<small>هر چیزی درباره‌ی هوش مصنوعی</small></span>
      </a>
      <a class="fbtn fbtn--yt" href="https://youtube.com/@navidix?sub_confirmation=1" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/></svg>
        <span>سابسکرایب یوتیوب<small>مستند و فیلم کوتاه علمی</small></span>
      </a>
    </div>
    <p class="note">هر دو رایگان‌اند و هیچ‌وقت ایمیلی از تو نمی‌خواهم.</p>
  </div>
</section>

'''

# The colophon and the closing tags are every page's, but the block above is
# not: it asks the reader to go and follow the Telegram and YouTube channels,
# which is the entire subject of channels.html. Printed there it repeated the
# page's own content back at it, with the same two buttons a second time.
TAIL = '''
<div class="colophon">
  <p><span class="mk">&copy;</span> ۱۴۰۵ <b>استودیو نویدیکس</b> — ساخته‌ی <b>محمد نویدی</b>. تمام حقوق محفوظ است.<br />بازنشر با ذکر منبع آزاد است، فروشش نه.</p>
</div>
</body>
</html>
'''


def page(slug, title, desc, img, alt, ld, body, back=('index.html', 'صفحه‌ی اصلی ←'),
         followup=True):
    url = BASE + slug
    return f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<!-- بازدیدکننده‌ای که از دامنه‌ی github.io می‌آید به دامنه‌ی اصلی می‌رود. این
     خط در صفحه‌های ساخته‌شده هست ولی در این قالب نبود، پس هر بار ساختن دوباره
     پاکش می‌کرد. -->
<script>if(location.hostname==='navidixstudio.github.io'){{location.replace('https://navidixstudio.com'+location.pathname.replace(/^\/Navidix/i,'')+location.search+location.hash);}}</script>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<meta name="author" content="محمد نویدی" />
<link rel="canonical" href="{url}" />
<meta name="theme-color" content="#08090B" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:site_name" content="Navidix" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="fa_IR" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{BASE}{img}" />
<meta property="og:image:secure_url" content="{BASE}{img}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="{alt}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<meta name="twitter:image" content="{BASE}{img}" />
<meta name="twitter:image:alt" content="{alt}" />
{head_assets}
<script type="application/ld+json">{ld}</script>
{style}
{EXTRA_CSS}
.nvxflow{{ display:contents }}
</style>
<script src="nvx-ui.js" defer></script>
<script src="nvx-config.js" defer></script>
<script src="nvx-auth.js" defer></script>
<!-- نوار مشترک سایت (دکمه‌ی برگشت و حالت روز داخل همین است) و خواننده‌ی
     عمومی که محتوای منتشرشده‌ی پنل را کنار محتوای مخزن می‌گذارد. هر دو در
     صفحه‌های ساخته‌شده اضافه شده بودند ولی در قالب نبودند. -->
<script src="nvx-topbar.js" defer></script>
<script src="nvx-content.js" defer></script>
</head>
<body>

<header class="sitebar"><div class="row">
  <a class="home" href="index.html"><img class="navmark" src="navidix-mark.png" alt="" width="24" height="24" /><span>NAVIDIX</span></a>
  <a href="{back[0]}">{back[1]}</a>
</div></header>

<div class="lesson">
<div class="lesson__main">
{body}
</div>
</div>

{FOLLOWUP if followup else ''}{TAIL}'''


def film_card(vid, time, t, d, cta='تماشا در یوتیوب'):
    stamp = f'<span class="vcard__time lat">{time}</span>' if time else ''
    return f'''  <a class="vcard edge" href="https://www.youtube.com/watch?v={vid}" target="_blank" rel="noopener">
    <span class="vcard__cover"><img loading="lazy" width="480" height="270" alt="{t}"
      src="https://img.youtube.com/vi/{vid}/hqdefault.jpg" />{stamp}</span>
    <span class="vcard__body"><h2>{t}</h2><p>{d}</p><span class="vcard__go">{cta} ←</span></span>
  </a>'''


# ------------------------------------------------------------ documentaries

LD_FILMS = ('{"@context":"https://schema.org","@type":"CollectionPage",'
            '"name":"مستندهای برگزیده‌ی استودیو نویدیکس","inLanguage":"fa-IR",'
            '"description":"مستندهای بلندِ پژوهش‌محور درباره‌ی علم، فناوری، فضا، تاریخ و دفاع.",'
            '"url":"' + BASE + 'documentaries.html",'
            '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"},'
            '"mainEntity":{"@type":"ItemList","itemListElement":[' +
            ','.join('{"@type":"ListItem","position":%d,"url":"https://www.youtube.com/watch?v=%s","name":"%s"}'
                     % (i + 1, f[0], f[2]) for i, f in enumerate(FILMS)) + ']}}')

films_body = '''<section class="sect">
  <p class="eyebrow">آرشیو استودیو</p>
  <h1>مستندهای برگزیده</h1>
  <p class="sub">فیلم‌های بلندِ پژوهش‌محور. هر کدام در همین استودیو نوشته، تولید و روایت شده‌اند — از پژوهش اولیه تا صداگذاری نهایی. موضوع‌ها فرق می‌کنند، ولی روش یکی است: یک پرسش واقعی، منابع قابل ردیابی، و روایتی که تماشاگر را دست‌کم نمی‌گیرد.</p>
</section>

<div class="grid">
  <!-- ویدیوهایی که از پنل منتشر می‌شوند، در همین شبکه و با همان کارت.
       display:contents یعنی این پوشش خودش خانه‌ی شبکه نمی‌گیرد و کارت‌های
       داخلش مستقیم کنار چهارتای پایین می‌نشینند. اگر پایگاه داده خالی یا
       دور از دسترس باشد، این عنصر پنهان می‌شود و صفحه همان است که بود. -->
  <div class="nvxflow" data-nvx="videos" data-nvx-style="vcard"></div>
''' + '\n'.join(film_card(*f) for f in FILMS) + '''
</div>'''


# -------------------------------------------------------------- collections

LD_COLL = ('{"@context":"https://schema.org","@type":"CollectionPage",'
           '"name":"کالکشن‌های ویژه‌ی نویدیکس","inLanguage":"fa-IR",'
           '"description":"مجموعه‌های موضوعی برگزیده از آرشیو — هر کالکشن یک اثر واحد است، نه پوشه‌ای از ویدیو.",'
           '"url":"' + BASE + 'collections.html",'
           '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"}}')

coll_body = '''<section class="sect">
  <p class="eyebrow">مجموعه‌های موضوعی</p>
  <h1>کالکشن‌های ویژه</h1>
  <p class="sub">مجموعه‌های موضوعی برگزیده از سراسر آرشیو. هر کالکشن یک اثر واحد است، نه پوشه‌ای از ویدیو: با یک ایده شروع می‌شود، یک زبان تصویری دارد، و تا آخر همان را نگه می‌دارد.</p>
</section>

<div class="rowcta">
  <h2>ویدیوهای تاریخی حماسی</h2>
  <a class="fbtn fbtn--yt" href="''' + PLAYLIST + '''" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/></svg>
    <span>مشاهده‌ی پلی‌لیست</span>
  </a>
</div>

<div class="grid">
''' + '\n'.join(film_card(v, None, t, d) for v, t, d in COLLECTIONS) + '''
</div>'''


# ------------------------------------------------------------------ gallery

LD_GAL = ('{"@context":"https://schema.org","@type":"CollectionPage",'
          '"name":"گالری هوش مصنوعی نویدیکس","inLanguage":"fa-IR",'
          '"description":"آثار سینمایی هوش مصنوعی، کانسپت‌آرت و پوسترهای استودیو نویدیکس.",'
          '"url":"' + BASE + 'gallery.html",'
          '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"}}')

# ---- the gallery is deliberately empty ----
# It briefly held the prompt library's twenty-seven plates, which was the wrong
# call: the library is a tool and the gallery is meant to be the studio's own
# work, so all that did was print the same twenty-seven pictures twice under
# two names. The wall, its markup and its stylesheet are gone rather than left
# commented out. The page stays — it is linked from the homepage and the
# sitemap — and says plainly that it is being prepared.
gal_body = '''<section class="sect">
  <p class="eyebrow">آرشیو تصویری</p>
  <h1>گالری هوش مصنوعی</h1>
  <p class="sub">این بخش در حال آماده شدن است. گالری قرار است کارِ خودِ استودیو را نشان دهد — پوستر یک مستند، طراحی یک نما، آزمودن یک زبان تصویری پیش از آنکه به فیلم برسد — با هنر-کارگردانی مخصوص خودش. تا آن‌وقت، اگر دنبال ساختن تصویر با هوش مصنوعی هستی، شناسنامه‌ی کامل ۲۷ سبک در <a href="prompts.html">کتابخانه‌ی پرامپت</a> آماده است.</p>
</section>'''


# ----------------------------------------------------------------- channels

LD_CHAN = ('{"@context":"https://schema.org","@type":"ProfilePage",'
           '"name":"کانال‌های رسمی نویدیکس","inLanguage":"fa-IR",'
           '"url":"' + BASE + 'channels.html",'
           '"mainEntity":{"@type":"Organization","name":"Navidix","url":"' + BASE + '",'
           '"sameAs":[' + ','.join('"%s"' % c[3].split('?')[0] for c in CHANNELS) + ']}}')

chan_body = '''<section class="sect">
  <p class="eyebrow">کجا منتشر می‌کنیم</p>
  <h1>کانال‌های رسمی</h1>
  <p class="sub">جایی که نویدیکس منتشر می‌کند. هر چیز دیگری که این نام را داشته باشد، رسمی نیست. اگر می‌خواهی یکی را انتخاب کنی: تلگرام برای دنبال کردن روزبه‌روز، یوتیوب برای کارِ تمام‌شده.</p>
</section>

<div class="grid">
''' + '\n'.join(
    '''  <a class="chan edge chan--%s" href="%s" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">%s</svg>
    <span><b>%s</b><span class="at lat">%s</span><p>%s</p></span>
  </a>''' % (k[:2], url, svg, name, handle, desc)
    for k, name, handle, url, desc, svg in CHANNELS) + '''
</div>'''


# ------------------------------------------------------------------- output

PAGES = [
    ('documentaries.html',
     'مستندهای برگزیده | مستند فارسی علم، فناوری و فضا — استودیو نویدیکس',
     'مستندهای فارسی پژوهش‌محور درباره‌ی فرگشت، صنعت نیمه‌رسانا، هوش مصنوعی در جنگ مدرن و ناوهای هسته‌ای. نوشته، تولید و روایت‌شده در استودیو نویدیکس.',
     'og-documentaries.png', 'مستندهای برگزیده — Navidix', LD_FILMS, films_body),
    ('collections.html',
     'کالکشن‌های ویژه | موزیک ویدیوهای حماسی با هوش مصنوعی — نویدیکس',
     'مجموعه‌های موضوعی برگزیده از آرشیو نویدیکس: شاهنامه اگر فیلم می‌شد، گلادیاتور ایرانی و امپراتوری خورشید — ساخته‌شده با هوش مصنوعی.',
     'og-collections.png', 'کالکشن‌های ویژه — Navidix', LD_COLL, coll_body),
    ('gallery.html',
     'گالری هوش مصنوعی | کانسپت‌آرت و پوستر سینمایی — استودیو نویدیکس',
     'آثار سینمایی هوش مصنوعی، کانسپت‌آرت و پوسترهای استودیو نویدیکس، به‌همراه کتابخانه‌ی ۲۷ سبک تصویری برای ساختن نمونه‌های مشابه.',
     'og-prompts.png', 'گالری هوش مصنوعی — Navidix', LD_GAL, gal_body),
    ('channels.html',
     'کانال‌های رسمی نویدیکس | یوتیوب، تلگرام و اینستاگرام',
     'همه‌ی کانال‌های رسمی استودیو نویدیکس یک‌جا: یوتیوب برای مستند و فیلم کوتاه علمی، تلگرام برای ابزار و پرامپت روزانه، اینستاگرام برای تصویر.',
     'og-channels.png', 'کانال‌های رسمی — Navidix', LD_CHAN, chan_body),
]

# channels.html is the one page the follow prompt has nothing to add to — it is
# already a list of every channel, with the same links, further up the page.
NO_FOLLOWUP = {'channels.html'}

# gallery.html is deliberately not rebuilt here any more. The page on disk
# was rewritten by hand afterwards - it carries a .gx hero, .gs__shot plates
# and two hundred captions that this file knows nothing about - so running
# this generator over it would replace a live page with an older design.
# Whoever wants to generate it again has to bring gal_body up to date first
# and delete this line.
SKIP = {'gallery.html'}

for slug, title, desc, img, alt, ld, body in PAGES:
    if slug in SKIP:
        print('skipped ' + slug + ' (see SKIP above)')
        continue
    open(OUT + slug, 'w', encoding='utf-8').write(
        page(slug, title, desc, img, alt, ld, body,
             followup=slug not in NO_FOLLOWUP))
    print('wrote', slug, '(no follow prompt)' if slug in NO_FOLLOWUP else '')
