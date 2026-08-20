/* =====================================================================
   NAVIDIX — admin › dashboard.

   The first thing the panel opens on, and deliberately the thinnest
   section in it. Its numbers come from one call, admin_cms_overview(),
   which is a function rather than a view for a reason written in the SQL:
   a view running as the caller counts only the rows that caller may see,
   so "total users" would read 1 for an editor.

   The content counts come from two places, because the content does.
   admin_cms_overview() counts rows in the CMS tables; content/site-stats.json
   counts what the built pages already serve. Adding only the first would
   have shown a zero next to "prompts" while the site was serving two
   hundred of them, and a zero is a claim about the world.
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
    ['articles_total',  'مقاله‌ها',           fa, 'articles'],
    ['prompts_total',   'پرامپت‌ها',          fa, 'prompts'],
    ['lessons_total',   'درس‌ها',             fa, 'lessons'],
    ['courses_total',   'دوره‌ها',            fa, 'courses'],
    ['gallery_total',   'گالری',              fa, 'gallery'],
    ['videos_total',    'ویدیوها',            fa, 'videos'],
    ['drafts_total',    'پیش‌نویس',           fa],
    ['scheduled_total', 'زمان‌بندی‌شده',       fa],
    ['users_total',     'کل کاربران',        fa],
    ['users_active_7d', 'فعال ۷ روز اخیر',   fa],
    ['staff_total',     'اعضای تیم',          fa],
    ['media_total',     'فایل در کتابخانه',  fa],
    ['media_bytes',     'حجم کتابخانه',       A.bytes],
    ['audit_7d',        'فعالیت ۷ روز اخیر', fa]
  ];

  /* What the built pages already serve. Missing or unbuilt is not an
     error and not a zero — it is simply an unknown, and an unknown is
     left out of the split line rather than asserted as none. */
  function siteStats() {
    return fetch('/content/site-stats.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { return v && typeof v === 'object' ? v : null; },
            function () { return null; });
  }

  function kpis(over, site) {
    var wrap = el('div', 'kpis');
    CARDS.forEach(function (c) {
      var v = over[c[0]];
      if (v === undefined || v === null) return;

      /* The big number is everything of this kind the visitor can reach,
         wherever it is kept. The split underneath says where, because
         only one of the two halves is editable from this panel and
         someone about to look for a prompt here needs to know that. */
      var onSite = site && typeof site[c[3]] === 'number' ? site[c[3]] : null;
      var box = el('div', 'kpi');
      box.appendChild(el('b', 'num', c[2](onSite === null ? v : v + onSite)));
      box.appendChild(el('span', '', c[1]));
      if (onSite) {
        box.appendChild(el('span', 'kpi__split',
          fa(v) + ' در پنل · ' + fa(onSite) + ' از مخزن'));
      }
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

      Promise.all([
        A.db.rpc('admin_cms_overview'),
        siteStats()
      ]).then(function (both) {
        var over = both[0], site = both[1];
        host.removeChild(load);

        if (!over) {
          host.appendChild(A.empty('این حساب دسترسی دیدن این بخش را ندارد.'));
          return;
        }

        host.appendChild(kpis(over, site));

        /* Which half is editable from here differs by kind, and getting
           that wrong is expensive: someone who reads "200 prompts" and
           goes looking for them in the panel finds an empty list. So the
           line below says plainly that only the panel's half is editable,
           and that of the five kinds only articles currently reach the
           site from both halves at once. */
        if (over.articles_total === undefined) {
          host.appendChild(el('h2', '', 'محتوای سایت'));
          host.appendChild(el('p', 'hint',
            'شمارش محتوا وقتی اضافه می‌شود که جدول‌هایش ساخته شوند — فایل ' +
            'supabase/cms-content.sql را اجرا کن.'));
        } else {
          host.appendChild(el('p', 'hint',
            'عددها مجموع دو جا هستند: آنچه در همین پنل ساخته‌ای، و آنچه از قبل ' +
            'روی سایت است و از مخزن ساخته می‌شود (tools/). فقط نیمه‌ی اول از ' +
            'اینجا ویرایش می‌شود. مقاله‌ها هر دو نیمه‌شان کنار هم در articles.html ' +
            'می‌آیند؛ پرامپت‌ها، گالری و ویدیوها هنوز فقط از مخزن می‌آیند ' +
            '(شرحش در CMS.md).'));
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
