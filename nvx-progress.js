/* =====================================================================
   NAVIDIX — the progress layer.

   What a reader has read, how long they spent, and how many days in a row
   they came back. All of it on this browser, in one key, with no account
   and no network. A later phase syncs the same shape to a server for
   readers who choose to sign in; nothing here has to change when it does.

   Four things:

     1. state     — one localStorage key, read and written whole
     2. clock     — seconds counted only while the page is really being read
     3. lesson    — a completion panel, injected before the pager
     4. index     — the training list and the journey page, marked up live

   Written the way nvx-ui.js is written: no dependency, no build step, no
   markup a page has to carry. A page opts in with one script tag. A page
   that never links this file is untouched.

   Two invariants worth stating. Nothing here ever hides content that is
   already on screen — the worst case is a page without a progress panel,
   never a page without its lesson. And every localStorage call is wrapped:
   private mode, a full quota and a disabled store all end in the same
   place, which is the site working exactly as it did before.
   ===================================================================== */
(function () {
  'use strict';

  var KEY  = 'nvx-progress-v1';
  var TICK = 15;        // seconds added per heartbeat
  var IDLE = 90000;     // no input for this long and the reader is gone
  var FA   = '۰۱۲۳۴۵۶۷۸۹';

  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return FA[+d]; });
  }

  /* ===================================================================
     1 — state

     One object, read whole and written whole. It is a few hundred bytes
     even after a year of daily reading, so there is nothing to gain from
     a cleverer layout and a lot to lose: a shape this simple is one that
     a later sync can post to a server without translation.

         lessons  slug -> { done, at, sec }
         days     'YYYY-MM-DD' (Tehran) -> seconds
         streak   { cur, max, last }
     =================================================================== */
  function fresh() {
    return { v: 1, lessons: {}, days: {}, streak: { cur: 0, max: 0, last: '' }, first: Date.now() };
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (!s || s.v !== 1) return fresh();
      s.lessons = s.lessons || {};
      s.days    = s.days    || {};
      s.streak  = s.streak  || { cur: 0, max: 0, last: '' };
      return s;
    } catch (e) { return fresh(); }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ---- days, in the reader's own week ----
     A streak that rolls over at UTC midnight breaks at 3:30 in the
     morning Tehran time, which reads as the site losing the streak while
     the reader was asleep. Every day boundary here is Tehran's. */
  var DAYFMT = null;
  try { DAYFMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }); } catch (e) {}

  function today() {
    if (DAYFMT) { try { return DAYFMT.format(new Date()); } catch (e) {} }
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function shift(day, n) {
    var p = day.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* Called on any real activity. Yesterday continues the run, anything
     older starts a new one, and the same day twice does nothing. */
  function touch(s) {
    var t = today();
    if (s.streak.last === t) return;
    s.streak.cur = (s.streak.last === shift(t, -1)) ? s.streak.cur + 1 : 1;
    if (s.streak.cur > s.streak.max) s.streak.max = s.streak.cur;
    s.streak.last = t;
  }

  /* ===================================================================
     2 — the clock

     Time is only counted while the tab is visible and the reader has done
     something in the last ninety seconds. Without both tests a tab left
     open overnight reports eight hours of study, and once one number in a
     dashboard is nonsense the reader stops believing any of them.
     =================================================================== */
  var seen = Date.now();

  ['pointerdown', 'keydown', 'scroll', 'pointermove'].forEach(function (ev) {
    addEventListener(ev, function () { seen = Date.now(); }, { passive: true });
  });

  function beat() {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - seen > IDLE) return;

    var s = load(), t = today();
    s.days[t] = (s.days[t] || 0) + TICK;
    if (SLUG) {
      var l = s.lessons[SLUG] || (s.lessons[SLUG] = {});
      l.sec = (l.sec || 0) + TICK;
    }
    touch(s);
    save(s);
  }

  /* ===================================================================
     3 — what the numbers add up to
     =================================================================== */
  function stats() {
    var s = load(), C = window.NVX_CURRICULUM;
    var total = 0, week = 0, t = today(), wk = {}, d;

    for (var i = 0; i < 7; i++) wk[shift(t, -i)] = 1;
    for (d in s.days) {
      total += s.days[d];
      if (wk[d]) week += s.days[d];
    }

    var done = 0;
    for (var k in s.lessons) if (s.lessons[k].done) done++;

    var all = C ? C.total : 0;
    return {
      week: week, total: total, done: done, all: all,
      pct: all ? Math.round(done / all * 100) : 0,
      streak: s.streak.cur, best: s.streak.max,
      lessons: s.lessons
    };
  }

  /* A separator followed straight away by a digit is a trap in RTL: the
     reader sees "…دقیقه · ۴ روز" as "دقیقه ۴۰". Every clause after a middle
     dot therefore begins with a word, never a numeral. */
  function hours(sec) {
    if (sec < 60) return fa(sec) + ' ثانیه';
    if (sec < 3600) return fa(Math.round(sec / 60)) + ' دقیقه';
    var h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
    return fa(h) + ' ساعت' + (m ? ' و ' + fa(m) + ' دقیقه' : '');
  }

  function isDone(slug) {
    var l = load().lessons[slug];
    return !!(l && l.done);
  }

  function setDone(slug, on) {
    var s = load();
    var l = s.lessons[slug] || (s.lessons[slug] = {});
    l.done = !!on;
    l.at = on ? Date.now() : 0;
    touch(s);
    save(s);
  }

  /* Where a slug sits in the path, and what comes after it. */
  function nextOf(slug) {
    var C = window.NVX_CURRICULUM;
    if (!C) return null;
    var flat = [], i, j;
    for (i = 0; i < C.stages.length; i++)
      for (j = 0; j < C.stages[i].lessons.length; j++)
        flat.push(C.stages[i].lessons[j]);
    for (i = 0; i < flat.length; i++)
      if (flat[i].slug === slug) return flat[i + 1] || null;
    return null;
  }

  function slugOf(path) {
    var m = /([^\/]+)\.html?$/.exec(path || location.pathname);
    return m ? m[1] : '';
  }

  /* Only a slug the curriculum knows about counts as a lesson. */
  function known(slug) {
    var C = window.NVX_CURRICULUM;
    if (!C || !slug) return false;
    for (var i = 0; i < C.stages.length; i++)
      for (var j = 0; j < C.stages[i].lessons.length; j++)
        if (C.stages[i].lessons[j].slug === slug) return true;
    return false;
  }

  var SLUG = '';

  /* ===================================================================
     4 — styles

     Injected rather than added to a stylesheet, so a page needs one tag
     and nothing else. Every colour below is already in the site: the
     #08090B ground, the #E5202A ember, the steel and the hairline.
     =================================================================== */
  function styles() {
    var css = document.createElement('style');
    css.textContent = [
      '.nvxp{margin:44px 0 8px;padding:20px 22px;border-radius:14px;',
      '  border:1px solid #262A31;background:linear-gradient(158deg,rgba(32,38,48,.6),rgba(10,12,16,.76));}',
      '.nvxp__q{margin:0 0 14px;font-size:15px;line-height:1.9;color:#EDF2FA;font-weight:600;}',
      '.nvxp__row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}',
      '.nvxp__btn{appearance:none;border:1px solid #3A4250;background:#12161C;color:#EDF2FA;',
      '  font:inherit;font-size:13.5px;font-weight:600;padding:11px 20px;border-radius:10px;',
      '  cursor:pointer;transition:border-color .25s,background .25s,transform .2s;}',
      '.nvxp__btn:hover{border-color:rgba(150,196,255,.55);transform:translateY(-1px);}',
      '.nvxp.is-done .nvxp__btn{background:#7FB8FF;border-color:#7FB8FF;color:#08090B;}',
      '.nvxp__meta{font-size:12.5px;color:#8C939B;line-height:1.9;}',
      '.nvxp__next{font-size:13px;color:#7FB8FF;font-weight:600;text-decoration:none;}',
      '.nvxp__next:hover{color:#A9CEFF;}',
      '.nvxp__bar{height:5px;border-radius:99px;background:#181C23;overflow:hidden;margin:14px 0 0;}',
      '.nvxp__bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#E5202A,#7FB8FF);',
      '  transition:width .8s cubic-bezier(.16,1,.3,1);}',
      /* the strip on training.html */
      '.nvxs{margin:0 0 26px;padding:15px 17px;border-radius:12px;border:1px solid #1E232B;',
      '  background:rgba(16,19,25,.6);display:flex;align-items:center;gap:16px;flex-wrap:wrap;}',
      '.nvxs__t{font-size:13px;color:#C8D0DA;line-height:1.8;flex:1;min-width:190px;}',
      '.nvxs__t b{color:#EDF2FA;font-variant-numeric:tabular-nums;}',
      '.nvxs__go{font-size:12.5px;color:#7FB8FF;font-weight:600;text-decoration:none;white-space:nowrap;}',
      '.nvxs__go:hover{color:#A9CEFF;}',
      /* a tick on a finished card, wherever the card lives */
      '.nvx-done{position:relative;}',
      '.nvx-done::after{content:"✓";position:absolute;top:10px;inset-inline-end:12px;',
      '  width:19px;height:19px;border-radius:50%;background:#7FB8FF;color:#08090B;',
      '  font-size:11px;font-weight:700;display:grid;place-items:center;z-index:2;}',
      '@media (prefers-reduced-motion:reduce){.nvxp__btn,.nvxp__bar i{transition:none;}}'
    ].join('');
    document.head.appendChild(css);
  }

  /* ===================================================================
     5 — the panel on a lesson page

     Placed before the pager, which is where a reader already is when they
     have finished: the next thing they see is "next lesson", and the panel
     is the step between arriving there and taking it.
     =================================================================== */
  function panel() {
    var pager = document.querySelector('nav.pager');
    var main  = document.querySelector('.lesson__main');
    if (!pager && !main) return;

    var box = document.createElement('section');
    box.className = 'nvxp';

    var q = document.createElement('p');
    q.className = 'nvxp__q';
    q.textContent = 'این درس را تمام کردی؟';

    var row = document.createElement('div');
    row.className = 'nvxp__row';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nvxp__btn';

    var meta = document.createElement('span');
    meta.className = 'nvxp__meta';

    var next = document.createElement('a');
    next.className = 'nvxp__next';
    var nx = nextOf(SLUG);
    if (nx) {
      next.href = nx.slug + '.html';
      next.textContent = 'درس بعدی: ' + nx.s + ' ←';
    } else {
      next.href = 'journey.html';
      next.textContent = 'دیدن کل مسیر ←';
    }

    var bar = document.createElement('div');
    bar.className = 'nvxp__bar';
    var fill = document.createElement('i');
    bar.appendChild(fill);

    row.appendChild(btn);
    row.appendChild(meta);
    box.appendChild(q);
    box.appendChild(row);
    box.appendChild(bar);
    box.appendChild(next);

    function paint() {
      var on = isDone(SLUG), st = stats();
      box.classList.toggle('is-done', on);
      btn.textContent = on ? '✓ تکمیل شد' : 'تکمیل شد';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      q.textContent = on ? 'این درس تکمیل شده است.' : 'این درس را تمام کردی؟';
      meta.textContent = fa(st.done) + ' از ' + fa(st.all) + ' درس · مجموع ' + hours(st.total);
      fill.style.width = st.pct + '%';
      next.hidden = !on;
    }

    btn.addEventListener('click', function () {
      setDone(SLUG, !isDone(SLUG));
      paint();
    });

    paint();
    if (pager) pager.parentNode.insertBefore(box, pager);
    else main.appendChild(box);
  }

  /* ===================================================================
     6 — the training index and the journey page

     Both are read the same way: find anything carrying a known slug and
     mark it. On training.html the slug is in the card's href; on
     journey.html it is written out as data-slug.
     =================================================================== */
  function index() {
    var idx = document.querySelector('main.idx');
    if (!idx) return;

    var st = stats();
    if (!st.all) return;

    /* tick the finished cards */
    [].slice.call(idx.querySelectorAll('.cards > a[href]')).forEach(function (a) {
      var s = slugOf(a.getAttribute('href'));
      if (known(s) && isDone(s)) a.classList.add('nvx-done');
    });

    /* and say where the reader is, above the search box */
    var anchor = idx.querySelector('.find') || idx.querySelector('.feat');
    if (!anchor) return;

    var strip = document.createElement('div');
    strip.className = 'nvxs';

    var t = document.createElement('p');
    t.className = 'nvxs__t';
    if (st.done) {
      t.innerHTML = '';
      t.appendChild(document.createTextNode('تا اینجا '));
      var b1 = document.createElement('b');
      b1.textContent = fa(st.done) + ' از ' + fa(st.all);
      t.appendChild(b1);
      t.appendChild(document.createTextNode(' درس را تمام کرده‌ای — ' + hours(st.total) +
        (st.streak > 1 ? ' · زنجیره‌ی ' + fa(st.streak) + ' روزه' : '')));
    } else {
      t.textContent = 'هنوز درسی را تکمیل نکرده‌ای. مسیر پیشنهادی شش مرحله دارد و از مبانی شروع می‌شود.';
    }

    var go = document.createElement('a');
    go.className = 'nvxs__go';
    go.href = 'journey.html';
    go.textContent = 'مسیر یادگیری ←';

    strip.appendChild(t);
    strip.appendChild(go);
    anchor.parentNode.insertBefore(strip, anchor);
  }

  function journey() {
    var jr = document.querySelector('.jrn');
    if (!jr) return;

    var st = stats();

    [].slice.call(jr.querySelectorAll('.lrow[data-slug]')).forEach(function (a) {
      if (isDone(a.getAttribute('data-slug'))) a.classList.add('is-done');
    });

    [].slice.call(jr.querySelectorAll('.stg')).forEach(function (sec) {
      var rows = [].slice.call(sec.querySelectorAll('.lrow'));
      var n = rows.filter(function (r) { return r.classList.contains('is-done'); }).length;
      if (!n) return;
      sec.classList.add(n === rows.length ? 'is-done' : 'is-part');
    });

    var box = document.getElementById('jstats');
    if (box) {
      var put = function (k, v) {
        var el = box.querySelector('[data-stat="' + k + '"]');
        if (el) el.textContent = v;
      };
      put('week', hours(st.week));
      put('total', hours(st.total));
      put('done', fa(st.done) + ' از ' + fa(st.all));
      put('streak', fa(st.streak));
      box.hidden = false;
    }

    var bar = document.getElementById('jbar'), pct = document.getElementById('jpct');
    if (bar) {
      bar.hidden = false;
      requestAnimationFrame(function () { bar.querySelector('i').style.width = st.pct + '%'; });
    }
    if (pct) {
      pct.hidden = false;
      pct.textContent = st.done
        ? fa(st.pct) + '٪ از مسیر طی شده' + (st.best > 1 ? ' · بلندترین زنجیره: ' + fa(st.best) + ' روز' : '')
        : 'هنوز شروع نکرده‌ای — از مرحله‌ی ۰۱ بردار.';
    }
  }

  /* ===================================================================
     7 — start
     =================================================================== */
  function boot() {
    if (!window.NVX_CURRICULUM) return;   // no curriculum, nothing to do

    styles();

    SLUG = slugOf();
    if (known(SLUG)) {
      panel();
      beat();                                  // count the first tick now
      setInterval(beat, TICK * 1000);
    }

    index();
    journey();
  }

  /* curriculum.js and this file are both deferred, so by DOMContentLoaded
     both have run whatever their order in the head. */
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  /* The one thing worth exposing: a later auth layer needs to read this
     state whole in order to merge it into an account on first sign-in. */
  window.NVX_PROGRESS = { stats: stats, read: load, isDone: isDone, setDone: setDone, KEY: KEY };
})();
