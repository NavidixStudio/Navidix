/* =====================================================================
   NAVIDIX — the account layer.

   Optional by construction. Every lesson is readable without an account,
   progress is kept without an account, and this file exists for exactly
   one reason: to carry that progress between a reader's phone and their
   desk. Signed out, the site behaves precisely as it did before this file
   was written — which is why the sign-in control is an offer and never a
   wall.

   No library. Supabase's auth and PostgREST endpoints are plain HTTP with
   two headers, so the whole client is the fetch wrapper below rather than
   a vendored 120KB bundle we could not audit. This is the same reasoning
   that put three.js and the fonts in assets/ instead of on a CDN.

     1. session   — tokens in localStorage, refreshed when they expire
     2. rest      — two helpers over fetch
     3. merge     — local and remote progress reconciled, never replaced
     4. ui        — a control in the site bar and one modal

   The merge rule is the important part and it is deliberately generous:
   a lesson is done if either side says it is done, and a day's seconds
   are the larger of the two. Nothing a reader has already earned can be
   taken away by signing in, on any device, in any order.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.NVX_SUPABASE;
  if (!CFG || !CFG.url || !CFG.key) return;

  var URL_ = CFG.url.replace(/\/+$/, '');
  var KEY  = 'nvx-auth-v1';
  var P    = null;                       // the progress layer, once it is up

  /* ===================================================================
     1 — session
     =================================================================== */
  function session() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }

  function keep(s) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function store(tok) {
    if (!tok || !tok.access_token) return null;
    var s = {
      access_token:  tok.access_token,
      refresh_token: tok.refresh_token,
      /* a minute of margin, so a request never leaves with a token that
         expires while it is in flight */
      expires_at: Date.now() + ((tok.expires_in || 3600) - 60) * 1000,
      user: tok.user ? { id: tok.user.id, email: tok.user.email } : (session() || {}).user
    };
    keep(s);
    return s;
  }

  function signedIn() { return !!session(); }

  /* ===================================================================
     2 — rest
     =================================================================== */
  function auth(path, body) {
    return fetch(URL_ + '/auth/v1/' + path, {
      method: 'POST',
      headers: { 'apikey': CFG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(readOrThrow);
  }

  function readOrThrow(r) {
    return r.text().then(function (t) {
      var d = null;
      try { d = t ? JSON.parse(t) : null; } catch (e) {}
      if (r.ok) return d;
      var msg = (d && (d.error_description || d.msg || d.message || d.error)) || ('HTTP ' + r.status);
      throw new Error(msg);
    });
  }

  /* Refreshes first if the token has aged out. A failed refresh is a
     signed-out reader, not an error the page has to show: the site is
     fully usable that way, so it simply becomes usable that way. */
  function token() {
    var s = session();
    if (!s) return Promise.resolve(null);
    if (Date.now() < s.expires_at) return Promise.resolve(s.access_token);

    return auth('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
      .then(function (tok) { return (store(tok) || {}).access_token || null; })
      .catch(function () { keep(null); paint(); return null; });
  }

  function rest(path, opts) {
    opts = opts || {};
    return token().then(function (t) {
      if (!t) return null;
      var h = {
        'apikey': CFG.key,
        'Authorization': 'Bearer ' + t,
        'Content-Type': 'application/json'
      };
      if (opts.prefer) h['Prefer'] = opts.prefer;
      return fetch(URL_ + '/rest/v1/' + path, {
        method: opts.method || 'GET',
        headers: h,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(readOrThrow);
    });
  }

  /* ===================================================================
     3 — merge

     Both directions in one pass. Remote rows and local state are folded
     together by the generous rule described at the top, the result is
     written back to this browser, and anything the server was missing is
     pushed up. Running it twice changes nothing.
     =================================================================== */
  function recomputeStreak(days) {
    var keys = Object.keys(days).filter(function (k) { return days[k] > 0; }).sort();
    if (!keys.length) return { cur: 0, max: 0, last: '' };

    var max = 1, cur = 1, i;
    for (i = 1; i < keys.length; i++) {
      cur = (P.shift(keys[i], -1) === keys[i - 1]) ? cur + 1 : 1;
      if (cur > max) max = cur;
    }
    /* A run only counts as current if it reaches today or yesterday —
       otherwise it is a run that ended, however long it was. */
    var last = keys[keys.length - 1], t = P.today();
    if (last !== t && last !== P.shift(t, -1)) cur = 0;
    return { cur: cur, max: max, last: last };
  }

  function sync() {
    if (!signedIn() || !P) return Promise.resolve();

    return Promise.all([
      rest('lesson_progress?select=lesson_slug,done,done_at,seconds'),
      rest('learning_days?select=day,seconds')
    ]).then(function (res) {
      var rows = res[0] || [], daysR = res[1] || [];
      var local = P.read();
      var uid = (session() || {}).user;
      if (!uid) return;
      uid = uid.id;

      /* ---- lessons ---- */
      var lessons = {}, k;
      for (k in local.lessons) lessons[k] = {
        done: !!local.lessons[k].done,
        at:   local.lessons[k].at || 0,
        sec:  local.lessons[k].sec || 0
      };
      rows.forEach(function (r) {
        var l = lessons[r.lesson_slug] || (lessons[r.lesson_slug] = { done: false, at: 0, sec: 0 });
        l.done = l.done || !!r.done;
        l.sec  = Math.max(l.sec, r.seconds || 0);
        if (!l.at && r.done_at) l.at = Date.parse(r.done_at) || 0;
      });

      /* ---- days ---- */
      var days = {};
      for (k in local.days) days[k] = local.days[k];
      daysR.forEach(function (r) {
        days[r.day] = Math.max(days[r.day] || 0, r.seconds || 0);
      });

      var merged = {
        v: 1, lessons: lessons, days: days,
        streak: recomputeStreak(days),
        first: local.first || Date.now()
      };
      P.write(merged);

      /* ---- and up ---- */
      var upL = [], upD = [];
      for (k in lessons) upL.push({
        user_id: uid, lesson_slug: k,
        done: lessons[k].done,
        done_at: lessons[k].at ? new Date(lessons[k].at).toISOString() : null,
        seconds: lessons[k].sec,
        updated_at: new Date().toISOString()
      });
      for (k in days) upD.push({ user_id: uid, day: k, seconds: days[k] });

      var jobs = [];
      if (upL.length) jobs.push(rest('lesson_progress', {
        method: 'POST', body: upL, prefer: 'resolution=merge-duplicates,return=minimal'
      }));
      if (upD.length) jobs.push(rest('learning_days', {
        method: 'POST', body: upD, prefer: 'resolution=merge-duplicates,return=minimal'
      }));
      return Promise.all(jobs);
    }).then(function () {
      paint();
      /* The merge may have brought in lessons this device had never seen.
         Redraw, or the reader stares at a path that is a sync behind. */
      if (P.refresh) P.refresh();
    }).catch(function (e) {
      /* A sync that fails is a reader who is briefly one device behind,
         not a reader who cannot use the site. It stays quiet and tries
         again on the next change. */
      if (window.console && console.debug) console.debug('nvx: sync deferred —', e.message);
    });
  }

  /* Pushes are collapsed: a reader ticking four boxes in a row costs one
     request, not four. */
  var pending = null;
  addEventListener('nvx:progress', function () {
    if (!signedIn() || !P) return;
    clearTimeout(pending);
    pending = setTimeout(sync, 2500);
  });

  /* ===================================================================
     4 — ui
     =================================================================== */
  function styles() {
    var css = document.createElement('style');
    css.textContent = [
      '.nvxa{appearance:none;border:1px solid #3A4250;background:transparent;color:#C8D0DA;',
      '  font:inherit;font-size:12.5px;padding:6px 13px;border-radius:8px;cursor:pointer;',
      '  transition:border-color .25s,color .25s;white-space:nowrap;}',
      '.nvxa:hover{border-color:rgba(150,196,255,.55);color:#EDF2FA;}',
      '.nvxa--in{border-color:#262A31;color:#8C939B;}',
      '.nvxm{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;',
      '  background:rgba(4,6,10,.78);padding:20px;}',
      '.nvxm[hidden]{display:none;}',
      '.nvxm__box{width:100%;max-width:392px;border-radius:16px;border:1px solid #262A31;',
      '  background:linear-gradient(158deg,rgba(32,38,48,.96),rgba(10,12,16,.98));',
      '  padding:26px 26px 22px;box-shadow:0 30px 70px -30px rgba(0,0,0,.9);}',
      '.nvxm__t{margin:0 0 6px;font-size:18px;font-weight:700;color:#EDF2FA;line-height:1.7;}',
      '.nvxm__s{margin:0 0 18px;font-size:13px;line-height:1.95;color:#8C939B;}',
      '.nvxm label{display:block;font-size:12px;color:#8C939B;margin:0 0 6px;}',
      '.nvxm input{width:100%;box-sizing:border-box;background:#0E1116;color:#EDF2FA;',
      '  border:1px solid #2A303A;border-radius:9px;padding:11px 13px;font:inherit;font-size:14px;',
      '  margin:0 0 13px;direction:ltr;text-align:left;}',
      '.nvxm input:focus{outline:none;border-color:rgba(150,196,255,.6);}',
      '.nvxm__go{width:100%;appearance:none;border:0;border-radius:9px;padding:12px;',
      '  background:#E5202A;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;}',
      '.nvxm__go:disabled{opacity:.55;cursor:default;}',
      '.nvxm__alt{margin:14px 0 0;font-size:12.5px;color:#8C939B;text-align:center;line-height:2;}',
      '.nvxm__alt button{background:none;border:0;color:#7FB8FF;font:inherit;font-size:12.5px;',
      '  font-weight:600;cursor:pointer;padding:0;}',
      '.nvxm__err{margin:0 0 13px;font-size:12.5px;line-height:1.9;color:#FF8A80;}',
      '.nvxm__x{position:absolute;top:14px;inset-inline-end:16px;background:none;border:0;',
      '  color:#6B7280;font-size:20px;cursor:pointer;line-height:1;}',
      '.nvxm__box{position:relative;}'
    ].join('');
    document.head.appendChild(css);
  }

  var modal = null, mode = 'in';

  function build() {
    modal = document.createElement('div');
    modal.className = 'nvxm';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var box = document.createElement('form');
    box.className = 'nvxm__box';

    var x = document.createElement('button');
    x.type = 'button'; x.className = 'nvxm__x'; x.textContent = '×';
    x.setAttribute('aria-label', 'بستن');

    var t = document.createElement('h2'); t.className = 'nvxm__t';
    var s = document.createElement('p');  s.className = 'nvxm__s';
    var err = document.createElement('p'); err.className = 'nvxm__err'; err.hidden = true;

    var le = document.createElement('label'); le.textContent = 'ایمیل';
    var ie = document.createElement('input');
    ie.type = 'email'; ie.required = true; ie.autocomplete = 'email'; ie.dir = 'ltr';

    var lp = document.createElement('label'); lp.textContent = 'رمز عبور';
    var ip = document.createElement('input');
    ip.type = 'password'; ip.required = true; ip.dir = 'ltr';

    var go = document.createElement('button');
    go.type = 'submit'; go.className = 'nvxm__go';

    var alt = document.createElement('p'); alt.className = 'nvxm__alt';
    var altB = document.createElement('button'); altB.type = 'button';

    alt.appendChild(altB);
    [x, t, s, err, le, ie, lp, ip, go, alt].forEach(function (el) { box.appendChild(el); });
    modal.appendChild(box);
    document.body.appendChild(modal);

    function dress() {
      var up = mode === 'up';
      t.textContent = up ? 'ساختن حساب' : 'ورود';
      s.textContent = up
        ? 'پیشرفتی که تا حالا داشته‌ای از بین نمی‌رود — به همین حساب اضافه می‌شود و روی گوشی و کامپیوترت یکی می‌ماند.'
        : 'خوش برگشتی. پیشرفتت را از همان جایی که بودی برمی‌داریم.';
      go.textContent = up ? 'ساختن حساب' : 'ورود';
      altB.textContent = up ? 'حساب دارم — وارد می‌شوم' : 'حساب ندارم — می‌سازم';
      ip.autocomplete = up ? 'new-password' : 'current-password';
      /* Only when creating one. Enforcing it on sign-in silently refuses
         to submit for anyone whose existing password is shorter, and a
         button that does nothing reads as a broken site. */
      if (up) ip.minLength = 8; else ip.removeAttribute('minlength');
      err.hidden = true;
    }

    altB.addEventListener('click', function () { mode = mode === 'up' ? 'in' : 'up'; dress(); ie.focus(); });
    x.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

    box.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      go.disabled = true;
      go.textContent = 'یک لحظه…';

      var email = ie.value.trim(), pass = ip.value;
      var call = mode === 'up'
        ? auth('signup', { email: email, password: pass })
        : auth('token?grant_type=password', { email: email, password: pass });

      call.then(function (tok) {
        /* A project with email confirmation on returns a user and no
           token. That is not a failure, but it is also not a session —
           say so plainly instead of leaving a spinner behind. */
        if (!tok || !tok.access_token) {
          throw new Error('حساب ساخته شد. برای فعال‌سازی، ایمیلت را باز کن و روی لینک تأیید بزن.');
        }
        store(tok);
        close();
        paint();
        return sync();
      }).catch(function (ex) {
        err.textContent = translate(ex.message);
        err.hidden = false;
      }).then(function () {
        go.disabled = false;
        dress();
      });
    });

    modal.dress = dress;
    modal.focusFirst = function () { ie.focus(); };
    dress();
  }

  /* Supabase answers in English. These are the four a reader actually
     meets; anything else is passed through rather than guessed at. */
  function translate(m) {
    if (/Invalid login credentials/i.test(m)) return 'ایمیل یا رمز عبور درست نیست. اگر تازه آمده‌ای، اول حساب بساز.';
    if (/Email not confirmed/i.test(m))       return 'این حساب هنوز تأیید نشده. ایمیلت را باز کن و روی لینک تأیید بزن.';
    if (/signups? not allowed|Signups not allowed/i.test(m)) return 'ثبت‌نام روی این پروژه بسته است.';
    if (/rate limit|too many/i.test(m))       return 'درخواست‌ها زیاد شد. چند دقیقه صبر کن و دوباره امتحان کن.';
    if (/User already registered/i.test(m))   return 'این ایمیل قبلاً ثبت شده. وارد شو.';
    if (/Password should be at least/i.test(m)) return 'رمز عبور باید دست‌کم ۸ نویسه باشد.';
    if (/Unable to validate email/i.test(m))  return 'ایمیل معتبر نیست.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'اتصال برقرار نشد. اینترنتت را بررسی کن.';
    return m;
  }

  function open(which) {
    if (!modal) build();
    mode = which || 'in';
    modal.dress();
    modal.hidden = false;
    modal.focusFirst();
  }

  function close() { if (modal) modal.hidden = true; }

  /* ---- the control in the site bar ---- */
  var btn = null;

  function paint() {
    if (!btn) return;
    var s = session();
    if (s && s.user) {
      btn.textContent = (s.user.email || '').split('@')[0] + ' — خروج';
      btn.className = 'nvxa nvxa--in';
      btn.title = s.user.email || '';
    } else {
      btn.textContent = 'ورود / ثبت‌نام';
      btn.className = 'nvxa';
      btn.title = 'پیشرفتت را بین دستگاه‌هایت یکی کن';
    }
  }

  /* Three header shapes across the site: the sitebar every ordinary page
     carries, the xbar in explore/, and the homepage's topbar — which is
     deliberately absent over the hero and arrives once the reader has
     scrolled past it. First one found wins. */
  function mount() {
    var row = document.querySelector('.sitebar .row, .xbar__row, .topbar__links');
    if (!row) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      if (signedIn()) {
        keep(null);
        paint();
      } else {
        open('in');
      }
    });
    row.appendChild(btn);
    paint();
  }

  /* The journey page says what an account would buy, once, at the bottom
     — where a reader who has just seen their own progress is standing. */
  function invite() {
    var note = document.getElementById('jnote');
    if (!note) return;
    if (signedIn()) {
      note.textContent = 'پیشرفتت روی این حساب ذخیره می‌شود و روی همه‌ی دستگاه‌هایت یکی است.';
      return;
    }
    note.textContent = 'پیشرفتت روی همین مرورگر ذخیره می‌شود و ثبت‌نام نمی‌خواهد. ';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nvxm__alt';
    b.style.cssText = 'background:none;border:0;color:#7FB8FF;font:inherit;font-weight:600;cursor:pointer;padding:0;margin:0;';
    b.textContent = 'یک حساب بساز تا روی گوشی‌ات هم همین باشد ←';
    b.addEventListener('click', function () { open('up'); });
    note.appendChild(b);
  }

  /* ===================================================================
     5 — one line in the traffic log

     Counts the visit and nothing else. No cookie, no browser id, no IP —
     the table has no column for any of them. The referrer is reduced to a
     bare hostname before it is sent, because a full referring URL can
     carry a search query, and a search query is a person's words.

     It is fire-and-forget: no await, no retry, and a rejected promise is
     swallowed. A reader whose network drops this request loses nothing,
     which is the correct trade for a number only the owner ever reads.
     =================================================================== */
  function ping() {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) return;

    var ref = null;
    try {
      if (document.referrer) {
        var r = new URL(document.referrer);
        ref = (r.hostname === location.hostname) ? 'internal' : r.hostname;
      }
    } catch (e) {}

    try {
      fetch(URL_ + '/rest/v1/page_views', {
        method: 'POST',
        headers: { 'apikey': CFG.key, 'Content-Type': 'application/json',
                   'Prefer': 'return=minimal' },
        body: JSON.stringify({ path: location.pathname, ref: ref }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function boot() {
    /* The progress layer is optional here. Most of the site — the gallery,
       the style pages, the homepage — has no lesson to track, but a reader
       standing on any of them should still be able to sign in, and a reader
       already signed in should see that they are. Without a progress layer
       there is simply nothing to sync. */
    P = window.NVX_PROGRESS || null;
    styles();
    mount();
    invite();
    ping();
    if (P && signedIn()) sync();
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NVX_AUTH = {
    open: open, session: session, sync: sync, signedIn: signedIn, rest: rest
  };
})();
