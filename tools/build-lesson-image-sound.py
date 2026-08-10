# -*- coding: utf-8 -*-
"""Builds ai-image-sound.html — beginners' episode three."""

SRC  = '/home/user/Navidix/brand-content.html'
OUT  = '/home/user/Navidix/ai-image-sound.html'
BASE = 'https://navidixstudio.com/'

src   = open(SRC, encoding='utf-8').read().split('\n')
head_assets = '\n'.join(src[25:30])
_i = src.index('<style>'); _j = src.index('</style>')
style = '\n'.join(src[_i:_j])

TITLE = 'تصویر و صدا: ساختن، خواندن، شنیدن | آموزش هوش مصنوعی کاربردی — قسمت ۳'
DESC  = ('قسمت سوم آموزش مبتدی هوش مصنوعی: پنج چیزی که یک پرامپت تصویر لازم دارد، خواندنِ عکس به‌جای '
         'ساختنش، پیاده‌سازی صوت و جلسه، و مرزهای اخلاقی چهره و صدا. با تصویرساز تعاملی و پیوند به '
         'کتابخانه‌ی پرامپت فارسی. رایگان، از استودیو نویدیکس.')
URL   = BASE + 'ai-image-sound.html'
IMG   = BASE + 'og-image-sound.png'

LD = ('{"@context":"https://schema.org","@type":"LearningResource","name":"تصویر و صدا: ساختن، خواندن، شنیدن",'
      '"description":"پرامپت تصویر، خواندن عکس، پیاده‌سازی صوت و مرزهای چهره و صدا — برای مبتدی‌ها.",'
      '"inLanguage":"fa-IR","isAccessibleForFree":true,"educationalLevel":"beginner",'
      '"learningResourceType":"درس","teaches":"ساختن و خواندن تصویر و کار با صوت در هوش مصنوعی",'
      '"datePublished":"2026-08-10","author":{"@type":"Person","name":"محمد نویدی","jobTitle":"متخصص هوش مصنوعی کاربردی"},'
      '"publisher":{"@type":"Organization","name":"Navidix","url":"' + BASE + '"},'
      '"isPartOf":{"@type":"Course","name":"آموزش هوش مصنوعی کاربردی"},'
      '"mainEntityOfPage":{"@type":"WebPage","@id":"' + URL + '"},"position":3}')

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
<meta property="og:title" content="تصویر و صدا: ساختن، خواندن، شنیدن" />
<meta property="og:description" content="{DESC}" />
<meta property="og:url" content="{URL}" />
<meta property="og:image" content="{IMG}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{IMG}" />
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

