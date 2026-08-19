/* =====================================================================
   NAVIDIX — the top bar + burger menu, on every page.

   One source of truth for the navigation: the mark, the three-line
   button and the dropdown. The homepage (index.html) still carries its
   own inline copy; everywhere else this injects the same bar, removes
   the old <header class="sitebar">, and lets nvx-auth.js mount its
   account control into #topbar .topbar__links as usual.

   Self-contained on purpose — no page needs markup or page-scoped CSS
   variables for it, and it does nothing (leaving the page's own header
   alone) when a #topbar already exists.
   ===================================================================== */
(function () {
  'use strict';

  if (document.getElementById('topbar')) return;   /* homepage has its own inline copy */

  /* ---- palette: hardcoded so it matches on every page regardless of
     the page's own --vars ---- */
  var PAPER      = '#EDF2FA';
  var PAPER_DIM  = 'rgba(237,242,250,.52)';
  var LINE       = 'rgba(140,170,220,.16)';
  var EMBER      = '#FF6A5A';
  var EASE       = 'cubic-bezier(.16,1,.3,1)';

  /* ---- 1. the sheet ---- */
  var css = document.createElement('style');
  css.textContent = [
    '.topbar{position:fixed;inset:0 0 auto;z-index:50;background:rgba(6,8,13,.85);',
    '-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);',
    'border-bottom:1px solid rgba(140,170,220,.11)}',
    '.topbar__row{max-width:1240px;margin:0 auto;padding:11px 18px;display:flex;',
    'align-items:center;justify-content:space-between;gap:18px}',
    '.topbar__lead{display:flex;align-items:center;gap:12px;flex:none}',
    '.topbar__home{display:inline-flex;align-items:center;gap:9px;flex:none;',
    'color:'+PAPER+';text-decoration:none;font-family:"Inter","SF Pro Text","Helvetica Neue",system-ui,sans-serif;',
    'font-size:12.5px;letter-spacing:.2em}',
    '.topbar__home img{display:block;width:30px;height:30px;object-fit:contain}',
    '#topbar .topbar__links{display:flex;flex-direction:column;padding:0;margin:0 0 2px}',
    '#topbar .topbar__links .nvxa{appearance:none;border:0;background:none;color:'+PAPER_DIM+';',
    'font-family:"Estedad","IRANSansX","IRANSans","Segoe UI",Tahoma,sans-serif;font-size:14px;line-height:1.2;',
    'padding:11px 13px;border-radius:9px;cursor:pointer;text-align:start;',
    'transition:color .25s '+EASE+',background .25s '+EASE+';',
    'max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#topbar .topbar__links .nvxa:hover{color:'+PAPER+';background:rgba(140,170,220,.08)}',
    '#topbar .topbar__links .nvxa--in::before{content:"• ";color:'+EMBER+'}',
    '.topbar__burger{appearance:none;border:1px solid '+LINE+';background:rgba(140,170,220,.05);',
    'border-radius:999px;width:34px;height:34px;padding:0;flex:none;cursor:pointer;',
    'display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;',
    'transition:border-color .3s '+EASE+',background .3s '+EASE+'}',
    '.topbar__burger:hover{border-color:rgba(227,27,35,.55);background:rgba(227,27,35,.12)}',
    '.topbar__burger-line{display:block;width:15px;height:1.5px;border-radius:1px;background:'+PAPER_DIM+';',
    'transition:background .3s '+EASE+',transform .3s '+EASE+',opacity .2s '+EASE+'}',
    '.topbar__burger:hover .topbar__burger-line{background:'+PAPER+'}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(1){transform:translateY(5.5px) rotate(45deg)}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(2){opacity:0}',
    '.topbar__burger[aria-expanded="true"] .topbar__burger-line:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}',
    '.topbar__menu{position:fixed;inset-inline-start:18px;top:54px;z-index:51;width:min(320px,calc(100vw - 36px));',
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
    '@media (max-width:820px){.topbar__home span{display:none}}',
    '@media (max-width:560px){.topbar__row{padding:11px 14px}.topbar__menu{width:min(304px,calc(100vw - 24px))}}',
    '@media (prefers-reduced-motion:reduce){.topbar{} .topbar__menu{transition:none}}'
  ].join('');
  document.head.appendChild(css);

  /* ---- 2. the markup ----
     Root-relative paths, so the same bar resolves on the homepage, content
     pages and the explore/ subfolder alike. */
  function href(p){ return '/' + p; }

  var bar = document.createElement('header');
  bar.className = 'topbar';
  bar.id = 'topbar';
  bar.innerHTML =
    '<nav class="topbar__row" aria-label="Sections">' +
      '<div class="topbar__lead">' +
        '<button class="topbar__burger" id="topburger" type="button" aria-expanded="false" aria-controls="topmenu" aria-label="بازکردن منو">' +
          '<span class="topbar__burger-line"></span><span class="topbar__burger-line"></span><span class="topbar__burger-line"></span>' +
        '</button>' +
        '<a class="topbar__home" href="' + href('index.html') + '">' +
          '<img src="' + href('navidix-mark.png') + '" alt="" width="22" height="22" decoding="async" /><span class="lat">NAVIDIX</span>' +
        '</a>' +
      '</div>' +
    '</nav>' +
    '<div class="topbar__menu" id="topmenu" hidden>' +
      '<div class="topbar__menu-blk">' +
        '<button class="topbar__menu-trigger" type="button" data-panel="p-learn" aria-expanded="false"><span>آموزش و یادگیری</span><i aria-hidden="true"></i></button>' +
        '<div class="topbar__panel" id="p-learn" hidden>' +
          '<a href="' + href('training.html') + '">همه‌ی آموزش‌ها</a>' +
          '<a href="' + href('ai-start.html') + '">شروع از صفر</a>' +
          '<a href="' + href('ai-prompting.html') + '">ویدیو و پرامپت‌نویسی</a>' +
          '<a href="' + href('brand-content.html') + '">برند و محتوا</a>' +
          '<a href="' + href('hell-grind.html') + '">نمونه‌ها و خطاها</a>' +
        '</div>' +
      '</div>' +
      '<span class="topbar__links"></span>' +
      '<a href="' + href('prompts.html') + '"><span>پرامپت‌ها</span></a>' +
      '<a href="' + href('gallery.html') + '"><span>گالری</span></a>' +
      '<a href="' + href('documentaries.html') + '"><span>مستندها</span></a>' +
      '<a class="topbar__menu-cta" href="' + href('system.html') + '"><span>خدمات استودیو</span></a>' +
    '</div>';

  /* put the bar where the old nav was, or at the very top.
     Replaces every simple site header (sitebar, xbar in explore/) with
     the same burger bar. Account-only bars (.bar on me/admin) keep theirs. */
  var old = document.querySelector('.sitebar, .xbar');
  if (old && old.parentNode) old.parentNode.replaceChild(bar, old);
  else document.body.insertBefore(bar, document.body.firstChild);

  /* ---- 3. behaviour ---- */
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