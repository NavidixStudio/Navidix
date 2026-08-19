/* =====================================================================
   NAVIDIX — admin › media library.

   The file goes to Supabase Storage; the row in media_assets is only its
   metadata. Nothing here stores an image in the database, and nothing in
   the database is the file — which is why deleting is two steps and why
   the storage delete happens first: an orphaned row is a wrong number in
   a list, an orphaned file is bytes nobody can ever find again.

   Duplicate uploads are stopped by hashing before uploading, not after.
   The sha256 goes up as a column with a unique index, so two people
   uploading the same file at the same moment still end with one row —
   the second insert loses to the index rather than to a check that read
   stale data a moment earlier.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;
  var rows = [], filter = '';

  /* ------------------------------------------------------------------
     hashing and measuring, both before anything leaves the browser
     ------------------------------------------------------------------ */
  function sha256(file) {
    if (!window.crypto || !crypto.subtle || !file.arrayBuffer) {
      return Promise.reject(new Error('این مرورگر امکان محاسبه‌ی اثر انگشت فایل را ندارد.'));
    }
    return file.arrayBuffer().then(function (buf) {
      return crypto.subtle.digest('SHA-256', buf);
    }).then(function (hash) {
      var b = new Uint8Array(hash), s = '', i;
      for (i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2);
      return s;
    });
  }

  function dims(file) {
    return new Promise(function (res) {
      if (!/^image\//.test(file.type) || /svg/.test(file.type)) return res({ w: null, h: null });
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        res({ w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { res({ w: null, h: null }); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  /* A Persian filename reduces to nothing under this, which is fine —
     the hash prefix already makes the path unique, and the original name
     is kept in the filename column where it is still searchable. */
  function safeName(name) {
    var dot = name.lastIndexOf('.');
    var ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    var base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    if (!base) base = 'file';
    return base + (ext ? '.' + ext : '');
  }

  function pathFor(hash, name) {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    return d.getFullYear() + '/' + m + '/' + hash.slice(0, 12) + '-' + safeName(name);
  }

  /* ------------------------------------------------------------------
     one upload
     ------------------------------------------------------------------ */
  function upload(file, onProgress) {
    var meta = {};

    return sha256(file).then(function (hash) {
      meta.hash = hash;
      onProgress(0.25);
      return A.db.select('media_assets?select=id,filename,path&sha256=eq.' + hash + '&limit=1');

    }).then(function (found) {
      if (found.length) {
        var e = new Error('«' + file.name + '» قبلاً آپلود شده — همان فایل با نام ' +
                          found[0].filename + ' در کتابخانه هست.');
        e.duplicate = true;
        throw e;
      }
      onProgress(0.4);
      return dims(file);

    }).then(function (d) {
      meta.dims = d;
      meta.path = pathFor(meta.hash, file.name);
      onProgress(0.5);
      return A.storage.upload(file, meta.path);

    }).then(function () {
      onProgress(0.85);
      return A.db.insert('media_assets', {
        bucket: 'media',
        path: meta.path,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        width: meta.dims.w,
        height: meta.dims.h,
        sha256: meta.hash,
        uploaded_by: (A.ctx() || {}).user_id || null
      }).catch(function (e) {
        /* The row failed but the bytes are up. Left alone that is a file
           nothing references, so it is taken back down before the error
           is re-thrown. */
        return A.storage.remove(meta.path).then(function () { throw e; },
                                                function () { throw e; });
      });

    }).then(function (made) {
      onProgress(1);
      return (made || [])[0];
    });
  }

  function uploadAll(files, host) {
    var list = Array.prototype.slice.call(files);
    if (!list.length) return;

    var bar = host.querySelector('[data-prog]');
    var fill = bar.firstChild;
    bar.hidden = false;

    var done = 0, failed = 0, dupes = 0;

    function step(i) {
      if (i >= list.length) {
        bar.hidden = true;
        fill.style.width = '0';
        var msg = [];
        if (done) msg.push(fa(done) + ' فایل اضافه شد');
        if (dupes) msg.push(fa(dupes) + ' تکراری بود');
        if (failed) msg.push(fa(failed) + ' ناموفق');
        A.toast(msg.join(' · ') || 'چیزی اضافه نشد', failed ? 'bad' : 'good');
        return load(host);
      }

      return upload(list[i], function (p) {
        fill.style.width = Math.round(((i + p) / list.length) * 100) + '%';
      }).then(function () {
        done++;
      }, function (e) {
        if (e.duplicate) { dupes++; A.toast(e.message, 'bad'); }
        else { failed++; A.toast(list[i].name + ': ' + e.message, 'bad'); }
      }).then(function () { return step(i + 1); });
    }

    step(0);
  }

  /* ------------------------------------------------------------------
     the grid
     ------------------------------------------------------------------ */
  function matches(r) {
    if (!filter) return true;
    var q = filter.toLowerCase();
    return (r.filename || '').toLowerCase().indexOf(q) !== -1 ||
           (r.alt_text || '').toLowerCase().indexOf(q) !== -1 ||
           (r.path || '').toLowerCase().indexOf(q) !== -1;
  }

  function copyUrl(r) {
    var url = A.storage.publicUrl(r.path, r.bucket);
    function fallback() {
      A.modal({
        title: 'نشانی فایل',
        body: 'مرورگر اجازه‌ی کپی خودکار نداد. متن زیر را دستی کپی کن.',
        node: (function () {
          var ta = el('textarea', 'atextarea atextarea--code');
          ta.value = url;
          ta.readOnly = true;
          setTimeout(function () { ta.select(); }, 40);
          return ta;
        })(),
        confirm: 'بستن', cancel: 'انصراف'
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        A.toast('نشانی کپی شد', 'good');
      }, fallback);
    } else { fallback(); }
  }

  function editAlt(r, host) {
    var ta = el('textarea', 'atextarea');
    ta.value = r.alt_text || '';
    ta.placeholder = 'مثلاً: نمای نزدیک از یک تلسکوپ در شب';

    A.modal({
      title: 'متن جایگزین',
      body: 'چیزی که به‌جای تصویر خوانده می‌شود — برای کسی که تصویر را نمی‌بیند، و برای موتور جست‌وجو.',
      node: ta, confirm: 'ذخیره'
    }).then(function (ok) {
      if (!ok) return;
      var v = ta.value.trim() || null;
      A.db.update('media_assets', 'id=eq.' + r.id, { alt_text: v }).then(function () {
        r.alt_text = v;
        A.toast('ذخیره شد', 'good');
        draw(host);
      }, function (e) { A.toast(e.message, 'bad'); });
    });
  }

  function removeAsset(r, host) {
    A.confirm('حذف شود؟',
      '«' + r.filename + '» هم از فضای ذخیره‌سازی پاک می‌شود و هم از فهرست. ' +
      'اگر جایی در سایت به آن لینک داده شده باشد، آن لینک می‌شکند.',
      'حذف کن'
    ).then(function (ok) {
      if (!ok) return;
      /* Storage first: a row without a file is a visible mistake, a file
         without a row is invisible and permanent. */
      A.storage.remove(r.path, r.bucket).then(function () {
        return A.db.remove('media_assets', 'id=eq.' + r.id);
      }).then(function () {
        A.toast('حذف شد', 'good');
        load(host);
      }, function (e) { A.toast(e.message, 'bad'); });
    });
  }

  function card(r, host) {
    var c = el('div', 'amcard');

    if (/^image\//.test(r.mime_type || '')) {
      var img = el('img', 'amcard__img');
      img.src = A.storage.publicUrl(r.path, r.bucket);
      img.alt = r.alt_text || r.filename;
      img.loading = 'lazy';
      c.appendChild(img);
    } else {
      c.appendChild(el('div', 'amcard__none', (r.mime_type || 'فایل')));
    }

    var b = el('div', 'amcard__b');
    b.appendChild(el('p', 'amcard__n', r.filename));
    b.appendChild(el('p', 'amcard__m',
      A.bytes(r.size_bytes) + (r.width ? ' · ' + r.width + '×' + r.height : '')));

    var acts = el('div', 'amcard__a');
    var cp = el('button', 'abtn abtn--sm', 'نشانی');
    cp.type = 'button';
    cp.addEventListener('click', function () { copyUrl(r); });
    acts.appendChild(cp);

    if (A.can('media.manage')) {
      var alt = el('button', 'abtn abtn--sm', 'متن');
      alt.type = 'button';
      alt.addEventListener('click', function () { editAlt(r, host); });
      acts.appendChild(alt);

      var del = el('button', 'abtn abtn--sm abtn--danger', '✕');
      del.type = 'button';
      del.title = 'حذف';
      del.addEventListener('click', function () { removeAsset(r, host); });
      acts.appendChild(del);
    }

    b.appendChild(acts);
    c.appendChild(b);
    return c;
  }

  function draw(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);

    var list = rows.filter(matches);
    body.appendChild(el('p', 'acount',
      fa(list.length) + ' فایل' + (filter ? ' از ' + fa(rows.length) : '') + ' · ' +
      A.bytes(rows.reduce(function (s, r) { return s + Number(r.size_bytes || 0); }, 0))));

    if (!list.length) {
      body.appendChild(A.empty(filter ? 'چیزی پیدا نشد.' : 'کتابخانه خالی است.'));
      return;
    }

    var grid = el('div', 'agrid');
    list.forEach(function (r) { grid.appendChild(card(r, host)); });
    body.appendChild(grid);
  }

  function load(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);
    body.appendChild(A.skeleton(4));
    A.db.select('media_assets?select=*&order=created_at.desc&limit=300').then(function (v) {
      rows = v || [];
      draw(host);
    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e));
    });
  }

  /* ------------------------------------------------------------------
     the picker

     Used by every media field in every content form. It reads the same
     table the section does but keeps its own copy: the browsing list may
     be filtered to something the picker's caller never asked for, and a
     picker that inherits someone else's search box is a picker that
     appears empty for no visible reason.

     Resolves the chosen row, or null if the reader backs out.
     ------------------------------------------------------------------ */
  function pick() {
    return new Promise(function (resolve) {
      var box = el('div');
      var search = el('input', 'asearch');
      search.type = 'search';
      search.placeholder = 'جست‌وجو…';
      search.style.maxWidth = '100%';
      box.appendChild(search);

      var grid = el('div', 'agrid');
      grid.style.marginTop = '12px';
      box.appendChild(grid);

      var all = [], chosen = null, closer = null;

      function paint() {
        A.clear(grid);
        var q = search.value.trim().toLowerCase();
        var list = all.filter(function (r) {
          return !q || (r.filename || '').toLowerCase().indexOf(q) !== -1;
        }).slice(0, 60);

        if (!list.length) {
          grid.appendChild(A.empty(all.length ? 'چیزی پیدا نشد.' : 'کتابخانه خالی است.'));
          return;
        }

        list.forEach(function (r) {
          var c = el('div', 'amcard');
          c.style.cursor = 'pointer';
          if (/^image\//.test(r.mime_type || '')) {
            var img = el('img', 'amcard__img');
            img.src = A.storage.publicUrl(r.path, r.bucket);
            img.alt = r.alt_text || r.filename;
            img.loading = 'lazy';
            c.appendChild(img);
          } else {
            c.appendChild(el('div', 'amcard__none', r.mime_type || 'فایل'));
          }
          var b = el('div', 'amcard__b');
          b.appendChild(el('p', 'amcard__n', r.filename));
          c.appendChild(b);
          c.addEventListener('click', function () {
            chosen = r;
            if (closer) closer();
          });
          grid.appendChild(c);
        });
      }

      search.addEventListener('input', paint);

      grid.appendChild(A.skeleton(4));
      A.db.select('media_assets?select=*&order=created_at.desc&limit=300').then(function (v) {
        all = v || [];
        paint();
      }, function (e) {
        A.clear(grid);
        grid.appendChild(A.note(e));
      });

      var p = A.modal({
        title: 'انتخاب از کتابخانه',
        body: 'روی هر تصویر بزن تا انتخاب شود.',
        node: box, confirm: 'بستن', cancel: 'انصراف'
      });

      /* The modal resolves on its own buttons; clicking a card has to
         close it too, and A.modal has no handle for that — so the click
         handler resolves through this shared flag and the modal is
         dismissed by the Escape it would have listened for anyway. */
      closer = function () {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      };

      p.then(function () { resolve(chosen); });
    });
  }

  window.NVX_ADMIN_MEDIA = { pick: pick };

  A.register({
    id: 'media',
    title: 'رسانه',
    group: 'library',
    icon: 'media',
    render: function (host) {
      A.clear(host);
      A.page(host, {
        title: 'کتابخانه‌ی رسانه',
        sub: 'فایل‌ها در فضای ذخیره‌سازی Supabase می‌مانند و اینجا فقط اطلاعاتشان نگه ' +
             'داشته می‌شود. آپلود فایل تکراری قبل از فرستاده‌شدن جلویش گرفته می‌شود.'
      });

      if (A.can('media.manage')) {
        var drop = el('div', 'adrop');
        drop.appendChild(A.icon('upload'));
        drop.appendChild(el('b', '', 'فایل را اینجا رها کن'));
        drop.appendChild(document.createTextNode('یا برای انتخاب کلیک کن'));

        var input = el('input');
        input.type = 'file';
        input.multiple = true;
        input.hidden = true;

        drop.addEventListener('click', function () { input.click(); });
        input.addEventListener('change', function () {
          uploadAll(input.files, host);
          input.value = '';
        });

        ['dragenter', 'dragover'].forEach(function (n) {
          drop.addEventListener(n, function (e) {
            e.preventDefault(); drop.classList.add('over');
          });
        });
        ['dragleave', 'drop'].forEach(function (n) {
          drop.addEventListener(n, function (e) {
            e.preventDefault(); drop.classList.remove('over');
          });
        });
        drop.addEventListener('drop', function (e) {
          if (e.dataTransfer && e.dataTransfer.files) uploadAll(e.dataTransfer.files, host);
        });

        host.appendChild(drop);
        host.appendChild(input);

        var bar = el('div', 'aprog');
        bar.setAttribute('data-prog', '');
        bar.hidden = true;
        bar.appendChild(el('span'));
        host.appendChild(bar);
      }

      var tools = el('div', 'arow');
      tools.style.margin = '0 0 16px';
      var search = el('input', 'asearch');
      search.type = 'search';
      search.placeholder = 'جست‌وجو در نام فایل…';
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
