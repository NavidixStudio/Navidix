# -*- coding: utf-8 -*-
"""Builds ai-start.html — the beginners' first episode — on brand-content's
shell, so every lesson on the site looks like it came from the same hand."""

SRC  = '/home/user/Navidix/brand-content.html'
OUT  = '/home/user/Navidix/ai-start.html'
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
style = '\n'.join(src[_i:_j])   # by marker, not by line number

TITLE = 'از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی | آموزش هوش مصنوعی کاربردی — قسمت ۱'
DESC  = ('راهنمای کاملاً مبتدی هوش مصنوعی به فارسی: هوش مصنوعی واقعاً چیست و چه نیست، کدام ابزار را '
         'انتخاب کنی، چت‌جی‌پی‌تی و کلود و جمینای و نوت‌بوک‌ال‌ام چه فرقی دارند، چه چیزی رایگان است، '
         'و چطور هوش مصنوعی را با رشته و کار خودت ترکیب کنی. رایگان، از استودیو نویدیکس.')
URL   = BASE + 'ai-start.html'
IMG   = BASE + 'og-start.png'

LD = ('{"@context":"https://schema.org","@type":"LearningResource","name":"از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی",'
      '"description":"راهنمای مبتدی هوش مصنوعی به فارسی: انتخاب ابزار، تفاوت مدل‌ها، هزینه‌ها، و ترکیب هوش مصنوعی با رشته‌ی خودت.",'
      '"inLanguage":"fa-IR","isAccessibleForFree":true,"educationalLevel":"beginner",'
      '"learningResourceType":"درس","teaches":"استفاده‌ی کاربردی از هوش مصنوعی برای افراد مبتدی",'
      '"datePublished":"2026-08-10","author":{"@type":"Person","name":"محمد نویدی","jobTitle":"متخصص هوش مصنوعی کاربردی"},'
      '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"},'
      '"isPartOf":{"@type":"Course","name":"آموزش هوش مصنوعی کاربردی"},'
      '"mainEntityOfPage":{"@type":"WebPage","@id":"' + URL + '"},"position":1}')

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
<meta property="og:title" content="از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی" />
<meta property="og:description" content="{DESC}" />
<meta property="og:url" content="{URL}" />
<meta property="og:image" content="{IMG}" />
<meta property="og:image:secure_url" content="{IMG}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی" />
<meta name="twitter:description" content="{DESC}" />
<meta name="twitter:image" content="{IMG}" />
<meta name="twitter:image:alt" content="از کجا شروع کنم؟ راهنمای صفرِ صفر هوش مصنوعی" />
{head_assets}
<link rel="stylesheet" href="nvx-training.css" />
<script src="nvx-ui.js" defer></script>
<script src="nvx-training.js" defer></script>
<script src="curriculum.js" defer></script>
<script src="nvx-config.js" defer></script>
<script src="nvx-progress.js" defer></script>
<script src="nvx-auth.js" defer></script>
<script type="application/ld+json">
{LD}
</script>
{style}
/* ---- the field chooser: the one decision this episode is built around ---- */
.lesson .picker{{ display:flex; flex-wrap:wrap; gap:8px; margin:22px 0 24px; }}
.lesson .picker button{{
  appearance:none; cursor:pointer; font-family:var(--f-fa,inherit); font-size:13.5px;
  padding:9px 15px; border-radius:100px; line-height:1.7;
  color:var(--bone-dim); background:var(--ink-2); border:1px solid var(--line);
  transition:color .35s ease, border-color .35s ease, background .35s ease, transform .35s ease;
}}
.lesson .picker button:hover{{ color:var(--bone); border-color:#4A5A68; transform:translateY(-1px); }}
.lesson .picker button[aria-pressed="true"]{{
  color:#08090B; background:var(--amber); border-color:var(--amber); font-weight:600;
}}
.lesson .picker button:focus-visible{{ outline:1px solid var(--teal); outline-offset:3px; }}
.lesson .answer{{
  border:1px solid var(--line); border-inline-start:2px solid var(--amber);
  border-radius:4px; background:var(--ink-2); padding:22px 24px; min-height:120px;
}}
.lesson .answer h3{{ color:var(--amber); margin:0 0 10px; font-size:16px; }}
.lesson .answer p{{ margin:0 0 10px; }}
.lesson .answer p:last-child{{ margin-bottom:0; }}
.lesson .answer .muted{{ color:var(--bone-dim); font-size:13.5px; }}

/* ---- a prompt you can take away ---- */
.lesson .pbox{{ position:relative; border:1px solid var(--line); border-radius:4px;
  background:#0B0E12; padding:18px 20px 46px; margin:18px 0 8px; }}
.lesson .pbox pre{{ margin:0; white-space:pre-wrap; word-break:break-word; direction:ltr; text-align:left;
  font-family:var(--mono); font-size:12.5px; line-height:2; color:#CBD5E1; }}
.lesson .pbox pre b{{ color:var(--amber); font-weight:400; }}
.lesson .pcopy{{ position:absolute; inset-inline-end:10px; bottom:10px; cursor:pointer;
  font-family:inherit; font-size:12px; padding:6px 13px; border-radius:100px;
  color:var(--bone-dim); background:transparent; border:1px solid var(--line);
  transition:background .3s ease, color .3s ease, border-color .3s ease; }}
.lesson .pcopy:hover{{ background:var(--amber); border-color:var(--amber); color:#08090B; }}
.lesson .pcopy.done{{ background:#1B7A4B; border-color:#1B7A4B; color:#fff; }}

/* ---- the lie-spotting exercise ---- */
.lesson .quiz{{ display:grid; gap:1px; background:var(--line); border:1px solid var(--line);
  border-radius:4px; overflow:hidden; margin:20px 0 10px; }}
.lesson .quiz button{{ appearance:none; cursor:pointer; text-align:start; font-family:inherit;
  font-size:14.5px; line-height:1.95; padding:15px 20px; color:var(--bone);
  background:var(--ink-2); border:0; transition:background .3s ease; }}
.lesson .quiz button:hover{{ background:#171C22; }}
.lesson .quiz button.right{{ background:rgba(27,122,75,.18); color:#8FE3B4; }}
.lesson .quiz button.wrong{{ background:rgba(227,32,42,.14); color:#FFB4AE; }}
.lesson .verdict{{ font-size:14px; color:var(--bone-dim); line-height:2; min-height:34px; }}
@media (max-width:700px){{
  .lesson .picker button{{ font-size:12.5px; padding:8px 13px; }}
  .lesson .answer{{ padding:18px 18px; }}
}}
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
    <div class="eyebrow">شروع از صفر · قسمت اول</div>
    <h1>از کجا شروع کنم؟ <em>راهنمای</em> صفرِ صفر</h1>
    <p class="lede">این درس برای کسی نوشته شده که تا حالا هیچ کاری با هوش مصنوعی نکرده. لازم نیست برنامه‌نویس باشی، لازم نیست انگلیسی بلد باشی، لازم نیست چیزی نصب کنی. فقط یک مرورگر لازم داری و بیست دقیقه وقت.</p>
    <p class="lede">تا آخر همین صفحه سه چیز را می‌دانی: اینکه این ابزار واقعاً چه هست و چه نیست، اینکه از بین ده‌ها ابزار کدام یکی مالِ توست، و اینکه امشب دقیقاً چه کاری با آن بکنی که به درد کار و درس خودت بخورد.</p>
    <img class="hex-wm" src="navidix-mark.png" alt="" aria-hidden="true" />

    <figure class="nvx-hero" data-nvx-zoom>
      <picture>
        <source srcset="lessons/ai-start.webp" type="image/webp" />
        <img src="lessons/ai-start.jpg" alt="میز کاری تاریک با یک چراغ‌مطالعه و لپ‌تاپ بسته، و نور سرخی که از درگاهی پشت سر می‌تابد" width="1600" height="685" decoding="async" />
      </picture>
    </figure>
  </div>
</section>

<section class="stats">
  <div class="wrap">
    <div class="stat"><span class="v num">۲۰</span><span class="k">دقیقه تا اولین نتیجه‌ی واقعی</span></div>
    <div class="stat"><span class="v num">۱</span><span class="k">ابزار، نه ده‌تا</span></div>
    <div class="stat"><span class="v num">۰</span><span class="k">تومان برای شروع</span></div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۱</span></div>
    <h2>یک تصور غلط، سرِ راه همه را می‌گیرد</h2>
    <p class="intro">بیشتر کسانی که از هوش مصنوعی ناامید می‌شوند، مشکلشان بلد نبودنِ ابزار نیست. تصویری از این ابزار در ذهنشان است که با واقعیتش جور در نمی‌آید — و بر اساس همان تصویر، سوالی می‌پرسند که جوابِ خوبی ندارد.</p>

    <p>سه تصور رایج، و هر سه اشتباه‌اند:</p>

    <table class="swap">
      <thead><tr><th>تصور غلط</th><th>چرا خراب می‌کند</th></tr></thead>
      <tbody>
        <tr>
          <td>«مثل گوگل است»<span class="en">a search engine</span></td>
          <td>گوگل چیزی را <b>پیدا</b> می‌کند که یک نفر قبلاً نوشته. این ابزار جواب را همان لحظه <b>می‌سازد</b>. برای همین می‌تواند چیزی بسازد که اصلاً وجود ندارد.</td>
        </tr>
        <tr>
          <td>«جادوست، هر چه بخواهم می‌دهد»<span class="en">a genie</span></td>
          <td>کیفیت جوابش تقریباً برابر است با کیفیت صورت‌مسئله‌ات. سوال مبهم بدهی، جواب مبهم می‌گیری — و بعد فکر می‌کنی ابزار ضعیف است.</td>
        </tr>
        <tr>
          <td>«دانای کل است، پس راست می‌گوید»<span class="en">an oracle</span></td>
          <td>خطرناک‌ترین تصور. این ابزار طوری ساخته شده که <b>محتمل‌ترین</b> جمله را بنویسد، نه لزوماً <b>درست‌ترین</b> را. و وقتی نمی‌داند، با همان اعتماد‌به‌نفس جواب می‌دهد.</td>
        </tr>
      </tbody>
    </table>

    <p>حالا تصور درست: <b>یک همکار بسیار کتاب‌خوانده که تقریباً همه‌چیز خوانده، خیلی سریع می‌نویسد، خستگی ندارد — و هیچ‌وقت نمی‌گوید «نمی‌دانم».</b></p>

    <p>همه‌ی مهارتی که در این دوره یاد می‌گیری، از همین یک جمله بیرون می‌آید. با یک همکار این‌شکلی چطور کار می‌کنی؟ کارَت را روشن توضیح می‌دهی، بهش زمینه می‌دهی، و <b>کارش را چک می‌کنی</b>. دقیقاً همین.</p>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>هر چیزی که مدل به تو می‌گوید، تا وقتی خودت راستی‌آزمایی نکرده‌ای، در حد <strong>یک پیش‌نویس خوب</strong> است — نه یک واقعیت. این جمله را تا آخر دوره فراموش نکن.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۲</span></div>
    <h2>تنها تصمیمی که امشب باید بگیری</h2>
    <p class="intro">شایع‌ترین دلیلِ اینکه یک نفر بعد از شش ماه هنوز مبتدی است، این نیست که کم تلاش کرده. این است که <b>هر هفته ابزارش را عوض کرده</b>.</p>

    <p>هر روز یک ابزار جدید معرفی می‌شود و هر کانالی می‌گوید «این یکی همه‌چیز را عوض کرد». نتیجه‌اش برای یک مبتدی این است: ده‌تا حساب باز می‌کند، با هیچ‌کدام بیشتر از دو روز کار نمی‌کند، و هیچ‌وقت از سطحِ «سلام، یک متن برایم بنویس» بالاتر نمی‌رود.</p>

    <p>مهارتِ واقعی در هوش مصنوعی، بلد بودنِ <em>ابزارها</em> نیست. بلد بودنِ <em>گفت‌وگو</em> است — اینکه چطور صورت‌مسئله بدهی، چطور اصلاح کنی، چطور بفهمی کِی دارد اشتباه می‌کند. و این مهارت <b>منتقل می‌شود</b>: اگر با یکی خوب بشوی، بقیه را در یک بعدازظهر یاد می‌گیری.</p>

    <div class="rule warn">
      <span class="tag warn">مهم‌ترین اشتباه</span>
      <p>یک ابزار انتخاب کن و <strong>سی روز</strong> با همان بمان. در این سی روز حتی اگر ابزار جدیدی معرفی شد، بازش نکن. این تنها کاری است که تفاوت بین «کسی که با هوش مصنوعی ور می‌رود» و «کسی که با هوش مصنوعی کار می‌کند» را می‌سازد.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۳</span></div>
    <h2>نقشه‌ی صادقانه‌ی ابزارها</h2>
    <p class="intro">ده‌ها ابزار هست. برای یک مبتدی، عملاً <b>چهارتا</b> اهمیت دارد. بقیه یا همین‌ها را با نام دیگر تکرار می‌کنند، یا برای کارِ تخصصی‌اند که تو هنوز به آن نرسیده‌ای.</p>

    <table class="swap">
      <thead><tr><th>ابزار</th><th>در چه چیزی واقعاً خوب است</th><th>مناسبِ چه کسی</th></tr></thead>
      <tbody>
        <tr>
          <td><b>ChatGPT</b><span class="en">OpenAI</span></td>
          <td>همه‌فن‌حریفِ خوب. تولید تصویر، تحلیل فایل، جست‌وجوی وب و صحبت صوتی همه در یک جا. بیشترین آموزش فارسی هم برای همین هست.</td>
          <td>اگر نمی‌دانی کدام را بگیری، این را بگیر. کمترین احتمالِ گیر کردن.</td>
        </tr>
        <tr>
          <td><b>Claude</b><span class="en">Anthropic</span></td>
          <td>متن‌های بلند و کارِ فکری. نوشتن، بازنویسی، خلاصه‌کردنِ سندهای طولانی، و کد. لحن نوشتاری‌اش طبیعی‌تر است و کمتر شلوغ می‌نویسد.</td>
          <td>کسی که کارش با <b>نوشتن</b> یا <b>سند</b> است: حقوق، پژوهش، ترجمه، محتوا، برنامه‌نویسی.</td>
        </tr>
        <tr>
          <td><b>Gemini</b><span class="en">Google</span></td>
          <td>چسبیدن به اکوسیستم گوگل — جیمیل، داکس، شیتس، درایو، یوتیوب. اگر کارَت آنجاست، همان‌جا جواب می‌دهد.</td>
          <td>کسی که همه‌ی فایل‌ها و ایمیل‌هایش در گوگل است و نمی‌خواهد جابه‌جا کند.</td>
        </tr>
        <tr>
          <td><b>NotebookLM</b><span class="en">Google</span></td>
          <td>این یکی فرق دارد و کمتر کسی جدی‌اش می‌گیرد: فقط روی <b>سندهایی که خودت آپلود می‌کنی</b> کار می‌کند و جواب‌هایش را به همان صفحه‌ها ارجاع می‌دهد. یعنی احتمال از خود درآوردن به‌شدت کم می‌شود.</td>
          <td>دانشجو، پژوهشگر، وکیل، پزشک، هر کسی که با جزوه و مقاله و قرارداد سر و کار دارد.</td>
        </tr>
      </tbody>
    </table>

    <p><b>بقیه‌شان چه؟</b> Perplexity برای جست‌وجوی منبع‌دار خوب است، Copilot همان موتور مایکروسافت داخل آفیس است، DeepSeek و Grok و Mistral هم هستند. هیچ‌کدام برای شروع لازم نیستند. اسم‌شان را بدان، سراغ‌شان نرو.</p>

    <div class="rule data">
      <span class="tag cool">راستی‌آزمایی</span>
      <p>هر جمله‌ای که در اینترنت می‌خوانی — از جمله همین صفحه — تاریخ مصرف دارد. این ابزارها هر چند ماه عوض می‌شوند و اسم‌ها جابه‌جا می‌شود. <strong>قابلیت‌ها را در سایت رسمی خودشان چک کن</strong>، نه در ویدیوی یک سال پیش.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۴</span></div>
    <h2>پول: چه چیزی رایگان است و کِی باید پول بدهی</h2>
    <p class="intro">جواب کوتاه برای امشب: <b>هیچی</b>. برای پنج قسمت اولِ این دوره، نسخه‌ی رایگان کافی است و این را جدی می‌گویم، نه برای دلخوشی.</p>

    <p>هر چهار ابزارِ بالا نسخه‌ی رایگان دارند. نسخه‌ی رایگان معمولاً یعنی: مدلِ کمی ضعیف‌تر، سقفِ تعداد پیام در روز، و گاهی نبودِ چند قابلیت جانبی. برای کسی که تازه شروع کرده، هیچ‌کدام این‌ها مانع نیست — چون گلوگاهِ تو الان <b>مهارتِ پرسیدن</b> است، نه قدرتِ مدل.</p>

    <p>نسخه‌های پولی این‌ها معمولاً حول <b>۲۰ دلار در ماه</b> قیمت می‌خورند. سه نکته‌ی صادقانه دربارهٔ این عدد:</p>

    <ul>
      <li><b>قیمت‌ها مدام عوض می‌شوند.</b> عددی که اینجا نوشته‌ام تقریبی است و تاریخ نگارش این درس مرداد ۱۴۰۵ است. قبل از هر تصمیمی، صفحه‌ی قیمتِ خودِ سرویس را باز کن.</li>
      <li><b>پرداخت از ایران مستقیم ممکن نیست.</b> این سرویس‌ها کارت بانکی ایرانی را نمی‌پذیرند. این واقعیت را همین اول بگویم تا وقتت را سرِ تلاش برای خرید هدر ندهی.</li>
      <li><b>وقتی پول بده که به سقف خورده باشی.</b> یعنی وقتی روزی چند بار پیغام «امروز به حد مجاز رسیدی» بگیری، یا کاری داشته باشی که فقط نسخه‌ی پولی انجامش می‌دهد. تا آن روز، پول دادن فقط هزینه است، نه سرمایه‌گذاری.</li>
    </ul>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>اگر ماهی بیست دلار برایت پول کمی نیست، این معیار را بگذار: <strong>تا وقتی هوش مصنوعی برایت درآمد یا صرفه‌جویی زمانی ماهانه‌ی بیشتر از قیمتش نساخته، رایگان بمان.</strong> این معیار برای هر ابزاری در زندگی‌ات کار می‌کند، نه فقط این.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۵</span></div>
    <h2>رشته‌ی خودت را بزن</h2>
    <p class="intro">اینجا جایی است که بیشترِ آموزش‌ها شکست می‌خورند: کلی‌گویی می‌کنند. رشته‌ات را انتخاب کن تا دقیقاً بگویم کدام ابزار، و اولین کارِ واقعی‌ات چیست.</p>

    <div class="picker" id="picker" role="group" aria-label="انتخاب رشته یا حوزه‌ی کاری"></div>
    <div class="answer" id="answer" aria-live="polite">
      <h3>یکی را انتخاب کن</h3>
      <p class="muted">اگر رشته‌ات دقیقاً در فهرست نیست، نزدیک‌ترین را بزن — منطقش یکی است.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۶</span></div>
    <h2>اولین کار واقعی، همین امشب</h2>
    <p class="intro">خواندن این صفحه هیچ مهارتی به تو نمی‌دهد. بیست دقیقه کار کردن می‌دهد. این تمرین را همین حالا انجام بده.</p>

    <p>اشتباهِ همه‌ی مبتدی‌ها این است که می‌نویسند «یک متن درباره‌ی فلان بنویس» و بعد از جوابِ بی‌روحی که می‌گیرند ناامید می‌شوند. یک درخواستِ خوب <b>چهار تکه</b> دارد. این قالب را بردار و جای پرانتزها را پر کن:</p>

    <div class="pbox">
      <pre id="p1">تو یک <b>[نقش: مثلاً مشاور پایان‌نامه / مدیر فروش / سردبیر]</b> باتجربه هستی.

زمینه: <b>[من که هستم، چه کار می‌کنم، این کار برای چه کسی است]</b>

کار: <b>[دقیقاً چه می‌خواهی — یک جمله‌ی روشن]</b>

قالب خروجی: <b>[چند بند؟ فهرست یا متن؟ چه لحنی؟ چقدر بلند؟]</b>

اگر چیزی از زمینه برایت مبهم است، اول از من بپرس و بعد شروع کن.</pre>
      <button class="pcopy" type="button" data-for="p1">کپی قالب</button>
    </div>

    <p>آن جمله‌ی آخر مهم‌ترین تکه است و تقریباً هیچ‌کس نمی‌نویسدش. با همان یک خط، ابزار به‌جای حدس زدن، از تو سوال می‌پرسد — و همین یک تفاوت، کیفیت جواب را زیر و رو می‌کند.</p>

    <p>حالا یک قدم جلوتر. جوابِ اول را که گرفتی، <b>تمامش نکن</b>. این سه جمله را پشت سر هم بفرست و ببین چه اتفاقی می‌افتد:</p>

    <div class="pbox">
      <pre id="p2">۱. «این را برای <b>[مخاطب واقعی‌ات]</b> بازنویسی کن، ساده‌تر.»

۲. «سه جای این متن که ضعیف است را خودت پیدا کن و بگو چرا.»

۳. «حالا همان سه جا را درست کن.»</pre>
      <button class="pcopy" type="button" data-for="p2">کپی</button>
    </div>

    <p>این حلقه‌ی سه‌مرحله‌ای — <b>بساز، نقد کن، اصلاح کن</b> — تفاوت بین خروجیِ متوسط و خروجیِ قابل‌استفاده است. و کل هزینه‌اش سه جمله است.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۷</span></div>
    <h2>مهم‌ترین مهارت: بفهمی کِی دارد اشتباه می‌گوید</h2>
    <p class="intro">به این پدیده می‌گویند <b>توهم</b> — وقتی مدل چیزی را با اطمینان کامل می‌گوید که اصلاً وجود ندارد. این یک باگ نیست که روزی رفع شود؛ از طرزِ کارِ این ابزار می‌آید. پس مهارتِ تشخیصش، مهارتِ توست.</p>

    <p>یک تمرین کوچک. فرض کن از مدل پرسیده‌ای «منبعی برای فلان موضوع بده». کدام یکی از این سه جواب بیشتر از همه باید نگرانت کند؟</p>

    <div class="quiz" id="quiz">
      <button type="button" data-ok="0">«مطمئن نیستم؛ چند کتاب در این حوزه هست ولی بهتر است خودت در کتابخانه چک کنی.»</button>
      <button type="button" data-ok="0">«این موضوع خارج از چیزی است که با اطمینان می‌دانم.»</button>
      <button type="button" data-ok="1">«حتماً — کتاب <i>روش‌شناسی کاربردی</i>، نوشته‌ی دکتر احمدی، انتشارات دانشگاه تهران، ۱۳۹۸، صفحه‌ی ۱۴۲.»</button>
    </div>
    <p class="verdict" id="verdict"></p>

    <p>سه علامت هشدار که باید حفظ کنی:</p>
    <ul>
      <li><b>عدد و تاریخ و آمار.</b> دقیق‌ترین‌شان مشکوک‌ترین‌اند. «۶۷ درصد» را باور نکن تا منبعش را نبینی.</li>
      <li><b>ارجاع و منبع.</b> نام کتاب و مقاله و شماره‌ی صفحه از جاهایی است که مدل‌ها راحت‌تر از هر چیز از خودشان می‌سازند. همیشه جست‌وجو کن که آن منبع اصلاً وجود دارد.</li>
      <li><b>هر چیزی که به تو ضرر مالی، حقوقی یا پزشکی می‌زند.</b> اینجا اصلاً به تنهایی به مدل تکیه نکن. مدل برای پیش‌نویس خوب است، برای تصمیم نه.</li>
    </ul>

    <div class="rule warn">
      <span class="tag warn">قاعده</span>
      <p>یک سوال ساده قبل از استفاده از هر جوابی از خودت بپرس: <strong>«اگر این غلط باشد، چه چیزی را از دست می‌دهم؟»</strong> اگر جواب «هیچی» است، استفاده کن. اگر جواب «آبرو، پول یا سلامتی» است، برو راستی‌آزمایی کن.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۸</span></div>
    <div class="check-head">
      <h2>قانون سی روز</h2>
      <span class="progress num" id="progress1">۰ از ۸</span>
    </div>
    <p class="intro">این فهرست را تیک بزن. هر تیک، یک عادت است — و مجموعشان همان چیزی است که در سی روز از تو یک کاربرِ واقعی می‌سازد. تیک‌ها روی همین مرورگر ذخیره می‌شوند.</p>

    <ul class="clist" id="clist1">
      <li><label><input type="checkbox" /><span>یک ابزار انتخاب کردم و تصمیم گرفتم سی روز عوضش نکنم.</span></label></li>
      <li><label><input type="checkbox" /><span>حساب رایگان ساختم و اولین گفت‌وگو را انجام دادم.</span></label></li>
      <li><label><input type="checkbox" /><span>قالب چهارتکه‌ای (نقش، زمینه، کار، قالب خروجی) را روی یک کار واقعیِ خودم امتحان کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>حلقه‌ی «بساز، نقد کن، اصلاح کن» را دست‌کم یک بار کامل اجرا کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک جواب را عمداً راستی‌آزمایی کردم و دیدم درست بود یا غلط.</span></label></li>
      <li><label><input type="checkbox" /><span>یک کارِ تکراری در هفته‌ام پیدا کردم که می‌شود به این ابزار سپرد.</span></label></li>
      <li><label><input type="checkbox" /><span>پرامپت‌هایی که خوب جواب دادند را یک جا ذخیره کردم تا دوباره بنویسمشان.</span></label></li>
      <li><label><input type="checkbox" /><span>سی روز تمام شد و هنوز با همان یک ابزار کار می‌کنم.</span></label></li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">بعد</span></div>
    <h2>در قسمت دوم</h2>
    <p class="intro">حالا که ابزارت را انتخاب کرده‌ای و بلدی صورت‌مسئله بدهی، می‌رویم سراغ چیزی که واقعاً زندگی کاری‌ات را عوض می‌کند.</p>
    <ul>
      <li><b>آناتومی یک پرامپت خوب</b> — از قالب چهارتکه‌ای تا الگوهایی که در کار واقعی جواب می‌دهند.</li>
      <li><b>کار با فایل‌های خودت</b> — جزوه، قرارداد، مقاله، صورت‌حساب. اینجاست که NotebookLM معنا پیدا می‌کند.</li>
      <li><b>ساختن یک دستیار برای شغل خودت</b> — یک بار تنظیمش کنی، هر روز ازش استفاده کنی.</li>
      <li><b>مرزها</b> — چه کارهایی را هرگز نباید به هوش مصنوعی بسپاری، و چرا.</li>
    </ul>
    <p>تا آن موقع، سی روزت را شروع کن. جدی می‌گویم — بدون آن سی روز، قسمت دوم فقط یک متن دیگر است که خوانده‌ای.</p>
  </div>
</section>

<section class="srcs">
  <div class="wrap">
    <h3>برای راستی‌آزمایی خودت</h3>
    <p>عمداً به ویدیو و مقاله‌ی دست‌دوم ارجاع نمی‌دهم. قیمت‌ها و قابلیت‌ها را از سایت رسمی هر سرویس بخوان، چون فقط آنجا به‌روز است:</p>
    <ul>
      <li>OpenAI — <span class="en">openai.com/chatgpt/pricing</span> (قیمت و تفاوت نسخه‌ها)</li>
      <li>Anthropic — <span class="en">claude.com/pricing</span> (قیمت و سقف استفاده)</li>
      <li>Google — <span class="en">gemini.google.com</span> و <span class="en">notebooklm.google.com</span></li>
      <li>برای فهمیدن پدیده‌ی توهم: مستندات خودِ سازنده‌ها بخش <span class="en">limitations</span> را بخوان — هر سه شرکت صریح دربارهٔ آن نوشته‌اند.</li>
    </ul>
    <p>تاریخ نگارش این درس: مرداد ۱۴۰۵. اگر ماه‌ها بعد این را می‌خوانی، ساختار درس هنوز درست است، ولی اعداد را خودت چک کن.</p>
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

<nav class="pager"><a href="training.html"><small>فهرست</small><b>همه‌ی قسمت‌های آموزش هوش مصنوعی کاربردی</b></a><a href="prompts.html"><small>مرتبط</small><b>کتابخانه‌ی پرامپت فارسی</b></a></nav>

</div>
</div>

<script>
/* ---------------------------------------------------------------
   The field chooser. Everything is data — adding a field is one
   entry, and the copy stays in one place instead of in the markup.
   --------------------------------------------------------------- */
(function(){
  var FIELDS = [
    { id:'student', label:'دانشجو / دانش‌آموز', tool:'NotebookLM + یکی از سه‌تای دیگر',
      why:'جزوه و مقاله و کتابِ درسی‌ات را در NotebookLM آپلود کن. جوابش را به همان صفحه ارجاع می‌دهد، پس هم یاد می‌گیری هم مطمئنی از خودش درنیاورده.',
      task:'جزوه‌ی سخت‌ترین درس این ترمت را آپلود کن و بگو: «از این جزوه ده سوال امتحانی بساز و جواب هرکدام را با ذکر صفحه بده.»' },
    { id:'teacher', label:'معلم / مدرس', tool:'ChatGPT یا Claude',
      why:'بیشترِ وقتِ یک معلم صرف کارهای تکراری می‌شود: طرح درس، نمونه‌سوال، بازخورد. همین‌ها دقیقاً کاری است که این ابزار خوب انجام می‌دهد.',
      task:'بگو: «برای یک جلسه‌ی ۹۰ دقیقه‌ای دربارهٔ [موضوع] برای [رده‌ی سنی]، طرح درس بده با یک فعالیت گروهی و سه سوال سنجش.»' },
    { id:'writer', label:'نویسنده / محتوا / ترجمه', tool:'Claude',
      why:'برای متن بلند و لحن، خروجی‌اش طبیعی‌تر است و کمتر پرگویی می‌کند. برای ویرایش و بازنویسی هم بهتر گوش می‌دهد.',
      task:'یک متن قدیمی خودت را بده و بگو: «این را ویرایش نکن؛ اول بگو سه ضعف ساختاری‌اش چیست.» بعد بخواه درستشان کند.' },
    { id:'business', label:'کسب‌وکار / فروش / بازاریابی', tool:'ChatGPT',
      why:'ترکیب متن، تحلیل فایل اکسل و تولید تصویر در یک جا، برای کارِ روزمره‌ی یک کسب‌وکار کوچک از همه سریع‌تر است.',
      task:'فهرست فروش ماه گذشته را (بدون اسم مشتری) آپلود کن و بگو: «سه الگو در این داده پیدا کن که به چشم من نیامده و بگو هرکدام چه تصمیمی را پیشنهاد می‌دهد.»' },
    { id:'dev', label:'برنامه‌نویس / فنی', tool:'Claude یا ChatGPT',
      why:'برای کد، هر دو خوب‌اند. مهم‌تر از انتخاب، این است که کد را بفهمی نه اینکه کپی کنی.',
      task:'یک تکه کد که خودت ننوشته‌ای بده و بگو: «خط به خط توضیح بده چه می‌کند و کجایش می‌تواند بشکند.»' },
    { id:'legal', label:'حقوق / قرارداد / اداری', tool:'NotebookLM',
      why:'برای متن حقوقی، از خود درآوردن فاجعه است. NotebookLM فقط به سندی که دادی جواب می‌دهد و ارجاع می‌دهد — امن‌ترین گزینه.',
      task:'یک قرارداد نمونه (بدون اطلاعات محرمانه) آپلود کن و بپرس: «کدام بندها برای طرفِ امضاکننده ریسک دارد؟ به بند ارجاع بده.»' },
    { id:'health', label:'پزشکی / سلامت', tool:'NotebookLM + احتیاط جدی',
      why:'اینجا بیش از هر جای دیگری خطرِ توهم مهم است. فقط روی منابعی که خودت آپلود کرده‌ای کار کن، و هیچ تصمیم بالینی را به مدل نسپار.',
      task:'یک مقاله‌ی مرورِ جدید در حوزه‌ات را آپلود کن و بگو: «روش‌شناسی و محدودیت‌های این مطالعه را خلاصه کن، با ارجاع.»' },
    { id:'art', label:'هنر / طراحی / فیلم', tool:'ChatGPT برای شروع',
      why:'تولید تصویر و ایده‌پردازی در یک جا. بعد از اینکه دستت راه افتاد، سراغ ابزارهای تخصصی تصویر برو، نه قبلش.',
      task:'یک ایده‌ی خام بده و بگو: «ده جهتِ بصری متفاوت برای این پیشنهاد بده، هرکدام در دو خط.» بعد یکی را انتخاب و بازش کن.' },
    { id:'other', label:'هیچ‌کدام / مطمئن نیستم', tool:'ChatGPT',
      why:'وقتی مطمئن نیستی، همه‌فن‌حریف را بردار. بیشترین آموزش فارسی برای همین هست و کمترین احتمالِ گیر کردن را دارد.',
      task:'بگو: «من [شغل یا رشته‌ات] هستم. پنج کارِ تکراری در هفته‌ی من را حدس بزن که می‌شود به تو سپرد، و برای هرکدام بگو چطور.»' }
  ];

  var picker = document.getElementById('picker'), answer = document.getElementById('answer');
  if (!picker || !answer) return;

  function show(f, btn){
    [].forEach.call(picker.children, function(b){ b.setAttribute('aria-pressed', String(b === btn)); });
    answer.innerHTML =
      '<h3>' + f.tool + '</h3>' +
      '<p>' + f.why + '</p>' +
      '<p><b>اولین کارت:</b> ' + f.task + '</p>' +
      '<p class="muted">این را همین امشب انجام بده. بیست دقیقه بیشتر طول نمی‌کشد.</p>';
  }

  FIELDS.forEach(function(f){
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = f.label; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function(){ show(f, b); });
    picker.appendChild(b);
  });
})();

/* ---- copy the prompt templates, without the markup inside them ---- */
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

/* ---- the lie-spotting exercise ---- */
(function(){
  var quiz = document.getElementById('quiz'), verdict = document.getElementById('verdict');
  if (!quiz || !verdict) return;
  quiz.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    [].forEach.call(quiz.children, function(x){ x.classList.remove('right','wrong'); });
    if (b.dataset.ok === '1'){
      b.classList.add('right');
      verdict.innerHTML = 'درست. <b>دقیق‌ترین جواب، مشکوک‌ترین جواب است.</b> نام و ناشر و سال و شماره‌ی صفحه، همگی چیزهایی‌اند که یک مدل می‌تواند بدون اینکه وجود داشته باشند بسازد — و چون دقیق به نظر می‌رسند، کسی شک نمی‌کند. دو جواب دیگر ابراز تردید کرده‌اند و همین آن‌ها را امن‌تر می‌کند.';
    } else {
      b.classList.add('wrong');
      verdict.innerHTML = 'نه. این جواب دارد تردیدش را به تو می‌گوید، و همین ارزشمند است. دنبال جوابی بگرد که <b>بیش از حد دقیق</b> است.';
    }
  });
})();

/* ---- the thirty-day checklist, remembered on this browser ---- */
(function(){
  var list = document.getElementById('clist1'), out = document.getElementById('progress1');
  if (!list || !out) return;
  var boxes = [].slice.call(list.querySelectorAll('input'));
  var KEY = 'nvx-start-30';
  var FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  var fa = function(n){ return String(n).replace(/\\d/g, function(d){ return FA[+d]; }); };

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    boxes.forEach(function(b, i){ b.checked = !!saved[i]; });
  } catch(e){}

  function sync(){
    var n = boxes.filter(function(b){ return b.checked; }).length;
    out.textContent = fa(n) + ' از ' + fa(boxes.length);
    try { localStorage.setItem(KEY, JSON.stringify(boxes.map(function(b){ return b.checked; }))); } catch(e){}
  }
  boxes.forEach(function(b){ b.addEventListener('change', sync); });
  sync();
})();
</script>
</body>
</html>
'''

open(OUT, 'w', encoding='utf-8').write(head + BODY)
print('wrote', OUT, len(head + BODY), 'bytes')
