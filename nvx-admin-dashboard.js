/* =====================================================================
   NAVIDIX — admin › dashboard.

   The first thing the panel opens on, and deliberately the thinnest
   section in it. Its numbers come from one call, admin_cms_overview(),
   which is a function rather than a view for a reason written in the SQL:
   a view running as the caller counts only the rows that caller may see,
   so "total users" would read 1 for an editor.

   What is missing here is the content counts — articles, prompts,
   lessons, gallery items, drafts, scheduled. Those tables do not exist
   yet. When they do, the SQL function grows the keys and the CARDS list
   below grows the rows; nothing else in this file changes.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  /* key, label, and how to render it. Anything the function does not
     return yet is skipped rather than drawn as zero — a zero is a claim
     about the data, and "not built yet" is not a zero. */
  var CARDS = [
    ['articles_total',  'مقاله‌ها',           fa],
    ['prompts_total',   'پرامپت‌ها',          fa],
    ['lessons_total',   'درس‌ها',             fa],
    ['courses_total',   'دوره‌ها',            fa],
    ['gallery_total',   'گالری',              fa],
    ['videos_total',    'ویدیوها',            fa],
    ['drafts_total',    'پیش‌نویس',           fa],
    ['scheduled_total', 'زمان‌بندی‌شده',       fa],
    ['users_total',     'کل کاربران',        fa],
    ['users_active_7d', 'فعال ۷ روز اخیر',   fa],
    ['staff_total',     'اعضای تیم',          fa],
    ['media_total',     'فایل در کتابخانه',  fa],
    ['media_bytes',     'حجم کتابخانه',       A.bytes],
    ['audit_7d',        'فعالیت ۷ روز اخیر', fa]
  ];

  function kpis(over) {
    var wrap = el('div', 'kpis');
    CARDS.forEach(function (c) {
      var v = over[c[0]];
      if (v === undefined || v === null) return;
      var box = el('div', 'kpi');
      box.appendChild(el('b', 'num', c[2](v)));
      box.appendChild(el('span', '', c[1]));
      wrap.appendChild(box);
    });
    return wrap;
  }

  /* The five most recent entries, as a taste of the log rather than the
     log itself — the full thing is its own section, and only the owner
     has it. Anyone else simply does not get this panel. */
  function recent(rows) {
    var ul = el('ul', 'alog');
    rows.forEach(function (r) {
      var li = el('li');
      li.appendChild(document.createTextNode(
        (r.actor_email || 'نامشخص') + ' — ' +
        (window.NVX_ADMIN_AUDIT_LABEL ? NVX_ADMIN_AUDIT_LABEL(r.action) : r.action) + ' — ' +
        (r.entity_label || r.entity_type)));
      li.appendChild(el('span', 'alog__w', A.when(r.created_at, true)));
      ul.appendChild(li);
    });
    return ul;
  }

  function head(host) {
    A.page(host, {
      title: 'داشبورد',
      sub: 'نمای کلی. اعداد زنده‌اند و مستقیم از پایگاه داده خوانده می‌شوند.',
      actions: [A.button('تازه‌سازی', null, null, function () { A.refresh(); })]
    });
  }

  function panel(node) {
    var p = el('div', 'panel');
    p.appendChild(node);
    return p;
  }

  A.register({
    id: 'dashboard',
    title: 'داشبورد',
    group: 'insight',
    icon: 'dashboard',
    render: function (host) {
      A.clear(host);
      head(host);
      var load = A.skeleton(6, 'tile');
      host.appendChild(load);

      A.db.rpc('admin_cms_overview').then(function (over) {
        host.removeChild(load);

        if (!over) {
          host.appendChild(A.empty('این حساب دسترسی دیدن این بخش را ندارد.'));
          return;
        }

        host.appendChild(kpis(over));

        /* The counts above are of the database. The site's own pages are
           still built from tools/ and still show what is in the repo —
           so a published article here is not yet an article there, and
           saying otherwise on the panel's front page would be the most
           expensive place to be misunderstood. */
        if (over.articles_total === undefined) {
          host.appendChild(el('h2', '', 'محتوای سایت'));
          host.appendChild(el('p', 'hint',
            'شمارش محتوا وقتی اضافه می‌شود که جدول‌هایش ساخته شوند — فایل ' +
            'supabase/cms-content.sql را اجرا کن.'));
        } else {
          host.appendChild(el('p', 'hint',
            'مقاله‌ها به سایت وصل‌اند: هرچه منتشر کنی در articles.html می‌آید. ' +
            'پرامپت‌ها، گالری و ویدیوها هنوز نه — صفحه‌هایشان از tools/ ساخته ' +
            'می‌شوند و وصل‌کردنشان دو خط در قالب سازنده است (در CMS.md).'));
        }

        if (!A.isOwner()) return;

        host.appendChild(el('h2', '', 'آخرین فعالیت‌ها'));
        host.appendChild(el('p', 'hint', 'پنج مورد آخر. گزارش کامل در بخش «گزارش فعالیت» است.'));

        return A.db.select('audit_log?select=*&order=created_at.desc&limit=5')
          .then(function (rows) {
            host.appendChild(panel(rows.length
              ? recent(rows)
              : A.empty('هنوز چیزی ثبت نشده.')));
          }, function (e) {
            host.appendChild(panel(A.note(e)));
          });

      }, function (e) {
        host.removeChild(load);
        host.appendChild(A.note(e));
      });
    }
  });
})();
