# -*- coding: utf-8 -*-
"""Builds the whole library from styles.py: the index, one page per style,
styles.json for the plate generator, and the sitemap entries.

Everything is derived. Adding a style means one entry in styles.py — the
index card, the detail page, the search index, the category chip, the plate
and the sitemap line all follow.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from styles import CATS, STYLES

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://navidixstudio.com/'
src  = open(f'{REPO}/brand-content.html', encoding='utf-8').read().split('\n')
HEAD_ASSETS = '\n'.join(src[25:30])
_i = src.index('<style>'); _j = src.index('</style>')
SHELL_CSS = '\n'.join(src[_i:_j])   # by marker, not by line number

CATNAME = {c[0]: c[1] for c in CATS}
FA_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
fa = lambda n: str(n).translate(FA_DIGITS)

def head(title, desc, url, img, extra_css='', kind='WebPage', jsonld=None, depth=''):
    ld = jsonld or (
        '{"@context":"https://schema.org","@type":"%s","name":"%s","description":"%s","inLanguage":"fa-IR",'
        '"author":{"@type":"Person","name":"محمد نویدی"},'
        '"publisher":{"@type":"Organization","name":"Navidix","logo":{"@type":"ImageObject","url":"%snavidix-mark.png"}},'
        '"image":"%s","mainEntityOfPage":{"@type":"WebPage","@id":"%s"}}' % (kind, title, desc, BASE, img, url))
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
<meta property="og:type" content="article" />
<meta property="og:locale" content="fa_IR" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{img}" />
<meta property="og:image:secure_url" content="{img}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{img}" />
{HEAD_ASSETS}
<script src="{depth}nvx-ui.js" defer></script>
<script type="application/ld+json">
{ld}
</script>
{SHELL_CSS}
{LIB_CSS}
{extra_css}

/* Persian is a joined script: positive tracking pulls the letters apart, so a
   word set in a tracked label stops reading as a word. Latin runs keep their
   tracking through .lat; digit-only labels keep theirs by being more specific. */
.eyebrow, .lesson .eyebrow, .idx .eyebrow, .lib .eyebrow, .slate-num,
.lesson .slate-num, .pager small, .lesson footer h3, .lesson .swap th,
.lesson .tag, .lesson .fbody dt, .lesson .cbtn span,
.lesson .funnel-read .count small, .feat__tag,
.no, .cards .no, .dna dt, .lang button[data-fa]{{ letter-spacing:normal; }}
.lat{{ letter-spacing:.24em; }}

/* ---- the studio's one recurring gesture ----
   A hairline running from red into blue along a top edge — the only place the
   two brand colours touch, and what makes a card here read as the same object
   as a card three pages away. Applied in CSS rather than markup so the search
   filter never has to know about it. */
.pc, .sd__stage{{ position:relative; overflow:hidden; }}
.pc::before, .sd__stage::before{{
  content:''; position:absolute; inset:0 0 auto; height:1px; z-index:3;
  background:linear-gradient(to left, transparent, rgba(227,32,42,.7) 30%,
             rgba(110,170,255,.52) 70%, transparent);
  opacity:.62; transition:opacity .45s cubic-bezier(.16,1,.3,1);
}}
.pc:hover::before{{ opacity:1; }}
</style>'''

LIB_CSS = '''
/* the line every site owes its reader */
.colophon{ max-width:1120px; margin:0 auto; padding:clamp(28px,4.5vh,46px) 22px clamp(34px,5vh,58px);
  text-align:center; border-top:1px solid rgba(140,170,220,.10); }
.colophon p{ margin:0 auto; max-width:62ch; font-size:12px; line-height:2.1; color:#6B7280; }
.colophon b{ color:#9AA3AD; font-weight:500; }
.colophon .mk{ color:#8C939B; }
.lib{ max-width:1120px; margin:0 auto; padding:clamp(48px,8vh,92px) 22px 80px; color:#D7DEE7; }
.lib h1{ font-size:clamp(26px,4.4vw,42px); line-height:1.4; margin:0 0 14px; font-weight:800; letter-spacing:-.01em; color:#F2F6FB; }
.lib .sub{ color:#8C939B; font-size:clamp(14px,2vw,17px); line-height:2; max-width:66ch; margin:0 0 16px; }
.lib .eyebrow{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:11.5px; letter-spacing:.24em; color:#B9C0C8;
  text-transform:uppercase; margin-bottom:18px; display:flex; align-items:center; gap:10px; }
.lib .eyebrow::before{ content:""; width:26px; height:1px; background:#E5202A; display:block; }
code.ph{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:.92em; color:#F0A868;
  background:#12151a; border:1px solid #262A31; border-radius:3px; padding:1px 6px; }

/* control bar sticks so filters stay reachable however long the list gets */
.bar{ position:sticky; top:0; z-index:20; margin:clamp(18px,3vh,26px) -22px clamp(22px,3vh,30px);
  padding:13px 22px; background:rgba(8,9,11,.94);
  -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid #1b1e24; }
.bar__box{ position:relative; display:block; }
.bar__box > svg{ position:absolute; inset-inline-start:15px; top:50%; transform:translateY(-50%);
  width:16px; height:16px; color:#6B7280; pointer-events:none; }
.q{ width:100%; box-sizing:border-box; padding:14px 44px; background:#0C0F13; border:1px solid #262A31;
  border-radius:4px; color:#E9EDF2; font-family:inherit; font-size:15px; line-height:1.6;
  transition:border-color .25s ease, background .25s ease; }
.q::placeholder{ color:#6B7280; }
.q:focus{ outline:none; border-color:rgba(229,32,42,.55); background:#12151a; }
.qx{ position:absolute; inset-inline-end:12px; top:50%; transform:translateY(-50%); width:26px; height:26px;
  border:0; border-radius:50%; cursor:pointer; background:#1b1e24; color:#B9C0C8; font-size:15px;
  line-height:1; display:none; place-items:center; padding:0; }
.qx:hover{ background:#E5202A; color:#fff; }
.bar.has-q .qx{ display:grid; }
.chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.chip{ font-family:inherit; font-size:13px; line-height:1; cursor:pointer; padding:9px 15px;
  border-radius:100px; color:#B9C0C8; background:transparent; border:1px solid #262A31;
  transition:border-color .2s ease, color .2s ease, background .2s ease; }
.chip:hover{ border-color:#3a4049; color:#E9EDF2; }
.chip[aria-pressed="true"]{ background:rgba(229,32,42,.14); border-color:rgba(229,32,42,.6); color:#fff; }
.chip:focus-visible{ outline:1px solid #5BD6C0; outline-offset:2px; }
.tally{ margin:11px 0 0; font-size:13px; color:#6B7280; }

.grp2{ margin-bottom:clamp(32px,5vh,52px); }
.grp2__head{ display:flex; align-items:baseline; gap:12px; margin:0 0 6px; }
.grp2__head h2{ font-size:clamp(18px,2.6vw,25px); font-weight:700; margin:0; line-height:1.5; color:#EDF2F8; }
.grp2__n{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:12px; letter-spacing:.14em; color:#E5202A; }
.grp2__sub{ color:#8C939B; font-size:13.5px; line-height:1.95; margin:0 0 16px; max-width:62ch; }
.cards2{ display:grid; grid-template-columns:repeat(auto-fill,minmax(268px,1fr)); gap:16px; }

.pc{ display:flex; flex-direction:column; border:1px solid #262A31; border-radius:5px; background:#0d1015;
  overflow:hidden; text-decoration:none; color:inherit;
  transition:border-color .25s ease, transform .25s ease; }
.pc:hover{ border-color:rgba(229,32,42,.45); transform:translateY(-2px); }
.pc:focus-visible{ outline:1px solid #5BD6C0; outline-offset:3px; }
.pc[hidden]{ display:none; }
.pc__sw{ position:relative; aspect-ratio:16/10; }
.pc__sw img{ width:100%; height:100%; object-fit:cover; display:block; }
.pc__tag{ position:absolute; inset-inline-start:9px; bottom:9px; font-size:10.5px; letter-spacing:.04em;
  padding:4px 9px; border-radius:3px; background:rgba(4,5,8,.74); color:#C9D1D9;
  border:1px solid rgba(255,255,255,.12); }
.pc__body{ padding:15px 16px 17px; display:flex; flex-direction:column; gap:7px; flex:1; }
.pc__title{ margin:0; font-size:16.5px; font-weight:700; line-height:1.55; color:#EDF2F8; }
.pc__en{ display:block; font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:11px;
  letter-spacing:.05em; color:#7C848D; margin-top:3px; }
.pc__hint{ margin:0; font-size:12.5px; line-height:1.9; color:#8C939B; }
.pc__go{ margin-top:auto; padding-top:9px; font-size:12px; color:#E5202A; display:flex;
  align-items:center; gap:6px; }

.empty2{ display:none; border:1px dashed #262A31; border-radius:4px; padding:32px 22px;
  text-align:center; color:#8C939B; font-size:14px; line-height:2; }
.empty2 b{ color:#E9EDF2; }
.lib.is-empty .empty2{ display:block; }
.grp2[hidden]{ display:none; }

.join{ border:1px solid #262A31; border-inline-start:3px solid #E5202A; border-radius:4px;
  background:#0d1015; padding:clamp(18px,3vw,26px); margin:clamp(28px,5vh,44px) 0 0; }
.join h2{ margin:0 0 10px; font-size:clamp(17px,2.4vw,22px); font-weight:700; line-height:1.6; }
.join p{ margin:0 0 14px; color:#98A0A9; font-size:14px; line-height:2; max-width:62ch; }
.join__row{ display:flex; flex-wrap:wrap; gap:10px; }
.jbtn{ display:inline-flex; align-items:center; gap:9px; text-decoration:none; font-size:14px;
  font-weight:700; padding:11px 19px; border-radius:100px; border:1px solid #2b313a;
  color:#E9EDF2; background:#12151a; transition:border-color .25s ease, background .25s ease; }
.jbtn:hover{ border-color:rgba(229,32,42,.6); background:#181c22; }
.jbtn svg{ width:17px; height:17px; flex:none; }
.jbtn--tg svg{ color:#2AABEE; } .jbtn--yt svg{ color:#FF0033; }
.jbtn:focus-visible{ outline:1px solid #5BD6C0; outline-offset:3px; }
'''

DETAIL_CSS = '''
.sd{ max-width:920px; margin:0 auto; padding:clamp(40px,7vh,80px) 22px 80px; color:#D7DEE7; }
.sd__crumb{ font-size:12.5px; color:#7C848D; margin-bottom:16px; }
.sd__crumb a{ color:#8C939B; text-decoration:none; } .sd__crumb a:hover{ color:#E5202A; }
.sd h1{ font-size:clamp(26px,4.6vw,42px); line-height:1.38; margin:0 0 8px; font-weight:800; letter-spacing:-.01em; color:#F2F6FB; }
.sd__en{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:13px; letter-spacing:.06em; color:#7C848D; }
.sd__meta{ display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 clamp(22px,4vh,32px); }
.sd__meta span{ font-size:12px; padding:5px 11px; border-radius:100px; border:1px solid #262A31; color:#B9C0C8; }
.sd__hero{ border:1px solid #262A31; border-radius:5px; overflow:hidden; margin-bottom:10px;
  transform-style:preserve-3d; will-change:transform;
  transition:transform .5s var(--ease,cubic-bezier(.16,1,.3,1)), box-shadow .5s var(--ease,cubic-bezier(.16,1,.3,1));
  box-shadow:0 26px 60px -34px rgba(0,0,0,.95); }
.sd__stage{ perspective:1100px; }
.sd__hero::after{                      /* a sheen that moves with the tilt */
  content:''; position:absolute; inset:0; pointer-events:none; opacity:0;
  background:linear-gradient(105deg, transparent 34%, rgba(190,214,244,.14) 50%, transparent 66%);
  transition:opacity .5s var(--ease,cubic-bezier(.16,1,.3,1)); }
.sd__stage:hover .sd__hero::after{ opacity:1; }
.sd__stage:hover .sd__hero{ box-shadow:0 40px 90px -40px rgba(0,0,0,1); }
.sd__hero{ position:relative; }
.sd__hero img{ width:100%; display:block; }
.sd__cap{ font-size:12px; color:#6B7280; line-height:1.9; margin:0 0 clamp(26px,4vh,38px); }

.sd h2{ font-size:clamp(18px,2.6vw,24px); font-weight:700; margin:clamp(28px,5vh,44px) 0 14px; line-height:1.55; color:#EDF2F8; }
.sd h2 .n{ font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:12px; letter-spacing:.14em;
  color:#E5202A; margin-inline-end:10px; }
.sd p{ color:#98A0A9; font-size:14.5px; line-height:2.05; margin:0 0 14px; max-width:64ch; }
.sd p b{ color:#E9EDF2; } .sd p em{ font-style:normal; color:#E5202A; font-weight:700; }

.dna{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:1px;
  background:#1b1e24; border:1px solid #1b1e24; border-radius:5px; overflow:hidden; }
.dna div{ background:#0d1015; padding:14px 16px; }
/* seven traits never fill a row exactly, so the last one takes the slack */
.dna div:last-child{ grid-column:1 / -1; }
.dna dt{ font-size:11px; letter-spacing:.13em; color:#E5202A; font-weight:700; margin-bottom:6px; }
.dna dd{ margin:0; font-size:13.5px; line-height:1.9; color:#C4CBD3; }

.pal{ display:flex; gap:0; border-radius:5px; overflow:hidden; border:1px solid #262A31; margin-bottom:14px; }
.pal span{ flex:1; height:52px; display:block; }

.pbox{ position:relative; margin-bottom:8px; }
.pbox pre{ margin:0; background:#080B0E; border:1px solid #1b1e24; border-radius:4px;
  padding:15px 15px 46px; overflow-x:auto; direction:ltr; text-align:left;
  font-family:ui-monospace,Menlo,Vazirmatn,monospace; font-size:12.5px; line-height:1.9; color:#B7C0C9;
  white-space:pre-wrap; word-break:break-word; }
.pbox b{ color:#F0A868; font-weight:600; }
.copy{ position:absolute; inset-inline-end:8px; bottom:8px; font-family:inherit; font-size:12px;
  padding:6px 13px; border-radius:3px; cursor:pointer; color:#C9D1D9;
  background:#161A20; border:1px solid #2b313a; transition:background .2s ease, color .2s ease; }
.copy:hover{ background:#E5202A; border-color:#E5202A; color:#fff; }
.copy.done{ background:#1B7A4B; border-color:#1B7A4B; color:#fff; }
.copy:focus-visible{ outline:1px solid #5BD6C0; outline-offset:2px; }
.pnote{ font-size:12.5px; color:#6B7280; line-height:1.9; margin:0 0 clamp(20px,3vh,28px); }

.rel{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.rel a{ display:flex; gap:11px; align-items:center; text-decoration:none; color:inherit;
  border:1px solid #262A31; border-radius:4px; padding:9px; background:#0d1015;
  transition:border-color .22s ease; }
.rel a:hover{ border-color:rgba(229,32,42,.5); }
.rel img{ width:58px; height:38px; object-fit:cover; border-radius:3px; flex:none; }
.rel b{ font-size:13.5px; font-weight:700; line-height:1.5; display:block; }
.rel small{ font-size:11px; color:#7C848D; font-family:ui-monospace,Menlo,Vazirmatn,monospace; }
'''

COPY_JS = '''
/* copy falls back to a hidden textarea where the async clipboard API is
   missing, rather than silently doing nothing */
document.addEventListener('click', function(e){
  var btn = e.target.closest('[data-copy]'); if (!btn) return;
  var text = btn.parentNode.querySelector('pre').innerText;
  function done(){ var was = btn.textContent; btn.textContent = 'کپی شد ✓'; btn.classList.add('done');
    setTimeout(function(){ btn.textContent = was; btn.classList.remove('done'); }, 1600); }
  function legacy(){ var ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch(err){} document.body.removeChild(ta); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
  else legacy();
});
'''

SITEBAR = '''<header class="sitebar"><div class="row">
  <a class="home" href="{up}index.html"><img class="navmark" src="{up}navidix-mark.png" alt="" width="24" height="24" /><span>NAVIDIX</span></a>
  <a href="{up}prompts.html">کتابخانه‌ی پرامپت ←</a>
</div></header>'''

TG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.9 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.4-4.9 8.9-8c.4-.3-.1-.5-.6-.2L7 11.3 2.5 9.9c-1-.3-1-1 .2-1.5l17.7-6.8c.8-.3 1.5.2 1.5 1.2z"/></svg>'
YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 12s0-3.9-.5-5.8a3 3 0 0 0-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5A3 3 0 0 0 1.5 6.2C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.9 23 12 23 12z"/><path fill="#0d1015" d="M9.8 15.5V8.5l6 3.5-6 3.5z"/></svg>'

def join_block(up=''):
    return f'''  <div class="join">
    <h2>دنبال کردن ادامه‌ی کار</h2>
    <p><b>کانال تلگرام Navidix Media</b> جای هر چیزی است که به هوش مصنوعی مربوط می‌شود: ابزار تازه، پرامپت، یافته‌های حین کار، و خبر اضافه‌شدن سبک‌های همین کتابخانه.</p>
    <p><b>کانال یوتیوب</b> چیز دیگری است: مستند و فیلم کوتاهِ علمی، هنری و آموزشی — جایی که این ابزارها در یک کار تمام‌شده به کار می‌روند.</p>
    <div class="join__row">
      <a class="jbtn jbtn--tg" href="https://t.me/NavidixMedia" target="_blank" rel="noopener">{TG}<span>کانال تلگرام Navidix Media</span></a>
      <a class="jbtn jbtn--yt" href="https://youtube.com/@navidix?sub_confirmation=1" target="_blank" rel="noopener">{YT}<span>سابسکرایب یوتیوب</span></a>
    </div>
  </div>'''

def mark_ph(t):
    return t.replace('{SUBJECT}', '<b>{SUBJECT}</b>')

# ── per-style pages ───────────────────────────────────────────────────────
DNA_LABELS = [('medium','متریال'), ('brush','ضربه‌قلم'), ('light','نور'), ('palette','پالت'),
              ('texture','بافت'), ('comp','ترکیب‌بندی'), ('mood','حال‌وهوا')]

os.makedirs(f'{REPO}/style', exist_ok=True)
by_cat = {}
for s in STYLES: by_cat.setdefault(s['cat'], []).append(s)

for s in STYLES:
    sibs = [x for x in by_cat[s['cat']] if x['id'] != s['id']][:4]
    dna = ''.join(
        f'<div><dt>{lab}</dt><dd>{s["dna"][k]}</dd></div>'
        for k, lab in DNA_LABELS if s['dna'].get(k) and s['dna'][k] != '—')
    pal = ''.join(f'<span style="background:{c}"></span>' for c in s['plate'][2])
    rel = ''.join(
        f'<a href="{x["id"]}.html"><img src="../prompts/{x["id"]}.jpg" alt="" loading="lazy" />'
        f'<span><b>{x["fa"]}</b><small>{x["en"]}</small></span></a>' for x in sibs)
    title = f'{s["fa"]} — پرامپت و شناسنامه‌ی سبک | Navidix'
    desc = (f'پرامپت آماده‌ی {s["fa"]} ({s["en"]}) برای تصویر و ویدیو، همراه با شناسنامه‌ی سبک: '
            f'{s["dna"]["palette"]}؛ {s["dna"]["light"]}. و توضیح اینکه چطور هر سوژه‌ای را در همین سبک بسازی.')
    url = f'{BASE}style/{s["id"]}.html'

    body = f'''
<body>
{SITEBAR.format(up='../')}
<main class="sd">
  <div class="sd__crumb"><a href="../prompts.html">کتابخانه‌ی پرامپت</a> · {CATNAME[s['cat']]}</div>
  <h1>{s['fa']}</h1>
  <div class="sd__en">{s['en']}</div>
  <div class="sd__meta"><span>{CATNAME[s['cat']]}</span><span>{s['period']}</span></div>

  <div class="sd__stage"><div class="sd__hero"><img src="../prompts/{s['id']}.jpg" alt="لوح بصری سبک {s['fa']}" width="800" height="500" /></div></div>
  <p class="sd__cap">این لوح نمونه‌ی خروجی پرامپت نیست — از روی پالت، جهت نور و جنس قلمِ همین سبک ساخته شده تا زبان بصری‌اش را نشان دهد.</p>

  <h2><span class="n">۰۱</span>شناسنامه‌ی سبک</h2>
  <p>هر سبک را می‌شود به چند مؤلفه شکست. فایده‌اش این است که بعد می‌توانی مؤلفه‌ها را <b>جدا جدا</b> با سبک دیگری ترکیب کنی — مثلاً پالت این یکی با نور آن یکی.</p>
  <dl class="dna">{dna}</dl>

  <h2><span class="n">۰۲</span>پالت</h2>
  <div class="pal">{pal}</div>
  <p class="pnote">{s['dna']['palette']}</p>

  <h2><span class="n">۰۳</span>پرامپت تصویر</h2>
  <div class="pbox"><pre>{mark_ph(s['img'])}</pre><button class="copy" type="button" data-copy>کپی پرامپت</button></div>
  <p class="pnote">جای <code class="ph">{{SUBJECT}}</code> سوژه‌ی خودت را بگذار؛ بقیه‌ی جمله سبک را نگه می‌دارد.</p>

  <h2><span class="n">۰۴</span>پرامپت ویدیو</h2>
  <div class="pbox"><pre>{mark_ph(s['vid'])}</pre><button class="copy" type="button" data-copy>کپی پرامپت ویدیو</button></div>
  <p class="pnote">نسخه‌ی ویدیو همان سبک را نگه می‌دارد و حرکت دوربین، پیوستگی نور و ثبات بافت بین فریم‌ها را هم اضافه می‌کند — چیزی که در پرامپت تصویر معنا ندارد.</p>

  <h2><span class="n">۰۵</span>پرامپت منفی</h2>
  <div class="pbox"><pre>{s['neg']}</pre><button class="copy" type="button" data-copy>کپی پرامپت منفی</button></div>
  <p class="pnote">این فهرست مخصوص همین سبک است، نه یک متن عمومی. چیزهایی را رد می‌کند که مدل معمولاً <em>در همین سبک</em> اشتباه می‌سازد.</p>

  <h2><span class="n">۰۶</span>چطور هر چیزی را در این سبک بسازی</h2>
  <p>{mark_ph(s['recipe'])}</p>

  {'<h2><span class="n">۰۷</span>سبک‌های هم‌خانواده</h2><div class="rel">' + rel + '</div>' if rel else ''}

{join_block('../')}
</main>
<script>{COPY_JS}</script>
<script>
/* The plate tips toward the cursor. A fine pointer only: on a touch screen
   there is nothing hovering to tip toward, and a device that asks for
   reduced motion should get a card that stays still. */
(function(){{
  var stage = document.querySelector('.sd__stage');
  if (!stage) return;
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var card = stage.querySelector('.sd__hero'), raf = 0, tx = 0, ty = 0;

  function apply(){{
    raf = 0;
    card.style.transform = 'rotateX(' + ty + 'deg) rotateY(' + tx + 'deg) translateZ(0)';
  }}
  stage.addEventListener('pointermove', function(e){{
    var r = card.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  - .5) *  9;
    ty = ((e.clientY - r.top)  / r.height - .5) * -6;
    if (!raf) raf = requestAnimationFrame(apply);
  }});
  stage.addEventListener('pointerleave', function(){{
    tx = ty = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  }});
}})();
</script>
</body>
</html>
'''
    open(f'{REPO}/style/{s["id"]}.html', 'w', encoding='utf-8').write(
        head(title, desc, url, BASE + 'og-prompts.png', DETAIL_CSS, 'TechArticle', depth='../') + body)

# ── index ─────────────────────────────────────────────────────────────────
groups = ''
for i, (cid, cname, cdesc) in enumerate(CATS, 1):
    cards = ''
    for s in by_cat.get(cid, []):
        cards += f'''        <a class="pc" href="style/{s['id']}.html" target="_blank" rel="noopener"
           data-cat="{s['cat']}" data-tags="{s['id']} {s['en']} {s['fa']} {s['tags']} {s['dna']['palette']} {s['dna']['light']}">
          <span class="pc__sw"><img src="prompts/{s['id']}.jpg" alt="لوح بصری سبک {s['fa']}" width="800" height="500" loading="lazy" decoding="async" /><span class="pc__tag">{s['en']}</span></span>
          <span class="pc__body">
            <h3 class="pc__title">{s['fa']}<span class="pc__en">{s['en']}</span></h3>
            <p class="pc__hint">{s['dna']['light']}</p>
            <span class="pc__go">باز کردن سبک ←</span>
          </span>
        </a>\n'''
    groups += f'''
    <section class="grp2" data-cat="{cid}">
      <div class="grp2__head"><span class="grp2__n">{fa(i).rjust(2, "۰")}</span><h2>{cname}</h2></div>
      <p class="grp2__sub">{cdesc}</p>
      <div class="cards2">
{cards}      </div>
    </section>
'''

chips = '\n'.join(f'        <button class="chip" type="button" data-cat="{c[0]}" aria-pressed="false">{c[1]}</button>'
                  for c in CATS)

INDEX_JS = r'''
(function(){
  var FA='۰۱۲۳۴۵۶۷۸۹', AR='٠١٢٣٤٥٦٧٨٩';
  function norm(s){
    s=(s||'').toLowerCase(); var out='';
    for (var i=0;i<s.length;i++){
      var ch=s[i], k=FA.indexOf(ch); if(k<0) k=AR.indexOf(ch);
      if(k>-1){ out+=k; continue; }
      if(ch==='‌'||ch==='‏'||ch==='‎'||ch==='ـ') continue;
      if(ch>='ً'&&ch<='ْ') continue;
      if('يى'.indexOf(ch)>-1) ch='ی';
      else if(ch==='ك') ch='ک';
      else if('أإآٱ'.indexOf(ch)>-1) ch='ا';
      else if(ch==='ة') ch='ه';
      else if(ch==='ؤ') ch='و';
      out+=ch;
    }
    return out.replace(/\s+/g,' ').trim();
  }
  var lib=document.getElementById('lib'), bar=document.getElementById('bar'),
      input=document.getElementById('q'), clear=document.getElementById('qx'),
      tally=document.getElementById('tally'), emptyQ=document.getElementById('emptyQ2'),
      chips=[].slice.call(document.querySelectorAll('#chips .chip')),
      groups=[].slice.call(document.querySelectorAll('.grp2')),
      items=[].slice.call(document.querySelectorAll('.pc')).map(function(el){
        return { el:el, grp:el.closest('.grp2'), cat:el.dataset.cat,
                 hay:norm(el.textContent+' '+(el.dataset.tags||'')) }; });
  var cat='all';
  function apply(){
    var raw=input.value.trim(), q=norm(raw), hits=0;
    items.forEach(function(it){
      var ok=(cat==='all'||it.cat===cat)&&(!q||it.hay.indexOf(q)>-1);
      it.el.hidden=!ok; if(ok) hits++;
    });
    groups.forEach(function(g){
      g.hidden=!items.some(function(it){ return it.grp===g && !it.el.hidden; }); });
    bar.classList.toggle('has-q', raw.length>0);
    lib.classList.toggle('is-empty', hits===0);
    emptyQ.textContent=raw;
    tally.textContent=(!q&&cat==='all') ? items.length+' سبک در کتابخانه'
      : (hits===0 ? 'نتیجه‌ای پیدا نشد' : hits+' نتیجه');
  }
  input.addEventListener('input', apply);
  input.addEventListener('keydown', function(e){ if(e.key==='Escape'){ input.value=''; apply(); } });
  clear.addEventListener('click', function(){ input.value=''; input.focus(); apply(); });
  chips.forEach(function(c){ c.addEventListener('click', function(){
    cat=c.dataset.cat; chips.forEach(function(o){ o.setAttribute('aria-pressed', String(o===c)); }); apply(); }); });
  document.getElementById('reset2').addEventListener('click', function(){
    input.value=''; cat='all';
    chips.forEach(function(o){ o.setAttribute('aria-pressed', String(o.dataset.cat==='all')); });
    apply(); input.focus(); });
  document.addEventListener('keydown', function(e){
    if(e.key==='/' && document.activeElement!==input){ e.preventDefault(); input.focus(); } });
  apply();
})();
'''

itl = 'کتابخانه‌ی پرامپت فارسی | شناسنامه‌ی سبک، پرامپت تصویر و ویدیو — Navidix'
idesc = (f'{fa(len(STYLES))} سبک با شناسنامه‌ی کامل: پالت، نور، ضربه‌قلم، بافت و ترکیب‌بندی — '
         'همراه با پرامپت آماده‌ی تصویر، پرامپت ویدیو و پرامپت منفی برای هر کدام.')

index_body = f'''
<body>
{SITEBAR.format(up='').replace('<a href="prompts.html">کتابخانه‌ی پرامپت ←</a>', '<a href="training.html">همه‌ی آموزش‌ها ←</a>')}
<main class="lib" id="lib">
  <div class="eyebrow"><span class="lat">Navidix</span> · کتابخانه‌ی پرامپت</div>
  <h1>کتابخانه‌ی پرامپت فارسی</h1>
  <p class="sub">هر سبک یک صفحه‌ی خودش دارد: <b>شناسنامه‌ی سبک</b> (پالت، نور، ضربه‌قلم، بافت، ترکیب‌بندی)، <b>پرامپت تصویر</b>، <b>پرامپت ویدیو</b> و <b>پرامپت منفی</b>. روی هر کارت بزنی، در تبِ تازه باز می‌شود تا این فهرست باز بماند.</p>
  <p class="sub">پرامپت‌ها انگلیسی‌اند و این عمدی است: مدل‌ها روی داده‌ی انگلیسی آموزش دیده‌اند و همان جمله به فارسی خروجی ضعیف‌تری می‌دهد. توضیح‌ها فارسی‌اند تا بدانی <em>چرا</em> هر تکه آنجاست. جای <code class="ph">{{SUBJECT}}</code> سوژه‌ی خودت را بگذار.</p>

  <div class="bar" id="bar">
    <label class="bar__box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input class="q" id="q" type="search" autocomplete="off"
             placeholder="جست‌وجو — سبک، پالت، نور… مثلاً: مینیاتور، کیاروسکورو، لاجورد، baroque"
             aria-label="جست‌وجو در کتابخانه" aria-describedby="tally">
      <button class="qx" id="qx" type="button" aria-label="پاک کردن جست‌وجو">×</button>
    </label>
    <div class="chips" id="chips" role="group" aria-label="دسته‌بندی">
      <button class="chip" type="button" data-cat="all" aria-pressed="true">همه</button>
{chips}
    </div>
    <p class="tally" id="tally" role="status" aria-live="polite"></p>
  </div>
{groups}
  <div class="empty2" id="empty2">
    چیزی با <b id="emptyQ2"></b> پیدا نشد.<br>
    <button class="chip" type="button" id="reset2" style="margin-top:12px">نمایش همه‌ی سبک‌ها</button>
  </div>

{join_block()}
</main>

<div class="colophon"><p><span class="mk">&copy;</span> ۱۴۰۵ <b>استودیو نویدیکس</b> — ساخته‌ی <b>محمد نویدی</b>. تمام حقوق محفوظ است.<br />بازنشر با ذکر منبع آزاد است، فروشش نه.</p></div>
<nav class="pager"><a href="camera-language.html"><small>مرتبط</small><b>زبان دوربین: زاویه، اندازه‌ی نما و حرکت</b></a><a href="training.html"><small>فهرست</small><b>همه‌ی قسمت‌های آموزش هوش مصنوعی کاربردی</b></a></nav>

<script>{INDEX_JS}</script>
</body>
</html>
'''
open(f'{REPO}/prompts.html', 'w', encoding='utf-8').write(
    head(itl, idesc, BASE + 'prompts.html', BASE + 'og-prompts.png', '', 'CollectionPage') + index_body)

# data for the plate generator
json.dump([{'id': s['id'], 'plate': s['plate']} for s in STYLES],
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'styles.json'), 'w'), ensure_ascii=False)

print(f'{len(STYLES)} styles · {len(CATS)} categories · {len(STYLES)} detail pages + index')
