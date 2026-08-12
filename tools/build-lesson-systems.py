# -*- coding: utf-8 -*-
"""Builds ai-systems.html — beginners' episode four.

Episodes one to three taught one question and one answer. This one is about
what turns that into something that runs the same way twice: finding the task
worth the trouble, writing it down as a procedure instead of retyping it,
chaining steps, and knowing which decisions a person still has to make.
"""

SRC  = '/home/user/Navidix/brand-content.html'
OUT  = '/home/user/Navidix/ai-systems.html'
BASE = 'https://navidixstudio.com/'

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

TITLE = 'از یک کار به یک سیستم: رویه، زنجیره و جایی که باید دست نگه داری | آموزش هوش مصنوعی کاربردی — قسمت ۴'
DESC  = ('قسمت چهارم آموزش مبتدی هوش مصنوعی: کدام کارِ تکراری ارزش سیستم‌شدن دارد، چطور یک پرامپت را به '
         'رویه‌ی ثابت تبدیل کنی، زنجیره‌ی چند مرحله‌ای بسازی، و کجا باید آدم تصمیم بگیرد نه ماشین. '
         'با سنجه‌ی کارِ تکراری و رویه‌سازِ تعاملی. رایگان، از استودیو نویدیکس.')
URL   = BASE + 'ai-systems.html'
IMG   = BASE + 'og-systems.png'
ALT   = 'از یک کار به یک سیستم — قسمت چهارم آموزش هوش مصنوعی، Navidix'

LD = ('{"@context":"https://schema.org","@type":"LearningResource","name":"از یک کار به یک سیستم",'
      '"description":"رویه‌ی ثابت، زنجیره‌ی چند مرحله‌ای و نقطه‌ی تصمیم انسان — برای مبتدی‌ها.",'
      '"inLanguage":"fa-IR","isAccessibleForFree":true,"educationalLevel":"beginner",'
      '"learningResourceType":"درس","teaches":"تبدیل کار تکراری به رویه و زنجیره‌ی قابل تکرار با هوش مصنوعی",'
      '"datePublished":"2026-08-11","author":{"@type":"Person","name":"محمد نویدی","jobTitle":"متخصص هوش مصنوعی کاربردی"},'
      '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"},'
      '"isPartOf":{"@type":"Course","name":"آموزش هوش مصنوعی کاربردی"},'
      '"mainEntityOfPage":{"@type":"WebPage","@id":"' + URL + '"},"position":4}')

head = f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{TITLE}</title>
<meta name="description" content="{DESC}" />
<meta name="author" content="محمد نویدی" />
<link rel="canonical" href="{URL}" />
<meta name="theme-color" content="#08090B" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:site_name" content="Navidix" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="fa_IR" />
<meta property="og:title" content="از یک کار به یک سیستم" />
<meta property="og:description" content="{DESC}" />
<meta property="og:url" content="{URL}" />
<meta property="og:image" content="{IMG}" />
<meta property="og:image:secure_url" content="{IMG}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="{ALT}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="از یک کار به یک سیستم" />
<meta name="twitter:description" content="{DESC}" />
<meta name="twitter:image" content="{IMG}" />
<meta name="twitter:image:alt" content="{ALT}" />
{head_assets}
<link rel="stylesheet" href="nvx-training.css" />
<script src="nvx-ui.js" defer></script>
<script src="nvx-training.js" defer></script>
<script type="application/ld+json">
{LD}
</script>
{style}
/* ---- the forge, shared with episodes two and three ---- */
.lesson .forge{{ display:grid; gap:14px; margin:24px 0 18px; }}
.lesson .forge label{{ display:block; }}
.lesson .forge .lab{{
  display:block; font-size:12.5px; letter-spacing:.02em; color:#7FB8FF;
  margin-bottom:7px; font-weight:600;
}}
.lesson .forge .lab i{{ font-style:normal; color:var(--bone-dim); font-weight:400; }}
.lesson .forge input, .lesson .forge textarea, .lesson .forge select{{
  width:100%; box-sizing:border-box; font-family:inherit; font-size:14px; line-height:1.9;
  padding:11px 14px; border-radius:4px; color:var(--bone);
  background:#0B0E12; border:1px solid var(--line);
  transition:border-color .35s ease, background .35s ease;
}}
.lesson .forge textarea{{ resize:vertical; min-height:64px; }}
.lesson .forge input:focus, .lesson .forge textarea:focus, .lesson .forge select:focus{{
  outline:none; border-color:#5A96F0; background:#0D1116;
}}
.lesson .forge .two{{ display:grid; gap:14px; grid-template-columns:1fr 1fr; }}
@media (max-width:640px){{ .lesson .forge .two{{ grid-template-columns:1fr; }} }}

