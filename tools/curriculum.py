# -*- coding: utf-8 -*-
"""مسیر یادگیری — تنها منبع حقیقت.

شش مرحله، و درس‌هایی که در هر مرحله می‌نشینند. اگر درسی اضافه یا جابه‌جا شد،
فقط `JOURNEY` پایین را عوض کن؛ بعد این فایل را اجرا کن. دو چیز ساخته می‌شود:

    curriculum.js   داده‌ای که هر صفحه می‌خواند (window.NVX_CURRICULUM)
    journey.html    صفحه‌ی مسیر

هر دو از همین یک جا می‌آیند، پس نمی‌توانند از هم جدا بیفتند. این همان
قراردادی است که `styles.py` برای کتابخانه دارد: یک منبع، بقیه ساخته می‌شود.

    python3 tools/curriculum.py

نکته‌ی مهم: `slug` نام فایل درس است بدون `.html`. صفحه‌ها خودشان را با همین
شناسه پیدا می‌کنند، پس اگر نام فایلی عوض شد باید اینجا هم عوض شود — وگرنه
پیشرفتِ ذخیره‌شده‌ی کاربر روی درسی می‌افتد که دیگر وجود ندارد.

`min` تخمین زمان مطالعه است، نه عددی که اندازه گرفته شده باشد. فقط برای
نشان‌دادن حجم مسیر به کار می‌رود و هیچ محاسبه‌ای به آن تکیه نمی‌کند —
زمان واقعی یادگیری در مرورگر شمرده می‌شود.
"""

import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(REPO, 'brand-content.html')
BASE = 'https://navidixstudio.com/'


def L(slug, t, s, min):
    """یک درس: شناسه، عنوان کامل، عنوان کوتاه برای مسیر، و تخمین دقیقه."""
    return dict(slug=slug, t=t, s=s, min=min)


# ---------------------------------------------------------------- the path

JOURNEY = [
    dict(id='fundamentals', no='۰۱', en='AI Fundamentals', fa='مبانی هوش مصنوعی',
         blurb='هوش مصنوعی واقعاً چه هست و چه نیست، کدام ابزار مالِ توست، و مهم‌ترین '
               'مهارت: اینکه بفهمی کِی دارد اشتباه می‌گوید.',
         lessons=[
             L('ai-start', 'از کجا شروع کنم؟ راهنمای صفرِ صفر', 'شروع از صفر', 40),
         ]),

    dict(id='prompting', no='۰۲', en='Prompt Engineering', fa='پرامپت‌نویسی',
         blurb='شش تکه‌ی یک درخواست خوب، نمونه‌دادن به‌جای توصیف‌کردن، و سه جمله‌ای '
               'که جواب بد را نجات می‌دهد.',
         lessons=[
             L('ai-prompting', 'چطور درست بپرسم؟ آناتومی یک پرامپت خوب', 'آناتومی پرامپت', 45),
         ]),

    dict(id='image', no='۰۳', en='AI Image Generation', fa='تولید تصویر',
         blurb='پنج تکه‌ی یک پرامپت تصویر، و نور به‌عنوان مهم‌ترین تصمیمی که در یک '
               'قاب می‌گیری.',
         lessons=[
             L('ai-image-sound', 'تصویر و صدا: ساختن، خواندن، شنیدن', 'تصویر و صدا', 40),
             L('light-composition', 'نور و ترکیب‌بندی: ساختن حس با نور و قاب', 'نور و ترکیب‌بندی', 45),
         ]),

    dict(id='video', no='۰۴', en='AI Video Generation', fa='تولید ویدیو',
         blurb='زبان دوربین، و اینکه چرا «تصویر به ویدیو» جواب می‌دهد و «متن به '
               'ویدیو» نه.',
         lessons=[
             L('camera-language', 'زبان دوربین: زاویه، اندازه‌ی نما و حرکت', 'زبان دوربین', 35),
             L('video-motion', 'پرامپت‌نویسی ویدیو: از قاب ثابت تا حرکت کنترل‌شده', 'پرامپت ویدیو', 40),
         ]),

    dict(id='story', no='۰۵', en='Cinematic Storytelling', fa='روایت سینمایی',
         blurb='از پرمیس یک‌جمله‌ای تا مونتاژ: هفت مرحله‌ی تولید، و ریتمی که '
               'می‌شود حسابش کرد.',
         lessons=[
             L('idea-to-final', 'از ایده تا نمای نهایی: هفت مرحله‌ی تولید', 'ایده تا نمای نهایی', 40),
             L('edit-sound', 'تدوین و صدا', 'تدوین و صدا', 35),
         ]),

    dict(id='direction', no='۰۶', en='Creative Direction', fa='مدیریت خلاق',
         blurb='وقتی ساختن را بلدی، مسئله این می‌شود که چه چیزی بسازی و چطور '
               'تکرارپذیرش کنی — سیستم، برند، تیم و اعداد واقعی.',
         lessons=[
             L('ai-systems', 'از یک کار به یک سیستم', 'از کار تا سیستم', 45),
             L('ai-first-project', 'اولین کارِ واقعی', 'اولین کار واقعی', 40),
             L('brand-content', 'برند، پیش از محتوا', 'برند پیش از محتوا', 50),
             L('team-monetization', 'تیم و درآمد: ساختن ماشین مقیاس‌پذیری', 'تیم و درآمد', 45),
             L('rights-contracts', 'مالِ کیست؟ حق، مجوز و قرارداد در کار با هوش مصنوعی', 'حق و قرارداد', 35),
             L('hell-grind', 'پرونده‌ی باز Hell Grind', 'پرونده Hell Grind', 25),
         ]),
]

