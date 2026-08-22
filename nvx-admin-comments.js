/* =====================================================================
   NAVIDIX — admin › comments.

   Not a resource. nvx-admin-resource.js draws things you create, edit and
   publish; nobody creates a comment from here. The only three verbs are
   hide, show and delete, so this is a list with buttons rather than a
   list with a form behind it.

   Comments go live the moment they are written — that was a deliberate
   choice, and it is what makes this screen matter: it is the only place
   the thread can be walked back. So the defaults are built around being
   caught up quickly. Newest first, the page each one sits on named and
   linked, and a filter that starts on "everything" rather than on a
   status nobody remembers choosing.

   Two things worth stating about what is not here.

   Nothing in this file can read who wrote a comment beyond the name that
   was stored with it. user_id and client_hash are revoked from every
   role in cms-comments.sql — including this one. The panel does not need
   them, and a moderation screen that quietly exposes a commenter's
   identity is worse than no screen.

   And hiding is not deleting. `hidden` takes a comment off the site and
   keeps the row, which is what you want the first time somebody is rude
   and the second time you decide they were not. Delete is there too, and
   it takes the replies with it, which the confirmation says out loud.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  var PERM = 'comments.manage';

  /* Where a comment sits, in words, and the address it sits at. Both come
     from the same pair of columns so the label and the link can never
     disagree. */
  var KIND = {
    article: 'مقاله',
    lesson:  'درس',
    style:   'سبک',
    prompt:  'پرامپت',
    page:    'صفحه'
  };

  function href(r) {
    if (r.target_type === 'article') return '/article.html?slug=' + encodeURIComponent(r.target_slug);
    if (r.target_type === 'style')   return '/style/' + encodeURIComponent(r.target_slug) + '.html';
    return '/' + encodeURIComponent(r.target_slug) + '.html';
  }

  var STATUS = {
    visible: 'روی سایت',
    hidden:  'پنهان',
    spam:    'اسپم'
  };

  var rows = [], filter = '', only = 'all';


  function matches(r) {
    if (only !== 'all' && r.status !== only) return false;
    if (!filter) return true;
    var q = filter.toLowerCase();
    return (r.author_name || '').toLowerCase().indexOf(q) !== -1 ||
           (r.body || '').toLowerCase().indexOf(q) !== -1 ||
           (r.target_slug || '').toLowerCase().indexOf(q) !== -1;
  }


  /* ---- one row ---- */
  function line(r, host) {
    var li = el('li', 'acmt');

    var head = el('div', 'acmt__head');
    head.appendChild(el('span', 'acmt__who', r.author_name || 'بی‌نام'));
    if (r.is_member) head.appendChild(el('span', 'acmt__tag', 'کاربر سایت'));
    if (r.parent_id) head.appendChild(el('span', 'acmt__tag', 'پاسخ'));
    head.appendChild(A.statusBadge(
      r.status === 'visible' ? 'published' : 'draft', STATUS[r.status] || r.status));

    var where = el('a', 'acmt__where');
    where.href = href(r);
    where.target = '_blank';
    where.rel = 'noopener';
    where.textContent = (KIND[r.target_type] || r.target_type) + ' › ' + r.target_slug;
    head.appendChild(where);

    head.appendChild(el('span', 'acmt__w', A.when(r.created_at, true)));
    li.appendChild(head);

    /* textContent, always. A comment body is the one string on this
       screen that a stranger wrote. */
    li.appendChild(el('p', 'acmt__body', r.body || ''));

    if (!A.can(PERM)) return li;

    var acts = el('div', 'acmt__acts');

    var toggle = A.button(r.status === 'visible' ? 'پنهان کن' : 'برگردان روی سایت', '', '', function () {
      var next = r.status === 'visible' ? 'hidden' : 'visible';
      toggle.disabled = true;
      A.db.update('comments', 'id=eq.' + r.id, { status: next }).then(function () {
        r.status = next;
        A.toast(next === 'hidden' ? 'پنهان شد.' : 'برگشت روی سایت.', 'ok');
        draw(host);
      }, function (e) {
        toggle.disabled = false;
        A.toast(String(e), 'bad');
      });
    });
    acts.appendChild(toggle);

    if (r.status !== 'spam') {
      acts.appendChild(A.button('اسپم', '', '', function () {
        A.db.update('comments', 'id=eq.' + r.id, { status: 'spam' }).then(function () {
          r.status = 'spam';
          A.toast('به‌عنوان اسپم علامت خورد.', 'ok');
          draw(host);
        }, function (e) { A.toast(String(e), 'bad'); });
      }));
    }

    acts.appendChild(A.button('حذف', 'danger', '', function () {
      /* The cascade is in the schema, not in this call, so the warning
         has to be here — from the panel it looks like one row. */
      A.confirm('حذف دیدگاه',
        'این دیدگاه برای همیشه پاک می‌شود' +
        (r.parent_id ? '.' : ' — و اگر پاسخی زیرش باشد، آن‌ها هم با آن می‌روند.') +
        ' اگر فقط می‌خواهی از سایت برداشته شود، «پنهان کن» را بزن؛ آن برگشت‌پذیر است.'
      ).then(function (ok) {
        if (!ok) return;
        A.db.remove('comments', 'id=eq.' + r.id).then(function () {
          rows = rows.filter(function (x) { return x.id !== r.id && x.parent_id !== r.id; });
          A.toast('پاک شد.', 'ok');
          draw(host);
        }, function (e) { A.toast(String(e), 'bad'); });
      });
    }));

    li.appendChild(acts);
    return li;
  }


  function draw(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);

    var list = rows.filter(matches);

    var live = rows.filter(function (r) { return r.status === 'visible'; }).length;
    body.appendChild(el('p', 'acount',
      fa(list.length) + ' دیدگاه' +
      (list.length !== rows.length ? ' از ' + fa(rows.length) : '') +
      ' · ' + fa(live) + ' تا روی سایت'));

    if (!list.length) {
      body.appendChild(A.empty(
        rows.length
          ? 'با این فیلتر چیزی نیست.'
          : 'هنوز دیدگاهی ثبت نشده. اولین دیدگاه که بیاید همین‌جا می‌نشیند.'));
      return;
    }

    var panel = el('div', 'panel');
    var ul = el('ul', 'acmts');
    list.forEach(function (r) { ul.appendChild(line(r, host)); });
    panel.appendChild(ul);
    body.appendChild(panel);
  }


  function load(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);
    body.appendChild(A.skeleton(6));

    /* The column list is written out rather than select=*, because * on
       this table would ask for user_id and client_hash — which are
       revoked, so the whole request would come back 403 and the screen
       would look broken for a reason nobody could guess. */
    A.db.select('comments?select=id,target_type,target_slug,parent_id,author_name,' +
                'is_member,body,is_pinned,status,created_at,hidden_at' +
                '&order=created_at.desc&limit=300')
      .then(function (v) {
        rows = v || [];
        draw(host);
      }, function (e) {
        A.clear(body);
        body.appendChild(A.note(e));
      });
  }


  /* ---- the styles this screen needs and no other does ---- */
  function styles() {
    if (document.getElementById('acmt-css')) return;
    var css = document.createElement('style');
    css.id = 'acmt-css';
    css.textContent = [
      '.acmts{list-style:none;margin:0;padding:0;}',
      '.acmt{padding:14px 0;border-top:1px solid var(--line,rgba(226,238,255,.08));}',
      '.acmt:first-child{border-top:0;}',
      '.acmt__head{display:flex;align-items:center;gap:9px;flex-wrap:wrap;',
      '  margin-bottom:7px;font-size:12px;}',
      '.acmt__who{font-weight:700;font-size:13px;}',
      '.acmt__tag{font-size:10.5px;font-weight:600;padding:1.5px 7px;border-radius:99px;',
      '  background:rgba(127,184,255,.14);color:#9CC6FF;}',
      '.acmt__where{color:#7FB8FF;text-decoration:none;font-size:12px;}',
      '.acmt__where:hover{text-decoration:underline;}',
      '.acmt__w{margin-inline-start:auto;opacity:.7;}',
      '.acmt__body{margin:0 0 9px;font-size:13.5px;line-height:2;',
      '  white-space:pre-wrap;overflow-wrap:anywhere;}',
      '.acmt__acts{display:flex;gap:8px;flex-wrap:wrap;}'
    ].join('');
    document.head.appendChild(css);
  }


  A.register({
    id: 'comments',
    title: 'دیدگاه‌ها',
    group: 'content',
    icon: 'comment',
    perm: PERM,
    render: function (host) {
      styles();
      A.clear(host);
      A.page(host, {
        title: 'دیدگاه‌ها',
        sub: 'هر دیدگاهی که روی سایت نوشته شده — زیر مقاله، درس یا صفحه‌ی سبک. ' +
             'دیدگاه‌ها همان لحظه منتشر می‌شوند، پس این‌جا جایی است که برشان ' +
             'می‌گردانی. «پنهان» از سایت برشان می‌دارد و نگهشان می‌دارد؛ «حذف» ' +
             'برگشت ندارد. سیصد مورد آخر.'
      });

      var tools = el('div', 'arow');
      tools.style.margin = '0 0 16px';

      var search = el('input', 'asearch');
      search.type = 'search';
      search.placeholder = 'جست‌وجو در نام، متن یا نشانی صفحه…';
      tools.appendChild(search);

      var pick = el('select', 'asearch');
      pick.style.flex = '0 0 auto';
      [['all', 'همه'], ['visible', 'روی سایت'], ['hidden', 'پنهان'], ['spam', 'اسپم']]
        .forEach(function (o) {
          var op = el('option', null, o[1]);
          op.value = o[0];
          pick.appendChild(op);
        });
      tools.appendChild(pick);

      var reload = el('button', 'abtn', '↻ تازه‌سازی');
      reload.type = 'button';
      tools.appendChild(reload);

      host.appendChild(tools);

      var body = el('div');
      body.setAttribute('data-body', '');
      host.appendChild(body);

      search.addEventListener('input', function () {
        filter = search.value.trim();
        draw(host);
      });
      pick.addEventListener('change', function () {
        only = pick.value;
        draw(host);
      });
      reload.addEventListener('click', function () { load(host); });

      load(host);
    }
  });
})();