.lesson .pbox{{ position:relative; border:1px solid var(--line); border-radius:4px;
  background:#0B0E12; padding:18px 20px 46px; margin:18px 0 8px; }}
.lesson .pbox pre{{ margin:0; white-space:pre-wrap; word-break:break-word;
  font-family:var(--mono); font-size:12.5px; line-height:2; color:#CBD5E1; }}
.lesson .pbox pre b{{ color:var(--amber); font-weight:400; }}
.lesson .pbox pre .ph{{ color:#5A6472; }}
.lesson .pcopy{{ position:absolute; inset-inline-end:10px; bottom:10px; cursor:pointer;
  font-family:inherit; font-size:12px; padding:6px 13px; border-radius:100px;
  color:var(--bone-dim); background:transparent; border:1px solid var(--line);
  transition:background .3s ease, color .3s ease, border-color .3s ease; }}
.lesson .pcopy:hover{{ background:var(--amber); border-color:var(--amber); color:#08090B; }}
.lesson .pcopy.done{{ background:#1B7A4B; border-color:#1B7A4B; color:#fff; }}
.lesson .ltr{{ direction:ltr; text-align:left; }}

/* ---- the scorer: four sliders and a verdict that changes as you move them ---- */
.lesson .gauge{{ border:1px solid var(--line); border-radius:6px; background:var(--ink-2);
  padding:clamp(18px,3vw,26px); margin:24px 0 8px; }}
.lesson .gauge .q{{ margin:0 0 18px; }}
.lesson .gauge .q:last-of-type{{ margin-bottom:22px; }}
.lesson .gauge .q > span{{ display:block; font-size:13.5px; color:var(--bone);
  margin-bottom:9px; line-height:1.8; }}
.lesson .opts{{ display:flex; gap:7px; flex-wrap:wrap; }}
.lesson .opts button{{
  appearance:none; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:500;
  padding:8px 15px; border-radius:100px; color:var(--bone-dim);
  background:#0B0E12; border:1px solid var(--line);
  transition:color .35s ease, background .35s ease, border-color .35s ease;
}}
.lesson .opts button:hover{{ border-color:rgba(150,196,255,.5); color:var(--bone); }}
.lesson .opts button[aria-pressed="true"]{{
  color:#08090B; background:#7FB8FF; border-color:#7FB8FF; font-weight:600; }}
.lesson .verdict{{ border-top:1px solid var(--line); padding-top:20px; }}
.lesson .verdict .band{{ display:flex; align-items:baseline; gap:11px; margin-bottom:10px; }}
.lesson .verdict .score{{ font-family:var(--mono); font-size:27px; font-weight:700;
  color:#7FB8FF; letter-spacing:normal; }}
.lesson .verdict .label{{ font-size:15px; font-weight:700; color:var(--bone); }}
.lesson .verdict p{{ margin:0; font-size:13.5px; line-height:2; color:var(--bone-dim); }}
.lesson .verdict.hot .score, .lesson .verdict.hot .label{{ color:#E3202A; }}
.lesson .verdict.warm .score, .lesson .verdict.warm .label{{ color:#E8A33D; }}
.lesson .verdict.go .score, .lesson .verdict.go .label{{ color:#4FBE86; }}

/* ---- the chain: one step at a time, so the shape is visible ---- */
.lesson .chain{{ display:flex; gap:8px; flex-wrap:wrap; margin:24px 0 0; }}
.lesson .chain button{{
  appearance:none; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:600;
  padding:9px 16px; border-radius:100px; color:var(--bone-dim);
  background:var(--ink-2); border:1px solid var(--line);
  transition:color .35s ease, background .35s ease, border-color .35s ease;
}}
.lesson .chain button[aria-pressed="true"]{{
  color:#08090B; background:#7FB8FF; border-color:#7FB8FF; }}
.lesson .step{{ border:1px solid var(--line); border-radius:6px; background:var(--ink-2);
  padding:clamp(18px,3vw,26px); margin-top:14px; }}
.lesson .step h4{{ margin:0 0 12px; font-size:15px; color:var(--bone); font-weight:700; }}
.lesson .step .io{{ display:grid; gap:12px; grid-template-columns:1fr 1fr; margin-bottom:14px; }}
@media (max-width:640px){{ .lesson .step .io{{ grid-template-columns:1fr; }} }}
.lesson .step .io div{{ background:#0B0E12; border:1px solid var(--line);
  border-radius:4px; padding:12px 14px; }}
.lesson .step .io b{{ display:block; font-size:11.5px; color:#7FB8FF; margin-bottom:6px;
  font-weight:600; }}
.lesson .step .io span{{ font-size:12.5px; line-height:1.95; color:var(--bone-dim); }}
.lesson .step .io.out b{{ color:#E8A33D; }}
.lesson .step > p{{ margin:0; font-size:13.5px; line-height:2.05; color:var(--bone-dim); }}
.lesson .step .human{{ margin-top:13px; padding-top:13px; border-top:1px solid var(--line);
  font-size:13px; line-height:1.95; color:#E8A33D; }}
</style>
</head>
'''

BODY = '''<body>
<header class="sitebar"><div class="row">
  <a class="home" href="index.html"><img class="navmark" src="navidix-mark.png" alt="" width="24" height="24" /><span>NAVIDIX</span></a>
  <a href="training.html">همه‌ی آموزش‌ها ←</a>
</div></header>

<div class="lesson">
<div class="lesson__main">

<section class="hero">
  <div class="wrap">
    <div class="eyebrow">شروع از صفر · قسمت چهارم</div>
    <h1>از یک کار به <em>یک سیستم</em></h1>
    <p class="lede">سه قسمت اول مهارتِ تک‌کار بود: یک سوال می‌پرسیدی، یک جواب می‌گرفتی. این کار می‌کند — ولی هر بار از صفر. هفته‌ی بعد همان کار را داری و دوباره باید همان جمله‌ها را از نو بنویسی، و جواب هم دقیقاً همان کیفیت را ندارد.</p>
    <p class="lede">این قسمت دربارهٔ چیزی است که این را عوض می‌کند: <b>یک بار خوب بنویس، صد بار استفاده کن</b>. و مهم‌تر از آن، بدانی کجا نباید بگذاری ماشین تصمیم بگیرد.</p>
    <img class="hex-wm" src="navidix-mark.png" alt="" aria-hidden="true" />
  </div>
</section>

<section class="stats">
  <div class="wrap">
    <div class="stat"><span class="v num">۵</span><span class="k">تکه‌ی یک رویه</span></div>
    <div class="stat"><span class="v num">۴</span><span class="k">حلقه‌ی یک زنجیره</span></div>
    <div class="stat"><span class="v num">۱</span><span class="k">نقطه‌ای که آدم تصمیم می‌گیرد</span></div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۱</span></div>
    <h2>هر کاری ارزش سیستم‌شدن ندارد</h2>
    <p class="intro">اولین اشتباهی که تقریباً همه می‌کنند این است: ذوق‌زده می‌شوند و می‌خواهند همه‌چیز را خودکار کنند. بعد سه ساعت وقت می‌گذارند تا کاری را خودکار کنند که ماهی یک بار پیش می‌آید و ده دقیقه طول می‌کشد.</p>

    <p>ساختن یک رویه هزینه دارد — وقت، حوصله، و چند بار آزمون و خطا. آن هزینه فقط وقتی برمی‌گردد که کار <b>تکرار شود</b>، <b>شکلش هر بار یکی باشد</b>، و <b>خروجی‌اش قابل داوری باشد</b>. اگر یکی از این سه نباشد، همان بار به بار انجامش بده و بی‌خیال سیستم شو.</p>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>یک کار وقتی ارزش سیستم‌شدن دارد که <strong>تعدادِ دفعات ضربدر وقتی که می‌گیرد</strong>، از وقتی که ساختن رویه می‌برد بیشتر باشد — و شکل ورودی‌اش هر بار همان باشد.</p>
    </div>

    <hr class="hr" />

    <h2>سنجه‌ی کارِ تکراری</h2>
    <p class="intro">یک کار واقعی از هفته‌ی خودت را در ذهن بیاور — چیزی که هر بار حوصله‌ات را می‌برد — و چهار سوال زیر را دربارهٔ آن جواب بده.</p>

    <div class="gauge">
      <div class="q" data-k="freq">
        <span>۱. چند وقت یک بار انجامش می‌دهی؟</span>
        <div class="opts">
          <button type="button" data-v="0">سالی چند بار</button>
          <button type="button" data-v="1">ماهی یک بار</button>
          <button type="button" data-v="2">هفته‌ای یک بار</button>
          <button type="button" data-v="3">هر روز</button>
        </div>
      </div>
      <div class="q" data-k="time">
        <span>۲. هر بار چقدر طول می‌کشد؟</span>
        <div class="opts">
          <button type="button" data-v="0">چند دقیقه</button>
          <button type="button" data-v="1">نیم ساعت</button>
          <button type="button" data-v="2">یکی دو ساعت</button>
          <button type="button" data-v="3">بیشتر از نصف روز</button>
        </div>
      </div>
      <div class="q" data-k="same">
        <span>۳. هر بار شکلش همان است؟ (ورودی همان‌جور، خروجی همان‌جور)</span>
        <div class="opts">
          <button type="button" data-v="0">هر بار کاملاً فرق دارد</button>
          <button type="button" data-v="2">تقریباً همان است</button>
          <button type="button" data-v="3">دقیقاً همان قالب</button>
        </div>
      </div>
      <div class="q" data-k="judge">
        <span>۴. می‌توانی در یک نگاه بگویی خروجی خوب شده یا نه؟</span>
        <div class="opts">
          <button type="button" data-v="0">نه، باید کارشناس ببیند</button>
          <button type="button" data-v="2">با کمی دقت آره</button>
          <button type="button" data-v="3">بله، فوری معلوم است</button>
        </div>
      </div>
      <div class="verdict" id="g-out">
        <div class="band"><span class="score num" id="g-score">—</span><span class="label" id="g-label">چهار تا را جواب بده</span></div>
        <p id="g-note">هر چهار سوال را انتخاب کن تا بگویم این کار ارزش رویه‌ساختن دارد یا نه.</p>
      </div>
    </div>

    <p>اگر جواب «نه» بود، ناراحت نشو — این خودش یک نتیجه است. کارِ درست را انتخاب کردن، نصفِ کار است.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۲</span></div>
    <h2>فرق یک پرامپت با یک رویه</h2>
    <p class="intro">در قسمت دوم یاد گرفتی یک درخواست خوب شش تکه دارد. یک <b>رویه</b> همان است، به‌علاوهٔ سه چیزی که باعث می‌شود بار دوم هم همان کیفیت را بدهد.</p>

    <table class="swap">
      <thead><tr><th>پرامپت</th><th>رویه</th></tr></thead>
      <tbody>
        <tr><td>یک بار تایپ می‌شود و از بین می‌رود.</td>
            <td>یک جا ذخیره می‌شود و هر بار همان برداشته می‌شود.</td></tr>
        <tr><td>ورودی داخل خودش نوشته شده.</td>
            <td>جای ورودی خالی است و هر بار پُر می‌شود.</td></tr>
        <tr><td>معلوم نیست جواب خوب چه شکلی است.</td>
            <td>شکلِ خروجی از قبل تعریف شده — چند بند، چه بخش‌هایی، چه طولی.</td></tr>
        <tr><td>اگر بد جواب داد، باز از اول می‌نویسی.</td>
            <td>یک نمونه‌ی درست کنارش هست تا با آن مقایسه کنی.</td></tr>
      </tbody>
    </table>

    <hr class="hr hr--cool" />

    <h2>پنج تکه‌ی یک رویه</h2>
    <p class="intro">این پنج تکه، همان شش تکه‌ی قسمت دوم است که برای تکرارشدن بازنویسی شده.</p>

    <table class="swap">
      <thead><tr><th>تکه</th><th>چه کار می‌کند</th></tr></thead>
      <tbody>
        <tr><td><b>۱. نقش و هدف</b><span class="en">Role</span></td>
            <td>یک جمله: تو چه کسی هستی و این کار برای چیست. ثابت می‌ماند و هرگز عوض نمی‌شود.</td></tr>
        <tr><td><b>۲. ورودی</b><span class="en">Input</span></td>
            <td>تنها تکه‌ای که هر بار عوض می‌شود. جایش را با یک نشانه‌ی روشن خالی بگذار، مثل <span class="en">{{متن}}</span>.</td></tr>
        <tr><td><b>۳. مراحل</b><span class="en">Steps</span></td>
            <td>ترتیب کاری که باید بکند، شماره‌دار. مدل ترتیب را جدی می‌گیرد، و تو هم بعداً می‌فهمی کدام مرحله خراب شده.</td></tr>
        <tr><td><b>۴. قالب خروجی</b><span class="en">Format</span></td>
            <td>دقیقاً چه شکلی برگردد: چند بند، با چه عنوان‌هایی، چند کلمه. بدون این، هر بار یک شکل می‌گیری.</td></tr>
        <tr><td><b>۵. مرزها</b><span class="en">Limits</span></td>
            <td>چه کاری نکند: چیزی از خودش اضافه نکند، عدد نسازد، اگر اطلاعات کم بود بپرسد نه اینکه حدس بزند.</td></tr>
      </tbody>
    </table>

    <div class="rule data">
      <span class="tag cool">چرا تکه‌ی پنجم مهم‌ترین است</span>
      <p>در قسمت اول دربارهٔ <a href="ai-start.html">توهم و راستی‌آزمایی</a> حرف زدیم. وقتی یک کار را صد بار تکرار می‌کنی، آن یک بار که مدل عدد از خودش می‌سازد حتماً پیش می‌آید. جمله‌ی «اگر اطلاعات کافی نبود، بپرس؛ حدس نزن» را در هر رویه‌ای بنویس.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۳</span></div>
    <h2>رویه‌ساز</h2>
    <p class="intro">مثل دو قسمت قبل، خودت پرش کن. هر چه بنویسی، پایین ساخته می‌شود. بعد کپی کن و یک جای همیشگی نگهش دار — یادداشت گوشی، یک فایل، هرجا که دفعه‌ی بعد پیدایش کنی.</p>

    <div class="forge">
      <label><span class="lab">نقش و هدف <i>— یک جمله</i></span>
        <input id="s-role" type="text" placeholder="تو ویراستار یک کانال آموزشی فارسی هستی. کارَت خلاصه‌کردن مقاله‌ها برای پست تلگرام است." /></label>

      <label><span class="lab">اسم ورودی <i>— چیزی که هر بار عوض می‌شود</i></span>
        <input id="s-input" type="text" placeholder="متن مقاله" /></label>

      <label><span class="lab">مراحل <i>— هر خط یک مرحله</i></span>
        <textarea id="s-steps" rows="4" placeholder="ادعای اصلی مقاله را پیدا کن
سه نکته‌ی مهمی که ادعا را پشتیبانی می‌کنند بیرون بکش
هر نکته را در یک جمله‌ی کوتاه فارسی بنویس
یک جمله‌ی پایانی بنویس که خواننده را به خواندن اصل مقاله دعوت کند"></textarea></label>

      <div class="two">
        <label><span class="lab">قالب خروجی</span>
          <input id="s-format" type="text" placeholder="یک تیتر، سه بولت، یک جمله‌ی پایانی. زیر ۹۰ کلمه." /></label>
        <label><span class="lab">لحن</span>
          <select id="s-tone">
            <option value="">— انتخاب کن —</option>
            <option>ساده و خودمانی، برای مخاطب عام</option>
            <option>دقیق و رسمی، برای مخاطب حرفه‌ای</option>
            <option>کوتاه و خبری، بدون تعارف</option>
            <option>آموزشی و صبور، برای مبتدی</option>
          </select></label>
      </div>

      <label><span class="lab">مرزها <i>— چه کاری نکند</i></span>
        <input id="s-limits" type="text" placeholder="چیزی که در متن نیست اضافه نکن. عدد و تاریخ را از خودت نساز. اگر ادعای اصلی روشن نبود، بپرس." /></label>
    </div>

    <div class="pbox">
      <pre id="s-out" class="ltr"></pre>
      <button class="pcopy" type="button" data-for="s-out">کپی</button>
    </div>
    <p>حالا هر بار فقط جای ورودی را عوض می‌کنی. همین. این تفاوت بین «هر بار از نو» و «یک بار برای همیشه» است.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۴</span></div>
    <h2>زنجیره: وقتی یک رویه کافی نیست</h2>
    <p class="intro">بعضی کارها با یک درخواست تمام نمی‌شوند. راه‌حل، نوشتن یک پرامپت غول‌پیکر نیست — راه‌حل این است که کار را به چند مرحله بشکنی و <b>خروجی هر مرحله را ورودی مرحله‌ی بعد</b> کنی.</p>

    <p>چرا این بهتر از یک درخواست بزرگ است؟ چون وقتی نتیجه بد می‌شود، می‌فهمی <em>کدام</em> مرحله خراب شده و فقط همان را درست می‌کنی. در یک پرامپت بزرگ، فقط می‌دانی «بد شد».</p>

    <p class="intro">یک نمونه‌ی واقعی: از یک مستند یوتیوب تا یک پست کانال. روی هر حلقه بزن.</p>

    <div class="chain" id="c-tabs">
      <button type="button" data-i="0" aria-pressed="true">۱ · پیاده‌سازی</button>
      <button type="button" data-i="1" aria-pressed="false">۲ · استخراج</button>
      <button type="button" data-i="2" aria-pressed="false">۳ · نوشتن</button>
      <button type="button" data-i="3" aria-pressed="false">۴ · بازبینی</button>
    </div>
    <div class="step" id="c-step"></div>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>هر حلقه باید <strong>یک کار</strong> بکند و خروجی‌اش <strong>قابل خواندن</strong> باشد. اگر نمی‌توانی خروجی یک مرحله را بخوانی و بگویی درست است یا نه، آن مرحله را بشکن.</p>
    </div>

    <hr class="hr" />

    <p>و یک هشدار که دیر یا زود به آن می‌خوری: <b>خطا در زنجیره جمع می‌شود</b>. اگر مرحله‌ی اول ده درصد اشتباه کند و مرحله‌ی دوم روی همان اشتباه بسازد، تا مرحله‌ی چهارم چیزی دستت می‌آید که هیچ ربطی به واقعیت ندارد و کاملاً هم مطمئن به‌نظر می‌رسد. برای همین است که لایه‌ی بعدی وجود دارد.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۵</span></div>
    <h2>کجا باید دست نگه داری</h2>
    <p class="intro">این مهم‌ترین بخش این درس است. یک سیستم خوب آن نیست که همه‌چیز را خودکار کند — آن است که <b>بداند کجا باید از تو بپرسد</b>.</p>

    <p>یک معیار ساده هست که تقریباً همیشه جواب می‌دهد: <b>آیا این تصمیم برگشت‌پذیر است؟</b> اگر اشتباه از آب دربیاید، می‌شود در پنج دقیقه جبرانش کرد، یا نه؟</p>

    <table class="swap">
      <thead><tr><th>بگذار ماشین انجام دهد</th><th>خودت تصمیم بگیر</th></tr></thead>
      <tbody>
        <tr><td>پیش‌نویس نوشتن، خلاصه‌کردن، مرتب‌کردن</td>
            <td>منتشر کردن — هر چیزی که اسم تو رویش می‌رود</td></tr>
        <tr><td>پیشنهاد چند گزینه</td>
            <td>انتخاب بین آن گزینه‌ها</td></tr>
        <tr><td>پیدا کردن الگو در داده‌ای که خودت داده‌ای</td>
            <td>هر عدد یا تاریخی که قرار است جایی نوشته شود</td></tr>
        <tr><td>ترجمه و بازنویسی برای فهم خودت</td>
            <td>هر چیزی دربارهٔ آدم‌های واقعی — نام، ادعا، نسبت</td></tr>
        <tr><td>دسته‌بندی و برچسب‌زدن</td>
            <td>پول، قرارداد، سلامت، و هر چیز قانونی</td></tr>
      </tbody>
    </table>

    <div class="rule warn">
      <span class="tag warn">خط قرمز</span>
      <p>هیچ‌وقت آخرین حلقه‌ی زنجیره را «انتشار» نکن. آخرین حلقه همیشه باید <strong>نشان دادن به تو</strong> باشد. سیستمی که خودش منتشر می‌کند، سیستمی است که روزی چیزی منتشر می‌کند که نباید.</p>
    </div>

    <hr class="hr hr--cool" />

    <h2>نمونه‌ی طلایی: تنها راه فهمیدن اینکه رویه‌ات خراب شده</h2>
    <p class="intro">رویه‌ات را می‌نویسی، خوب کار می‌کند، خیالت راحت می‌شود. سه هفته بعد کیفیت افت کرده و تو متوجه نشده‌ای — چون هر بار فقط یک خروجی می‌بینی و مبنایی برای مقایسه نداری.</p>

    <p>راهش ساده است: <b>یک ورودی ثابت</b> انتخاب کن و <b>خروجی درستش</b> را یک جا ذخیره کن. هر وقت رویه را عوض کردی، اول همان ورودی ثابت را بزن و نتیجه را با نمونه مقایسه کن. اگر بدتر شده، تغییرت اشتباه بوده.</p>

    <div class="rule data">
      <span class="tag cool">در عمل</span>
      <p>یک فایل داشته باش با سه چیز: <strong>خودِ رویه</strong>، <strong>یک ورودی نمونه</strong>، و <strong>خروجی‌ای که قبولش داری</strong>. این کوچک‌ترین کاری است که یک کار دستی را به یک چیز قابل اتکا تبدیل می‌کند — و همان کاری است که تیم‌های حرفه‌ای هم دقیقاً همین‌طور انجامش می‌دهند.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="check-head">
      <h2>تمرین این هفته</h2>
      <span class="progress num" id="progress4">۰ از ۶</span>
    </div>
    <p class="intro">شش کار. تیک‌ها روی همین مرورگر می‌مانند.</p>
    <ul class="clist" id="clist4">
      <li><label><input type="checkbox" /><span>یک کار تکراری واقعی از هفته‌ام را با سنجه امتیاز دادم.</span></label></li>
      <li><label><input type="checkbox" /><span>برای همان کار، با رویه‌ساز یک رویه‌ی پنج‌تکه نوشتم.</span></label></li>
      <li><label><input type="checkbox" /><span>رویه را یک جای همیشگی ذخیره کردم که هفته‌ی بعد پیدایش کنم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک ورودی نمونه و خروجی قابل قبولش را کنار رویه نگه داشتم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک کار را به دو مرحله شکستم و خروجی اولی را ورودی دومی کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>در زنجیره‌ام مشخص کردم کدام نقطه باید حتماً از من بپرسد.</span></label></li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">بعد</span></div>
    <h2>در قسمت پنجم</h2>
    <p class="intro">قسمت پنجم آخرین قسمت بخش مبتدی است، و دربارهٔ چیزی است که همه‌ی چهار قسمت قبل را به هم وصل می‌کند: <b>کارِ خودت، نه تمرین</b>.</p>
    <ul>
      <li><b>سرهم کردن یک کارِ کامل</b> — از ایده تا خروجیِ منتشرشدنی، با همان رویه‌هایی که خودت نوشته‌ای.</li>
      <li><b>وقتی مدل عوض می‌شود</b> — چطور رویه‌ات را جوری بنویسی که با ابزار بعدی هم کار کند.</li>
      <li><b>اشتباه‌های رایجِ ماه اول</b> — آن‌هایی که تقریباً همه مرتکبشان می‌شوند، و علامتشان چیست.</li>
      <li><b>از اینجا به کجا</b> — راه پیشرفته، و اینکه چه چیزی واقعاً لازم است یاد بگیری.</li>
    </ul>
    <p>تا آن موقع، رویه‌ات را بنویس و یک هفته واقعاً استفاده‌اش کن. قسمت پنجم روی چیزی ساخته می‌شود که <em>خودت</em> ساخته باشی و یک هفته باهاش زندگی کرده باشی.</p>
  </div>
</section>

<section class="srcs">
  <div class="wrap">
    <h3>برای راستی‌آزمایی خودت</h3>
    <p>هر چه در این درس آمد، قاعده است نه قابلیت — ولی اگر خواستی همان‌ها را در مستندات رسمی ببینی:</p>
    <ul>
      <li>بخش <span class="en">prompt engineering</span> در مستندات OpenAI و Anthropic — هر دو فصلی دربارهٔ شکستن کار به مراحل دارند.</li>
      <li>برای ذخیره‌ی رویه: قابلیت‌های <span class="en">Projects</span> و <span class="en">Custom instructions</span> در همان ابزارها، که در <a href="ai-start.html">قسمت اول</a> معرفی‌شان کردیم.</li>
      <li>پیش‌نیازها: <a href="ai-prompting.html">قسمت دوم</a> برای شش تکه‌ی یک درخواست، و <a href="ai-image-sound.html">قسمت سوم</a> برای مرحله‌های تصویری و صوتی یک زنجیره.</li>
    </ul>
    <p>تاریخ نگارش: مرداد ۱۴۰۵. ساختار این درس کهنه نمی‌شود؛ نام قابلیت‌ها ممکن است عوض شود.</p>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="sig">
      <div>نوشته و تدریس: <b>محمد نویدی</b> — متخصص هوش مصنوعی کاربردی · استودیو نویدیکس</div>
      <div class="brand"><img class="mark" src="navidix-mark.png" alt="Navidix" width="26" height="26" /><span class="wordmark">NAVIDIX</span></div>
    </div>
      <p class="legal">© ۱۴۰۵ <b>استودیو نویدیکس</b> — تمام حقوق محفوظ است. متن، تصویر و ساختار این درس‌ها حاصل کار همین استودیوست؛ بازنشرشان با ذکر منبع آزاد است، فروششان نه.</p>
  </div>
</footer>

<nav class="pager"><a href="ai-image-sound.html"><small>قسمت پیش</small><b>تصویر و صدا: ساختن، خواندن، شنیدن</b></a><a href="prompts.html"><small>مرتبط</small><b>کتابخانه‌ی پرامپت فارسی — ۲۷ سبک</b></a><a href="training.html"><small>فهرست</small><b>همه‌ی قسمت‌های آموزش هوش مصنوعی کاربردی</b></a></nav>

</div>
</div>

<script>
var FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function fa(n){ return String(n).replace(/\\d/g, function(d){ return FA[+d]; }); }

/* ---- the scorer ----
   Frequency and duration multiply, because what a procedure saves is the
   product of the two; sameness and judgeability are the gates — a task that
   is different every time or whose output nobody can check cannot be handed
   over however often it comes round. */
(function(){
  var box = document.querySelector('.gauge');
  if (!box) return;
  var pick = {};
  var score = document.getElementById('g-score'),
      label = document.getElementById('g-label'),
      note  = document.getElementById('g-note'),
      out   = document.getElementById('g-out');

  [].forEach.call(box.querySelectorAll('.q'), function(q){
    var key = q.dataset.k;
    [].forEach.call(q.querySelectorAll('button'), function(b){
      b.addEventListener('click', function(){
        [].forEach.call(q.querySelectorAll('button'), function(o){
          o.setAttribute('aria-pressed', String(o === b));
        });
        pick[key] = +b.dataset.v;
        render();
      });
    });
  });

  function render(){
    var keys = ['freq','time','same','judge'], i;
    for (i = 0; i < keys.length; i++) if (pick[keys[i]] === undefined) return;

    var volume = pick.freq * pick.time;            /* 0 – 9  */
    var fit    = pick.same + pick.judge;           /* 0 – 6  */
    var total  = Math.round((volume / 9 * 60) + (fit / 6 * 40));

    out.className = 'verdict';
    score.textContent = fa(total);

    if (pick.same === 0){
      out.classList.add('hot');
      label.textContent = 'هنوز نه';
      note.textContent = 'کاری که هر بار شکلش فرق دارد، رویه برنمی‌دارد. اول ببین می‌توانی بخش ثابتش را جدا کنی — معمولاً یک تکه‌ی همیشگی داخلش هست. همان تکه را رویه کن، بقیه را دستی.';
    } else if (pick.judge === 0){
      out.classList.add('hot');
      label.textContent = 'خطرناک';
      note.textContent = 'اگر نمی‌توانی خودت خروجی را داوری کنی، خودکار کردنش یعنی اشتباه‌ها را سریع‌تر تولید کنی. این کار را دستی نگه دار تا وقتی معیارِ خوب‌بودن را پیدا کنی.';
    } else if (total >= 62){
      out.classList.add('go');
      label.textContent = 'همین امروز رویه‌اش را بنویس';
      note.textContent = 'این دقیقاً همان کاری است که این درس برایش نوشته شده. برو سراغ رویه‌ساز پایین همین صفحه و همین یکی را بنویس.';
    } else if (total >= 38){
      out.classList.add('warm');
      label.textContent = 'ارزشش را دارد';
      note.textContent = 'وقتی که برای ساختن رویه می‌گذاری، ظرف یکی دو ماه برمی‌گردد. اگر امروز فرصت نداری، اسمش را یادداشت کن و هفته‌ی بعد بنویسش.';
    } else {
      out.classList.add('warm');
      label.textContent = 'فعلاً دستی انجامش بده';
      note.textContent = 'به اندازه‌ای تکرار نمی‌شود که هزینه‌ی ساختن رویه را برگرداند. یک کار پرتکرارتر پیدا کن — همان که هر روز حوصله‌ات را می‌برد.';
    }
  }
})();

/* ---- the procedure builder ---- */
(function(){
  var out = document.getElementById('s-out');
  if (!out) return;
  var F = ['role','input','steps','format','tone','limits'].reduce(function(o,k){
    o[k] = document.getElementById('s-' + k); return o;
  }, {});
  var ph = function(t){ return '<span class="ph">' + t + '</span>'; };

  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function build(){
    var v = {}, k;
    for (k in F) v[k] = (F[k].value || '').trim();

    var L = [];
    L.push('# نقش');
    L.push(v.role ? '<b>' + esc(v.role) + '</b>' : ph('[یک جمله: تو چه کسی هستی و این کار برای چیست]'));
    L.push('');
    L.push('# مراحل');
    if (v.steps){
      v.steps.split('\\n').filter(function(s){ return s.trim(); })
        .forEach(function(s, i){ L.push('<b>' + fa(i + 1) + '. ' + esc(s.trim()) + '</b>'); });
    } else {
      L.push(ph('[هر خط یک مرحله]'));
    }
    L.push('');
    L.push('# قالب خروجی');
    L.push(v.format ? '<b>' + esc(v.format) + '</b>' : ph('[چند بند، چه بخش‌هایی، چه طولی]'));
    if (v.tone) L.push('<b>لحن: ' + esc(v.tone) + '</b>');
    L.push('');
    L.push('# مرزها');
    L.push(v.limits ? '<b>' + esc(v.limits) + '</b>' : ph('[چه کاری نکند]'));
    L.push('<b>اگر اطلاعات کافی نبود، بپرس؛ حدس نزن.</b>');
    L.push('');
    L.push('# ' + (v.input ? '<b>' + esc(v.input) + '</b>' : ph('[اسم ورودی]')));
    L.push(ph('«««'));
    L.push(ph('اینجا هر بار ورودی تازه را بگذار'));
    L.push(ph('»»»'));

    out.innerHTML = L.join('\\n');
  }
  Object.keys(F).forEach(function(k){
    F[k].addEventListener('input', build);
    F[k].addEventListener('change', build);
  });
  build();
})();

/* ---- the chain ---- */
(function(){
  var tabs = document.getElementById('c-tabs'), pane = document.getElementById('c-step');
  if (!tabs || !pane) return;

  var STEPS = [
    { h:'حلقه ۱ — پیاده‌سازی',
      in:'فایل صوتی مستند، ۲۲ دقیقه',
      out:'متن کامل گفتار، با زمان',
      p:'ساده‌ترین حلقه، و همان که در قسمت سوم یاد گرفتی. هیچ تصمیمی اینجا گرفته نمی‌شود — فقط صدا به متن تبدیل می‌شود. برای همین می‌شود کاملاً به ماشین سپردش.',
      human:null },
    { h:'حلقه ۲ — استخراج',
      in:'متن کامل گفتار',
      out:'پنج ادعای اصلی، هر کدام با شماره‌ی دقیقه',
      p:'اینجا اولین جایی است که مدل باید انتخاب کند. خواستنِ شماره‌ی دقیقه یک ترفند عمدی است: مدل را وادار می‌کند هر ادعا را به یک نقطه‌ی مشخص از متن وصل کند، و تو می‌توانی در ده ثانیه راستی‌آزمایی‌اش کنی.',
      human:'اینجا خروجی را نگاه کن. اگر ادعایی در آن دقیقه نبود، مدل ساخته است — و بقیه‌ی زنجیره روی همان می‌سازد.' },
    { h:'حلقه ۳ — نوشتن',
      in:'پنج ادعای تأییدشده',
      out:'پیش‌نویس پست، زیر ۱۲۰ کلمه',
      p:'حالا که ورودی تمیز است، این حلقه فقط یک کار می‌کند: بازنویسی برای مخاطب. توجه کن که متن اصلی ۲۲ دقیقه‌ای دیگر اینجا نیست — و همین باعث می‌شود مدل نتواند چیز تازه‌ای از آن دربیاورد.',
      human:null },
    { h:'حلقه ۴ — بازبینی',
      in:'پیش‌نویس پست',
      out:'همان متن، با نکته‌های مشکوک علامت‌خورده',
      p:'آخرین حلقه انتشار نیست — بازبینی است. از مدل بخواه هر جمله‌ای را که در ورودی پشتوانه ندارد علامت بزند. مدل در نقد کارِ خودش بهتر از تولیدِ بی‌خطاست.',
      human:'و بعد تو می‌خوانی و منتشر می‌کنی. این حلقه هیچ‌وقت خودکار نمی‌شود.' }
  ];

  function show(i){
    var s = STEPS[i];
    pane.innerHTML =
      '<h4>' + s.h + '</h4>' +
      '<div class="io"><div><b>ورودی</b><span>' + s.in + '</span></div>' +
      '<div class="out"><b>خروجی</b><span>' + s.out + '</span></div></div>' +
      '<p>' + s.p + '</p>' +
      (s.human ? '<p class="human">↳ ' + s.human + '</p>' : '');
    [].forEach.call(tabs.querySelectorAll('button'), function(b){
      b.setAttribute('aria-pressed', String(+b.dataset.i === i));
    });
  }
  [].forEach.call(tabs.querySelectorAll('button'), function(b){
    b.addEventListener('click', function(){ show(+b.dataset.i); });
  });
  show(0);
})();

/* ---- copy, without the markup ---- */
(function(){
  [].forEach.call(document.querySelectorAll('.pcopy'), function(btn){
    btn.addEventListener('click', function(){
      var pre = document.getElementById(btn.dataset.for);
      if (!pre) return;
      var text = pre.innerText;
      var done = function(){
        var old = btn.textContent;
        btn.textContent = 'کپی شد'; btn.classList.add('done');
        setTimeout(function(){ btn.textContent = old; btn.classList.remove('done'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done, function(){});
      } else {
        var t = document.createElement('textarea');
        t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch(e){}
        document.body.removeChild(t);
      }
    });
  });
})();

/* ---- the checklist, remembered on this browser ---- */
(function(){
  var list = document.getElementById('clist4'), out = document.getElementById('progress4');
  if (!list || !out) return;
  var boxes = [].slice.call(list.querySelectorAll('input'));
  var KEY = 'nvx-systems-week';
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    boxes.forEach(function(b, i){ b.checked = !!saved[i]; });
  } catch(e){}
  function paint(){
    var n = boxes.filter(function(b){ return b.checked; }).length;
    out.textContent = fa(n) + ' از ' + fa(boxes.length);
    try { localStorage.setItem(KEY, JSON.stringify(boxes.map(function(b){ return b.checked; }))); } catch(e){}
  }
  boxes.forEach(function(b){ b.addEventListener('change', paint); });
  paint();
})();
</script>
</body>
</html>
'''

open(OUT, 'w', encoding='utf-8').write(head + BODY)
print('wrote', OUT)
