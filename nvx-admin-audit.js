/* =====================================================================
   NAVIDIX — admin › activity log.

   Owner only, and that is enforced twice: this section is registered with
   owner:true so it is not drawn for anyone else, and the RLS policy on
   audit_log answers `select` with zero rows for anyone who is not an
   owner. The first is why the tab is absent; the second is why removing
   that check in the browser would still return nothing.

   Rows arrive here two ways. Triggers on site_settings and media_assets
   write on every insert/update/delete, and log_audit() is called by
   set_user_role and set_user_active for the events that are not a table
   write. In both cases the actor is taken from the token inside a
   security-definer function, never from anything the client sent — so a
   line in this log cannot be attributed to someone who did not do it.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  var ACTION = {
    insert: 'ساخت',
    update: 'ویرایش',
    delete: 'حذف',
    update_role: 'تغییر نقش',
    activate: 'فعال‌سازی',
    deactivate: 'غیرفعال‌سازی',
    publish: 'انتشار'
  };

  var ENTITY = {
    profiles: 'کاربر',
    site_settings: 'تنظیمات',
    media_assets: 'رسانه'
  };

  function label(a) { return ACTION[a] || a; }

  /* Shared with the dashboard's five-line preview, so the two never
     disagree about what an action is called. */
  window.NVX_ADMIN_AUDIT_LABEL = label;

  var rows = [], filter = '';

  function matches(r) {
    if (!filter) return true;
    var q = filter.toLowerCase();
    return (r.actor_email || '').toLowerCase().indexOf(q) !== -1 ||
           (r.entity_label || '').toLowerCase().indexOf(q) !== -1 ||
           (r.entity_type || '').toLowerCase().indexOf(q) !== -1 ||
           (label(r.action) || '').indexOf(filter) !== -1;
  }

  /* The before/after pair is the part that answers "what actually
     changed", and it is also the part that is a wall of JSON. It stays
     folded until asked for. */
  function details(r) {
    var box = el('div');
    var b = el('button', 'abtn abtn--sm', 'جزئیات');
    b.type = 'button';
    var pre = el('pre', 'alog__j');
    pre.hidden = true;
    pre.textContent = JSON.stringify({ before: r.before, after: r.after }, null, 2);

    b.addEventListener('click', function () {
      pre.hidden = !pre.hidden;
      b.textContent = pre.hidden ? 'جزئیات' : 'بستن';
    });

    box.appendChild(b);
    box.appendChild(pre);
    return box;
  }

  function line(r) {
    var li = el('li');

    var who = r.actor_email || 'نامشخص';
    var what = label(r.action);
    var on = ENTITY[r.entity_type] || r.entity_type;
    var which = r.entity_label || r.entity_id || '';

    var head = el('span', '', who + ' ← ' + on + (which ? ' «' + which + '»' : '') + ' ← ' + what);
    li.appendChild(head);
    li.appendChild(el('span', 'alog__w', A.when(r.created_at, true)));

    if (r.before || r.after) li.appendChild(details(r));
    return li;
  }

  function draw(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);

    var list = rows.filter(matches);
    body.appendChild(el('p', 'acount',
      fa(list.length) + ' رویداد' + (filter ? ' از ' + fa(rows.length) : '')));

    if (!list.length) {
      body.appendChild(A.empty(filter
        ? 'چیزی پیدا نشد.'
        : 'هنوز چیزی ثبت نشده. از اولین تغییری که در پنل بدهی پر می‌شود.'));
      return;
    }

    var panel = el('div', 'panel');
    var ul = el('ul', 'alog');
    list.forEach(function (r) { ul.appendChild(line(r)); });
    panel.appendChild(ul);
    body.appendChild(panel);
  }

  function load(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);
    body.appendChild(A.skeleton(8));
    A.db.select('audit_log?select=*&order=created_at.desc&limit=200').then(function (v) {
      rows = v || [];
      draw(host);
    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e));
    });
  }

  A.register({
    id: 'audit',
    title: 'گزارش فعالیت',
    group: 'admin',
    icon: 'audit',
    owner: true,
    render: function (host) {
      A.clear(host);
      A.page(host, {
        title: 'گزارش فعالیت',
        sub: 'چه کسی، چه زمانی، چه چیزی را عوض کرد. فقط مالک این بخش را می‌بیند، ' +
             'و پایگاه داده هم برای هر کس دیگری صفر ردیف برمی‌گرداند. دویست مورد آخر.'
      });

      var tools = el('div', 'arow');
      tools.style.margin = '0 0 16px';
      var search = el('input', 'asearch');
      search.type = 'search';
      search.placeholder = 'جست‌وجو در ایمیل، نوع یا عملیات…';
      tools.appendChild(search);
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
      reload.addEventListener('click', function () { load(host); });

      load(host);
    }
  });
})();