ALL = [l for st in JOURNEY for l in st['lessons']]
MINS = sum(l['min'] for l in ALL)


# ------------------------------------------------------------------ shell
#
# پوسته با نشانه بریده می‌شود، نه با شماره‌ی خط. دلیلش در tools/README.md
# نوشته شده و یک بار سی‌ویک صفحه را خراب کرد.

src = open(SRC, encoding='utf-8').read().split('\n')
_a = next(i for i, l in enumerate(src) if l.startswith('<link rel="icon"'))
_b = next(i for i, l in enumerate(src) if i > _a and l == '</style>')
head_assets = '\n'.join(src[_a:_b + 1])
_i = next(i for i, l in enumerate(src) if i > _b and l == '<style>')
_j = next(i for i, l in enumerate(src) if i > _i and l == '</style>')
style = '\n'.join(src[_i:_j])


# --------------------------------------------------------------- numerals

FA = '۰۱۲۳۴۵۶۷۸۹'


def fa(n):
    return str(n).translate(str.maketrans('0123456789', FA))


# ------------------------------------------------------------ curriculum.js

def js():
    def lesson(l):
        return ('{slug:%s,t:%s,s:%s,min:%d}'
                % (q(l['slug']), q(l['t']), q(l['s']), l['min']))

    stages = ',\n    '.join(
        '{id:%s,no:%s,en:%s,fa:%s,lessons:[%s]}'
        % (q(st['id']), q(st['no']), q(st['en']), q(st['fa']),
           ','.join(lesson(l) for l in st['lessons']))
        for st in JOURNEY)

    return '''/* =====================================================================
   NAVIDIX — the curriculum, as data.

   Generated by tools/curriculum.py. Do not edit by hand: the next build
   overwrites it. Add or move a lesson in that file instead, and both this
   and journey.html come out in step.

   Read by nvx-progress.js and by journey.html. A page that never loads
   this file is untouched by any of it.
   ===================================================================== */
window.NVX_CURRICULUM = {
  total: %d,
  minutes: %d,
  stages: [
    %s
  ]
};
''' % (len(ALL), MINS, stages)


