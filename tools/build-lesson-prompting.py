# -*- coding: utf-8 -*-
"""Builds ai-prompting.html — beginners' episode two — on brand-content's shell."""

SRC  = '/home/user/Navidix/brand-content.html'
OUT  = '/home/user/Navidix/ai-prompting.html'
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

TITLE = 'چطور درست بپرسم؟ آناتومی یک پرامپت خوب | آموزش هوش مصنوعی کاربردی — قسمت ۲'
DESC  = ('قسمت دوم آموزش مبتدی هوش مصنوعی: شش تکه‌ی یک درخواست خوب، تکنیک نمونه‌دادن، حلقه‌ی اصلاح، '
         'کار با فایل‌ها و جزوه‌های خودت، و ساختن یک دستیار برای شغل خودت. با پرامپت‌ساز تعاملی. '
         'رایگان، از استودیو نویدیکس.')
URL   = BASE + 'ai-prompting.html'
IMG   = BASE + 'og-prompting.png'

LD = ('{"@context":"https://schema.org","@type":"LearningResource","name":"چطور درست بپرسم؟ آناتومی یک پرامپت خوب",'
      '"description":"شش تکه‌ی یک درخواست خوب، نمونه‌دادن، حلقه‌ی اصلاح، کار با فایل‌های خودت و ساختن دستیار شخصی.",'
      '"inLanguage":"fa-IR","isAccessibleForFree":true,"educationalLevel":"beginner",'
      '"learningResourceType":"درس","teaches":"نوشتن پرامپت مؤثر و کار با اسناد شخصی در هوش مصنوعی",'
      '"datePublished":"2026-08-10","author":{"@type":"Person","name":"محمد نویدی","jobTitle":"متخصص هوش مصنوعی کاربردی"},'
      '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"},'
      '"isPartOf":{"@type":"Course","name":"آموزش هوش مصنوعی کاربردی"},'
      '"mainEntityOfPage":{"@type":"WebPage","@id":"' + URL + '"},"position":2}')

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
<meta property="og:title" content="چطور درست بپرسم؟ آناتومی یک پرامپت خوب" />
<meta property="og:description" content="{DESC}" />
<meta property="og:url" content="{URL}" />
<meta property="og:image" content="{IMG}" />
<meta property="og:image:secure_url" content="{IMG}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="چطور درست بپرسم؟ آناتومی یک پرامپت خوب" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="چطور درست بپرسم؟ آناتومی یک پرامپت خوب" />
<meta name="twitter:description" content="{DESC}" />
<meta name="twitter:image" content="{IMG}" />
<meta name="twitter:image:alt" content="چطور درست بپرسم؟ آناتومی یک پرامپت خوب" />
{head_assets}
<script src="nvx-ui.js" defer></script>
<script type="application/ld+json">
{LD}
</script>
{style}
/* ---- the prompt builder: the anatomy, assembled while you watch ---- */
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

