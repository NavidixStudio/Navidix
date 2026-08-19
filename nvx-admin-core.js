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

   The third is the shell itself. Fifteen destinations do not fit in a row
   of chips, so they live in a grouped rail with a command palette over the
   top — ⌘K reaches any screen, and any article, in two keystrokes and a
   word. The rail becomes a drawer under 860px rather than a squeeze.
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

  /* Rail groups, in the order they appear. A section names its group; one
     that names none lands in "کارگاه", which is also where a group that no
     longer exists would land rather than vanishing. */
  var GROUPS = [
    ['content',  'محتوا'],
    ['library',  'کتابخانه'],
    ['ai',       'هوش مصنوعی'],
    ['insight',  'سنجش'],
    ['admin',    'مدیریت'],
    ['workshop', 'کارگاه']
  ];


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

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function icon(name) {
    return window.NVX_ICON ? NVX_ICON(name) : el('span');
  }

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
     page furniture

     Every section opens the same way, so it is one call rather than six
     copies of the same three nodes that drift apart over time.
     =================================================================== */
  function page(host, opts) {
    var head = el('div', 'apage');
    var x = el('div', 'apage__x');
    x.appendChild(el('h1', 'apage__t', opts.title));
    if (opts.sub) x.appendChild(el('p', 'apage__s', opts.sub));
    head.appendChild(x);

    if (opts.actions && opts.actions.length) {
      var a = el('div', 'apage__a');
      opts.actions.forEach(function (n) { a.appendChild(n); });
      head.appendChild(a);
    }
    host.appendChild(head);

    var top = document.getElementById('atop-title');
    if (top) top.textContent = opts.title;
    return head;
  }

  function button(label, kind, iconName, onClick) {
    var b = el('button', 'abtn' + (kind ? ' abtn--' + kind : ''));
    b.type = 'button';
    if (iconName) b.appendChild(icon(iconName));
    if (label) b.appendChild(el('span', '', label));
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  /* A shape the size of what is coming, rather than the word "loading". */
  function skeleton(n, kind) {
    var s = el('div', 'askel' + (kind ? ' askel--' + kind : ''));
    for (var i = 0; i < (n || 5); i++) s.appendChild(el('i'));
    return s;
  }

  function emptyState(title, text, action) {
    var e = el('div', 'aempty');
    e.appendChild(icon('info'));
    e.appendChild(el('b', '', title));
    if (text) e.appendChild(document.createTextNode(text));
    if (action) {
      var w = el('div');
      w.style.marginTop = '16px';
      w.appendChild(action);
      e.appendChild(w);
    }
    return e;
  }


  /* ===================================================================
     toast
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

     Resolves true/false; a dismissal — Escape, the backdrop, cancel — is
     false, so a caller only ever has to handle the two outcomes. `close`
     is handed back on the promise for the one caller that has to dismiss
     it from inside its own body.
     =================================================================== */
  function modal(opts) {
    var api = {};
    var p = new Promise(function (resolve) {
      var back = el('div', 'amodal');
      var box = el('div', 'amodal__box' + (opts.wide ? ' amodal__box--wide' : ''));

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

      if (opts.cancel !== false) row.appendChild(no);
      row.appendChild(yes);
      box.appendChild(row);
      back.appendChild(box);
      document.body.appendChild(back);

      function done(v) {
        document.removeEventListener('keydown', esc, true);
        if (back.parentNode) back.parentNode.removeChild(back);
        resolve(v);
      }
      function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); done(false); } }

      no.addEventListener('click', function () { done(false); });
      yes.addEventListener('click', function () { done(true); });
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      document.addEventListener('keydown', esc, true);
      yes.focus();

      api.close = done;
    });
    p.close = function (v) { api.close(v); };
    return p;
  }

  function confirmBox(title, body, confirmLabel) {
    return modal({ title: title, body: body, confirm: confirmLabel || 'حذف', danger: true });
  }


  /* ===================================================================
     database
     =================================================================== */
  function rest(path, opts) {
    if (!window.NVX_AUTH) return Promise.reject(new Error('لایه‌ی حساب بالا نیامده'));
    return NVX_AUTH.rest(path, opts).then(function (v) {
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
     without content.delete gets exactly this, 0 rows and no complaint. */
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
    },

    /* Used by the AI assistant, which produces bytes rather than picking
       an existing file. Same bucket, same policies. */
    uploadBlob: function (blob, path, type) {
      return storage.upload(new File([blob], 'gen', { type: type || blob.type }), path);
    }
  };


  /* ===================================================================
     failure, said usefully
     =================================================================== */
  function missing(err) {
    return /Could not find the (function|table|relation)|schema cache|does not exist|PGRST202|PGRST205/i
      .test(err && err.message || '');
  }

  function note(err, file) {
    var e = el('div', 'aempty');
    e.appendChild(icon('warn'));
    if (missing(err)) {
      e.appendChild(el('b', '', 'این بخش هنوز در پایگاه داده ساخته نشده'));
      e.appendChild(document.createTextNode(
        'محتوای فایل ' + (file || 'supabase/cms-rbac.sql') + ' را در ' +
        'Supabase → SQL Editor بچسبان و Run بزن.'));
    } else {
      e.appendChild(el('b', '', 'خواندن این بخش ممکن نشد'));
      e.appendChild(document.createTextNode(err && err.message || 'خطای نامشخص'));
    }
    return e;
  }

  function empty(text) { return el('p', 'empty', text); }
  function spinner(text) { return skeleton(5); }


  /* ===================================================================
     permissions
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
    if (active === false) return el('span', 'abadge abadge--off', 'غیرفعال');
    return el('span', 'abadge abadge--' + role, ROLE_FA[role] || role);
  }

  function statusBadge(status, label) {
    return el('span', 'abadge abadge--' + status, label);
  }


  /* ===================================================================
     registration and routing
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

    var rail = document.getElementById('arail-nav');
    if (rail) {
      Array.prototype.forEach.call(rail.querySelectorAll('.arail__item'), function (b) {
        b.setAttribute('aria-current', b.getAttribute('data-id') === spec.id ? 'true' : 'false');
      });
    }
    var crumb = document.getElementById('atop-crumb');
    if (crumb) {
      var g = null;
      GROUPS.forEach(function (x) { if (x[0] === (spec.group || 'workshop')) g = x[1]; });
      crumb.textContent = g || '';
    }
    var title = document.getElementById('atop-title');
    if (title) title.textContent = spec.title;

    list.forEach(function (s) {
      var host = document.getElementById('sec-' + s.id);
      if (host) host.hidden = s.id !== spec.id;
    });
    closeRail();

    var host = document.getElementById('sec-' + spec.id);
    if (!host) return;

    if (spec.once && drawn[spec.id] && !force) return;
    drawn[spec.id] = true;

    try {
      spec.render(host);
    } catch (e) {
      clear(host);
      host.appendChild(note(e));
    }
    window.scrollTo(0, 0);
  }

  function route() {
    var id = (location.hash || '').replace(/^#\/?/, '');
    show(id || null);
  }

  function go(id) { location.hash = '#/' + id; }


  /* ===================================================================
     the rail
     =================================================================== */
  function buildRail() {
    var list = visible();
    var nav = document.getElementById('arail-nav');
    var host = document.getElementById('asections');
    if (!nav || !host) return;

    clear(nav);

    GROUPS.forEach(function (g) {
      var inGroup = list.filter(function (s) { return (s.group || 'workshop') === g[0]; });
      if (!inGroup.length) return;

      var box = el('div', 'arail__group');
      box.appendChild(el('p', 'arail__label', g[1]));

      inGroup.forEach(function (s) {
        var b = el('button', 'arail__item');
        b.type = 'button';
        b.setAttribute('data-id', s.id);
        b.appendChild(icon(s.icon || 'article'));
        b.appendChild(el('span', '', s.title));
        b.addEventListener('click', function () { go(s.id); });
        box.appendChild(b);
      });

      nav.appendChild(box);
    });

    list.forEach(function (s) {
      if (!document.getElementById('sec-' + s.id)) {
        var sec = el('section', 'asec');
        sec.id = 'sec-' + s.id;
        sec.hidden = true;
        host.appendChild(sec);
      }
    });

    var who = document.getElementById('arail-who');
    if (who && ctx) {
      clear(who);
      who.appendChild(el('span', 'arail__mail', ctx.email || ''));
      who.appendChild(el('span', 'arail__role', ROLE_FA[ctx.role] || ctx.role || ''));
    }
  }

  function openRail() {
    var r = document.getElementById('arail');
    var s = document.getElementById('ascrim');
    if (r) r.setAttribute('data-open', 'true');
    if (s) s.hidden = false;
  }
  function closeRail() {
    var r = document.getElementById('arail');
    var s = document.getElementById('ascrim');
    if (r) r.removeAttribute('data-open');
    if (s) s.hidden = true;
  }


  /* ===================================================================
     command palette

     Sections always; content when the query is long enough to be worth a
     round trip. The database side of it is admin_search(), which is
     gated on is_staff() and refuses anything under two characters — so
     an empty box can never become an export of the whole site.
     =================================================================== */
  var pal = { open: false, items: [], cursor: 0, seq: 0 };

  function palOpen() {
    var box = document.getElementById('apal');
    if (!box) return;
    pal.open = true;
    box.hidden = false;
    var input = document.getElementById('apal-input');
    input.value = '';
    palRender('');
    setTimeout(function () { input.focus(); }, 20);
  }

  function palClose() {
    var box = document.getElementById('apal');
    if (box) box.hidden = true;
    pal.open = false;
  }

  function palRender(q) {
    var list = document.getElementById('apal-list');
    clear(list);
    pal.items = [];
    pal.cursor = 0;

    var secs = visible().filter(function (s) {
      return !q || s.title.indexOf(q) !== -1;
    });

    if (secs.length) {
      list.appendChild(el('p', 'apal__sec', 'بخش‌ها'));
      secs.forEach(function (s) {
        var b = el('button', 'apal__i');
        b.type = 'button';
        b.appendChild(icon(s.icon || 'article'));
        b.appendChild(el('span', '', s.title));
        var g = null;
        GROUPS.forEach(function (x) { if (x[0] === (s.group || 'workshop')) g = x[1]; });
        if (g) b.appendChild(el('em', '', g));
        b.addEventListener('click', function () { palClose(); go(s.id); });
        list.appendChild(b);
        pal.items.push(b);
      });
    }

    if (!q || q.length < 2) { palCursor(0); return; }

    var mine = ++pal.seq;
    db.rpc('admin_search', { q: q }).then(function (rows) {
      if (mine !== pal.seq || !pal.open) return;
      if (!rows || !rows.length) {
        if (!secs.length) list.appendChild(el('p', 'apal__none', 'چیزی پیدا نشد.'));
        return;
      }
      list.appendChild(el('p', 'apal__sec', 'محتوا'));
      var WHERE = {
        articles: ['articles', 'مقاله'], prompts: ['prompts', 'پرامپت'],
        courses: ['courses', 'دوره'], lessons: ['lessons', 'درس'],
        gallery_items: ['gallery', 'گالری'], videos: ['videos', 'ویدیو']
      };
      rows.slice(0, 18).forEach(function (r) {
        var w = WHERE[r.kind] || [null, r.kind];
        var b = el('button', 'apal__i');
        b.type = 'button';
        b.appendChild(icon(r.kind === 'videos' ? 'video' : r.kind === 'gallery_items' ? 'gallery' : 'article'));
        b.appendChild(el('span', '', r.label || '—'));
        b.appendChild(el('em', '', w[1]));
        b.addEventListener('click', function () { palClose(); if (w[0]) go(w[0]); });
        list.appendChild(b);
        pal.items.push(b);
      });
      palCursor(pal.cursor);
    }, function () {});

    palCursor(0);
  }

  function palCursor(i) {
    if (!pal.items.length) return;
    pal.cursor = Math.max(0, Math.min(i, pal.items.length - 1));
    pal.items.forEach(function (b, n) {
      b.setAttribute('data-on', n === pal.cursor ? 'true' : 'false');
    });
    var on = pal.items[pal.cursor];
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  function palKeys(e) {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      pal.open ? palClose() : palOpen();
      return;
    }
    if (!pal.open) return;
    if (e.key === 'Escape') { e.preventDefault(); palClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); palCursor(pal.cursor + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palCursor(pal.cursor - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var on = pal.items[pal.cursor];
      if (on) on.click();
    }
  }


  /* ===================================================================
     the gate
     =================================================================== */
  function gate(msg, offerSignIn) {
    var boot = document.getElementById('aboot');
    var shell = document.getElementById('ashell');
    if (shell) shell.hidden = true;
    if (!boot) return;

    clear(boot);
    boot.hidden = false;

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
      b.appendChild(icon('warn'));
      var t = el('div');
      t.appendChild(el('b', '', 'بخش‌های CMS هنوز فعال نیستند. '));
      t.appendChild(document.createTextNode(
        'پایگاه داده هنوز جدول‌های نقش و دسترسی را ندارد، پس فعلاً فقط آمار را می‌بینی. ' +
        'برای فعال‌شدن بقیه، محتوای فایل '));
      t.appendChild(el('code', '', 'supabase/cms-rbac.sql'));
      t.appendChild(document.createTextNode(
        ' را در Supabase → SQL Editor اجرا کن و این صفحه را دوباره باز کن.'));
      b.appendChild(t);
      host.appendChild(b);
      return;
    }

    if (ctx && isStaff() && !(ctx.permissions || []).length) {
      var v = el('div', 'abanner abanner--calm');
      v.appendChild(icon('info'));
      v.appendChild(el('div', '', 'نقش تو «' + (ROLE_FA[ctx.role] || ctx.role) +
        '» است: می‌توانی ببینی، ولی چیزی را تغییر نمی‌دهی.'));
      host.appendChild(v);
    }
  }


  /* ===================================================================
     boot
     =================================================================== */
  function start() {
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

      if (!ctx)            { gate('این حساب پروفایلی در پایگاه داده ندارد.', false); return; }
      if (!ctx.is_active)  { gate('این حساب غیرفعال شده است.', false); return; }
      if (ctx.role === 'reader') { gate('این حساب دسترسی مدیر ندارد.', false); return; }
      ready();

    }, function (e) {
      if (!missing(e)) {
        gate('خواندن دسترسی ممکن نشد: ' + e.message +
             '. اگر VPN روشن است یا این صفحه را در مرورگر داخلی یک اپ باز کرده‌ای، ' +
             'در کروم امتحان کن.', false);
        return;
      }
      legacy = true;
      ready();
    });
  }

  function ready() {
    banner();
    buildRail();

    if (!visible().length) {
      gate('این حساب به هیچ بخشی از پنل دسترسی ندارد.', false);
      return;
    }

    var boot = document.getElementById('aboot');
    if (boot) boot.hidden = true;
    var shell = document.getElementById('ashell');
    if (shell) shell.hidden = false;

    var burger = document.getElementById('aburger');
    if (burger) burger.addEventListener('click', openRail);
    var scrim = document.getElementById('ascrim');
    if (scrim) scrim.addEventListener('click', closeRail);

    var trigger = document.getElementById('apal-trigger');
    if (trigger) trigger.addEventListener('click', palOpen);
    var pinput = document.getElementById('apal-input');
    if (pinput) {
      var t = null;
      pinput.addEventListener('input', function () {
        clearTimeout(t);
        var q = pinput.value.trim();
        t = setTimeout(function () { palRender(q); }, 170);
      });
    }
    var pback = document.getElementById('apal');
    if (pback) pback.addEventListener('click', function (e) {
      if (e.target === pback) palClose();
    });
    document.addEventListener('keydown', palKeys);

    addEventListener('hashchange', route);
    route();
  }


  /* =================================================================== */
  window.NVX_ADMIN = {
    /* state */
    ctx: function () { return ctx; },
    can: can, isOwner: isOwner, isStaff: isStaff, isLegacy: function () { return legacy; },
    roleBadge: roleBadge, statusBadge: statusBadge, ROLE_FA: ROLE_FA,

    /* data */
    db: db, storage: storage,

    /* ui */
    el: el, fa: fa, when: when, hours: hours, bytes: bytes, clear: clear, icon: icon,
    page: page, button: button, skeleton: skeleton, emptyState: emptyState,
    toast: toast, modal: modal, confirm: confirmBox,
    note: note, empty: empty, spinner: spinner,

    /* sections */
    register: register, go: go,
    refresh: function () { show(current, true); },
    palette: palOpen
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})();