def q(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


# ------------------------------------------------------------ journey.html

EXTRA_CSS = '''
/* ---- the journey ---- */
/* Lesson prose sits inside elements that carry their own horizontal
   padding; .jrn goes straight into .lesson__main and so inherited none —
   on a 390px phone every line ran edge to edge. */
.jrn{ max-width:760px; margin:0 auto; padding-inline:22px; }
@media (max-width:640px){ .jrn{ padding-inline:15px; } }
.jrn__stats{ display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr));
  gap:10px; margin:26px 0 34px; }
.jrn__stat{ background:#161C26; border:1px solid #2E3542; border-radius:12px; padding:14px 15px;
  box-shadow:inset 0 1px 0 rgba(226,238,255,.06); }
.jrn__stat b{ display:block; font-size:20px; text-wrap:balance; font-weight:700; color:#EDF2FA; line-height:1.5;
  font-variant-numeric:tabular-nums; }
.jrn__stat span{ display:block; font-size:11.5px; color:#8C939B; margin-top:2px; }

.jrn__bar{ height:6px; border-radius:99px; background:#181C23; overflow:hidden; margin:0 0 6px; }
.jrn__bar i{ display:block; height:100%; width:0;
  background:linear-gradient(90deg,#E5202A,#7FB8FF); transition:width .8s cubic-bezier(.16,1,.3,1); }
.jrn__pct{ font-size:12.5px; color:#8C939B; margin:0 0 30px; }

/* The shell styles every section inside .lesson with 48px of vertical
   padding, which is right for a lesson and far too loose for a path —
   two stages ended up 126px apart. `.lesson section` scores 0,1,1, so
   plain `.stg` loses to it; `.jrn .stg` at 0,2,0 wins it back. */
.jrn .stg{ position:relative; padding:0 0 6px; }
.stg{ position:relative; }
.stg__head{ display:flex; align-items:baseline; gap:12px; margin:0 0 4px; }
.stg__no{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:12px; color:#6B7280; }
.stg__head h2{ margin:0; font-size:clamp(17px,2.3vw,21px); font-weight:700; line-height:1.6; color:#EDF2FA; }
.stg__en{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:11px; color:#6B7280;
  letter-spacing:.04em; }
.stg__blurb{ margin:0 0 14px; font-size:13.5px; line-height:2; color:#8C939B; }

/* the rail that joins the stages */
.stg::before{ content:''; position:absolute; top:26px; bottom:-30px;
  inset-inline-start:-22px; width:1px; background:linear-gradient(#262A31,#141922); }
.stg:last-of-type::before{ display:none; }
.stg__dot{ position:absolute; top:8px; inset-inline-start:-27px; width:11px; height:11px;
  border-radius:50%; background:#0E1116; border:1px solid #3A4250; }
.stg.is-done .stg__dot{ background:#7FB8FF; border-color:#7FB8FF; }
.stg.is-part .stg__dot{ background:#E5202A; border-color:#E5202A; }
@media (max-width:640px){
  .stg::before,.stg__dot{ display:none; }
}

.stg__list{ display:flex; flex-direction:column; gap:8px; margin:0 0 30px; }
.lrow{ display:flex; align-items:center; gap:12px; padding:13px 15px; border-radius:11px;
  background:#141922; border:1px solid #2A313C; text-decoration:none;
  transition:border-color .25s,transform .25s; }
.lrow:hover{ border-color:rgba(150,196,255,.4); transform:translateY(-1px); }
.lrow__tick{ flex:none; width:19px; height:19px; border-radius:50%; border:1px solid #3A4250;
  display:grid; place-items:center; font-size:10px; color:#08090B; }
.lrow.is-done .lrow__tick{ background:#7FB8FF; border-color:#7FB8FF; }
.lrow.is-done .lrow__tick::after{ content:'✓'; font-weight:700; }
.lrow__t{ flex:1; font-size:14px; line-height:1.7; color:#C8D0DA; }
.lrow.is-done .lrow__t{ color:#7E8894; }
.lrow__m{ flex:none; font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:11px; color:#6B7280; }

.jrn__note{ font-size:12.5px; line-height:2; color:#6B7280; border-top:1px solid #1B2028;
  padding-top:18px; margin-top:8px; }
'''


def html():
    stages = []
    for st in JOURNEY:
        rows = '\n'.join(
            '      <a class="lrow" data-slug="%s" href="%s.html">'
            '<span class="lrow__tick"></span>'
            '<span class="lrow__t">%s</span>'
            '<span class="lrow__m">%s دقیقه</span></a>'
            % (l['slug'], l['slug'], l['t'], fa(l['min']))
            for l in st['lessons'])
        stages.append(
            '    <section class="stg" data-stage="%s">\n'
            '      <span class="stg__dot" aria-hidden="true"></span>\n'
            '      <div class="stg__head"><span class="stg__no lat">%s</span>'
            '<h2>%s</h2><span class="stg__en">%s</span></div>\n'
            '      <p class="stg__blurb">%s</p>\n'
            '      <div class="stg__list">\n%s\n      </div>\n'
            '    </section>'
            % (st['id'], st['no'], st['fa'], st['en'], st['blurb'], rows))

    title = 'مسیر یادگیری هوش مصنوعی | Navidix'
    desc  = ('مسیر شش‌مرحله‌ای یادگیری هوش مصنوعی کاربردی: از مبانی و پرامپت‌نویسی تا '
             'تولید تصویر، ویدیو، روایت سینمایی و مدیریت خلاق. پیشرفتت را ببین و هر '
             'مرحله را که تمام کردی علامت بزن.')
    url = BASE + 'journey.html'

    return f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
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
<meta property="og:image" content="{BASE}og-training.png" />
<meta property="og:image:secure_url" content="{BASE}og-training.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="مسیر یادگیری هوش مصنوعی — Navidix" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<meta name="twitter:image" content="{BASE}og-training.png" />
<meta name="twitter:image:alt" content="مسیر یادگیری هوش مصنوعی — Navidix" />
{head_assets}
{style}
{EXTRA_CSS}
</style>
<link rel="stylesheet" href="nvx-training.css" />
<script src="nvx-ui.js" defer></script>
<script src="curriculum.js" defer></script>
<script src="nvx-config.js" defer></script>
<script src="nvx-progress.js" defer></script>
<script src="nvx-auth.js" defer></script>
</head>
<body>

<header class="sitebar"><div class="row">
  <a class="home" href="index.html"><img class="navmark" src="navidix-mark.png" alt="" width="24" height="24" /><span>NAVIDIX</span></a>
  <a href="training.html">همه‌ی آموزش‌ها ←</a>
</div></header>

<div class="lesson">
<div class="lesson__main">
<div class="jrn">

  <div class="eyebrow"><span class="lat">Navidix</span> · مسیر یادگیری</div>
  <h1>مسیر یادگیری</h1>
  <p class="sub">شش مرحله، از مبانی تا مدیریت خلاق. لازم نیست به ترتیب بروی — ولی اگر
  بروی، هر مرحله دقیقاً همان چیزی را فرض می‌گیرد که مرحله‌ی قبل ساخته است.
  {fa(len(ALL))} درس، حدود {fa(round(MINS / 60))} ساعت.</p>

  <!-- Numbers are written by nvx-progress.js from what this browser has
       stored. With the script absent the page is still the whole path in
       order, which is all it ever claims to be. -->
  <div class="jrn__stats" id="jstats" hidden>
    <div class="jrn__stat"><b data-stat="week">۰</b><span>این هفته</span></div>
    <div class="jrn__stat"><b data-stat="total">۰</b><span>مجموع زمان</span></div>
    <div class="jrn__stat"><b data-stat="done">۰</b><span>درس تکمیل‌شده</span></div>
    <div class="jrn__stat"><b data-stat="streak">۰</b><span>روز پیوسته</span></div>
  </div>

  <div class="jrn__bar" id="jbar" hidden><i></i></div>
  <p class="jrn__pct" id="jpct" hidden></p>

{chr(10).join(stages)}

  <p class="jrn__note" id="jnote">پیشرفتت روی همین مرورگر ذخیره می‌شود و ثبت‌نام
  نمی‌خواهد. <a href="me.html" style="color:#7FB8FF;font-weight:600">صفحه‌ی پیشرفت و
  نشان‌های خودت ←</a></p>

</div>
</div>
</div>

<nav class="pager">
  <a href="training.html"><small>فهرست کامل</small><b>همه‌ی آموزش‌ها، با جست‌وجو و دسته‌بندی</b></a>
  <a href="prompts.html"><small>کتابخانه</small><b>کتابخانه‌ی پرامپت فارسی</b></a>
</nav>

</body>
</html>
'''


# ------------------------------------------------------------------ write

if __name__ == '__main__':
    open(os.path.join(REPO, 'curriculum.js'), 'w', encoding='utf-8').write(js())
    open(os.path.join(REPO, 'journey.html'), 'w', encoding='utf-8').write(html())
    print('curriculum.js  — %d درس در %d مرحله' % (len(ALL), len(JOURNEY)))
    print('journey.html   — %d دقیقه، حدود %d ساعت' % (MINS, round(MINS / 60)))
