/* =====================================================================
   NAVIDIX — the layer that makes the site feel answered.

   Three things, on every page: a ring under the finger or cursor when
   something is pressed, a short haptic tick where the device offers one,
   and a fade between pages so a link does not cut to the next screen.

   Self-contained on purpose. It injects its own styles, binds nothing that
   needs markup changes, and does nothing at all when the reader has asked
   for reduced motion.
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- styles, so no page has to carry them ---- */
  var css = document.createElement('style');
  css.textContent = [
    '.nvx-ring{position:fixed;z-index:9998;pointer-events:none;border-radius:50%;',
    '  width:14px;height:14px;margin:-7px 0 0 -7px;',
    '  border:1px solid rgba(233,244,255,.55);',
    '  background:radial-gradient(circle, rgba(233,244,255,.20), rgba(233,244,255,0) 68%);',
    '  animation:nvxRing .58s cubic-bezier(.16,1,.3,1) forwards}',
    '.nvx-ring.hot{border-color:rgba(255,138,128,.7);',
    '  background:radial-gradient(circle, rgba(227,32,42,.26), rgba(227,32,42,0) 68%)}',
    '@keyframes nvxRing{from{transform:scale(.4);opacity:.95}to{transform:scale(7.5);opacity:0}}',
    '.nvx-veil{position:fixed;inset:0;z-index:9999;pointer-events:none;background:#08090B;',
    '  opacity:0;transition:opacity .32s cubic-bezier(.4,0,1,1)}',
    '.nvx-veil.on{opacity:1}',
    '.nvx-enter{animation:nvxFade .62s cubic-bezier(.16,1,.3,1) both}',
    '.nvx-enter-lift{animation:nvxRise .62s cubic-bezier(.16,1,.3,1) both}',
    '@keyframes nvxFade{from{opacity:0}to{opacity:1}}',
    '@keyframes nvxRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.nvx-ring,.nvx-veil,.nvx-enter,.nvx-enter-lift{animation:none;transition:none}}'
  ].join('');
  document.head.appendChild(css);

  /* ---- 1. the ring, and a tick under the finger ----
     Drawn on the page rather than inside the control: a ring clipped by its
     own button stops looking like something spreading across a surface. */
  var PRESSABLE = 'a.panel,a.hcta,a.cta,a.film,a.social,button,.chip,.pcopy,' +
                  '.picker button,.quiz button,.flip button,a[data-tags],.hcta,#lang button';

  addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest(PRESSABLE);
    if (!t) return;

    if (navigator.vibrate) { try { navigator.vibrate(9); } catch (_) {} }
    if (REDUCED) return;

    var r = document.createElement('span');
    r.className = 'nvx-ring' + (t.classList.contains('hcta--main') ||
                                t.closest('.hcta--main') ? ' hot' : '');
    r.style.left = e.clientX + 'px';
    r.style.top  = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 620);
  }, { passive: true });

  /* ---- 2. the page arrives instead of appearing ----
     A transform on an ancestor makes it the containing block for every
     position:fixed descendant inside it, which silently re-anchors overlays
     to the page instead of the viewport. The homepage keeps its portals in
     a fixed overlay inside <main>, so that container fades and does not
     move; containers known to hold nothing fixed get the small lift too. */
  if (!REDUCED) {
    var lift = document.querySelector('.lesson__main, .lib, .sd');
    if (lift) lift.classList.add('nvx-enter-lift');
    else {
      var main = document.querySelector('#shell, main');
      if (main) main.classList.add('nvx-enter');
    }
  }

  /* ---- 3. and leaves instead of cutting ----
     Only for ordinary same-tab navigation inside the site. A new tab, a
     download, a modifier-click and an in-page anchor all stay untouched. */
  var veil = document.createElement('div');
  veil.className = 'nvx-veil';
  document.body.appendChild(veil);

  addEventListener('click', function (e) {
    if (REDUCED || e.defaultPrevented || e.button) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

    var href = a.getAttribute('href');
    if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;

    var url;
    try { url = new URL(a.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;   // same page, an anchor

    e.preventDefault();
    veil.classList.add('on');
    setTimeout(function () { location.href = a.href; }, 300);
  });

  /* Coming back through history reuses the cached page with the veil still
     up, so it has to be cleared on show as well as on load. */
  addEventListener('pageshow', function () { veil.classList.remove('on'); });
})();
