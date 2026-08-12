/* =====================================================================
   NAVIDIX — the training layer.

   The behaviour half of nvx-training.css, shared by the آموزش‌ها index,
   the lessons and the prompt library. Six small things:

     1. reveal    — sections arrive instead of being there
     2. tilt      — card surfaces tip toward the cursor
     3. diagram   — a flow figure draws its own wire
     4. counters  — the stats strip counts up when it lands
     5. lightbox  — a sample frame opens full size
     6. resize    — the diagram re-measures, once, when it has to

   Written the way nvx-ui.js is written: no dependency, no build step, no
   markup a page has to carry. A page opts in with two tags and gets all
   of it; a page that never links this file is untouched.

   The one invariant worth stating: this script may hide an element only
   if that element is currently off screen. Anything already painted stays
   painted. That is what makes a slow or failed load harmless instead of
   catastrophic — the worst case is a page with no animation, never a page
   with no content.
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE    = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var EASE    = 'cubic-bezier(.16,1,.3,1)';
  var FA      = '۰۱۲۳۴۵۶۷۸۹';

  function all(sel, root) {
    return [].slice.call((root || document).querySelectorAll(sel));
  }

  /* ===================================================================
     1 — reveal

     One observer for the whole page. Everything it watches gets .is-in on
     the way in; only the things that were below the fold when the script
     ran are given .nvx-rv first, so nothing on screen is hidden in order
     to be shown again.

     The stagger is per parent and capped: on a track of four cards the
     delay reads as the cards landing one after another, but on a list of
     twenty the last one would otherwise wait a second and a half for its
     turn, which reads as a page that has not finished loading.
     =================================================================== */
  var TARGETS = [
    '.nvx-fig', '.nvx-hero',
    '.idx .feat', '.idx .cards > a', '.idx .grp__head', '.idx .grp__sub',
    '.lesson .stat',
    '.lesson .rule', '.lesson .branch', '.lesson .step', '.lesson details',
    '.lesson .correction', '.lesson .pbox', '.lesson .gauge', '.lesson .forge',
    '.lesson .quiz', '.lesson .picker', '.lesson .demo', '.lesson .funnel',
    '.lesson .slate', '.lesson .intro', '.lesson pre', '.lesson .swap',
    '.lib .pc', '.lib .grp2__head', '.sd__stage', '.rel a'
  ].join(',');

  var io = null;

  function watch() {
    var els = all(TARGETS);
    if (!els.length) return;

    /* group by parent so siblings share a stagger sequence */
    var seen = typeof Map === 'function' ? new Map() : null;
    var fold = innerHeight * 0.92;

    els.forEach(function (el) {
      var p = el.parentNode, n = 0;
      if (seen) { n = seen.get(p) || 0; seen.set(p, n + 1); }
      el.style.setProperty('--nvx-d', Math.min(n, 5) * 70 + 'ms');

      /* below the fold, so hiding it costs the reader nothing */
      if (!REDUCED && el.getBoundingClientRect().top > fold) el.classList.add('nvx-rv');
    });

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { arrive(el); });
      return;
    }

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        arrive(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });
  }

  function arrive(el) {
    el.classList.add('is-in');
    if (el.classList.contains('nvx-rv')) {
      /* the layer is worth holding for the length of the transition and
         not one frame longer — a long track would otherwise keep a
         compositor layer per card for the life of the page */
      setTimeout(function () { el.classList.add('is-done'); }, 1300);
    }
    if (el.classList.contains('stat')) countUp(el.querySelector('.v'));
  }

  /* ===================================================================
     2 — tilt

     The angles go out as custom properties and the transform that reads
     them lives in CSS, so a frame here is two string writes and nothing
     else: no layout is read while the pointer moves, because the card's
     box is measured once on entry rather than on every event.

     Skipped wholesale where it would be nonsense — a finger has nothing
     to tip a card toward, and .sd__hero already carries its own.
     =================================================================== */
  var TILTABLE = '.idx .cards > a, .idx .feat, .lib .pc, .rel a, .pager a';

  function tilt() {
    if (REDUCED || !FINE || innerWidth < 760) return;

    all(TILTABLE).forEach(function (el) {
      if (el.closest('.sd__stage')) return;
      el.classList.add('nvx-tilt');

      var box = null, raf = 0, rx = 0, ry = 0, mx = 50, my = 50;

      function paint() {
        raf = 0;
        el.style.setProperty('--nvx-rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--nvx-ry', ry.toFixed(2) + 'deg');
        el.style.setProperty('--nvx-mx', mx.toFixed(1) + '%');
        el.style.setProperty('--nvx-my', my.toFixed(1) + '%');
      }

      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        box = el.getBoundingClientRect();
        el.classList.add('is-live');
      });

      el.addEventListener('pointermove', function (e) {
        if (!box || e.pointerType !== 'mouse') return;
        var fx = (e.clientX - box.left) / box.width;
        var fy = (e.clientY - box.top) / box.height;
        /* small angles on purpose: a card that swings is a toy, a card
           that leans is a surface */
        ry = (fx - 0.5) * 7;
        rx = (fy - 0.5) * -5;
        mx = fx * 100;
        my = fy * 100;
        if (!raf) raf = requestAnimationFrame(paint);
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        box = null;
        el.classList.remove('is-live');
        rx = ry = 0; mx = my = 50;
        if (!raf) raf = requestAnimationFrame(paint);
      });
    });
  }

  /* ===================================================================
     3 — the diagram

     A <ol> of steps becomes a flow: a rail above the row (or beside the
     column, on a phone), a station on the rail over each step, and a stem
     down to it. The rail is one path that draws itself when the figure
     lands, and a dot runs it afterwards.

     Geometry comes from offsetLeft/offsetTop rather than
     getBoundingClientRect, and the difference matters: the steps settle
     out of a slight rotateX when they arrive, and a rect measured mid-
     rotation would put the rail somewhere the steps are not. Offsets are
     layout values — a transform cannot move them.
     =================================================================== */
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* offsetLeft/offsetTop are relative to the nearest positioned ancestor,
     and both the list and its items are positioned — so a step's offsets
     are measured from the list, not from the figure the svg is pinned to.
     Walk the chain and add the borders crossed on the way up. */
  function offsetIn(node, root) {
    var x = 0, y = 0, n = node;
    while (n && n !== root && n.offsetParent) {
      x += n.offsetLeft; y += n.offsetTop;
      n = n.offsetParent;
      if (n && n !== root) { x += n.clientLeft; y += n.clientTop; }
    }
    return { x: x, y: y };
  }

  function drawFigure(fig) {
    var steps = fig.querySelector('.nvx-fig__steps');
    if (!steps) return;
    var lis = all('li', steps);
    if (lis.length < 2) return;

    var w = fig.offsetWidth, h = fig.offsetHeight;
    if (!w || !h) return;

    /* offsetLeft is measured from the offsetParent's padding edge; the
       svg is pinned to its border box, so the border is the difference */
    var bx = fig.clientLeft, by = fig.clientTop;

    var horizontal = Math.abs(lis[1].offsetTop - lis[0].offsetTop) < 4;

    /* offsetLeft is measured from the left in both writing directions, so
       in a column the reserved lane — margin-inline-start — is the space
       past the right edge of the steps, not before their left one. */
    var rtl = getComputedStyle(fig).direction === 'rtl';

    var pts = lis.map(function (li) {
      var o = offsetIn(li, fig);
      return {
        cx: bx + o.x + li.offsetWidth / 2,
        cy: by + o.y + li.offsetHeight / 2,
        top: by + o.y,
        edge: bx + o.x + (rtl ? li.offsetWidth : 0)
      };
    });

    /* the rail sits in the margin the stylesheet reserves for it */
    var lane = horizontal
      ? Math.max(10, pts[0].top - 26)
      : pts[0].edge + (rtl ? 17 : -17);

    var first = pts[0], last = pts[pts.length - 1];
    var d = horizontal
      ? 'M' + first.cx + ' ' + lane + 'H' + last.cx
      : 'M' + lane + ' ' + first.cy + 'V' + last.cy;

    var svg = fig.querySelector('.nvx-fig__wire');
    if (!svg) {
      svg = el('svg', { class: 'nvx-fig__wire', 'aria-hidden': 'true', focusable: 'false' });
      fig.insertBefore(svg, fig.firstChild);
    }
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('preserveAspectRatio', 'none');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(el('path', { class: 'rail', d: d }));

    /* the stems: rail down to each step, drawn on the dim rail so they
       read as structure rather than as part of the travelling line */
    pts.forEach(function (p) {
      svg.appendChild(el('path', {
        class: 'rail',
        d: horizontal
          ? 'M' + p.cx + ' ' + lane + 'V' + p.top
          : 'M' + lane + ' ' + p.cy + 'H' + p.edge
      }));
    });

    var live = el('path', { class: 'live', d: d });
    svg.appendChild(live);

    pts.forEach(function (p) {
      svg.appendChild(el('circle', {
        class: 'node', r: 3.5,
        cx: horizontal ? p.cx : lane,
        cy: horizontal ? lane : p.cy
      }));
    });

    var len = 0;
    try { len = live.getTotalLength(); } catch (_) { len = horizontal ? w : h; }
    fig.style.setProperty('--nvx-len', Math.ceil(len) + 1);

    /* the pulse only exists where the browser can move it along a path,
       and never on a phone or under reduced motion — it is the one loop
       on these pages, and a loop is the first thing that should go */
    var pulse = fig.querySelector('.nvx-fig__pulse');
    var wanted = !REDUCED && innerWidth >= 760 &&
                 window.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0H1")');
    if (!wanted) { if (pulse) pulse.remove(); return; }
    if (!pulse) {
      pulse = document.createElement('span');
      pulse.className = 'nvx-fig__pulse';
      pulse.setAttribute('aria-hidden', 'true');
      fig.appendChild(pulse);
    }
    pulse.style.offsetPath = 'path("' + d + '")';
  }

  function figures() {
    all('.nvx-fig').forEach(drawFigure);
  }

  /* ===================================================================
     4 — counters

     The numbers in a stats strip are the claim the section is making, so
     they count rather than appear. Everything around the number is left
     exactly as written — the tilde in ~$500K, the currency, the K — and
     the digits are handed back in the script they arrived in, Persian or
     Latin, with the same thousands separator.
     =================================================================== */
  var NUM = /[0-9۰-۹٠-٩][0-9۰-۹٠-٩.,٬٫]*/;

  function toLatin(s) {
    return s.replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; })
            .replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; });
  }

  function countUp(node) {
    if (!node || REDUCED || node.dataset.nvxCounted) return;
    /* the value is rewritten as text, so a value built out of elements —
       a number with its unit in a <small>, say — is left alone rather
       than flattened into a string on the way past */
    if (node.children.length) return;
    var raw = node.textContent, m = raw.match(NUM);
    if (!m) return;

    var body  = m[0];
    var persian = /[۰-۹]/.test(body);
    var sepCh = /[,٬]/.exec(body);
    var sep   = sepCh ? sepCh[0] : '';
    var plain = toLatin(body).replace(/[,٬]/g, '');

    /* a decimal is a measurement, not a tally — ticking it up reads as a
       value still settling rather than one being counted out */
    if (plain.indexOf('.') > -1) return;
    var end = parseInt(plain, 10);
    if (!isFinite(end) || end < 2 || end > 1e9) return;

    node.dataset.nvxCounted = '1';
    var head = raw.slice(0, m.index), tail = raw.slice(m.index + body.length);
    var t0 = 0, dur = 1150;

    function render(v) {
      var s = String(v);
      if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      if (persian) s = s.replace(/[0-9]/g, function (d) { return FA[+d]; });
      node.textContent = head + s + tail;
    }

    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      render(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
      else node.textContent = raw;          /* land on the exact original */
    }
    render(0);
    requestAnimationFrame(frame);
  }

  /* ===================================================================
     5 — the lightbox

     The sample frames are the output the lesson is about, and at card
     size the reader cannot see what the prompt actually did. Two kinds of
     target: a frame that is its own element and simply opens, and a frame
     that lives inside a link to somewhere else — that one gets a zoom
     button, because hijacking the card's click would cost the reader the
     page the card is for.
     =================================================================== */
  var lb = null, shots = [], at = 0, restoreTo = null;

  function collect() {
    var out = [];

    all('.sd__hero').forEach(function (h) {
      var img = h.querySelector('img');
      if (!img) return;
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      h.setAttribute('aria-label', 'بزرگ‌نمایی تصویر');
      var i = out.length;
      out.push(img);
      h.addEventListener('click', function () { open(i); });
      h.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    /* a frame inside a link to somewhere else: the card keeps its click,
       the zoom gets a control of its own */
    all('.pc__sw, [data-nvx-zoom]').forEach(function (sw) {
      var img = sw.querySelector('img');
      if (!img) return;
      var i = out.length;
      out.push(img);

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nvx-zoom';
      b.setAttribute('aria-label', 'بزرگ‌نمایی نمونه‌ی خروجی');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                    'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
                    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.7-4.7M10.5 8v5M8 10.5h5"/></svg>';
      b.addEventListener('click', function (e) {
        /* inside a card link: stop the navigation, and stop nvx-ui from
           seeing a click it would fade the page out for */
        e.preventDefault();
        e.stopPropagation();
        open(i);
      });
      sw.appendChild(b);
    });

    return out;
  }

  function build() {
    lb = document.createElement('div');
    lb.className = 'nvx-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'نمایش بزرگ تصویر');
    var chev = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
               '<path d="M9 5l7 7-7 7"/></svg>';
    lb.innerHTML =
      '<figure class="nvx-lb__fig">' +
        '<img alt="" decoding="async" />' +
        '<figcaption class="nvx-lb__cap"><b></b><span class="nvx-lb__n"></span></figcaption>' +
      '</figure>' +
      '<button type="button" class="nvx-lb__x" aria-label="بستن">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      '<button type="button" class="nvx-lb__prev" aria-label="تصویر پیشین">' + chev + '</button>' +
      '<button type="button" class="nvx-lb__next" aria-label="تصویر بعدی">' + chev + '</button>';
    document.body.appendChild(lb);

    lb.querySelector('.nvx-lb__x').addEventListener('click', close);
    lb.querySelector('.nvx-lb__prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.nvx-lb__next').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

    /* a swipe is the only way a phone reader has to ask for the next one */
    var x0 = null;
    lb.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);   /* rtl: leftward is onward */
    });

    /* Capture, not bubble. The library page binds "/" to its search box
       and Escape to clearing it, both on document — from behind an open
       overlay, either would move the focus somewhere the reader cannot
       see. While the lightbox is up it takes the keys first and keeps
       them. */
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape' || e.key === '/' || e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' || e.key === 'Tab') e.stopPropagation();

      if (e.key === 'Escape')     { close(); }
      else if (e.key === 'ArrowLeft')  { step(1); }
      else if (e.key === 'ArrowRight') { step(-1); }
      else if (e.key === '/')     { e.preventDefault(); }
      else if (e.key === 'Tab') {
        /* three buttons and nothing else: keep the ring inside them */
        var btns = all('button', lb).filter(function (b) { return b.offsetParent; });
        if (!btns.length) return;
        var i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    }, true);
  }

  function show() {
    var src = shots[at];
    var img = lb.querySelector('img');
    img.src = src.currentSrc || src.src;
    img.alt = src.alt || '';
    lb.querySelector('.nvx-lb__cap b').textContent = src.alt || '';
    lb.querySelector('.nvx-lb__n').textContent = shots.length > 1
      ? fa(at + 1) + ' از ' + fa(shots.length) : '';
    lb.setAttribute('data-single', shots.length > 1 ? '0' : '1');

    /* the next one is usually the next thing asked for */
    [at + 1, at - 1].forEach(function (i) {
      var n = shots[(i + shots.length) % shots.length];
      if (n && n !== src) { var p = new Image(); p.src = n.currentSrc || n.src; }
    });
  }

  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }

  function open(i) {
    if (!lb) build();
    at = i;
    restoreTo = document.activeElement;
    show();
    document.documentElement.classList.add('nvx-lb-lock');
    lb.classList.add('is-open');
    lb.querySelector('.nvx-lb__x').focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('nvx-lb-lock');
    if (restoreTo && restoreTo.focus) restoreTo.focus();
    restoreTo = null;
  }

  function step(d) {
    if (shots.length < 2) return;
    at = (at + d + shots.length) % shots.length;
    show();
  }

  /* ===================================================================
     6 — start, and re-measure

     The diagram is the only thing here that depends on layout, so it is
     the only thing that listens for a change to it. A resize redraws it
     on the next idle frame; a webfont landing changes step heights, so
     that counts as a resize too.
     =================================================================== */
  function boot() {
    watch();
    tilt();
    figures();
    shots = collect();

    var t = 0;
    addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(figures, 140);
    }, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(figures).catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
