/* =====================================================================
   NAVIDIX — admin › users and roles.

   Two things happen here and both go through an RPC rather than a table
   write: set_user_role and set_user_active. That is not a style choice.
   profiles.role and profiles.is_active are outside the column grant given
   to `authenticated`, so a PATCH on them is refused at the privilege
   level before any policy is consulted — the two functions are the only
   door, and each carries its own checks (you cannot change yourself, only
   an owner may touch an owner, admins.manage is required at all).

   Which means the select box below is a convenience. Removing it from the
   DOM would not grant anyone anything.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  /* Owner is missing from this list on purpose. Handing the top of the
     ladder to someone else is not a dropdown decision, and the SQL
     refuses it from anyone who is not already an owner — so offering it
     would mostly produce an error message. It stays a SQL Editor act. */
  var ASSIGNABLE = ['reader', 'viewer', 'writer', 'editor', 'admin'];

  var rows = [], filter = '';

  function matches(r) {
    if (!filter) return true;
    var q = filter.toLowerCase();
    return (r.email || '').toLowerCase().indexOf(q) !== -1 ||
           (r.display_name || '').toLowerCase().indexOf(q) !== -1 ||
           (A.ROLE_FA[r.role] || '').indexOf(filter) !== -1;
  }

  function roleSelect(r, onDone) {
    var s = el('select', 'aselect');
    s.style.cssText = 'width:auto;min-width:112px;padding:5px 9px;font-size:12px';

    var opts = ASSIGNABLE.slice();
    /* An existing owner has to be representable in their own row, even
       though nobody can be promoted into it from here. */
    if (opts.indexOf(r.role) === -1) opts.unshift(r.role);

    opts.forEach(function (id) {
      var o = el('option', '', A.ROLE_FA[id] || id);
      o.value = id;
      if (id === r.role) o.selected = true;
      s.appendChild(o);
    });

    var me = A.ctx() || {};
    var locked = !A.can('admins.manage') ||
                 r.id === me.user_id ||
                 (r.role === 'owner' && !A.isOwner());
    s.disabled = locked;
    if (locked) s.title = r.id === me.user_id
      ? 'نقش خودت را از اینجا نمی‌توانی عوض کنی'
      : 'برای این کار دسترسی admins.manage لازم است';

    s.addEventListener('change', function () {
      var next = s.value, prev = r.role;
      s.disabled = true;
      A.db.rpc('set_user_role', { p_user_id: r.id, p_role_id: next }).then(function () {
        r.role = next;
        A.toast((r.email || 'کاربر') + ' شد ' + (A.ROLE_FA[next] || next), 'good');
        onDone();
      }, function (e) {
        s.value = prev;
        s.disabled = false;
        A.toast(e.message, 'bad');
      });
    });

    return s;
  }

  function activeButton(r, onDone) {
    var me = A.ctx() || {};
    var b = el('button', 'abtn abtn--sm' + (r.is_active ? ' abtn--danger' : ''),
               r.is_active ? 'غیرفعال' : 'فعال کن');
    b.type = 'button';

    var locked = !A.can('admins.manage') ||
                 r.id === me.user_id ||
                 (r.role === 'owner' && !A.isOwner());
    b.disabled = locked;

    b.addEventListener('click', function () {
      var next = !r.is_active;
      var go = next
        ? Promise.resolve(true)
        : A.confirm('غیرفعال شود؟',
            (r.email || 'این کاربر') + ' دیگر به هیچ بخشی از پنل دسترسی نخواهد داشت. ' +
            'حسابش پاک نمی‌شود و هر وقت خواستی دوباره فعالش می‌کنی.',
            'غیرفعال کن');

      go.then(function (ok) {
        if (!ok) return;
        b.disabled = true;
        return A.db.rpc('set_user_active', { p_user_id: r.id, p_active: next })
          .then(function () {
            r.is_active = next;
            A.toast(next ? 'فعال شد' : 'غیرفعال شد', 'good');
            onDone();
          }, function (e) {
            b.disabled = false;
            A.toast(e.message, 'bad');
          });
      });
    });

    return b;
  }

  function table(onDone) {
    var total = window.NVX_CURRICULUM ? NVX_CURRICULUM.total : 0;
    var list = rows.filter(matches);

    if (!list.length) return A.empty(filter ? 'چیزی پیدا نشد.' : 'هنوز کسی ثبت‌نام نکرده.');

    var t = el('table', 't--users'), thead = el('thead'), hd = el('tr');
    ['ایمیل', 'نقش', 'وضعیت', 'ثبت‌نام', 'تکمیل', 'زمان', ''].forEach(function (h, i) {
      hd.appendChild(el('th', i >= 4 && i <= 5 ? 'n' : '', h));
    });
    thead.appendChild(hd);
    t.appendChild(thead);

    var tb = el('tbody');
    list.forEach(function (r) {
      var tr = el('tr');

      var td = el('td');
      td.appendChild(el('span', 'mail', r.email || '—'));
      if (r.display_name) {
        td.appendChild(el('span', 'path', r.display_name));
      }
      tr.appendChild(td);

      var tdRole = el('td');
      tdRole.appendChild(roleSelect(r, onDone));
      tr.appendChild(tdRole);

      var tdState = el('td');
      tdState.appendChild(r.is_active
        ? A.roleBadge(r.role, true)
        : el('span', 'abadge abadge--off', 'غیرفعال'));
      tr.appendChild(tdState);

      tr.appendChild(el('td', '', A.when(r.joined)));
      tr.appendChild(el('td', 'n num', fa(r.completed || 0) + ' از ' + fa(total || 0)));
      tr.appendChild(el('td', 'n', A.hours(r.seconds)));

      var tdAct = el('td', 'n');
      tdAct.appendChild(activeButton(r, onDone));
      tr.appendChild(tdAct);

      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function draw(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);

    var count = el('p', 'acount',
      fa(rows.filter(matches).length) + ' کاربر' +
      (filter ? ' از ' + fa(rows.length) : '') + ' · ' +
      fa(rows.filter(function (r) { return r.role !== 'reader'; }).length) + ' عضو تیم');
    body.appendChild(count);

    var node = table(function () { draw(host); });
    var panel = el('div', 'panel');
    if (node.tagName === 'TABLE') {
      var sc = el('div', 'scroll');
      sc.appendChild(node);
      panel.appendChild(sc);
    } else {
      panel.appendChild(node);
    }
    body.appendChild(panel);
  }

  A.register({
    id: 'users',
    title: 'کاربران',
    perm: ['users.manage', 'admins.manage'],
    render: function (host) {
      A.clear(host);

      host.appendChild(el('p', 'sub',
        A.can('admins.manage')
          ? 'نقش هر کس را از همین‌جا عوض کن. تغییر نقش و غیرفعال‌کردن هر دو در گزارش فعالیت ثبت می‌شوند.'
          : 'فهرست کاربران. برای تغییر نقش یا غیرفعال‌کردن، دسترسی admins.manage لازم است.'));

      var tools = el('div', 'arow');
      tools.style.margin = '0 0 16px';

      var search = el('input', 'asearch');
      search.type = 'search';
      search.placeholder = 'جست‌وجو در ایمیل، نام یا نقش…';
      tools.appendChild(search);

      var reload = el('button', 'abtn', '↻ تازه‌سازی');
      reload.type = 'button';
      tools.appendChild(reload);
      host.appendChild(tools);

      var body = el('div');
      body.setAttribute('data-body', '');
      host.appendChild(body);

      function load() {
        A.clear(body);
        body.appendChild(A.spinner());
        A.db.rpc('admin_user_list').then(function (v) {
          rows = v || [];
          draw(host);
        }, function (e) {
          A.clear(body);
          body.appendChild(A.note(e));
        });
      }

      search.addEventListener('input', function () {
        filter = search.value.trim();
        draw(host);
      });
      reload.addEventListener('click', load);

      load();
    }
  });
})();