/* ---- before and after, on one switch ---- */
.lesson .flip{{ display:flex; gap:8px; margin:20px 0 14px; }}
.lesson .flip button{{
  appearance:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600;
  padding:9px 18px; border-radius:100px; color:var(--bone-dim);
  background:var(--ink-2); border:1px solid var(--line);
  transition:all .35s ease;
}}
.lesson .flip button[aria-pressed="true"]{{ color:#08090B; background:#7FB8FF; border-color:#7FB8FF; }}
.lesson .demo{{ border:1px solid var(--line); border-radius:4px; background:var(--ink-2);
  padding:20px 22px; }}
.lesson .demo h4{{ margin:0 0 10px; font-size:14px; color:var(--amber); }}
.lesson .demo p{{ margin:0 0 8px; }}
.lesson .demo p:last-child{{ margin-bottom:0; }}
.lesson .demo .said{{ font-family:var(--mono); font-size:12.5px; color:#9FB0C0; line-height:2;
  background:#0B0E12; border-radius:4px; padding:13px 15px; margin-bottom:12px; }}
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
    <div class="eyebrow">شروع از صفر · قسمت دوم</div>
    <h1>چطور درست بپرسم؟ <em>آناتومی</em> یک پرامپت خوب</h1>
    <p class="lede">در قسمت اول ابزارت را انتخاب کردی و یاد گرفتی چه هست و چه نیست. حالا می‌رویم سراغ چیزی که تفاوت بین یک جواب بی‌مصرف و یک جواب قابل‌استفاده را می‌سازد — و آن چیز، مدلِ گران‌تر نیست.</p>
    <p class="lede">تا آخر این درس یک <b>پرامپت‌ساز</b> داری که خودت پرش می‌کنی و متن آماده را برمی‌داری، بلدی جوابِ بد را نجات بدهی به‌جای اینکه از اول شروع کنی، و می‌توانی با جزوه و قرارداد و فایل‌های خودت کار کنی.</p>
    <img class="hex-wm" src="navidix-mark.png" alt="" aria-hidden="true" />
  </div>
</section>

<section class="stats">
  <div class="wrap">
    <div class="stat"><span class="v num">۶</span><span class="k">تکه‌ی یک درخواست خوب</span></div>
    <div class="stat"><span class="v num">۳</span><span class="k">جمله برای نجات جواب بد</span></div>
    <div class="stat"><span class="v num">۱</span><span class="k">دستیار که یک بار می‌سازی</span></div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۱</span></div>
    <h2>چرا جواب‌هایت متوسط‌اند</h2>
    <p class="intro">اگر خروجی‌هایی که می‌گیری بی‌روح و کلی‌اند، تقصیر مدل نیست. تقریباً همیشه یک چیز کم است: <b>زمینه</b>.</p>

    <p>یک آزمایش ذهنی. فرض کن به یک همکار تازه‌وارد بگویی «یک ایمیل بنویس». او چه می‌نویسد؟ چیزی عمومی و بی‌خاصیت — چون نمی‌داند برای چه کسی، با چه لحنی، برای رسیدن به چه چیزی. مدل هم دقیقاً همان کار را می‌کند، فقط سریع‌تر.</p>

    <p>تفاوتِ کسی که خروجی خوب می‌گیرد با کسی که نمی‌گیرد، در دانش فنی نیست. در این است که <b>چقدر از آنچه در سرش هست را روی کاغذ می‌آورد</b>. مدل ذهنت را نمی‌خواند؛ فقط چیزی را دارد که نوشته‌ای.</p>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>هر بار که جواب ضعیفی گرفتی، قبل از اینکه ابزار را مقصر بدانی این سوال را بپرس: <strong>«چه چیزی را من می‌دانستم و ننوشتم؟»</strong> نودوپنج درصد مواقع، جواب همان‌جاست.</p>
    </div>

    <hr class="hr" />

    <h2>یک نمونه‌ی واقعی</h2>
    <p class="intro">همین را با یک مثال ببین. دو درخواست، برای یک کار.</p>

    <div class="flip" id="flip" role="group" aria-label="مقایسه‌ی درخواست ضعیف و قوی">
      <button type="button" data-mode="bad" aria-pressed="true">درخواست معمولی</button>
      <button type="button" data-mode="good" aria-pressed="false">درخواست حرفه‌ای</button>
    </div>
    <div class="demo" id="demo" aria-live="polite"></div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۲</span></div>
    <h2>شش تکه</h2>
    <p class="intro">هر درخواستِ خوبی، چه بدانی چه ندانی، از همین شش تکه ساخته شده. لازم نیست همیشه هر شش‌تا را بنویسی — ولی هر کدام را که جا بیندازی، مدل خودش حدس می‌زند، و حدسش معمولاً کلی است.</p>

    <table class="swap">
      <thead><tr><th>تکه</th><th>چه می‌کند، و اگر ننویسی چه می‌شود</th></tr></thead>
      <tbody>
        <tr><td><b>۱. نقش</b><span class="en">Role</span></td>
            <td>سطح و زاویه‌ی نگاه را تعیین می‌کند. «تو یک ویراستار روزنامه‌ای» جوابی می‌دهد که با «تو یک معلم ابتدایی‌ای» زمین تا آسمان فرق دارد. ننویسی، لحنِ بی‌طرف و دانشنامه‌ای می‌گیری.</td></tr>
        <tr><td><b>۲. زمینه</b><span class="en">Context</span></td>
            <td>مهم‌ترین تکه. تو که هستی، این برای چه کسی است، چه محدودیتی داری. ننویسی، مدل برای «همه» می‌نویسد، یعنی برای هیچ‌کس.</td></tr>
        <tr><td><b>۳. کار</b><span class="en">Task</span></td>
            <td>یک فعل روشن: بنویس، خلاصه کن، مقایسه کن، نقد کن، طبقه‌بندی کن. مبهم بگویی، مدل محتاط‌ترین تفسیر را برمی‌دارد.</td></tr>
        <tr><td><b>۴. محدودیت</b><span class="en">Constraints</span></td>
            <td>چه چیزی را <em>نباید</em> انجام دهد. «بدون اصطلاح تخصصی»، «فقط از متنی که دادم»، «اسم برند نبر». این تکه بیشتر از بقیه کیفیت را بالا می‌برد و کمتر از همه نوشته می‌شود.</td></tr>
        <tr><td><b>۵. قالب خروجی</b><span class="en">Format</span></td>
            <td>چند بند، فهرست یا متن، جدول یا پاراگراف، چقدر بلند. ننویسی، معمولاً یک متن بلندِ فهرست‌دار می‌گیری که باید خودت مرتبش کنی.</td></tr>
        <tr><td><b>۶. نمونه</b><span class="en">Example</span></td>
            <td>قوی‌ترین تکه، و تقریباً هیچ مبتدی‌ای از آن استفاده نمی‌کند. یک نمونه از خروجیِ دلخواهت بگذار — لایه‌ی بعدی دربارهٔ همین است.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۳</span></div>
    <h2>نشان بده، توضیح نده</h2>
    <p class="intro">اگر فقط یک تکنیک از این درس یادت بماند، این باشد: <b>به‌جای توصیف‌کردنِ چیزی که می‌خواهی، یک نمونه‌اش را بگذار.</b></p>

    <p>توصیف‌کردنِ لحن سخت است. «رسمی ولی صمیمی، کوتاه، بدون تعارف اضافه» — هر کسی از این جمله برداشت دیگری دارد، مدل هم همین‌طور. ولی اگر <em>یک</em> نمونه از متنی که خودت پسندیده‌ای بگذاری، تمام آن توصیف‌ها در یک تکه متن خلاصه می‌شود و مدل دقیقاً همان را تحویل می‌دهد.</p>

    <p>در عمل یعنی این:</p>
    <div class="pbox">
      <pre class="ltr" id="p3">Here is an example of the tone I want:

"<span class="ph">[یک پاراگراف از متنی که خودت نوشته‌ای یا دوستش داری]</span>"

Now write <span class="ph">[کار جدید]</span> in exactly that voice.
Do not explain the voice back to me, just write it.</pre>
      <button class="pcopy" type="button" data-for="p3">کپی</button>
    </div>

    <p>همین کار برای ساختار هم جواب می‌دهد: یک نمونه از گزارشی که قالبش را دوست داری بگذار و بگو «هر هفته دقیقاً همین شکل را برایم پر کن».</p>

    <div class="rule data">
      <span class="tag cool">چرا کار می‌کند</span>
      <p>این مدل‌ها الگو را از روی نمونه می‌گیرند، نه از روی صفت. یک نمونه‌ی واقعی، ده‌تا صفت را بی‌مصرف می‌کند — و برخلاف صفت، <strong>تفسیرپذیر نیست</strong>.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۴</span></div>
    <h2>پرامپت‌ساز</h2>
    <p class="intro">حالا خودت بساز. کادرها را پر کن؛ متن پایین همان لحظه ساخته می‌شود. هرچه بیشتر پر کنی جوابت دقیق‌تر است، ولی خالی گذاشتنِ بعضی‌ها هم اشکالی ندارد.</p>

    <div class="forge">
      <label><span class="lab">۱. نقش <i>— مدل خودش را چه کسی فرض کند؟</i></span>
        <input id="f-role" type="text" placeholder="مثلاً: یک ویراستار باتجربه‌ی نشریه" /></label>

      <label><span class="lab">۲. زمینه <i>— تو که هستی و این برای چه کسی است؟</i></span>
        <textarea id="f-ctx" rows="2" placeholder="مثلاً: من دانشجوی ارشد معماری‌ام و این متن برای معرفی پروژه به داورهاست."></textarea></label>

      <label><span class="lab">۳. کار <i>— دقیقاً چه می‌خواهی؟</i></span>
        <input id="f-task" type="text" placeholder="مثلاً: متن معرفی پروژه را بنویس" /></label>

      <label><span class="lab">۴. محدودیت <i>— چه چیزی را نباید بکند؟</i></span>
        <input id="f-limit" type="text" placeholder="مثلاً: بدون اصطلاح تخصصی، بدون اغراق" /></label>

      <div class="two">
        <label><span class="lab">۵. قالب خروجی</span>
          <select id="f-fmt">
            <option value="">— انتخاب کن —</option>
            <option>سه بند کوتاه</option>
            <option>یک فهرست شماره‌دار</option>
            <option>یک جدول دوستونی</option>
            <option>یک متن یک‌صفحه‌ای</option>
            <option>یک پیام کوتاه، حداکثر ۴ خط</option>
          </select></label>
        <label><span class="lab">زبان خروجی</span>
          <select id="f-lang">
            <option value="fa">فارسی</option>
            <option value="en">انگلیسی</option>
          </select></label>
      </div>
    </div>

    <div class="pbox">
      <pre id="p-out"></pre>
      <button class="pcopy" type="button" data-for="p-out">کپی پرامپت</button>
    </div>
    <p>آن خط آخر — «اگر چیزی مبهم است اول بپرس» — عمداً همیشه هست. با همان یک جمله، مدل به‌جای حدس‌زدن از تو سوال می‌پرسد، و این تنها تغییری است که در همه‌ی کارها جواب می‌دهد.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۵</span></div>
    <h2>جوابِ بد را دور نریز</h2>
    <p class="intro">اشتباه رایج: جواب که خوب نبود، پاک می‌کنی و پرامپت را از اول می‌نویسی. این بدترین کار است — چون همان گفت‌وگو، سرمایه‌ی توست.</p>

    <p>به‌جایش سه حرکت داری. به ترتیب امتحانشان کن:</p>

    <table class="swap">
      <thead><tr><th>وقتی جواب…</th><th>این را بگو</th></tr></thead>
      <tbody>
        <tr><td><b>کلی و بی‌روح است</b></td>
            <td>«خیلی عمومی است. یک نمونه‌ی مشخص و یک عدد واقعی به هر بند اضافه کن.»</td></tr>
        <tr><td><b>طولانی است</b></td>
            <td>«نصفش کن بدون اینکه چیزی از معنی کم شود. بگو چه چیزی را حذف کردی.»</td></tr>
        <tr><td><b>لحنش غلط است</b></td>
            <td>«لحن درست نیست. این نمونه را بخوان و دوباره بنویس: [نمونه].»</td></tr>
        <tr><td><b>نمی‌دانی چرا بد است</b></td>
            <td>«خودت سه ضعف این متن را پیدا کن و بگو چرا. بعد درستشان کن.»</td></tr>
      </tbody>
    </table>

    <p>آن ردیف آخر مهم‌ترین است. مدل در <b>نقدکردنِ</b> کار خودش معمولاً بهتر از <b>ساختنِ</b> بارِ اولش است. این تفاوت را رایگان بردار.</p>

    <hr class="hr hr--cool" />

    <h2>و یک هشدار</h2>
    <p>اگر بعد از سه بار اصلاح هنوز به جایی نرسیده‌ای، اصلاح چهارم کمکی نمی‌کند. <b>گفت‌وگوی تازه شروع کن</b> و این بار صورت‌مسئله را از اول بهتر بنویس. گفت‌وگوی طولانیِ پر از اصلاح، خودش مدل را گیج می‌کند.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۶</span></div>
    <h2>کار با فایل‌های خودت</h2>
    <p class="intro">اینجا جایی است که هوش مصنوعی از «اسباب‌بازی» به «ابزار کار» تبدیل می‌شود. تا وقتی فقط از حافظه‌ی عمومی مدل می‌پرسی، جواب‌ها عمومی‌اند. وقتی <b>سندِ خودت</b> را می‌دهی، جواب‌ها مالِ تو می‌شوند.</p>

    <p>سه نکته‌ی عملی که کیفیت را زیر و رو می‌کند:</p>

    <ul>
      <li><b>بگو فقط از همین سند جواب بده.</b> جمله‌ی «اگر جوابش در این متن نیست، بگو نیست — از دانش عمومی‌ات استفاده نکن» بزرگ‌ترین محافظ توست در برابر از خود درآوردن.</li>
      <li><b>ارجاع بخواه.</b> «برای هر ادعا بگو از کدام بخش سند آمده.» این کار راستی‌آزمایی را از چند دقیقه به چند ثانیه می‌رساند.</li>
      <li><b>سندهای مرتبط را با هم بده، نه جدا جدا.</b> وقتی سه فایل کنار هم باشند، می‌توانی بپرسی «این‌ها کجا با هم تناقض دارند؟» — و این سوالی است که آدم‌ها معمولاً حوصله‌اش را ندارند.</li>
    </ul>

    <div class="pbox">
      <pre id="p4">فقط بر اساس فایل‌هایی که آپلود کرده‌ام جواب بده.

اگر جواب یک سوال در این فایل‌ها نیست، صریح بگو «در این منابع نیست»
و از دانش عمومی‌ات استفاده نکن.

برای هر ادعا بگو از کدام فایل و کدام بخش آمده.

سوال من: <b>[سوالت]</b></pre>
      <button class="pcopy" type="button" data-for="p4">کپی</button>
    </div>

    <p>یادت باشد در قسمت اول گفتم NotebookLM برای همین ساخته شده. اگر کارت با جزوه و مقاله و قرارداد است، این همان لایه‌ای است که وقتش رسیده.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۷</span></div>
    <h2>یک بار بساز، هر روز استفاده کن</h2>
    <p class="intro">اگر هر بار زمینه‌ات را از اول تایپ می‌کنی، داری وقتت را دور می‌ریزی. هر سه ابزار جایی دارند که یک بار می‌نویسی و همیشه اعمال می‌شود.</p>

    <p>در ChatGPT و Claude اسمش «دستورهای سفارشی» یا «پروژه» است، در Gemini «Gems». اسم‌ها فرق می‌کند، کار یکی است: <b>یک متن ثابت که پیش از هر گفت‌وگو خوانده می‌شود.</b></p>

    <p>این را یک بار بنویس و بگذار آنجا:</p>
    <div class="pbox">
      <pre id="p5">من <b>[شغل یا رشته‌ات]</b> هستم و بیشتر کارم <b>[دو سه کار اصلی‌ات]</b> است.
مخاطب من معمولاً <b>[چه کسانی]</b> هستند.

وقتی به من جواب می‌دهی:
— فارسی روان بنویس، نه ترجمه‌ای.
— اصطلاح تخصصی را فقط وقتی به کار ببر که جایگزین ساده ندارد.
— اگر چیزی را مطمئن نیستی، بگو مطمئن نیستی.
— جواب کوتاه بده مگر اینکه بخواهم مفصل باشد.
— قبل از شروع، اگر چیزی مبهم است بپرس.</pre>
      <button class="pcopy" type="button" data-for="p5">کپی</button>
    </div>

    <p>بعد از این، هر گفت‌وگویی که شروع کنی از نقطه‌ی صفر شروع نمی‌شود. همین یک کارِ ده‌دقیقه‌ای، در طول یک ماه ساعت‌ها برایت وقت می‌خرد.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۸</span></div>
    <h2>مرزها</h2>
    <p class="intro">یک استادِ خوب فقط نمی‌گوید چه کار بکن؛ می‌گوید کجا نایست. این فهرست کوتاه است و هر بندش دلیل دارد.</p>

    <table class="swap">
      <thead><tr><th>نسپار</th><th>چرا</th></tr></thead>
      <tbody>
        <tr><td><b>اطلاعات محرمانه‌ی دیگران</b></td>
            <td>اطلاعات بیمار، مشتری، دانش‌آموز، یا هر داده‌ای که مالِ تو نیست. آپلودکردنش یعنی سپردنش به یک شرکت خارجی — تصمیمی که حق تو نیست بگیری.</td></tr>
        <tr><td><b>تصمیم پزشکی، حقوقی و مالی</b></td>
            <td>برای فهمیدن و پیش‌نویس‌کردن عالی است. برای <em>تصمیم‌گرفتن</em> نه. مدل مسئولیتی ندارد؛ تو داری.</td></tr>
        <tr><td><b>کاری که اسم تو پایش می‌رود، بدون خواندن</b></td>
            <td>هر متنی که منتشر می‌کنی مالِ توست، حتی اگر مدل نوشته باشد. نخوانده نفرست.</td></tr>
        <tr><td><b>مهارتی که داری یاد می‌گیری</b></td>
            <td>ظریف‌ترین بند. اگر تکلیفت را مدل بنویسد، نمره می‌گیری و مهارت را از دست می‌دهی. از آن برای <em>فهمیدن</em> استفاده کن، نه برای دورزدنِ یادگیری.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="check-head">
      <h2>تمرین این هفته</h2>
      <span class="progress num" id="progress2">۰ از ۶</span>
    </div>
    <p class="intro">شش کار، نه بیشتر. تیک‌ها روی همین مرورگر می‌مانند.</p>
    <ul class="clist" id="clist2">
      <li><label><input type="checkbox" /><span>با پرامپت‌ساز یک درخواست کامل ساختم و روی یک کار واقعی اجرا کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک بار به‌جای توصیف لحن، نمونه گذاشتم و تفاوتش را دیدم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک جواب ضعیف را با «سه ضعفش را خودت پیدا کن» نجات دادم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک فایل خودم را دادم و خواستم فقط از همان جواب بدهد، با ارجاع.</span></label></li>
      <li><label><input type="checkbox" /><span>متن دستیار شخصی‌ام را نوشتم و در تنظیمات ابزارم ذخیره کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک مورد پیدا کردم که تصمیم گرفتم به هوش مصنوعی نسپارم — و می‌دانم چرا.</span></label></li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">بعد</span></div>
    <h2>در قسمت سوم</h2>
    <p class="intro">حالا که بلدی درست بپرسی و با فایل‌های خودت کار کنی، می‌رویم سراغ تصویر و صدا.</p>
    <ul>
      <li><b>ساختن تصویر</b> — از یک جمله‌ی مبهم تا قابی که در ذهنت بود.</li>
      <li><b>خواندن تصویر</b> — عکس بده، جواب بگیر. برای درس، کار و زندگی روزمره.</li>
      <li><b>صدا و متن</b> — پیاده‌سازی جلسه، زیرنویس، خلاصه‌ی یک ویدیوی دو ساعته.</li>
      <li><b>کجا خودت را جای مدل نگذاری</b> — تقسیم کار بین تو و ابزار.</li>
    </ul>
  </div>
</section>

<section class="srcs">
  <div class="wrap">
    <h3>برای راستی‌آزمایی خودت</h3>
    <p>هر سه شرکت راهنمای رسمی پرامپت‌نویسی دارند و رایگان‌اند. اگر خواستی عمیق‌تر بروی، از همان‌ها شروع کن نه از ویدیوهای دست‌دوم:</p>
    <ul>
      <li>OpenAI — راهنمای <span class="en">prompt engineering</span> در مستندات رسمی‌شان</li>
      <li>Anthropic — بخش <span class="en">prompt engineering</span> در مستندات Claude، از همه مفصل‌تر است</li>
      <li>Google — راهنمای <span class="en">prompting</span> برای Gemini</li>
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

<nav class="pager"><a href="ai-start.html"><small>قسمت پیش</small><b>از کجا شروع کنم؟ راهنمای صفرِ صفر</b></a><a href="training.html"><small>فهرست</small><b>همه‌ی قسمت‌های آموزش هوش مصنوعی کاربردی</b></a></nav>

</div>
</div>

<script>
/* ---- before and after ---- */
(function(){
  var DEMO = {
    bad: {
      h: 'درخواست معمولی',
      said: 'یک متن درباره‌ی پروژه‌ی معماری من بنویس.',
      note: ['مدل نمی‌داند تو که هستی، متن برای چه کسی است، چقدر باید بلند باشد و چه لحنی می‌خواهی. پس محتاط‌ترین کار را می‌کند: یک متن عمومی، بلند، پر از صفت، بدون هیچ چیزِ مشخص.',
             'نتیجه چیزی است که هزار نفر دیگر هم می‌توانستند بگیرند.']
    },
    good: {
      h: 'درخواست حرفه‌ای',
      said: 'تو یک ویراستار مجله‌ی معماری هستی.\\nمن دانشجوی ارشدم و این متن برای داورهای یک مسابقه است که روزی پنجاه پروژه می‌خوانند.\\nمتن معرفی پروژه را بنویس.\\nبدون اصطلاح تخصصی و بدون اغراق؛ ادعای بدون شاهد نگذار.\\nسه بند کوتاه، بند اول باید در دو جمله کل ایده را برساند.\\nاگر چیزی از پروژه برایت مبهم است، اول بپرس.',
      note: ['همان شش تکه: نقش، زمینه، کار، محدودیت، قالب — و اجازه‌ی سوال‌پرسیدن.',
             'حالا مدل می‌داند خواننده خسته است و وقت ندارد، پس بند اول را تیز می‌نویسد. می‌داند نباید اغراق کند. و اگر اطلاعات کم باشد، به‌جای سرِهم‌کردن، از تو می‌پرسد.']
    }
  };
  var flip = document.getElementById('flip'), demo = document.getElementById('demo');
  if (!flip || !demo) return;
  function show(mode){
    var d = DEMO[mode];
    [].forEach.call(flip.children, function(b){ b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    demo.innerHTML = '<h4>' + d.h + '</h4><div class="said">' +
      d.said.replace(/\\n/g, '<br />') + '</div>' +
      d.note.map(function(t){ return '<p>' + t + '</p>'; }).join('');
  }
  flip.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (b) show(b.dataset.mode);
  });
  show('bad');
})();

/* ---- the prompt builder ---- */
(function(){
  var out = document.getElementById('p-out');
  if (!out) return;
  var F = ['role','ctx','task','limit','fmt','lang'].reduce(function(o,k){
    o[k] = document.getElementById('f-' + k); return o;
  }, {});
  var ph = function(t){ return '<span class="ph">' + t + '</span>'; };

  function build(){
    var v = {}, k;
    for (k in F) v[k] = (F[k].value || '').trim();
    var L = [];
    L.push('تو ' + (v.role ? '<b>' + v.role + '</b>' : ph('[نقش]')) + ' هستی.');
    L.push('');
    L.push('زمینه: ' + (v.ctx ? '<b>' + v.ctx + '</b>' : ph('[من که هستم و این برای چه کسی است]')));
    L.push('');
    L.push('کار: ' + (v.task ? '<b>' + v.task + '</b>' : ph('[دقیقاً چه می‌خواهی]')));
    if (v.limit){ L.push(''); L.push('محدودیت: <b>' + v.limit + '</b>'); }
    if (v.fmt){   L.push(''); L.push('قالب خروجی: <b>' + v.fmt + '</b>'); }
    if (v.lang === 'en'){ L.push(''); L.push('Write the answer in English.'); }
    L.push('');
    L.push('اگر چیزی از زمینه برایت مبهم است، اول از من بپرس و بعد شروع کن.');
    out.innerHTML = L.join('\\n');
  }
  Object.keys(F).forEach(function(k){
    F[k].addEventListener('input', build);
    F[k].addEventListener('change', build);
  });
  build();
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
  var list = document.getElementById('clist2'), out = document.getElementById('progress2');
  if (!list || !out) return;
  var boxes = [].slice.call(list.querySelectorAll('input'));
  var KEY = 'nvx-prompting-week';
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
