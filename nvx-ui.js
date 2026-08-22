/* =====================================================================
   NAVIDIX — the layer that makes the site feel answered.

   Three things, on every page: a ring under the finger or cursor when
   something is pressed, a short haptic tick where the device offers one,
   and a fade between pages so a link does not cut to the next screen.

   Self-contained on purpose. It injects its own styles and binds nothing
   that needs markup changes.

   On "reduce motion" it does less, not nothing. That distinction is the
   whole of this file's accessibility story and it is worth stating.

   The preference is a request to stop things *moving* — parallax, drift,
   anything that travels across the screen or scales up under the finger.
   It is not a request for a dead page. A cross-fade carries no motion:
   nothing changes position, nothing changes size, and there is no
   direction for the eye to follow. So under the preference the ring
   stops, the page stops lifting as it arrives and the scroll-linked
   gradient stops moving — while the fade between pages and the fade-in
   on arrival stay, because they are opacity and nothing else.

   Before this, one boolean turned all four off together, and a Mac with
   Reduce Motion switched on got a site with exactly zero animations
   running. Measured, in the same browser, changing only the preference:
   nine running became none.
   ===================================================================== */
(function () {
  'use strict';

  var mq = matchMedia('(prefers-reduced-motion: reduce)');
  var REDUCED = mq.matches;

  /* Read once at load was a small bug of its own: somebody who turns the
     setting off in System Settings had to reload every open tab before the
     site noticed. Both spellings, because Safari only learned addEventListener
     on MediaQueryList in 14. */
  function watch(fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  watch(function (e) { REDUCED = e.matches; });

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
    /* The ring scales from .4 to 7.5 — that one is motion, and it goes.
       The lift travels ten pixels, so it degrades to the plain fade rather
       than disappearing. nvxFade and the veil are opacity alone and are
       left running. */
    '@media (prefers-reduced-motion:reduce){',
    '  .nvx-ring{animation:none;display:none}',
    '  .nvx-enter-lift{animation:nvxFade .5s ease both}',
    '}'
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
  var lift = document.querySelector('.lesson__main, .lib, .sd');
  if (lift) lift.classList.add('nvx-enter-lift');
  else {
    var main = document.querySelector('#shell, main');
    if (main) main.classList.add('nvx-enter');
  }

  /* ---- 3. and leaves instead of cutting ----
     Only for ordinary same-tab navigation inside the site. A new tab, a
     download, a modifier-click and an in-page anchor all stay untouched. */
  var veil = document.createElement('div');
  veil.className = 'nvx-veil';
  document.body.appendChild(veil);

  addEventListener('click', function (e) {
    /* No REDUCED test here on purpose: the veil is one element going from
       opacity 0 to 1. It does not move, and without it a reader with the
       preference on gets a hard cut between every page on the site. */
    if (e.defaultPrevented || e.button) return;
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

  /* ---- 4. the brand hairline drifts as you scroll ----
     Every card on the site carries a hairline running red into blue. This
     makes that gradient travel with the page instead of sitting still.

     The whole effect is one number. Scroll position becomes --nvx-flow on
     the root element, every .edge::before reads it as a background offset,
     and the work per frame is a single custom-property write — no element
     is measured, no list is walked, nothing is queried. The listener is
     passive and collapses into one write per animation frame, so a fast
     flick costs the same as a slow drag, and once the page stops moving
     nothing runs at all.

     The gradient is laid out twice as wide as its element and shifted by
     half its width over one viewport of scrolling, so the colours slide
     through continuously and never show a seam. */
  if (!REDUCED) {
    var root = document.documentElement, queued = false;

    function flow() {
      queued = false;
      root.style.setProperty('--nvx-flow', (-(scrollY * 0.5) % 200) + '%');
    }
    addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(flow); }
    }, { passive: true });
    flow();
  }
})();
