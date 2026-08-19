/* =====================================================================
   NAVIDIX — the panel shell.

   Everything a section needs and nothing a section owns. This file
   answers three questions and then gets out of the way:

     1. who is signed in, and what may they do
     2. which sections should exist for that person
     3. where do the shared helpers live

   The important design point is (1). The panel asks the database once —
   my_admin_context() — and every button it draws afterwards is drawn from
   that answer. But drawing is not enforcing: a section that hides a delete
   button is a courtesy, and the thing that actually stops the delete is the
   RLS policy on the table. Both exist, and only one of them is load-bearing.

   The second design point is what happens when the answer never comes.
   supabase/cms-rbac.sql may not have been run yet, and a panel that dies
   in that case takes the working analytics down with it. So a missing
   function is not an error here: it drops the panel into legacy mode,
   where the five old views still draw and a banner says which file to run.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.NVX_SUPABASE || {};
  var URL_ = (CFG.url || '').replace(/\/+$/, '');

  var sections = [];     // registered by the module files, in load order
  var ctx = null;        // my_admin_context(), once it answers
  var legacy = false;    // true when the CMS schema is not in the database
  var drawn = {};        // section id -> true, for sections that render once
  var current = null;


  /* ===================================================================
     small helpers
     =================================================================== */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var DATE = null;
  try { DATE = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }); } catch (e) {}
  var STAMP = null;
  try { STAMP = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) {}

  function when(x, withTime) {
    if (!x) return '—';
    var d = new Date(x);
    if (isNaN(d)) return '—';
    var f = withTime ? STAMP : DATE;
    if (f) { try { return f.format(d); } catch (e) {} }
    return d.toISOString().slice(0, withTime ? 16 : 10).replace('T', ' ');
  }

  function hours(sec) {
    sec = sec || 0;
    if (sec < 60) return fa(sec) + ' ثانیه';
    if (sec < 3600) return fa(Math.round(sec / 60)) + ' دقیقه';
    var h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
    return fa(h) + ' ساعت' + (m ? ' و ' + fa(m) + ' دقیقه' : '');
  }

  function bytes(n) {
    n = Number(n || 0);
    if (n < 1024) return fa(n) + ' بایت';
    if (n < 1048576) return fa(Math.round(n / 1024)) + ' کیلوبایت';
    if (n < 1073741824) return fa((n / 1048576).toFixed(1)) + ' مگابایت';
    return fa((n / 1073741824).toFixed(2)) + ' گیگابایت';
  }


  /* ===================================================================
     toast

     One node, reused. Two of these on screen at once would stack and
     shift, and nothing here is important enough to be worth that.
     =================================================================== */
  var toastNode = null, toastTimer = null;

  function toast(msg, kind) {
    if (!toastNode) {
      toastNode = el('div', 'atoast');
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = msg;
    toastNode.className = 'atoast on' + (kind ? ' atoast--' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastNode.className = 'atoast' + (kind ? ' atoast--' + kind : '');
    }, kind === 'bad' ? 5200 : 2800);
  }


  /* ===================================================================
     modal

     Used for confirmations and for the one or two forms that are too
     small to deserve their own view. Resolves true/false; a dismissal —
     Escape, the backdrop, cancel — is false, so a caller only ever has
     to handle the two outcomes.
     =================================================================== */
  function modal(opts) {
    return new Promise(function (resolve) {
      var back = el('div', 'amodal');
      var box = el('div', 'amodal__box');

      box.appendChild(el('h2', 'amodal__t', opts.title));
      if (opts.body) box.appendChild(el('p', 'amodal__s', opts.body));
      if (opts.node) box.appendChild(opts.node);

      var row = el('div', 'arow arow--end');
      row.style.marginTop = '18px';

      var no = el('button', 'abtn', opts.cancel || 'انصراف');
      no.type = 'button';
      var yes = el('button', 'abtn ' + (opts.danger ? 'abtn--danger' : 'abtn--primary'),
                   opts.confirm || 'تأیید');
      yes.type = 'button';

      row.appendChild(no);
      row.appendChild(yes);
      box.appendChild(row);
      back.appendChild(box);
      document.body.appendChild(back);

      function done(v) {
        document.removeEventListener('keydown', esc);
        if (back.parentNode) back.parentNode.removeChild(back);
        resolve(v);
      }
      function esc(e) { if (e.key === 'Escape') done(false); }

      no.addEventListener('click', function () { done(false); });
      yes.addEventListener('click', function () { done(true); });
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      document.addEventListener('keydown', esc);
      yes.focus();
    });
  }

  function confirmBox(title, body, confirmLabel) {
    return modal({ title: title, body: body, confirm: confirmLabel || 'حذف', danger: true });
  }


  /* ===================================================================
     database

     Thin named wrappers over NVX_AUTH.rest, which already carries the
     token, refreshes it and throws on a non-2xx. Nothing here adds
     privileges — every call goes out as the signed-in reader, exactly as
     the analytics half has always done.
     =================================================================== */
  function rest(path, opts) {
    if (!window.NVX_AUTH) return Promise.reject(new Error('لایه‌ی حساب بالا نیامده'));
    return NVX_AUTH.rest(path, opts).then(function (v) {
      /* rest() resolves null for a signed-out reader rather than throwing.
         Here that is always a bug in the caller's ordering, so it is made
         loud instead of arriving later as "cannot read property of null". */
      if (v === null && (!opts || (opts.method || 'GET') === 'GET')) {
        if (!NVX_AUTH.signedIn()) throw new Error('وارد نشده‌ای');
      }
      return v;
    });
  }

  /* A row that RLS refuses to update or delete is not an error over HTTP.
     Postgres does not reject the statement — the policy simply removes
     the row from what the statement can see, so PostgREST answers 200
     with an empty array and the panel used to say "deleted" about a row
     that is still there. Verified against a real Postgres: a writer
     without content.delete gets exactly this, 0 rows and no complaint.

     So both verbs ask for the affected rows back and treat none as a
     failure. Two different causes land here — no permission, or the row
     is already gone — and the message names both rather than guessing. */
  function affected(v) {
    if (Array.isArray(v) && v.length === 0) {
      throw new Error('پایگاه داده این کار را نپذیرفت: یا دسترسی‌اش را نداری، ' +
                      'یا آن ردیف دیگر وجود ندارد.');
    }
    return v;
  }

  var db = {
    select: function (path) { return rest(path).then(function (v) { return v || []; }); },
    one: function (path) {
      return rest(path).then(function (v) { return (v || [])[0] || null; });
    },
    insert: function (table, body) {
      return rest(table, { method: 'POST', body: body, prefer: 'return=representation' });
    },
    update: function (table, filter, body) {
      return rest(table + '?' + filter, {
        method: 'PATCH', body: body, prefer: 'return=representation'
      }).then(affected);
    },
    upsert: function (table, body) {
      return rest(table, {
        method: 'POST', body: body,
        prefer: 'resolution=merge-duplicates,return=representation'
      });
    },
    remove: function (table, filter) {
      return rest(table + '?' + filter, {
        method: 'DELETE', prefer: 'return=representation'
      }).then(affected);
    },
    rpc: function (name, body) {
      return rest('rpc/' + name, { method: 'POST', body: body || {} });
    }
  };


  /* ===================================================================
     storage

     Not reachable through rest(), which is hardwired to /rest/v1/. The
     token comes from NVX_AUTH.token() rather than out of the session so
     that an upload gets the same freshness guarantee every other request
     has — a large file signed with a token that expires mid-flight fails
     after the bytes have already gone up.
     =================================================================== */
  function readOrThrow(r) {
    return r.text().then(function (t) {
      var d = null;
      try { d = t ? JSON.parse(t) : null; } catch (e) {}
      if (r.ok) return d;
      var msg = (d && (d.error_description || d.msg || d.message || d.error)) ||
                ('HTTP ' + r.status);
      throw new Error(msg);
    });
  }

  var storage = {
    publicUrl: function (path, bucket) {
      return URL_ + '/storage/v1/object/public/' + (bucket || 'media') + '/' + path;
    },

    upload: function (file, path, bucket) {
      return NVX_AUTH.token().then(function (t) {
        if (!t) throw new Error('وارد نشده‌ای');
        return fetch(URL_ + '/storage/v1/object/' + (bucket || 'media') + '/' + path, {
          method: 'POST',
          headers: {
            'apikey': CFG.key,
            'Authorization': 'Bearer ' + t,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'false'
          },
          body: file
        }).then(readOrThrow);
      });
    },

    remove: function (path, bucket) {
      return NVX_AUTH.token().then(function (t) {
        if (!t) throw new Error('وارد نشده‌ای');
        return fetch(URL_ + '/storage/v1/object/' + (bucket || 'media') + '/' + path, {
          method: 'DELETE',
          headers: { 'apikey': CFG.key, 'Authorization': 'Bearer ' + t }
        }).then(readOrThrow);
      });
    }
  };


  /* ===================================================================
     failure, said usefully

     There are exactly two failures a reader of this panel can act on, and
     they read nothing alike. One is "that table is not in the database
     yet", which is a file waiting to be run and not a fault. The other is
     everything else.
     =================================================================== */
  function missing(err) {
    return /Could not find the (function|table|relation)|schema cache|does not exist|PGRST202|PGRST205/i
      .test(err && err.message || '');
  }

  function note(err, file) {
    var p = el('p', 'empty');
    if (missing(err)) {
      p.textContent = 'این بخش هنوز در پایگاه داده ساخته نشده. در مخزن، فایل ' +
        (file || 'supabase/cms-rbac.sql') + ' را باز کن، محتوایش را کپی کن و در ' +
        'Supabase → SQL Editor بچسبان و Run بزن.';
    } else {
      p.textContent = 'خواندن این بخش ممکن نشد: ' + (err && err.message || 'خطای نامشخص');
    }
    return p;
  }

  function empty(text) { return el('p', 'empty', text); }
  function spinner(text) { return el('p', 'aspin', text || 'در حال خواندن…'); }


  /* ===================================================================
     permissions

     can() is the only thing a section should ask. It is deliberately
     false for everything in legacy mode: without the roles tables there
     is no honest answer, and a panel that guesses "probably yes" because
     the reader used to be an admin is how a Writer ends up with a delete
     button.
     =================================================================== */
  function can(key) {
    if (!ctx || !ctx.is_active) return false;
    var list = ctx.permissions || [];
    if (Array.isArray(key)) {
      for (var i = 0; i < key.length; i++) if (list.indexOf(key[i]) !== -1) return true;
      return false;
    }
    return list.indexOf(key) !== -1;
  }

  function isOwner() { return !!ctx && ctx.role === 'owner' && ctx.is_active; }
  function isStaff() { return !!ctx && ctx.role !== 'reader' && ctx.is_active; }

  var ROLE_FA = {
    owner: 'مالک', admin: 'ادمین', editor: 'ویراستار',
    writer: 'نویسنده', viewer: 'مشاهده‌گر', reader: 'خواننده'
  };

  function roleBadge(role, active) {
    var b = el('span', 'abadge abadge--' + role, ROLE_FA[role] || role);
    if (active === false) b.className = 'abadge abadge--off';
    return b;
  }


  /* ===================================================================
     registration and routing

     A section is a plain object. `perm` is what decides whether it is
     drawn at all: a string, an array meaning any-of, or nothing at all
     for the sections every member of the team may open.
     =================================================================== */
  function register(spec) { sections.push(spec); }

  function allowed(spec) {
    if (legacy) return !!spec.legacy;
    if (!isStaff()) return false;
    if (spec.owner && !isOwner()) return false;
    if (!spec.perm) return true;
    return can(spec.perm);
  }

  function visible() { return sections.filter(allowed); }

  function show(id, force) {
    var list = visible();
    var spec = null, i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) spec = list[i];
    if (!spec) spec = list[0];
    if (!spec) return;

    current = spec.id;

    var nav = document.getElementById('anav');
    if (nav) {
      Array.prototype.forEach.call(nav.children, function (b) {
        b.setAttribute('aria-current', b.getAttribute('data-id') === spec.id ? 'true' : 'false');
      });
    }

    list.forEach(function (s) {
      var host = document.getElementById('sec-' + s.id);
      if (host) host.hidden = s.id !== spec.id;
    });

    var host = document.getElementById('sec-' + spec.id);
    if (!host) return;

    /* Analytics reads five views and is the one section worth not
       re-reading on every visit; it carries its own refresh button.
       Everything else is redrawn each time it is opened, which is the
       cheaper way to never show a stale row. */
    if (spec.once && drawn[spec.id] && !force) return;
    drawn[spec.id] = true;

    try {
      spec.render(host);
    } catch (e) {
      clear(host);
      host.appendChild(note(e));
    }
  }

  function route() {
    var id = (location.hash || '').replace(/^#\/?/, '');
    show(id || null);
  }

  function buildNav() {
    var list = visible();
    var nav = document.getElementById('anav');
    var host = document.getElementById('asections');
    if (!nav || !host) return;

    clear(nav);

    list.forEach(function (s) {
      var b = el('button', '', s.title);
      b.type = 'button';
      b.setAttribute('data-id', s.id);
      b.addEventListener('click', function () { location.hash = '#/' + s.id; });
      nav.appendChild(b);

      if (!document.getElementById('sec-' + s.id)) {
        var sec = el('section', 'asec');
        sec.id = 'sec-' + s.id;
        sec.hidden = true;
        host.appendChild(sec);
      }
    });

    /* One destination is not a choice, and a row of one chip only takes
       up space telling the reader they have none. */
    nav.hidden = list.length < 2;
  }


  /* ===================================================================
     the gate
     =================================================================== */
  function gate(msg, offerSignIn) {
    var boot = document.getElementById('aboot');
    var nav = document.getElementById('anav');
    if (nav) nav.hidden = true;
    if (!boot) return;

    clear(boot);
    boot.className = '';

    var g = el('div', 'gate');
    g.appendChild(el('h2', '', 'دسترسی نداری'));
    g.appendChild(el('p', '', msg));

    if (offerSignIn) {
      var b = el('button', '', 'ورود');
      b.type = 'button';
      b.addEventListener('click', function () { window.NVX_AUTH && NVX_AUTH.open('in'); });
      g.appendChild(b);
    }

    var s = el('p', 'diag');
    s.textContent = 'وضعیت: ' +
      (window.NVX_SUPABASE ? 'پیکربندی هست' : 'پیکربندی نیست') + ' · ' +
      (window.NVX_AUTH ? 'لایه‌ی حساب هست' : 'لایه‌ی حساب نیست') + ' · ' +
      (window.NVX_AUTH && NVX_AUTH.signedIn() ? 'وارد شده‌ای' : 'وارد نشده‌ای');
    g.appendChild(s);

    boot.appendChild(g);
  }

  function banner() {
    var host = document.getElementById('abanner');
    if (!host) return;
    clear(host);

    if (legacy) {
      var b = el('div', 'abanner');
      var t = el('b', '', 'بخش‌های CMS هنوز فعال نیستند. ');
      b.appendChild(t);
      b.appendChild(document.createTextNode(
        'پایگاه داده هنوز جدول‌های نقش و دسترسی را ندارد، پس فعلاً فقط آمار را می‌بینی. ' +
        'برای فعال‌شدن بقیه، محتوای فایل '));
      b.appendChild(el('code', '', 'supabase/cms-rbac.sql'));
      b.appendChild(document.createTextNode(
        ' را در Supabase → SQL Editor اجرا کن و این صفحه را دوباره باز کن.'));
      host.appendChild(b);
      return;
    }

    /* Signed in with a role but no permissions at all — a Viewer. Saying
       so is kinder than a panel that simply has nothing in it. */
    if (ctx && isStaff() && !(ctx.permissions || []).length) {
      var v = el('div', 'abanner abanner--calm');
      v.appendChild(document.createTextNode(
        'نقش تو «' + (ROLE_FA[ctx.role] || ctx.role) + '» است: می‌توانی ببینی، ولی چیزی را تغییر نمی‌دهی.'));
      host.appendChild(v);
    }
  }


  /* ===================================================================
     boot
     =================================================================== */
  function start() {
    var boot = document.getElementById('aboot');

    if (!window.NVX_SUPABASE || !window.NVX_AUTH) {
      gate('لایه‌ی حساب بالا نیامد. صفحه را دوباره بارگذاری کن.', false);
      return;
    }

    if (!NVX_AUTH.signedIn()) {
      gate('برای دیدن این صفحه باید با حساب مدیر وارد شوی. اگر جای دیگری وارد ' +
           'شده‌ای و اینجا نه، احتمالاً این صفحه در مرورگر داخلی یک اپ باز شده — ' +
           'آن‌ها فضای ذخیره‌سازی جدا دارند. در کروم بازش کن.', true);
      return;
    }

    db.rpc('my_admin_context').then(function (v) {
      ctx = v || null;

      if (!ctx) {
        gate('این حساب پروفایلی در پایگاه داده ندارد.', false);
        return;
      }
      if (!ctx.is_active) {
        gate('این حساب غیرفعال شده است.', false);
        return;
      }
      if (ctx.role === 'reader') {
        gate('این حساب دسترسی مدیر ندارد.', false);
        return;
      }
      ready();

    }, function (e) {
      /* The CMS schema is not there. That is the expected state of a
         database that has only had schema.sql run against it, so the
         panel does not treat it as a failure — it falls back to what
         still works and says what would make the rest work. */
      if (!missing(e)) {
        gate('خواندن دسترسی ممکن نشد: ' + e.message +
             '. اگر VPN روشن است یا این صفحه را در مرورگر داخلی یک اپ باز کرده‌ای، ' +
             'در کروم امتحان کن.', false);
        return;
      }
      legacy = true;
      ready();
    });

    if (boot) boot.textContent = 'در حال بررسی دسترسی…';
  }

  function ready() {
    banner();
    buildNav();

    /* Checked before #aboot is taken out of the page, not after: gate()
       draws into that node, and removing it first turns "you have no
       sections" into a blank screen. */
    if (!visible().length) {
      gate('این حساب به هیچ بخشی از پنل دسترسی ندارد.', false);
      return;
    }

    var boot = document.getElementById('aboot');
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);

    addEventListener('hashchange', route);
    route();
  }


  /* =================================================================== */
  window.NVX_ADMIN = {
    /* state */
    ctx: function () { return ctx; },
    can: can, isOwner: isOwner, isStaff: isStaff, isLegacy: function () { return legacy; },
    roleBadge: roleBadge, ROLE_FA: ROLE_FA,

    /* data */
    db: db, storage: storage,

    /* ui */
    el: el, fa: fa, when: when, hours: hours, bytes: bytes, clear: clear,
    toast: toast, modal: modal, confirm: confirmBox,
    note: note, empty: empty, spinner: spinner,

    /* sections */
    register: register,
    refresh: function () { show(current, true); }
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})();
