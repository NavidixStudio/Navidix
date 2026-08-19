/* =====================================================================
   NAVIDIX — admin › central search.

   One box across all six content tables. It could have been six requests
   fired in parallel and merged in the browser; it is one RPC instead,
   because merging in the browser means sorting six lists by a date the
   browser has to parse, and because six round trips on a phone over a
   3G connection is the difference between a search box and a wait.

   admin_search() is gated on is_staff() and returns nothing for a query
   shorter than two characters — so an empty box cannot become an export
   of every row in the database.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  /* Where a hit lives, so a result can be a door rather than a fact.
     The key is the table name the RPC reports. */
  var WHERE = {
    articles:      { section: 'articles',   label: 'مقاله' },
    prompts:       { section: 'prompts',    label: 'پرامپت' },
    courses:       { section: 'courses',    label: 'دوره' },
    lessons:       { section: 'lessons',    label: 'درس' },
    gallery_items: { section: 'gallery',    label: 'گالری' },
    videos:        { section: 'videos',     label: 'ویدیو' }
  };

  var STATUS_FA = { draft: 'پیش‌نویس', published: 'منتشرشده', scheduled: 'زمان‌بندی‌شده' };

  function results(rows) {
    if (!rows.length) return A.empty('چیزی پیدا نشد.');

    var t = el('table'), thead = el('thead'), hd = el('tr');
    ['عنوان', 'نوع', 'وضعیت', 'آخرین تغییر', ''].forEach(function (h, i) {
      hd.appendChild(el('th', i >= 3 ? 'n' : '', h));
    });
    thead.appendChild(hd);
    t.appendChild(thead);

    var tb = el('tbody');
    rows.forEach(function (r) {
      var w = WHERE[r.kind] || { section: null, label: r.kind };
      var tr = el('tr');

      tr.appendChild(el('td', '', r.label || '—'));
      tr.appendChild(el('td', '', w.label));

      var ts = el('td');
      ts.appendChild(el('span', 'abadge' +
        (r.status === 'published' ? ' abadge--editor'
         : r.status === 'scheduled' ? ' abadge--admin' : ''),
        STATUS_FA[r.status] || r.status || '—'));
      tr.appendChild(ts);

      tr.appendChild(el('td', 'n', A.when(r.updated, true)));

      var act = el('td', 'n');
      if (w.section) {
        var go = el('button', 'abtn abtn--sm', 'برو');
        go.type = 'button';
        go.addEventListener('click', function () { location.hash = '#/' + w.section; });
        act.appendChild(go);
      }
      tr.appendChild(act);

      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  A.register({
    id: 'search',
    title: 'جست‌وجو',
    render: function (host) {
      A.clear(host);
      host.appendChild(el('p', 'sub',
        'جست‌وجو در مقاله‌ها، پرامپت‌ها، دوره‌ها، درس‌ها، گالری و ویدیوها — با هم. ' +
        'دست‌کم دو نویسه بنویس.'));

      var tools = el('div', 'arow');
      tools.style.margin = '0 0 16px';
      var q = el('input', 'asearch');
      q.type = 'search';
      q.placeholder = 'دنبال چه می‌گردی؟';
      tools.appendChild(q);
      host.appendChild(tools);

      var body = el('div');
      host.appendChild(body);
      body.appendChild(A.empty('چیزی بنویس تا بگردم.'));

      /* Typing is not a query. Two hundred milliseconds of quiet is,
         which on a real keyboard is one search per word rather than one
         per letter. */
      var timer = null, seq = 0;

      q.addEventListener('input', function () {
        clearTimeout(timer);
        var term = q.value.trim();

        if (term.length < 2) {
          A.clear(body);
          body.appendChild(A.empty('چیزی بنویس تا بگردم.'));
          return;
        }

        timer = setTimeout(function () {
          var mine = ++seq;
          A.clear(body);
          body.appendChild(A.spinner());

          A.db.rpc('admin_search', { q: term }).then(function (rows) {
            /* A slow answer to an old query must not overwrite a fast
               answer to a new one. */
            if (mine !== seq) return;
            A.clear(body);
            var node = results(rows || []);
            if (node.tagName === 'TABLE') {
              var panel = el('div', 'panel');
              var sc = el('div', 'scroll');
              sc.appendChild(node);
              panel.appendChild(sc);
              body.appendChild(el('p', 'acount', fa((rows || []).length) + ' نتیجه'));
              body.appendChild(panel);
            } else {
              body.appendChild(node);
            }
          }, function (e) {
            if (mine !== seq) return;
            A.clear(body);
            body.appendChild(A.note(e, 'supabase/cms-content.sql'));
          });
        }, 200);
      });

      setTimeout(function () { q.focus(); }, 60);
    }
  });
})();