# -*- coding: utf-8 -*-
BODY = '''<body>
<header class="sitebar"><div class="row">
  <a class="home" href="index.html"><img class="navmark" src="navidix-mark.png" alt="" width="24" height="24" /><span>NAVIDIX</span></a>
  <a href="training.html">همه‌ی آموزش‌ها ←</a>
</div></header>

<div class="lesson">
<div class="lesson__main">

<section class="hero">
  <div class="wrap">
    <div class="eyebrow">شروع از صفر · قسمت سوم</div>
    <h1>تصویر و صدا: <em>ساختن</em>، خواندن، شنیدن</h1>
    <p class="lede">در قسمت اول ابزارت را انتخاب کردی، در قسمت دوم یاد گرفتی چطور درخواست بدهی. هر دو دربارهٔ <b>متن</b> بودند. حالا همان مهارت را می‌بریم سراغ تصویر و صدا — و می‌بینی که قاعده‌ها عوض نمی‌شوند، فقط واژگانشان فرق می‌کند.</p>
    <p class="lede">و یک نکته که نصف خوانندگان این درس نمی‌دانند: <b>خواندنِ</b> تصویر توسط هوش مصنوعی، بیشتر از ساختنش به درد کار روزمره می‌خورد.</p>
    <img class="hex-wm" src="navidix-mark.png" alt="" aria-hidden="true" />
  </div>
</section>

<section class="stats">
  <div class="wrap">
    <div class="stat"><span class="v num">۵</span><span class="k">تکه‌ی یک پرامپت تصویر</span></div>
    <div class="stat"><span class="v num">۲</span><span class="k">جهت: ساختن و خواندن</span></div>
    <div class="stat"><span class="v num">۲۷</span><span class="k">سبک آماده در کتابخانه</span></div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۱</span></div>
    <h2>چرا تصویرهایت شبیه چیزی که در ذهنت بود نیستند</h2>
    <p class="intro">در قسمت دوم دیدیم که مدل ذهنت را نمی‌خواند. برای تصویر، این مسئله دو برابر می‌شود — چون یک تصویر ده‌ها تصمیم دارد و تو معمولاً فقط یکی‌شان را می‌نویسی.</p>

    <p>بنویسی «یک زن در حال قدم‌زدن»، مدل باید خودش تصمیم بگیرد: کجا؟ چه ساعتی از روز؟ از چه فاصله‌ای می‌بینیمش؟ دوربین کجاست؟ رنگ‌ها گرم‌اند یا سرد؟ نقاشی است یا عکس؟ هر کدام از این‌ها را ننویسی، یکی از هزاران حالتِ ممکن را می‌گیری — و بعد فکر می‌کنی مدل ضعیف است.</p>

    <div class="rule">
      <span class="tag">قاعده</span>
      <p>در متن، <strong>زمینه</strong> مهم‌ترین تکه بود. در تصویر، <strong>هر چیزی که ننویسی، تصادفی انتخاب می‌شود</strong>. این همان قاعده است با لباس دیگر.</p>
    </div>

    <hr class="hr" />

    <h2>پنج تکه‌ی یک پرامپت تصویر</h2>
    <p class="intro">در قسمت دوم شش تکه برای متن داشتیم. برای تصویر پنج تکه است، و ترتیبشان هم مهم است — مدل به اولِ جمله بیشتر وزن می‌دهد.</p>

    <table class="swap">
      <thead><tr><th>تکه</th><th>چه چیزی را تعیین می‌کند</th></tr></thead>
      <tbody>
        <tr><td><b>۱. سوژه</b><span class="en">Subject</span></td>
            <td>چه چیزی در قاب است، و چند تا. هرچه مشخص‌تر بهتر: «یک زن مسن با روسری آبی» نه «یک نفر».</td></tr>
        <tr><td><b>۲. کنش و حالت</b><span class="en">Action</span></td>
            <td>دارد چه می‌کند و در چه حالی است. بدون این، تصویرت یک عکس پرسنلی می‌شود.</td></tr>
        <tr><td><b>۳. مکان و زمان</b><span class="en">Setting</span></td>
            <td>کجا و چه ساعتی. «بازار قدیمی، ساعتی پیش از غروب» یک فضا می‌سازد؛ «بیرون» هیچ نمی‌سازد.</td></tr>
        <tr><td><b>۴. نور</b><span class="en">Light</span></td>
            <td>مهم‌ترین تکه‌ای که مبتدی‌ها می‌نویسندش. نور است که تصویر را از «رندر» به «عکس» تبدیل می‌کند: نور پهلویی، نور پشتی، ساعت طلایی، سایه‌ی سخت.</td></tr>
        <tr><td><b>۵. قاب و سبک</b><span class="en">Framing &amp; style</span></td>
            <td>از چه فاصله‌ای، با چه لنزی، و به چه زبانی: عکس، نقاشی رنگ‌روغن، مینیاتور. اینجا جایی است که <a href="prompts.html">کتابخانه‌ی پرامپت</a> کارَت را تمام می‌کند.</td></tr>
      </tbody>
    </table>

    <div class="rule data">
      <span class="tag cool">پیوند</span>
      <p>تکه‌ی پنجم را لازم نیست خودت از صفر بنویسی. <strong><a href="prompts.html">کتابخانه‌ی پرامپت فارسی</a></strong> بیست‌وهفت سبک آماده دارد — از مینیاتور ایرانی و قاجار تا عکاسی مستند و کیاروسکورو — و هر کدام پرامپت انگلیسیِ آماده، پرامپت منفی و توضیح فارسی دارند. سه تکه‌ی اول را خودت بنویس، سبک را از آنجا بردار.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۲</span></div>
    <h2>تصویرساز</h2>
    <p class="intro">مثل قسمت قبل، خودت پرش کن. متن انگلیسی پایین همان لحظه ساخته می‌شود — انگلیسی، چون مدل‌های تصویر با انگلیسی به‌مراتب بهتر کار می‌کنند.</p>

    <div class="forge">
      <label><span class="lab">۱. سوژه <i>— چه چیزی در قاب است</i></span>
        <input id="i-subj" type="text" placeholder="an old woman in a blue headscarf" /></label>
      <label><span class="lab">۲. کنش <i>— دارد چه می‌کند</i></span>
        <input id="i-act" type="text" placeholder="pouring tea, looking away from camera" /></label>
      <label><span class="lab">۳. مکان و زمان</span>
        <input id="i-set" type="text" placeholder="an old bazaar, an hour before sunset" /></label>
      <div class="two">
        <label><span class="lab">۴. نور</span>
          <select id="i-light">
            <option value="">— انتخاب کن —</option>
            <option value="soft window light from the side">نور پنجره از پهلو، نرم</option>
            <option value="warm golden hour backlight">نور پشتیِ ساعت طلایی</option>
            <option value="hard directional light, deep shadows">نور سخت و مستقیم، سایه‌ی عمیق</option>
            <option value="overcast diffused daylight">روز ابری، نور یکدست</option>
            <option value="single candle, deep chiaroscuro">تک‌شمع، کیاروسکورو</option>
            <option value="cool blue night light with one warm accent">شب سرد با یک لکه‌ی نور گرم</option>
          </select></label>
        <label><span class="lab">۵. قاب</span>
          <select id="i-frame">
            <option value="">— انتخاب کن —</option>
            <option value="close-up portrait, 85mm lens, shallow depth of field">پرتره‌ی نزدیک، لنز ۸۵</option>
            <option value="medium shot, 50mm lens">نمای متوسط، لنز ۵۰</option>
            <option value="wide establishing shot, 24mm lens">نمای باز معرفی، لنز ۲۴</option>
            <option value="overhead top-down view">از بالا، عمود</option>
            <option value="low angle, looking up">از پایین، رو به بالا</option>
          </select></label>
      </div>
      <label><span class="lab">سبک <i>— از کتابخانه بردار یا خودت بنویس</i></span>
        <select id="i-style">
          <option value="">— بدون سبکِ مشخص (عکاسانه) —</option>
          <option value="documentary photography, natural colour, available light only">عکاسی مستند</option>
          <option value="cinematic 35mm film still, subtle grain">قاب سینمایی ۳۵ میلی‌متری</option>
          <option value="classical oil painting, visible impasto brushwork">رنگ روغن کلاسیک</option>
          <option value="Persian miniature painting, flattened perspective, gold leaf detailing">مینیاتور ایرانی</option>
          <option value="delicate watercolour, wet-on-wet bleeding edges">آبرنگ</option>
          <option value="ukiyo-e woodblock print, flat colour areas, bold outline">اوکیو-ئه ژاپنی</option>
        </select></label>
    </div>

    <div class="pbox">
      <pre class="ltr" id="i-out"></pre>
      <button class="pcopy" type="button" data-for="i-out">کپی پرامپت</button>
    </div>
    <p>آن خط آخر، <b>پرامپت منفی</b> است: فهرست چیزهایی که <em>نمی‌خواهی</em>. خیلی از ابزارها کادر جداگانه‌ای برایش دارند؛ اگر نداشت، همان‌جا در انتهای پرامپت بگذارش. برای هر سبک، فهرست مخصوص خودش در <a href="prompts.html">کتابخانه</a> هست.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۳</span></div>
    <h2>جهت دیگر: عکس بده، جواب بگیر</h2>
    <p class="intro">این نیمه‌ی فراموش‌شده است. بیشتر مردم فقط تصویر می‌سازند، در حالی که <b>خواندنِ</b> تصویر همان چیزی است که در کار روزمره وقت آزاد می‌کند.</p>

    <p>هر سه ابزاری که در قسمت اول معرفی کردم عکس می‌خوانند. چند کارِ واقعی که همین امروز می‌توانی بکنی:</p>

    <table class="swap">
      <thead><tr><th>عکس از</th><th>و بپرس</th></tr></thead>
      <tbody>
        <tr><td><b>تخته‌ی کلاس یا اسلاید</b></td>
            <td>«این را به یادداشت مرتب تبدیل کن و هر جا که ناخواناست بگو مطمئن نیستی.»</td></tr>
        <tr><td><b>یک نمودار یا جدول</b></td>
            <td>«این نمودار چه می‌گوید؟ سه نکته‌ای که در نگاه اول دیده نمی‌شود چیست؟»</td></tr>
        <tr><td><b>یک فرم یا قبض</b></td>
            <td>«اطلاعاتش را در یک جدول مرتب کن.» — به‌جای تایپ‌کردن دستی.</td></tr>
        <tr><td><b>یک اسکرین‌شات از خطا</b></td>
            <td>«این خطا چه می‌گوید و از کجا می‌آید؟»</td></tr>
        <tr><td><b>کار خودت</b></td>
            <td>«اگر داورِ سختگیری بودی، سه ایراد این طراحی را چه می‌گفتی؟»</td></tr>
      </tbody>
    </table>

    <p>همان قاعده‌ی قسمت دوم اینجا هم برقرار است: <b>عکس را بده و بگو دقیقاً چه می‌خواهی.</b> «این چیه؟» جواب کلی می‌گیرد؛ «متن این تخته را به فهرست تبدیل کن» جواب قابل‌استفاده.</p>

    <div class="rule warn">
      <span class="tag warn">حواست باشد</span>
      <p>عکسی که آپلود می‌کنی از دستت خارج می‌شود. <strong>عکس مدرک شناسایی، فیش حقوقی، پرونده‌ی بیمار و صفحه‌ی حساب بانکی را آپلود نکن</strong> — نه به این ابزار، نه به هیچ سرویس آنلاین دیگری. اگر لازم است، اول قسمت‌های حساس را بپوشان.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۴</span></div>
    <h2>صدا: از یک ساعت حرف تا نیم صفحه‌ی مفید</h2>
    <p class="intro">صوت کم‌استفاده‌ترین و شاید پرارزش‌ترین بخش برای کسی است که جلسه دارد، کلاس می‌رود، یا مصاحبه می‌گیرد.</p>

    <p>کار در دو مرحله انجام می‌شود و اشتباه رایج این است که مردم فقط مرحله‌ی اول را انجام می‌دهند:</p>
    <ul>
      <li><b>مرحله‌ی اول — پیاده‌سازی.</b> فایل صوتی را به متن تبدیل کن. خروجی معمولاً بلند و خام است و به‌تنهایی خیلی به درد نمی‌خورد.</li>
      <li><b>مرحله‌ی دوم — استخراج.</b> همان متن را بده و بخواه چیزی از دلش بیرون بکشد. اینجاست که ارزش ساخته می‌شود.</li>
    </ul>

    <div class="pbox">
      <pre id="p6">این متنِ پیاده‌شده‌ی یک <b>[جلسه / کلاس / مصاحبه]</b> است.

سه چیز از آن بیرون بکش:
۱. تصمیم‌هایی که گرفته شد — فقط تصمیم‌ها، نه بحث‌ها.
۲. کارهایی که به کسی سپرده شد، با اسم آن شخص.
۳. سوال‌هایی که بی‌جواب ماند.

هر چیزی که در متن نیست را ننویس. اگر جایی نامفهوم بود، بگو نامفهوم است.</pre>
      <button class="pcopy" type="button" data-for="p6">کپی</button>
    </div>

    <p>و اگر با ویدیو کار می‌کنی: همین کار برای زیرنویس هم جواب می‌دهد. متن پیاده‌شده را بده و بخواه به قطعه‌های کوتاهِ زمان‌دار تقسیمش کند — یک کار چند ساعته که به چند دقیقه می‌رسد.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">لایه ۰۵</span></div>
    <h2>مرزها — این بار جدی‌تر</h2>
    <p class="intro">در قسمت دوم دربارهٔ مرزهای متن حرف زدیم. تصویر و صدا مرزهای سخت‌تری دارند، چون به <b>آدم‌های واقعی</b> مربوط می‌شوند.</p>

    <table class="swap">
      <thead><tr><th>نکن</th><th>چرا</th></tr></thead>
      <tbody>
        <tr><td><b>چهره‌ی آدمِ واقعی را در صحنه‌ای که نبوده نگذار</b></td>
            <td>حتی به شوخی. این کار در بسیاری از کشورها جرم است و در همه‌جا خیانت به اعتماد است. چهره‌ی خودت هم استثنا نیست وقتی پای دیگران وسط باشد.</td></tr>
        <tr><td><b>صدای کسی را تقلید نکن</b></td>
            <td>شبیه‌سازی صدا امروز آسان است و همین آسان بودن، آن را خطرناک کرده. بدون اجازه‌ی صریح، هرگز.</td></tr>
        <tr><td><b>تصویر پزشکی را به مدل نسپار</b></td>
            <td>برای <em>فهمیدنِ</em> یک مفهوم بپرس، ولی هیچ تصویر پزشکیِ واقعیِ کسی را برای تشخیص نده.</td></tr>
        <tr><td><b>خروجی را بدون گفتن منتشر نکن</b></td>
            <td>اگر تصویری با هوش مصنوعی ساخته‌ای و ممکن است کسی واقعی فرضش کند، بگو. این یک خط است که اعتبار چندساله را حفظ می‌کند.</td></tr>
      </tbody>
    </table>

    <hr class="hr hr--cool" />

    <p>یک قاعده‌ی ساده که همه‌ی این‌ها را پوشش می‌دهد: <b>اگر آدمی که در تصویر یا صداست می‌دید چه کرده‌ای و ناراحت می‌شد، نکن.</b></p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="check-head">
      <h2>تمرین این هفته</h2>
      <span class="progress num" id="progress3">۰ از ۶</span>
    </div>
    <p class="intro">شش کار. تیک‌ها روی همین مرورگر می‌مانند.</p>
    <ul class="clist" id="clist3">
      <li><label><input type="checkbox" /><span>با تصویرساز یک پرامپت کامل ساختم و اجرایش کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>همان پرامپت را با یک نورِ متفاوت دوباره زدم و فرقش را دیدم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک سبک از کتابخانه‌ی پرامپت برداشتم و روی سوژه‌ی خودم گذاشتم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک عکس واقعی از کار یا درسم دادم و ازش چیزی استخراج کردم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک فایل صوتی را پیاده کردم و بعد ازش تصمیم‌ها را بیرون کشیدم.</span></label></li>
      <li><label><input type="checkbox" /><span>یک کار پیدا کردم که به‌خاطر مرزهای این درس تصمیم گرفتم انجامش ندهم.</span></label></li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="slate"><span class="clap"></span><span class="slate-num">بعد</span></div>
    <h2>در قسمت چهارم</h2>
    <p class="intro">سه قسمت اول، مهارتِ تک‌کار بود: یک سوال، یک جواب. قسمت چهارم دربارهٔ چیزی است که این را به یک <b>سیستم</b> تبدیل می‌کند.</p>
    <ul>
      <li><b>پیدا کردن کارِ تکراری خودت</b> — آن چیزی که هر هفته انجامش می‌دهی و حوصله‌ات را می‌برد.</li>
      <li><b>تبدیلش به یک رویه‌ی ثابت</b> — که هر بار همان کیفیت را بدهد، نه گاهی خوب گاهی بد.</li>
      <li><b>زنجیره‌ی چند مرحله‌ای</b> — خروجی یک مرحله، ورودی مرحله‌ی بعد.</li>
      <li><b>کجا باید دست نگه داری</b> — نقطه‌ای که آدم باید تصمیم بگیرد، نه ماشین.</li>
    </ul>
    <p>تا آن موقع تمرین این هفته را انجام بده. قسمت چهارم روی چیزی ساخته می‌شود که <em>خودت</em> ساخته باشی.</p>
  </div>
</section>

<section class="srcs">
  <div class="wrap">
    <h3>برای راستی‌آزمایی خودت</h3>
    <p>قابلیت‌های تصویر و صوت سریع‌تر از هر بخش دیگری عوض می‌شوند. فقط از مستندات رسمی بخوان:</p>
    <ul>
      <li>راهنمای تصویر و بینایی در مستندات OpenAI، Anthropic و Google — هر سه بخش <span class="en">vision</span> جداگانه دارند.</li>
      <li>برای صوت: بخش <span class="en">speech to text</span> در مستندات همان‌ها.</li>
      <li>سبک‌ها و پرامپت‌های آماده: <a href="prompts.html">کتابخانه‌ی پرامپت فارسی</a> در همین سایت.</li>
    </ul>
    <p>تاریخ نگارش: مرداد ۱۴۰۵. قاعده‌های این درس کهنه نمی‌شوند؛ نام قابلیت‌ها ممکن است عوض شود.</p>
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

<nav class="pager"><a href="ai-prompting.html"><small>قسمت پیش</small><b>چطور درست بپرسم؟ آناتومی یک پرامپت خوب</b></a><a href="prompts.html"><small>مرتبط</small><b>کتابخانه‌ی پرامپت فارسی — ۲۷ سبک</b></a><a href="training.html"><small>فهرست</small><b>همه‌ی قسمت‌های آموزش هوش مصنوعی کاربردی</b></a></nav>

</div>
</div>

<script>
/* ---- the image prompt builder ---- */
(function(){
  var out = document.getElementById('i-out');
  if (!out) return;
  var F = ['subj','act','set','light','frame','style'].reduce(function(o,k){
    o[k] = document.getElementById('i-' + k); return o;
  }, {});
  var ph = function(t){ return '<span class="ph">' + t + '</span>'; };

  var NEG = 'extra fingers, deformed hands, distorted face, watermark, text artifacts, oversaturated colour, plastic skin';

  function build(){
    var v = {}, k;
    for (k in F) v[k] = (F[k].value || '').trim();
    var parts = [];
    parts.push(v.subj ? '<b>' + v.subj + '</b>' : ph('[subject]'));
    if (v.act)   parts.push('<b>' + v.act + '</b>');
    if (v.set)   parts.push('<b>' + v.set + '</b>');
    if (v.light) parts.push('<b>' + v.light + '</b>');
    if (v.frame) parts.push('<b>' + v.frame + '</b>');
    if (v.style) parts.push('<b>' + v.style + '</b>');
    out.innerHTML = parts.join(',\\n') + '\\n\\n--- negative ---\\n' + NEG;
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
  var list = document.getElementById('clist3'), out = document.getElementById('progress3');
  if (!list || !out) return;
  var boxes = [].slice.call(list.querySelectorAll('input'));
  var KEY = 'nvx-imagesound-week';
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
