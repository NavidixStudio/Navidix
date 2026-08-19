/* =====================================================================
   NAVIDIX — admin › the resource engine.

   Six content types, one implementation. Articles, prompts, courses,
   lessons, gallery items and videos differ in their columns and in which
   permission guards them, and in nothing else: each is a list you can
   filter, a form you fill in, a status you set, and an order you drag
   things around in. Written six times that is six places for the status
   control to drift apart.

   So this file is the whole of it, and nvx-admin-content.js is six field
   descriptions. Adding a seventh content type is a dozen lines there and
   nothing here.

   What it deliberately does not do is decide anything about permission.
   It reads spec.perms to know which buttons to draw, and every one of
   those buttons calls a table the database has already gated — a Writer
   who un-hides the publish control gets an exception from the trigger in
   cms-content.sql, not a published article.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  var STATUS = [
    ['draft',     'پیش‌نویس'],
    ['published', 'منتشرشده'],
    ['scheduled', 'زمان‌بندی‌شده']
  ];
  var STATUS_FA = { draft: 'پیش‌نویس', published: 'منتشرشده', scheduled: 'زمان‌بندی‌شده' };

  /* Options for category and reference fields are the same for every row
     in a list, so they are fetched once per section rather than per row. */
  var refCache = {};

  function cacheKey(table, filter) { return table + '|' + (filter || ''); }

  function options(table, filter, labelField) {
    var k = cacheKey(table, filter);
    if (refCache[k]) return Promise.resolve(refCache[k]);
    var q = table + '?select=id,' + labelField + (filter ? '&' + filter : '') + '&order=' + labelField;
    return A.db.select(q).then(function (rows) {
      refCache[k] = rows.map(function (r) {
        return { id: r.id, label: r[labelField] };
      });
      return refCache[k];
    }, function () { return []; });
  }

  function dropCache() { refCache = {}; }


  /* ===================================================================
     slugs

     A Persian title cannot be transliterated into a URL slug without
     inventing a romanisation, and every romanisation is wrong for
     somebody. So Latin characters are kept, everything else is dropped,
     and a title with nothing Latin in it falls back to a short random
     handle the author can then rewrite. Better an honest `post-k3n8fa`
     than a confident mis-spelling of someone's name.
     =================================================================== */
  function slugify(s) {
    var out = String(s || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return out;
  }

  function fallbackSlug(prefix) {
    return (prefix || 'item') + '-' + Math.random().toString(36).slice(2, 8);
  }


  /* ===================================================================
     date helpers for <input type="datetime-local">

     That control speaks local wall-clock with no zone; the column is
     timestamptz. Converting through the Date object in both directions
     keeps the reader in Tehran time without storing Tehran time.
     =================================================================== */
  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fromLocalInput(v) {
    if (!v) return null;
    var d = new Date(v);
    return isNaN(d) ? null : d.toISOString();
  }


  /* ===================================================================
     one field

     Returns the node to append and a read() that produces the value to
     store. Nothing validates here beyond `required`; the database has
     the real constraints and its message is the one worth showing.
     =================================================================== */
  function field(f, value, opts) {
    var wrap = el('div', 'afield');
    var label = el('label', 'alabel', f.label + (f.required ? ' *' : ''));
    wrap.appendChild(label);

    var node, read;

    if (f.type === 'bool') {
      var sw = el('label', 'aswitch');
      node = el('input');
      node.type = 'checkbox';
      node.checked = value === true;
      sw.appendChild(node);
      sw.appendChild(el('span', '', f.on || 'بله'));
      wrap.appendChild(sw);
      read = function () { return node.checked; };

    } else if (f.type === 'select' || f.type === 'ref' || f.type === 'category') {
      node = el('select', 'aselect');
      var blank = el('option', '', f.blank || '— انتخاب نشده —');
      blank.value = '';
      node.appendChild(blank);

      var fill = function (list) {
        list.forEach(function (o) {
          var op = el('option', '', o.label);
          op.value = o.id;
          if (String(value) === String(o.id)) op.selected = true;
          node.appendChild(op);
        });
      };

      if (f.type === 'select') {
        fill((f.options || []).map(function (o) {
          return Array.isArray(o) ? { id: o[0], label: o[1] } : o;
        }));
      } else {
        (opts && opts[f.key] ? Promise.resolve(opts[f.key]) : Promise.resolve([])).then(fill);
      }

      wrap.appendChild(node);
      read = function () { return node.value || null; };

    } else if (f.type === 'tags') {
      node = el('input', 'ainput');
      node.type = 'text';
      node.value = (value || []).join('، ');
      node.placeholder = f.placeholder || 'با ویرگول جدا کن';
      wrap.appendChild(node);
      read = function () {
        return node.value.split(/[,،]/)
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length; });
      };

    } else if (f.type === 'media') {
      node = el('input');
      node.type = 'hidden';
      node.value = value || '';

      var box = el('div');
      var prev = el('div');
      var paint = function () {
        A.clear(prev);
        if (!node.value) {
          prev.appendChild(el('p', 'ahelp', 'تصویری انتخاب نشده.'));
          return;
        }
        var img = el('img');
        img.src = A.storage.publicUrl(node.value);
        img.alt = '';
        img.style.cssText = 'max-width:190px;border-radius:9px;border:1px solid var(--line2);display:block';
        prev.appendChild(img);
        prev.appendChild(el('p', 'ahelp', node.value));
      };

      var row = el('div', 'arow');
      row.style.marginTop = '8px';

      var pick = el('button', 'abtn abtn--sm', 'انتخاب از کتابخانه');
      pick.type = 'button';
      pick.addEventListener('click', function () {
        if (!window.NVX_ADMIN_MEDIA || !NVX_ADMIN_MEDIA.pick) {
          A.toast('کتابخانه‌ی رسانه بالا نیامده.', 'bad');
          return;
        }
        NVX_ADMIN_MEDIA.pick().then(function (asset) {
          if (!asset) return;
          node.value = asset.path;
          paint();
        });
      });

      var clr = el('button', 'abtn abtn--sm', 'پاک کن');
      clr.type = 'button';
      clr.addEventListener('click', function () { node.value = ''; paint(); });

      row.appendChild(pick);
      row.appendChild(clr);
      box.appendChild(prev);
      box.appendChild(row);
      box.appendChild(node);
      wrap.appendChild(box);
      paint();
      read = function () { return node.value || null; };

    } else if (f.type === 'datetime') {
      node = el('input', 'ainput ainput--ltr');
      node.type = 'datetime-local';
      node.value = toLocalInput(value);
      wrap.appendChild(node);
      read = function () { return fromLocalInput(node.value); };

    } else if (f.type === 'number') {
      node = el('input', 'ainput ainput--ltr');
      node.type = 'number';
      node.value = value == null ? '' : value;
      if (f.min != null) node.min = f.min;
      wrap.appendChild(node);
      read = function () { return node.value === '' ? null : Number(node.value); };

    } else if (f.type === 'textarea' || f.type === 'markdown') {
      node = el('textarea', 'atextarea');
      if (f.type === 'markdown') node.style.minHeight = '260px';
      node.value = value == null ? '' : value;
      if (f.placeholder) node.placeholder = f.placeholder;
      wrap.appendChild(node);
      read = function () { return node.value.trim() || null; };

    } else {
      node = el('input', 'ainput' + (f.ltr ? ' ainput--ltr' : ''));
      node.type = f.type === 'url' ? 'url' : 'text';
      node.value = value == null ? '' : value;
      if (f.placeholder) node.placeholder = f.placeholder;
      wrap.appendChild(node);
      read = function () { return node.value.trim() || null; };
    }

    if (f.required && node.type !== 'hidden') node.required = true;
    if (f.help) wrap.appendChild(el('p', 'ahelp', f.help));

    return { wrap: wrap, read: read, node: node, spec: f };
  }


  /* ===================================================================
     the status control

     Its own thing rather than a field, because it is three controls that
     only make sense together: what the status is, when it goes out if it
     is scheduled, and whether this reader may set either. Without
     content.publish the select is locked to draft and says why.
     =================================================================== */
  function statusControl(spec, row) {
    var canPublish = A.can('content.publish');

    var wrap = el('div', 'afield');
    wrap.appendChild(el('label', 'alabel', 'وضعیت'));

    var sel = el('select', 'aselect');
    STATUS.forEach(function (s) {
      var o = el('option', '', s[1]);
      o.value = s[0];
      if ((row.status || 'draft') === s[0]) o.selected = true;
      sel.appendChild(o);
    });
    sel.disabled = !canPublish;
    wrap.appendChild(sel);

    var when = el('div', 'afield');
    when.style.marginTop = '12px';
    when.appendChild(el('label', 'alabel', 'زمان انتشار'));
    var dt = el('input', 'ainput ainput--ltr');
    dt.type = 'datetime-local';
    dt.value = toLocalInput(row.scheduled_for);
    dt.disabled = !canPublish;
    when.appendChild(dt);
    when.appendChild(el('p', 'ahelp',
      'در این لحظه خودش منتشر می‌شود. تا آن موقع از بیرون دیده نمی‌شود، ' +
      'حتی اگر کسی وضعیت را دستی عوض کند.'));

    var sync = function () { when.hidden = sel.value !== 'scheduled'; };
    sel.addEventListener('change', sync);
    sync();

    wrap.appendChild(when);

    if (!canPublish) {
      wrap.appendChild(el('p', 'ahelp',
        'برای انتشار یا زمان‌بندی، دسترسی content.publish لازم است. ' +
        'کارت به‌صورت پیش‌نویس ذخیره می‌شود.'));
    }

    return {
      wrap: wrap,
      read: function () {
        var st = canPublish ? sel.value : (row.status || 'draft');
        return {
          status: st,
          scheduled_for: st === 'scheduled' ? fromLocalInput(dt.value) : null
        };
      }
    };
  }


  /* ===================================================================
     preview

     Honest about what it is. The site's own pages do not read these
     tables yet — that is the next phase — so this shows the content in
     the panel's typography rather than claiming to be the finished page.
     =================================================================== */
  function preview(spec, values) {
    var box = el('div');

    if (values.cover_path || values.media_path || values.thumbnail_path) {
      var img = el('img');
      img.src = A.storage.publicUrl(values.cover_path || values.media_path || values.thumbnail_path);
      img.alt = '';
      img.style.cssText = 'width:100%;border-radius:11px;margin:0 0 14px;display:block';
      box.appendChild(img);
    }

    var title = values[spec.labelField];
    if (title) {
      var h = el('h2', '', title);
      h.style.margin = '0 0 8px';
      box.appendChild(h);
    }

    ['excerpt', 'description', 'recipe'].forEach(function (k) {
      if (values[k]) {
        var p = el('p', 'hint', values[k]);
        p.style.margin = '0 0 12px';
        box.appendChild(p);
      }
    });

    if (values.body) {
      var b = el('div');
      b.style.cssText = 'font-size:14px;line-height:2.1;color:var(--ink2);white-space:pre-wrap';
      b.textContent = values.body;
      box.appendChild(b);
    }

    A.modal({
      title: 'پیش‌نمایش',
      body: 'این محتوا با تایپوگرافی پنل نشان داده می‌شود. نمایش دقیق روی سایت وقتی ' +
            'ممکن می‌شود که صفحه‌های عمومی از همین جدول‌ها بخوانند.',
      node: box, confirm: 'بستن', cancel: 'انصراف'
    });
  }


  /* ===================================================================
     the form
     =================================================================== */
  function form(host, spec, row, back) {
    A.clear(host);
    var isNew = !row.id;

    host.appendChild(el('h2', '', (isNew ? 'ساختن ' : 'ویرایش ') + spec.singular));

    var panel = el('div', 'panel');
    var built = [];

    /* Category and reference options are loaded before the form is drawn
       so a select never appears empty and then fills in under the
       reader's cursor. */
    var needs = spec.fields.filter(function (f) {
      return f.type === 'category' || f.type === 'ref';
    });

    Promise.all(needs.map(function (f) {
      return f.type === 'category'
        ? options('categories', 'kind=eq.' + spec.kind, 'name_fa')
        : options(f.refTable, f.refFilter, f.refLabel || 'title');
    })).then(function (loaded) {
      var opts = {};
      needs.forEach(function (f, i) { opts[f.key] = loaded[i]; });

      spec.fields.forEach(function (f) {
        var b = field(f, row[f.key], opts);
        built.push(b);
        panel.appendChild(b.wrap);
      });

      var st = spec.status ? statusControl(spec, row) : null;
      if (st) panel.appendChild(st.wrap);

      if (spec.featured) {
        var fb = field({ key: 'featured', label: 'ویژه', type: 'bool',
                         on: 'در بخش ویژه نشان داده شود' }, row.featured);
        built.push(fb);
        panel.appendChild(fb.wrap);
      }

      host.appendChild(panel);

      /* ---- actions ---- */
      var bar = el('div', 'arow');
      bar.style.marginTop = '16px';

      var save = el('button', 'abtn abtn--primary', isNew ? 'بساز' : 'ذخیره');
      save.type = 'button';

      var prev = el('button', 'abtn', 'پیش‌نمایش');
      prev.type = 'button';

      var cancel = el('button', 'abtn', 'برگرد');
      cancel.type = 'button';

      bar.appendChild(save);
      bar.appendChild(prev);
      bar.appendChild(el('span', 'aspacer'));
      bar.appendChild(cancel);
      host.appendChild(bar);

      function collect() {
        var payload = {};
        built.forEach(function (b) { payload[b.spec.key] = b.read(); });
        if (st) {
          var s = st.read();
          payload.status = s.status;
          payload.scheduled_for = s.scheduled_for;
        }
        return payload;
      }

      prev.addEventListener('click', function () { preview(spec, collect()); });
      cancel.addEventListener('click', back);

      save.addEventListener('click', function () {
        var payload = collect();

        var missingField = null;
        spec.fields.forEach(function (f) {
          if (f.required && (payload[f.key] == null || payload[f.key] === '')) {
            missingField = missingField || f.label;
          }
        });
        if (missingField) { A.toast('«' + missingField + '» را پر کن.', 'bad'); return; }

        if (spec.slugField && !payload[spec.slugField]) {
          payload[spec.slugField] =
            slugify(payload[spec.labelField]) || fallbackSlug(spec.id.slice(0, 4));
        }

        save.disabled = true;
        save.textContent = 'یک لحظه…';

        var job;
        if (isNew) {
          var me = A.ctx() || {};
          payload.created_by = me.user_id || null;
          if (spec.authorField) payload[spec.authorField] = me.user_id || null;
          job = A.db.insert(spec.table, payload);
        } else {
          job = A.db.update(spec.table, 'id=eq.' + row.id, payload);
        }

        job.then(function () {
          A.toast(isNew ? 'ساخته شد' : 'ذخیره شد', 'good');
          dropCache();
          back();
        }, function (e) {
          A.toast(e.message, 'bad');
          save.disabled = false;
          save.textContent = isNew ? 'بساز' : 'ذخیره';
        });
      });
    });
  }


  /* ===================================================================
     the list
     =================================================================== */
  function list(host, spec) {
    A.clear(host);

    var state = { rows: [], q: '', status: '', cats: [] };

    host.appendChild(el('p', 'sub', spec.intro));

    var tools = el('div', 'arow');
    tools.style.margin = '0 0 12px';

    if (A.can(spec.perms.create)) {
      var add = el('button', 'abtn abtn--primary', '+ ' + spec.singular + ' تازه');
      add.type = 'button';
      add.addEventListener('click', function () {
        form(host, spec, spec.blank ? spec.blank() : {}, function () { list(host, spec); });
      });
      tools.appendChild(add);
    }

    var search = el('input', 'asearch');
    search.type = 'search';
    search.placeholder = 'جست‌وجو…';
    tools.appendChild(search);

    var reload = el('button', 'abtn', '↻');
    reload.type = 'button';
    reload.title = 'تازه‌سازی';
    tools.appendChild(reload);
    host.appendChild(tools);

    /* Status filter chips. Only where there is a status to filter by —
       chapters have none, and a row of chips that all mean the same
       thing is worse than no chips. */
    if (spec.status) {
      var chips = el('div', 'anav');
      chips.style.margin = '0 0 16px';
      [['', 'همه']].concat(STATUS).forEach(function (s) {
        var b = el('button', '', s[1]);
        b.type = 'button';
        b.setAttribute('aria-current', state.status === s[0] ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.status = s[0];
          Array.prototype.forEach.call(chips.children, function (c) {
            c.setAttribute('aria-current', c === b ? 'true' : 'false');
          });
          draw();
        });
        chips.appendChild(b);
      });
      host.appendChild(chips);
    }

    var body = el('div');
    host.appendChild(body);

    function matches(r) {
      if (state.status && r.status !== state.status) return false;
      if (!state.q) return true;
      var q = state.q.toLowerCase();
      var hay = [spec.labelField, spec.slugField, 'title_en', 'description', 'excerpt']
        .map(function (k) { return String(r[k] || ''); }).join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) return true;
      return (r.tags || []).some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
    }

    function catName(id) {
      var found = null;
      state.cats.forEach(function (c) { if (c.id === id) found = c.label; });
      return found;
    }

    function move(visibleRows, i, dir) {
      var j = i + dir;
      if (j < 0 || j >= visibleRows.length) return;
      var ids = visibleRows.map(function (r) { return r.id; });
      var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;

      A.db.rpc('reorder_content', { p_table: spec.table, p_ids: ids }).then(function () {
        A.toast('ترتیب ذخیره شد', 'good');
        load();
      }, function (e) { A.toast(e.message, 'bad'); });
    }

    function remove(r) {
      A.confirm('حذف شود؟',
        '«' + (r[spec.labelField] || '') + '» برای همیشه پاک می‌شود.',
        'حذف کن'
      ).then(function (ok) {
        if (!ok) return;
        A.db.remove(spec.table, 'id=eq.' + r.id).then(function () {
          A.toast('حذف شد', 'good');
          load();
        }, function (e) { A.toast(e.message, 'bad'); });
      });
    }

    function row(r, i, visibleRows) {
      var tr = el('tr');

      var td = el('td');
      td.appendChild(el('span', '', r[spec.labelField] || '—'));
      if (spec.slugField && r[spec.slugField]) {
        td.appendChild(el('span', 'path lat', r[spec.slugField]));
      }
      tr.appendChild(td);

      if (spec.hasCategory) {
        tr.appendChild(el('td', '', catName(r.category_id) || '—'));
      }

      if (spec.status) {
        var ts = el('td');
        var badge = el('span', 'abadge' +
          (r.status === 'published' ? ' abadge--editor'
           : r.status === 'scheduled' ? ' abadge--admin' : ''),
          STATUS_FA[r.status] || r.status);
        ts.appendChild(badge);
        if (r.status === 'scheduled' && r.scheduled_for) {
          ts.appendChild(el('span', 'path', A.when(r.scheduled_for, true)));
        }
        tr.appendChild(ts);
      }

      if (spec.featured) {
        tr.appendChild(el('td', 'n', r.featured ? '★' : '—'));
      }

      var act = el('td', 'n');
      var bar = el('div', 'arow');

      if (spec.ordering && A.can(spec.perms.edit)) {
        var up = el('button', 'abtn abtn--sm', '↑');
        up.type = 'button';
        up.disabled = i === 0;
        up.addEventListener('click', function () { move(visibleRows, i, -1); });
        var dn = el('button', 'abtn abtn--sm', '↓');
        dn.type = 'button';
        dn.disabled = i === visibleRows.length - 1;
        dn.addEventListener('click', function () { move(visibleRows, i, 1); });
        bar.appendChild(up);
        bar.appendChild(dn);
      }

      if (A.can(spec.perms.edit)) {
        var ed = el('button', 'abtn abtn--sm', 'ویرایش');
        ed.type = 'button';
        ed.addEventListener('click', function () {
          form(host, spec, r, function () { list(host, spec); });
        });
        bar.appendChild(ed);
      }

      if (A.can(spec.perms.del)) {
        var rm = el('button', 'abtn abtn--sm abtn--danger', '✕');
        rm.type = 'button';
        rm.title = 'حذف';
        rm.addEventListener('click', function () { remove(r); });
        bar.appendChild(rm);
      }

      act.appendChild(bar);
      tr.appendChild(act);
      return tr;
    }

    function draw() {
      A.clear(body);
      var visibleRows = state.rows.filter(matches);

      body.appendChild(el('p', 'acount',
        fa(visibleRows.length) + ' مورد' +
        (visibleRows.length !== state.rows.length ? ' از ' + fa(state.rows.length) : '')));

      if (!visibleRows.length) {
        body.appendChild(A.empty(state.q || state.status
          ? 'چیزی پیدا نشد.'
          : 'هنوز چیزی ساخته نشده.'));
        return;
      }

      var t = el('table'), thead = el('thead'), hd = el('tr');
      var heads = [spec.columnLabel || 'عنوان'];
      if (spec.hasCategory) heads.push('دسته');
      if (spec.status) heads.push('وضعیت');
      if (spec.featured) heads.push('ویژه');
      heads.push('');
      heads.forEach(function (h, i) {
        hd.appendChild(el('th', i === heads.length - 1 ? 'n' : '', h));
      });
      thead.appendChild(hd);
      t.appendChild(thead);

      var tb = el('tbody');
      visibleRows.forEach(function (r, i) { tb.appendChild(row(r, i, visibleRows)); });
      t.appendChild(tb);

      var panel = el('div', 'panel');
      var sc = el('div', 'scroll');
      sc.appendChild(t);
      panel.appendChild(sc);
      body.appendChild(panel);
    }

    function load() {
      A.clear(body);
      body.appendChild(A.spinner());

      var jobs = [A.db.select(spec.table + '?select=' + (spec.select || '*') +
                              '&order=' + (spec.order || 'sort_order.asc,created_at.desc'))];
      if (spec.hasCategory) {
        jobs.push(options('categories', 'kind=eq.' + spec.kind, 'name_fa'));
      }

      Promise.all(jobs).then(function (res) {
        state.rows = res[0] || [];
        state.cats = res[1] || [];
        draw();
      }, function (e) {
        A.clear(body);
        body.appendChild(A.note(e, 'supabase/cms-content.sql'));
      });
    }

    search.addEventListener('input', function () {
      state.q = search.value.trim();
      draw();
    });
    reload.addEventListener('click', function () { dropCache(); load(); });

    load();
  }


  /* =================================================================== */
  window.NVX_RESOURCE = function (spec) {
    spec.perms = spec.perms || {};
    spec.singular = spec.singular || spec.title;
    spec.labelField = spec.labelField || 'title';

    A.register({
      id: spec.id,
      title: spec.title,
      perm: [spec.perms.create, spec.perms.edit, spec.perms.del].filter(Boolean),
      render: function (host) { list(host, spec); }
    });
  };

  window.NVX_RESOURCE.slugify = slugify;
  window.NVX_RESOURCE.dropCache = dropCache;
})();
