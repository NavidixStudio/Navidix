/* =====================================================================
   NAVIDIX — the top bar + burger menu + back + day/night, on every page.

   One source of truth for the navigation: the mark (centered), the
   three-line button, the back button and the day/night toggle. The
   homepage used to carry its own inline copy; it is now served from
   here like every other page, so the bar is one thing site-wide.

   Day mode is a gentle light theme: the CONTENT frame is inverted
   (back + hue-rotate) while images/video/canvas get the same filter a
   second time, so pictures render untouched while the page around them
   turns soft-light. Nothing is blown to pure white — the page keeps a
   warm warm-tinted light.

   Self-contained on purpose — no page needs markup or page CSS
   variables for it, and it does nothing (leaves any pre-existing #topbar
   alone) when a page ships its own inline copy.

   The nav links are real <a> elements, so a missing script still
   leaves plain navigation.
   ===================================================================== */
(function () {
  'use strict';

  if (document.getElementById('topbar')) return; /* a page-owned copy exists */

  /* ---- palette: hardcoded so it matches on every page regardless of
     the page's own --vars ---- */
  var PAPER      = '#EDF2FA';
  var PAPER_DIM  = 'rgba(237,242,250,.52)';
  var LINE       = 'rgba(140,170,220,.16)';
  var EMBER      = '#FF6A5A';
  var EASE       = 'cubic-bezier(.16,1,.3,1)';

  /* ---- theme state ----
     Dark is not a default the reader can change permanently, it is where
     every visit begins. Day lasts for the session — so following a link
     does not snap the page back and undo a deliberate choice mid-read —
     and a new visit opens dark again.

     sessionStorage rather than localStorage is the whole of that rule.
     The old localStorage key is cleared on the way past, or anyone who
     once tried day mode would still be arriving in it. */
  var KEY = 'nvx-day';
  var DAY = false;
  try {
    DAY = sessionStorage.getItem(KEY) === '1';
    localStorage.removeItem(KEY);
  } catch (e) {}

  /* ---- 1. the sheet ---- */
  var css = document.createElement('style');
  css.textContent = [
    '.topbar{position:fixed;inset:0 0 auto;z-index:50;background:rgba(6,8,13,.85);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid rgba(140,170,220,.11);transform:translateY(-101%);transition:transform .6s ' + EASE + '}',
    '.topbar.is-in{transform:none}',
    '.topbar[hidden]{display:none}',
    '.topbar__row{max-width:1240px;margin:0 auto;padding:9px 18px;display:flex;',
    'align-items:center;gap:10px}',
    /* The mark was never centred: one button on the start side, two on
       the end, and space-between splits the leftover unevenly. Both
       tails now claim the same share and push from opposite edges, so
       the middle is the middle no matter how many buttons a side has. */
    '.topbar__tail{flex:1 1 0;min-width:0}',
    '.topbar__tail:first-child{justify-content:flex-start}',
    '.topbar__tail:last-child{justify-content:flex-end}',
    '.topbar__home{display:inline-flex;align-items:center;justify-content:center;gap:11px;',
    'flex:0 0 auto;min-width:0;color:'+PAPER+';text-decoration:none;text-align:center;',
    'font-family:"Inter","SF Pro Text","Helvetica Neue",system-ui,sans-serif;',
    'font-size:15px;font-weight:700;letter-spacing:.26em}',
    '.topbar__home .topbar__mark{display:block;width:40px;height:40px;object-fit:contain;',
    'transition:transform .35s '+EASE+'}',
    /* The logotype itself, not type set to look like it. The silver
       wordmark is the brand's own artwork; a font can approximate its
       letterforms but not its bevel, and the two side by side read as two
       different brands. Height rather than width, so it lines up with the
       emblem beside it whatever the file's aspect ratio is. */
    '.topbar__home .topbar__word{display:block;height:17px;width:auto;',
    'object-fit:contain;transition:opacity .35s '+EASE+'}',
    '.topbar__home:hover .topbar__mark{transform:scale(1.06)}',
    '.topbar__home:hover .topbar__word{opacity:.86}',
    '#topbar .topbar__links{display:flex;flex-direction:column;padding:0;margin:0 0 2px}',
    '#topbar .topbar__links .nvxa{appearance:none;border:0;background:none;color:'+PAPER_DIM+';',
    'font-family:"Estedad","IRANSansX","IRANSans","Segoe UI",Tahoma,sans-serif;font-size:14px;line-height:1.2;',
    'padding:11px 13px;border-radius:9px;cursor:pointer;text-align:start;',
    'transition:color .25s '+EASE+',background .25s '+EASE+';',
    'max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#topbar .topbar__links .nvxa:hover{color:'+PAPER+';background:rgba(140,170,220,.08)}',
    '#topbar .topbar__links .nvxa--in::before{content:"• ";color:'+EMBER+'}',
    '#topbar .topbar__links .nvxa--in{color:'+PAPER_DIM+'}',
    '.topbar__tail{display:flex;align-items:center;gap:8px}',
    '.topbar__circ{appearance:none;border:1px solid '+LINE+';background:rgba(140,170,220,.05);',
    'border-radius:999px;width:34px;height:34px;padding:0;flex:none;cursor:pointer;',
    'display:inline-flex;align-items:center;justify-content:center;color:'+PAPER_DIM+';',
    'transition:border-color .3s '+EASE+',background .3s '+EASE+',color .3s '+EASE+'}',
    '.topbar__circ:hover{border-color:rgba(227,27,35,.55);background:rgba(227,27,35,.12);color:'+PAPER+'}',
    '.topbar__circ svg{width:17px;height:17px;display:block}',
    '.topbar__burger{flex-direction:column;gap:4px}',
    '.topbar__burger-line{display:block;width:15px;height:1.5px;border-radius:1px;background:currentColor;',
    'transition:background .3s '+EASE+',transform .3s '+EASE+',opacity .2s '+EASE+'}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(1){transform:translateY(5.5px) rotate(45deg)}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(2){opacity:0}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}',
    /* theme toggle: diagonal sun/moon icon, swapped via the html class */
    '.topbar__theme .ic-sun{display:none}',
    '.topbar__theme .ic-moon{display:block}',
    'html.nvx-day .topbar__theme .ic-sun{display:block}',
    'html.nvx-day .topbar__theme .ic-moon{display:none}',
    /* ---- dropdown ---- */
    '.topbar__menu{position:fixed;inset-inline-start:18px;top:52px;z-index:51;width:min(320px,calc(100vw - 36px));',
    'background:rgba(8,11,17,.94);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);',
    'border:1px solid rgba(140,170,220,.13);border-radius:14px;padding:8px;',
    'box-shadow:0 24px 60px -22px rgba(0,0,0,.85);',
    'opacity:0;transform:scale(.96) translateY(-8px);transform-origin:top right;pointer-events:none;',
    'transition:opacity .28s '+EASE+',transform .32s '+EASE+'}',
    '.topbar__menu.is-in{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}',
    '.topbar__menu[hidden]{display:none}',
    'html[lang="en"] .topbar__menu{transform-origin:top left}',
    '.topbar__menu a,.topbar__menu-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'width:100%;box-sizing:border-box;text-align:start;color:'+PAPER_DIM+';text-decoration:none;background:none;border:0;',
    'font-family:"Estedad","IRANSansX","IRANSans","Segoe UI",Tahoma,sans-serif;font-size:14px;line-height:1.2;',
    'padding:11px 13px;border-radius:9px;cursor:pointer;transition:color .25s '+EASE+',background .25s '+EASE+'}',
    '.topbar__menu a:hover,.topbar__menu-trigger:hover{color:'+PAPER+';background:rgba(140,170,220,.08)}',
    '.topbar__menu-trigger{font-weight:600;appearance:none}',
    '.topbar__menu-trigger>i{flex:none;width:7px;height:7px;border-right:1.5px solid currentColor;',
    'border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform .3s '+EASE+'}',
    '.topbar__menu-trigger[aria-expanded="true"]>i{transform:rotate(225deg)}',
    '.topbar__panel{padding:2px 6px 6px;margin:0 10px 4px;border-inline-start:1px solid rgba(140,170,220,.14)}',
    '.topbar__panel[hidden]{display:none}',
    '.topbar__panel a{font-size:13px;padding:9px 11px;border-radius:7px}',
    '.topbar__menu-cta{margin-top:6px;border:1px solid rgba(227,27,35,.5);background:rgba(227,27,35,.1);',
    'color:'+PAPER+';font-weight:600}',
    '.topbar__menu-cta:hover{border-color:rgba(255,120,110,.8);background:rgba(227,27,35,.18)}',
    /* ---- day ----
       Not a light theme. A brighter one.

       This used to invert the content frame, and on a site with no shared
       token system that is the only way to flip 230 hand-written pages at
       once — but it flips only what it is applied to. The homepage paints
       its own black ground outside that element, so light text inverted to
       dark text and sat on a background that never moved. Unreadable, and
       every page with a backdrop of its own had some version of the same
       fault.

       So nothing inverts now. The page is lifted: backgrounds a few stops
       up, colour a touch stronger, and the relationship between text and
       ground preserved exactly as designed. Nothing is blown to white,
       because nothing crosses the middle.

       Media is brought back down by the reciprocal — brightness(a) then
       brightness(1/a) is the identity — so a photograph in day mode is the
       same photograph, which is what "behind the pictures must not break"
       asks for. */
    'html.nvx-day{background:#0E1420}',
    'html.nvx-day body{background:#101725}',
    /* Every direct child of body except the bar, rather than a list of
       container names. The list was the bug: pages here wrap themselves in
       .lesson, .gx, .idx, main, .sd or nothing at all, so naming them
       missed whole page types — and the media rule below, which was not
       scoped to the same set, then darkened pictures on exactly the pages
       whose frame had never been lifted. One rule cannot fall out of step
       with itself. */
    'html.nvx-day body > *:not(.topbar){filter:brightness(1.5) saturate(1.12)}',
    /* The exact reciprocal, and only inside a frame that was lifted:
       brightness(a) then brightness(1/a) is the identity, and saturate
       composes the same way, so a photograph in day mode is byte-for-byte
       the photograph in night mode.

       <picture> is deliberately absent from this list. It draws nothing of
       its own — the <img> inside it does — so listing both applied the
       reciprocal twice and left every responsive image at .667 of its true
       brightness. That was the bug behind the murky pictures: a photograph
       came out darker in day mode than at night. */
    'html.nvx-day body > *:not(.topbar) :is(img,video,canvas,iframe){',
    'filter:brightness(.6667) saturate(.893)}',
    /* The bar sits outside every filtered region, so it is lifted by hand
       to land in the same place the rest of the page arrives at. */
    'html.nvx-day .topbar{background:rgba(26,34,50,.88);border-bottom-color:rgba(160,190,235,.18)}',
    'html.nvx-day .topbar__home,html.nvx-day .topbar__circ{color:#F4F8FF}',
    'html.nvx-day .topbar__circ{border-color:rgba(160,190,235,.28);background:rgba(160,190,235,.10)}',
    'html.nvx-day .topbar__menu{background:rgba(24,32,47,.96);border-color:rgba(160,190,235,.20)}',
    'html.nvx-day .topbar__menu a,html.nvx-day .topbar__menu-trigger,html.nvx-day #topbar .topbar__links .nvxa{color:rgba(240,246,255,.72)}',
    'html.nvx-day .topbar__menu a:hover,html.nvx-day .topbar__menu-trigger:hover,html.nvx-day #topbar .topbar__links .nvxa:hover{color:#FFF;background:rgba(160,190,235,.12)}',
    'html.nvx-day .topbar__menu-trigger>i,html.nvx-day .topbar__panel{border-color:rgba(160,190,235,.24)}',
    /* The wordmark used to vanish below 820px, which left a lone icon on
       every phone. It stays; the tracking and the mark give back the
       width instead. */
    '@media (max-width:560px){.topbar__home{gap:8px}',
    '.topbar__home .topbar__mark{width:34px;height:34px}',
    '.topbar__home .topbar__word{height:14px}}',
    /* Below 380px the emblem carries the brand on its own — the logotype
       is the part that would have to shrink past legibility. */
    '@media (max-width:380px){.topbar__home .topbar__word{display:none}}',
    '@media (max-width:560px){.topbar__row{padding:10px 14px}}',
    '@media (prefers-reduced-motion:reduce){.topbar__menu{transition:none}}'
  ].join('');
  document.head.appendChild(css);

  /* ---- 2. the markup ----
     Root-relative paths so the bar resolves under explore/ too. */
  function href(p){ return '/' + p; }

  var sunSvg = '<svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/></svg>';
  var moonSvg = '<svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 14.2A8.5 8.5 0 0 1 9.8 3.6a8.5 8.5 0 1 0 10.6 10.6z"/></svg>';

  var bar = document.createElement('header');
  bar.className = 'topbar';
  bar.id = 'topbar';
  bar.innerHTML =
    '<nav class="topbar__row" aria-label="Sections">' +
      '<div class="topbar__tail">' +
        '<button class="topbar__circ topbar__burger" id="topburger" type="button" aria-expanded="false" aria-controls="topmenu" aria-label="بازکردن منو">' +
          '<span class="topbar__burger-line"></span><span class="topbar__burger-line"></span><span class="topbar__burger-line"></span>' +
        '</button>' +
      '</div>' +
      '<a class="topbar__home" href="' + href('index.html') + '" aria-label="NAVIDIX — صفحه‌ی اصلی">' +
        '<img class="topbar__mark" src="' + href('navidix-mark.png') + '" alt="" width="40" height="40" decoding="async" />' +
        '<img class="topbar__word" src="' + href('navidix-wordmark.webp') + '" alt="" width="900" height="139" decoding="async" />' +
      '</a>' +
      '<div class="topbar__tail">' +
        '<button class="topbar__circ topbar__back" id="topback" type="button" aria-label="بازگشت">' + btnBackSvg() + '</button>' +
        '<button class="topbar__circ topbar__theme" id="toptheme" type="button" aria-label="روز / شب" aria-pressed="' + DAY + '">' +
           sunSvg + moonSvg +
        '</button>' +
      '</div>' +
    '</nav>' +
    '<div class="topbar__menu" id="topmenu" hidden>' +
      '<div class="topbar__menu-blk">' +
        '<button class="topbar__menu-trigger" type="button" data-panel="p-learn" aria-expanded="false"><span>آموزش و یادگیری</span><i aria-hidden="true"></i></button>' +
        '<div class="topbar__panel" id="p-learn" hidden>' +
          '<a href="' + href('training.html') + '">همه‌ی آموزش‌ها</a>' +
          '<a href="' + href('journey.html') + '">مسیر یادگیری من</a>' +
          '<a href="' + href('ai-start.html') + '">شروع از صفر</a>' +
          '<a href="' + href('ai-prompting.html') + '">ویدیو و پرامپت‌نویسی</a>' +
          '<a href="' + href('brand-content.html') + '">برند و محتوا</a>' +
          '<a href="' + href('hell-grind.html') + '">نمونه‌ها و خطاها</a>' +
        '</div>' +
      '</div>' +
      '<span class="topbar__links"></span>' +
      '<a href="' + href('articles.html') + '"><span>مقاله‌ها</span></a>' +
      '<a href="' + href('prompts.html') + '"><span>پرامپت‌ها</span></a>' +
      '<a href="' + href('gallery.html') + '"><span>گالری</span></a>' +
      '<a href="' + href('documentaries.html') + '"><span>مستندها</span></a>' +
      '<a class="topbar__menu-cta" href="' + href('system.html') + '"><span>خدمات استودیو</span></a>' +
    '</div>';

  function btnBackSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';
  }

  /* put the bar where the old nav was, or at the very top.
     Replaces every simple site header (sitebar, xbar in explore/) with
     the same burger bar. Account-only bars (.bar on me/admin) keep theirs. */
  var old = document.querySelector('.sitebar, .xbar');
  if (old && old.parentNode) old.parentNode.replaceChild(bar, old);
  else document.body.insertBefore(bar, document.body.firstChild);

  /* ---- reveal ---- */
  var landing = document.querySelector('.landing');
  if (landing) {
    /* The homepage hero stays untouched: the reader meets the bar once
       they scroll past the landing, and it goes away again when they come
       back to it.

       It used to only ever appear. Scroll down once and the bar was
       permanent, so returning to the top left it sitting across the
       logotype — the one frame on the site that is supposed to be
       uninterrupted. */
    bar.hidden = true;
    function showBar() {
      bar.hidden = false;
      /* one frame with the element in the flow, so the transition runs
         instead of the bar simply appearing */
      requestAnimationFrame(function () { bar.classList.add('is-in'); });
    }
    function hideBar() {
      bar.classList.remove('is-in');
      /* closeMenu is declared further down and reads variables assigned
         further down still. This only ever runs from the observer, which
         is after all of that, but the guard costs nothing and means the
         order of this file can change without a silent break. */
      if (typeof closeMenu === 'function' && document.getElementById('topmenu')) closeMenu();
      setTimeout(function () {
        if (!bar.classList.contains('is-in')) bar.hidden = true;
      }, 340);
    }
    if (!('IntersectionObserver' in window)) { showBar(); }
    else {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) hideBar();
        else showBar();
      }, { rootMargin: '-45% 0px 0px 0px' }).observe(landing);
    }
  } else {
    bar.classList.add('is-in');
  }

  /* ---- 3. day/night ---- */
  var root = document.documentElement;
  if (DAY) root.classList.add('nvx-day');
  var themeBtn = document.getElementById('toptheme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      DAY = !DAY;
      try { sessionStorage.setItem(KEY, DAY ? '1' : '0'); } catch (e) {}
      root.classList.toggle('nvx-day', DAY);
      themeBtn.setAttribute('aria-pressed', String(DAY));
    });
  }

  /* ---- 4. back ----

     Back means pop the history, not navigate somewhere. Navigating -
     which is what an earlier version of this did, following a ?from=
     parameter with location.href - pushes a new entry, so the reader
     bounced between the page and the one they had just left, forever.
     history.back() removes an entry instead, which is the only thing
     that cannot loop.

     There is no ?from= fallback any more either. It was added to survive
     a reload of the account page, and that turned out to be a problem
     that does not exist: reloading replaces the current entry rather than
     adding one, so the entry underneath is still the page the reader came
     from and history.back() reaches it. The only case it could ever have
     answered - a shared link opened in a fresh tab - carries no history
     to come back to and no parameter either.

     With nothing to pop, home is the honest destination, and replace()
     keeps even that from leaving a step behind. */
  /* One more condition than "is there history": the entry underneath has
     to be a page of this site. A reader who arrived from a search result
     or a Telegram link has a history whose previous entry is that other
     place, and a control drawn in this site's own bar should not be the
     thing that carries them out of it. The referrer is what this
     navigation came from, so a same-origin referrer means the step back
     lands here. */
  function cameFromThisSite() {
    if (history.length < 2) return false;
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer).origin === location.origin;
    } catch (e) { return false; }
  }

  var backBtn = document.getElementById('topback');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (cameFromThisSite()) history.back();
      else location.replace(href('index.html'));
    });
  }

  /* ---- 5. behavior: burger + panels ---- */
  var burger = document.getElementById('topburger'),
      menu = document.getElementById('topmenu');
  if (!burger || !menu) return;

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-in');
    setTimeout(function () { if (!menu.classList.contains('is-in')) menu.hidden = true; }, 320);
  }
  function openMenu() {
    menu.classList.remove('is-in');
    menu.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { menu.classList.add('is-in'); });
    });
    burger.setAttribute('aria-expanded', 'true');
  }
  function closePanels() {
    [].forEach.call(document.querySelectorAll('.topbar__menu-trigger'), function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
    [].forEach.call(document.querySelectorAll('.topbar__panel'), function (p) { p.hidden = true; });
  }

  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  [].forEach.call(document.querySelectorAll('.topbar__menu-trigger'), function (t) {
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var panel = document.getElementById(t.getAttribute('data-panel'));
      if (!panel) return;
      var opening = panel.hidden;
      closePanels();
      if (opening) { t.setAttribute('aria-expanded', 'true'); panel.hidden = false; }
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#topbar')) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanels(); closeMenu(); }
  });
})();