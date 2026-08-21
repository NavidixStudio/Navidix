/* =====================================================================
   NAVIDIX — THE OUTLINE RAIL

   A column of section names down the side of a long page. It says where
   you are, and one click takes you anywhere else. Pages here run from
   five to fifteen screens; scrolling through fifteen screens to find the
   part about lighting is not reading, it is searching with a worse tool.

   It is a real table of contents, not decoration: a <nav> of links to
   real ids, so a keyboard reaches it, a screen reader lists it, and
   middle-click opens a section in a new tab. Headings that have no id
   are given one from their own text, so nothing had to be edited across
   two hundred pages to make this work.

   It appears only when it earns the room: a page at least three screens
   tall, at least three sections, and a viewport wide enough that the
   rail sits beside the text rather than on top of it. Below that it does
   not render at all — a table of contents that covers the words is worse
   than none.
   ===================================================================== */
(function () {
  'use strict';

  var MIN_SECTIONS = 3;
  var MIN_SCREENS  = 3;
  /* The reading column is 980px. Below this there is no room beside it
     for a 190px rail plus its gutters, and anything narrower than that
     turns the labels into ellipses. */
  var MIN_WIDTH    = 1280;

  var SELECTOR = '.lesson .wrap > h2, .sd > h2, .body h2, main > h2, .wrap > h2';

  function slugify(text, i) {
    var s = String(text || '').trim().toLowerCase()
      .replace(/[\s‌]+/g, '-')
      .replace(/[^؀-ۿ\w-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return s ? 'b-' + s : 'b-' + (i + 1);
  }

  function headings() {
    var out = [], seen = {};
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (h, i) {
      var text = (h.textContent || '').trim();
      if (!text) return;
      if (!h.id) {
        var id = slugify(text, i);
        /* Two sections can share a name; an id cannot. */
        while (seen[id] || document.getElementById(id)) id = id + '-' + (i + 1);
        h.id = id;
      }
      seen[h.id] = true;
      out.push(h);
    });
    return out;
  }

  function styles() {
    var css = document.createElement('style');
    css.textContent = [
      '.nvxo{position:fixed;z-index:8;inset-block-start:50%;transform:translateY(-50%);',
      '  inset-inline-end:calc(50% + 500px + 26px);width:190px;max-height:70vh;',
      '  overflow-y:auto;scrollbar-width:none;',
      '  opacity:0;transition:opacity .5s cubic-bezier(.16,1,.3,1);pointer-events:none}',
      '.nvxo::-webkit-scrollbar{display:none}',
      '.nvxo.is-in{opacity:1;pointer-events:auto}',
      '.nvxo__a{display:block;position:relative;padding:6px 0 6px 12px;',
      '  font-family:inherit;font-size:12px;line-height:1.65;text-decoration:none;',
      '  color:rgba(200,208,218,.34);',
      '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
      '  transition:color .3s ease}',
      /* The tick is the whole indicator: a hairline that grows and takes
         the brand colour on the section you are in. No box, no fill -
         anything heavier competes with the text it is meant to serve. */
      '.nvxo__a::before{content:"";position:absolute;inset-block:9px auto;height:11px;',
      '  inset-inline-start:0;width:1px;background:rgba(150,180,225,.3);',
      '  transition:background .3s ease,height .3s ease,inset-block-start .3s ease}',
      '.nvxo__a:hover{color:rgba(237,242,250,.9)}',
      '.nvxo__a:hover::before{background:rgba(150,180,225,.7)}',
      '.nvxo__a:focus-visible{outline:1px solid #7FB8FF;outline-offset:2px;border-radius:3px}',
      '.nvxo__a.is-here{color:#EDF2FA}',
      '.nvxo__a.is-here::before{background:#E5202A;height:19px;inset-block-start:5px}',
      '@media (prefers-reduced-motion:reduce){',
      '  .nvxo,.nvxo__a,.nvxo__a::before{transition:none}}'
    ].join('');
    document.head.appendChild(css);
  }

  var built = false;

  /* Returns false when there was nothing to build from, so the caller
     knows whether it is worth waiting for content to arrive. */
  function build() {
    if (built) return true;
    if (innerWidth < MIN_WIDTH) return true;

    var hs = headings();
    if (hs.length < MIN_SECTIONS) return false;
    if (document.body.scrollHeight < innerHeight * MIN_SCREENS) return false;

    built = true;
    styles();

    var nav = document.createElement('nav');
    nav.className = 'nvxo';
    nav.setAttribute('aria-label', 'فهرست این صفحه');

    var links = hs.map(function (h) {
      var a = document.createElement('a');
      a.className = 'nvxo__a';
      a.href = '#' + h.id;
      a.textContent = (h.textContent || '').trim();
      a.title = a.textContent;
      nav.appendChild(a);
      return a;
    });

    document.body.appendChild(nav);
    requestAnimationFrame(function () { nav.classList.add('is-in'); });

    /* Which section you are in is the last heading above the fold line,
       not the first one intersecting - with headings closer together
       than a screen, several are on screen at once and "first visible"
       flickers between them as you scroll. */
    var current = -1;
    function mark() {
      var line = innerHeight * 0.28, at = 0;
      for (var i = 0; i < hs.length; i++) {
        if (hs[i].getBoundingClientRect().top <= line) at = i; else break;
      }
      if (at === current) return;
      if (current > -1) links[current].classList.remove('is-here');
      links[at].classList.add('is-here');
      links[at].removeAttribute('aria-current');
      links[at].setAttribute('aria-current', 'true');
      if (current > -1) links[current].removeAttribute('aria-current');
      current = at;

      /* Keep the marked entry in view when the list is longer than the
         rail: a highlight you cannot see is not a highlight. */
      var r = links[at].getBoundingClientRect(), n = nav.getBoundingClientRect();
      if (r.top < n.top + 8) nav.scrollTop -= (n.top + 8 - r.top);
      else if (r.bottom > n.bottom - 8) nav.scrollTop += (r.bottom - n.bottom + 8);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { mark(); ticking = false; });
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () {
      /* The rail is positioned from the centre of the viewport, so it
         follows a resize on its own - but it has to leave entirely when
         the window is no longer wide enough for it. */
      nav.hidden = innerWidth < MIN_WIDTH;
      onScroll();
    });
    mark();

    /* The bar at the top of the site is fixed, so an anchor jump lands
       the heading underneath it. scroll-margin moves the landing point
       down by the bar's height plus a little air. */
    hs.forEach(function (h) { h.style.scrollMarginTop = '96px'; });
  }

  /* Some pages write their own body from script - an article fetches its
     Markdown and renders it - so at DOMContentLoaded there is nothing to
     make an outline from. Rather than guess at a delay, watch for
     headings to appear and build the moment they do, then stop watching.
     The window is bounded so a page that never grows any does not leave
     an observer running for the session. */
  function start() {
    if (build() !== false) return;

    var mo, timer;
    function stop() {
      if (mo) mo.disconnect();
      clearTimeout(timer);
    }
    if (!('MutationObserver' in window)) return;
    mo = new MutationObserver(function () {
      if (document.querySelectorAll(SELECTOR).length >= MIN_SECTIONS) {
        stop();
        build();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    timer = setTimeout(stop, 8000);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
}());
