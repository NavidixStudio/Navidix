/* =====================================================================
   NAVIDIX — the comment layer.

   One script, every page. A page that loads this file gets a comment
   thread at the end of its content; a page that does not is untouched.
   There is no markup to add — which is the point, because the comments
   have to appear under two hundred generated style pages, fourteen
   lessons and every article, and none of those share a template.

   Where the thread belongs is worked out from the URL, the same way
   nvx-progress.js works out which lesson it is on. A page can override
   that by carrying `data-nvx-comments="article:some-slug"` on the element
   it wants the thread inside.

   What the server guarantees, so this file does not have to pretend to:

     - a comment is written only through post_comment(), which sets the
       author, the status and the timestamp itself. Nothing this file
       sends can forge who wrote something.
     - rate limiting, length limits and the reserved-name rule all live
       in that function. The checks below are a courtesy to the reader,
       not a defence: they turn a round trip into an instant message.
     - client_hash and user_id are not readable by anybody. This file
       could not leak them if it tried.

   What this file is responsible for: never putting a comment body into
   innerHTML. Every piece of text a stranger typed goes in through
   textContent. There is no markdown here and no autolinking — a comment
   is plain text, deliberately, because a comment form that renders links
   is a link farm within a week.
   ===================================================================== */
(function () {
  'use strict';

  /* This file is now loaded two ways: by the pages that name it directly,
     and by nvx-topbar.js on every other page. Whichever arrives second
     does nothing. */
  if (window.NVX_COMMENTS) return;

  var CFG = window.NVX_SUPABASE;
  if (!CFG || !CFG.url || !CFG.key) return;

  /* Pages that are a way in rather than a thing to talk about. A comment
     box under a list of articles asks the reader to discuss the list.
     Everything not named here gets a thread, which is the point: a page
     added next month is covered without anybody remembering to do it.

     Any page can decide for itself with data-nvx-comments="off". */
  var NO_THREAD = {
    index: 1, admin: 1, me: 1,
    articles: 1, training: 1, journey: 1,
    gallery: 1, channels: 1, collections: 1, documentaries: 1
  };

  var URL_ = CFG.url.replace(/\/+$/, '');
  var MAX  = 2000;

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }


  /* ===================================================================
     1 — where are we

     target_type is one of five words the database will accept; anything
     else is refused there, so the job here is only to pick the right one.
     =================================================================== */
  function fileSlug() {
    var m = /([^\/]+)\.html?$/i.exec(location.pathname);
    return m ? m[1].toLowerCase() : 'index';
  }

  function knownLesson(slug) {
    var C = window.NVX_CURRICULUM;
    if (!C || !slug) return false;
    for (var i = 0; i < C.stages.length; i++)
      for (var j = 0; j < C.stages[i].lessons.length; j++)
        if (C.stages[i].lessons[j].slug === slug) return true;
    return false;
  }

  function target() {
    /* An explicit answer always wins — including "no". */
    var host = document.querySelector('[data-nvx-comments]');
    var said = host && host.getAttribute('data-nvx-comments');
    if (said === 'off') return null;
    if (said && said.indexOf(':') > 0) {
      var p = said.split(':');
      return { type: p[0], slug: p.slice(1).join(':') };
    }

    /* An article carries its slug in the query string, not the path —
       every article on this site is article.html?slug=… */
    if (/(^|\/)article\.html?$/i.test(location.pathname)) {
      var q = null;
      try { q = new URLSearchParams(location.search).get('slug'); } catch (e) {}
      return q ? { type: 'article', slug: q.toLowerCase() } : null;
    }

    var slug = fileSlug();

    /* /style/<name>.html — two hundred of them, none in the database. */
    if (/\/style\//i.test(location.pathname)) return { type: 'style', slug: slug };

    if (knownLesson(slug)) return { type: 'lesson', slug: slug };
    if (slug === 'prompts') return { type: 'prompt', slug: 'prompts' };

    if (NO_THREAD[slug] && !host) return null;
    return { type: 'page', slug: slug };
  }


  /* ===================================================================
     2 — the network

     Reading is anonymous, exactly like nvx-content.js: no Authorization
     header, and what comes back is whatever the read policy allows.

     Writing sends a token when there is one. That is the only difference
     a signed-in reader makes to this file — and the server, not this
     line, is what turns that token into a name.
     =================================================================== */
  function read(path) {
    return fetch(URL_ + '/rest/v1/' + path, {
      headers: { 'apikey': CFG.key, 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function token() {
    var A = window.NVX_AUTH;
    if (!A || !A.signedIn || !A.signedIn()) return Promise.resolve(null);
    /* A stale token is not an error worth stopping for — the comment
       simply posts as a guest instead, and the form already asked for a
       name in case that happens. */
    return A.token().catch(function () { return null; });
  }

  function post(payload) {
    return token().then(function (tok) {
      var h = {
        'apikey': CFG.key,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pgrst.object+json'
      };
      if (tok) h.Authorization = 'Bearer ' + tok;
      return fetch(URL_ + '/rest/v1/rpc/post_comment', {
        method: 'POST', headers: h, body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) {
          if (r.ok) return b;
          var e = new Error(b && (b.message || b.hint) || ('HTTP ' + r.status));
          e.code = b && b.message;
          throw e;
        });
      });
    });
  }

  /* The database raises short machine words on purpose, so that the
     wording a reader sees lives here, in the language of the site,
     rather than in a Postgres exception. */
  function explain(err) {
    var m = String((err && err.code) || (err && err.message) || '');
    if (/comments_closed/.test(m))  return 'دیدگاه‌ها فعلاً بسته است.';
    if (/too_fast/.test(m))         return 'کمی صبر کن — بین دو دیدگاه چند ثانیه فاصله لازم است.';
    if (/too_many/.test(m))         return 'برای این ساعت به سقف دیدگاه رسیده‌ای. کمی بعد دوباره امتحان کن.';
    if (/body_too_short/.test(m))   return 'متن دیدگاه خیلی کوتاه است.';
    if (/body_too_long/.test(m))    return 'متن دیدگاه از حد مجاز بلندتر است.';
    if (/name_reserved/.test(m))    return 'این نام برای صاحب سایت رزرو است. نام دیگری بگذار.';
    if (/name_invalid/.test(m))     return 'نام باید بین ۲ تا ۴۰ نویسه باشد.';
    if (/target_invalid/.test(m))   return 'این صفحه دیدگاه نمی‌پذیرد.';
    if (/parent_not_found/.test(m)) return 'دیدگاهی که به آن پاسخ می‌دادی دیگر نیست.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'اتصال برقرار نشد. اینترنت را چک کن.';
    return 'ثبت نشد. کمی بعد دوباره امتحان کن.';
  }


  /* ===================================================================
     3 — time, in words

     A comment written four minutes ago should say so. An exact date is
     kept on the title attribute for anyone who wants it.
     =================================================================== */
  var UNITS = [
    [31536000, 'سال'], [2592000, 'ماه'], [604800, 'هفته'],
    [86400, 'روز'], [3600, 'ساعت'], [60, 'دقیقه']
  ];

  function ago(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 45) return 'همین حالا';
    for (var i = 0; i < UNITS.length; i++) {
      if (s >= UNITS[i][0]) return fa(Math.round(s / UNITS[i][0])) + ' ' + UNITS[i][1] + ' پیش';
    }
    return fa(Math.round(s / 60)) + ' دقیقه پیش';
  }

  function exact(iso) {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran'
      }).format(new Date(iso));
    } catch (e) { return iso || ''; }
  }

  /* Two readers called "رضا" in one thread should not get the same
     colour by accident and the same one every time is nicer than random,
     so the hue comes from the name itself. */
  function hue(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }

  function initial(name) {
    var s = String(name || '').trim();
    return s ? s.charAt(0) : '؟';
  }


  /* ===================================================================
     4 — styles

     Injected, like every other nvx-* layer, so a page needs one script
     tag and nothing else. The palette is the site's: the #08090B ground,
     the #E5202A ember, the steel and the hairline.
     =================================================================== */
  function styles() {
    if (document.getElementById('nvxcm-css')) return;
    var css = document.createElement('style');
    css.id = 'nvxcm-css';
    css.textContent = [
      '.nvxcm{position:relative;max-width:var(--maxw,980px);margin:56px auto 0;',
      '  padding:0 22px 8px;',
      '  font-family:"Estedad","IRANSansX","IRANSans","Segoe UI",Tahoma,sans-serif;',
      '  color:#C8D0DA;text-align:start;}',
      '.nvxcm__h{display:flex;align-items:baseline;gap:10px;margin:0 0 20px;',
      '  padding-top:26px;border-top:1px solid rgba(226,238,255,.09);}',
      '.nvxcm__t{margin:0;font-size:15px;font-weight:600;color:#EDF2FA;}',
      '.nvxcm__n{font-size:12.5px;color:#818892;font-variant-numeric:tabular-nums;}',

      /* one comment */
      '.nvxcm__c{display:flex;gap:12px;padding:14px 0;',
      '  border-top:1px solid rgba(226,238,255,.055);}',
      '.nvxcm__c:first-of-type{border-top:0;}',
      '.nvxcm__av{flex:none;width:32px;height:32px;border-radius:50%;',
      '  display:grid;place-items:center;font-size:13px;font-weight:700;',
      '  color:#0C1017;user-select:none;}',
      '.nvxcm__b{flex:1;min-width:0;}',
      '.nvxcm__meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;',
      '  margin:0 0 5px;font-size:12px;color:#818892;}',
      '.nvxcm__who{color:#EDF2FA;font-weight:600;font-size:12.5px;}',
      /* A signed-in name is one the site vouches for; a guest typed
         theirs into a box. The badge is the only thing telling the two
         apart, so it says so in words as well as in colour. */
      '.nvxcm__badge{font-size:10.5px;font-weight:600;padding:1.5px 7px;border-radius:99px;',
      '  background:rgba(127,184,255,.14);color:#9CC6FF;}',
      '.nvxcm__body{margin:0;font-size:13.5px;line-height:2.05;color:#D5DCE5;',
      '  white-space:pre-wrap;overflow-wrap:anywhere;}',
      '.nvxcm__act{margin-top:7px;display:flex;gap:14px;}',
      '.nvxcm__reply{appearance:none;background:none;border:0;padding:0;cursor:pointer;',
      '  font:inherit;font-size:12px;font-weight:600;color:#7FB8FF;}',
      '.nvxcm__reply:hover{color:#A9CEFF;}',
      '.nvxcm__kids{margin-inline-start:44px;}',
      '@media (max-width:560px){.nvxcm__kids{margin-inline-start:20px;}}',
      '.nvxcm__kids .nvxcm__c{border-top:1px solid rgba(226,238,255,.045);}',

      /* the form */
      '.nvxcm__form{margin-top:22px;}',
      '.nvxcm__row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;}',
      '.nvxcm__in,.nvxcm__ta{font:inherit;font-size:13.5px;color:#EDF2FA;',
      '  background:#11151B;border:1px solid #2E3542;border-radius:10px;',
      '  padding:11px 13px;width:100%;box-sizing:border-box;',
      '  transition:border-color .25s;}',
      '.nvxcm__in{flex:1 1 200px;width:auto;}',
      '.nvxcm__ta{min-height:96px;line-height:1.95;resize:vertical;}',
      '.nvxcm__in:focus,.nvxcm__ta:focus{outline:0;border-color:rgba(150,196,255,.55);}',
      '.nvxcm__in::placeholder,.nvxcm__ta::placeholder{color:#6C737C;}',
      '.nvxcm__foot{display:flex;align-items:center;justify-content:space-between;',
      '  gap:12px;flex-wrap:wrap;margin-top:10px;}',
      '.nvxcm__send{appearance:none;border:1px solid #3A4250;background:#12161C;',
      '  color:#EDF2FA;font:inherit;font-size:13px;font-weight:600;',
      '  padding:10px 24px;border-radius:99px;cursor:pointer;',
      '  transition:border-color .25s,background .25s,transform .2s;}',
      '.nvxcm__send:hover:not(:disabled){border-color:rgba(150,196,255,.55);transform:translateY(-1px);}',
      '.nvxcm__send:disabled{opacity:.5;cursor:default;}',
      '.nvxcm__left{font-size:11.5px;color:#818892;font-variant-numeric:tabular-nums;}',
      '.nvxcm__left.is-over{color:#FF8A80;}',
      '.nvxcm__note{margin:10px 0 0;font-size:12px;line-height:1.9;color:#818892;}',
      '.nvxcm__note.is-bad{color:#FF8A80;}',
      '.nvxcm__note.is-good{color:#7FD8B0;}',
      /* The honeypot. Not display:none — a bot that reads styles skips
         those. Clipped to nothing and out of the tab order instead, so a
         person never reaches it and a script that fills every input does.
         The obvious version of this is `left:-9999px`, and on this site
         it is a bug rather than a trick: the pages are RTL, an absolutely
         positioned box ten thousand pixels to the left is still part of
         the scrollable area, and every style page grew a document
         10,981px wide with the content parked off to one side. Measured,
         not guessed. `clip-path:inset(50%)` takes the box out of the
         paint without taking it out of the layout, and `position:relative`
         on the section keeps it contained even if that ever changes. */
      '.nvxcm__hp{position:absolute;width:1px;height:1px;overflow:hidden;',
      '  clip-path:inset(50%);white-space:nowrap;',
      '  opacity:0;pointer-events:none;}',
      '.nvxcm__empty{margin:0 0 18px;font-size:13px;line-height:2;color:#818892;}',
      '@media (prefers-reduced-motion:reduce){',
      '  .nvxcm__send{transition:none;}}'
    ].join('');
    document.head.appendChild(css);
  }


  /* ===================================================================
     5 — drawing

     Every value that came from the network is set with textContent. The
     only strings that reach innerHTML in this file are the ones written
     above, in section 4.
     =================================================================== */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function commentNode(row, onReply) {
    var box = el('article', 'nvxcm__c');

    var av = el('div', 'nvxcm__av', initial(row.author_name));
    av.style.background = 'hsl(' + hue(row.author_name) + ' 46% 68%)';
    av.setAttribute('aria-hidden', 'true');

    var body = el('div', 'nvxcm__b');
    var meta = el('div', 'nvxcm__meta');

    meta.appendChild(el('span', 'nvxcm__who', row.author_name));
    if (row.is_member) meta.appendChild(el('span', 'nvxcm__badge', 'کاربر سایت'));

    var when = el('time', null, ago(row.created_at));
    when.setAttribute('datetime', row.created_at || '');
    when.title = exact(row.created_at);
    meta.appendChild(when);

    body.appendChild(meta);
    body.appendChild(el('p', 'nvxcm__body', row.body));

    if (onReply) {
      var act = el('div', 'nvxcm__act');
      var btn = el('button', 'nvxcm__reply', 'پاسخ');
      btn.type = 'button';
      btn.addEventListener('click', function () { onReply(row, box); });
      act.appendChild(btn);
      body.appendChild(act);
    }

    box.appendChild(av);
    box.appendChild(body);
    return box;
  }


  /* ===================================================================
     6 — the form

     Used twice: once at the foot of the thread, and once inline under a
     comment somebody is answering. Same function, different parent.
     =================================================================== */
  function form(state, parentId, onDone) {
    var wrap = el('form', 'nvxcm__form');
    wrap.noValidate = true;

    var signedIn = !!(window.NVX_AUTH && window.NVX_AUTH.signedIn && window.NVX_AUTH.signedIn());

    var name = null;
    if (!signedIn) {
      var row = el('div', 'nvxcm__row');
      name = el('input', 'nvxcm__in');
      name.type = 'text';
      name.placeholder = 'نامت';
      name.maxLength = 40;
      name.autocomplete = 'nickname';
      name.setAttribute('aria-label', 'نام');
      /* A returning guest should not have to type their name again. It
         never leaves this browser. */
      try { name.value = localStorage.getItem('nvx-comment-name') || ''; } catch (e) {}
      row.appendChild(name);
      wrap.appendChild(row);
    }

    var ta = el('textarea', 'nvxcm__ta');
    ta.placeholder = parentId ? 'پاسخت…' : 'نظرت را بنویس…';
    ta.maxLength = MAX;
    ta.setAttribute('aria-label', 'متن دیدگاه');
    wrap.appendChild(ta);

    /* the honeypot — see the note on .nvxcm__hp above */
    var hp = el('input', 'nvxcm__hp');
    hp.type = 'text';
    hp.name = 'website';
    hp.tabIndex = -1;
    hp.setAttribute('autocomplete', 'off');
    hp.setAttribute('aria-hidden', 'true');
    wrap.appendChild(hp);

    var foot = el('div', 'nvxcm__foot');
    var send = el('button', 'nvxcm__send', parentId ? 'ثبت پاسخ' : 'ثبت دیدگاه');
    send.type = 'submit';
    var left = el('span', 'nvxcm__left', '');
    foot.appendChild(send);
    foot.appendChild(left);
    wrap.appendChild(foot);

    var note = el('p', 'nvxcm__note',
      signedIn ? 'با نام حساب خودت ثبت می‌شود.'
               : 'بدون حساب هم می‌شود نوشت. اگر وارد شوی، نامت تأیید‌شده نشان داده می‌شود.');
    wrap.appendChild(note);

    function count() {
      var n = ta.value.length;
      left.textContent = n ? fa(n) + ' / ' + fa(MAX) : '';
      left.classList.toggle('is-over', n > MAX);
    }
    ta.addEventListener('input', count);

    function say(msg, kind) {
      note.textContent = msg;
      note.classList.toggle('is-bad', kind === 'bad');
      note.classList.toggle('is-good', kind === 'good');
    }

    wrap.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (send.disabled) return;

      /* Anything in the honeypot means a script filled this in. Say
         nothing about it — a bot that is told it failed comes back
         having learned something. It gets the same "thanks" a person
         gets, and nothing is sent. */
      if (hp.value) { say('ثبت شد.', 'good'); wrap.reset(); return; }

      var body = ta.value.trim();
      if (body.length < 2) { say('متن دیدگاه خیلی کوتاه است.', 'bad'); ta.focus(); return; }
      if (body.length > MAX) { say('متن دیدگاه از حد مجاز بلندتر است.', 'bad'); return; }

      var who = name ? name.value.trim() : '';
      if (!signedIn && who.length < 2) {
        say('نامت را بنویس — دو نویسه یا بیشتر.', 'bad');
        if (name) name.focus();
        return;
      }

      send.disabled = true;
      say('در حال ثبت…');

      post({
        p_target_type: state.type,
        p_target_slug: state.slug,
        p_body: body,
        p_guest_name: who || null,
        p_parent_id: parentId || null
      }).then(function (row) {
        if (name) { try { localStorage.setItem('nvx-comment-name', who); } catch (e) {} }
        ta.value = '';
        count();
        say('ثبت شد.', 'good');
        onDone(row);
      }).catch(function (err) {
        say(explain(err), 'bad');
      }).then(function () {
        send.disabled = false;
      });
    });

    return wrap;
  }


  /* ===================================================================
     7 — the thread
     =================================================================== */
  function thread(host, state) {
    var head  = el('div', 'nvxcm__h');
    var title = el('h2', 'nvxcm__t', 'دیدگاه‌ها');
    var count = el('span', 'nvxcm__n', '');
    head.appendChild(title);
    head.appendChild(count);

    var list  = el('div', 'nvxcm__list');
    var empty = el('p', 'nvxcm__empty', 'هنوز دیدگاهی نیست. اولین نفر باش.');

    host.appendChild(head);
    host.appendChild(empty);
    host.appendChild(list);

    var openReply = null;

    function reply(row, after) {
      if (openReply) { openReply.remove(); openReply = null; }
      var f = form(state, row.id, function () { draw(); });
      openReply = f;
      after.parentNode.insertBefore(f, after.nextSibling);
      f.querySelector('.nvxcm__ta').focus();
    }

    host.appendChild(form(state, null, function () { draw(); }));

    function draw() {
      if (openReply) { openReply.remove(); openReply = null; }

      return read('comments_public?target_type=eq.' + encodeURIComponent(state.type) +
                  '&target_slug=eq.' + encodeURIComponent(state.slug) +
                  '&order=is_pinned.desc,created_at.asc&limit=300')
        .then(function (rows) {
          rows = rows || [];
          count.textContent = rows.length ? fa(rows.length) : '';
          empty.hidden = rows.length > 0;
          list.textContent = '';

          /* Roots in order, each followed by its own replies in order.
             The database keeps the tree one level deep, so this is the
             whole of the layout problem. */
          var kids = {}, i;
          for (i = 0; i < rows.length; i++) {
            if (!rows[i].parent_id) continue;
            (kids[rows[i].parent_id] || (kids[rows[i].parent_id] = [])).push(rows[i]);
          }

          for (i = 0; i < rows.length; i++) {
            if (rows[i].parent_id) continue;
            list.appendChild(commentNode(rows[i], reply));
            var mine = kids[rows[i].id];
            if (!mine) continue;
            var box = el('div', 'nvxcm__kids');
            for (var j = 0; j < mine.length; j++) box.appendChild(commentNode(mine[j], reply));
            list.appendChild(box);
          }
        })
        .catch(function () {
          /* The database being unreachable must not put an error on a
             reader's screen. The page keeps its article; it just has no
             thread under it today. */
          empty.hidden = false;
          empty.textContent = 'دیدگاه‌ها الان در دسترس نیست.';
        });
    }

    draw();
  }


  /* ===================================================================
     8 — where to put it

     A page that names a container gets the thread there. Otherwise it
     goes after the last thing the reader reads, which differs by page
     type — so the anchors are named rather than assumed, the same way
     nvx-progress.js does it.
     =================================================================== */
  function mount() {
    var host = document.querySelector('[data-nvx-comments]');
    if (host) return host;

    var main = document.querySelector('.lesson__main') ||
               document.querySelector('main .sd') ||
               document.querySelector('article.body') ||
               document.querySelector('main');
    if (!main) return null;

    host = document.createElement('section');
    host.className = 'nvxcm';
    host.setAttribute('aria-label', 'دیدگاه‌ها');

    /* Before the footer if there is one, so the thread stays inside the
       page's own end matter rather than below its sign-off. */
    var foot = main.querySelector(':scope > footer') ||
               document.querySelector('.lesson footer');
    if (foot && foot.parentNode) foot.parentNode.insertBefore(host, foot);
    else main.appendChild(host);
    return host;
  }

  function boot() {
    var state = target();
    if (!state || !state.slug) return;

    var host = mount();
    if (!host) return;

    styles();
    if (!host.classList.contains('nvxcm')) host.classList.add('nvxcm');
    thread(host, state);
  }

  /* article.html fills itself in from the network, so its slug is in the
     URL from the start but its body is not. Nothing here waits for that:
     the thread is keyed on the slug, not on the article having rendered. */
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NVX_COMMENTS = { target: target };
})();
