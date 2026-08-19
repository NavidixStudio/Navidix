/* =====================================================================
   NAVIDIX — admin › AI workflows.

   Source → AI Processing → Draft → Human Review → Publish, as rows you
   can edit. A workflow is a saved instruction plus a switch: what to ask
   the model, what kind of content it produces, and whether the result is
   allowed to schedule itself.

   Two things this screen is honest about, because the alternative is a
   feature that looks finished and silently does nothing:

   Running a workflow queues it. ai_start_run() writes a run and a job and
   returns — Postgres has no outbound network and no business holding a
   model key, so the actual call belongs to the ai-assistant Edge
   Function. A run that stays "در حال اجرا" means nothing picked the job
   up, and that state is shown rather than hidden.

   And scheduling is stored, not applied. A cron expression in a row does
   not make anything happen; wiring it to pg_cron is a deliberate act
   documented in cms-ai.sql. An automated workflow that is wrong is wrong
   every hour, so switching it on should cost one explicit step.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;

  var KIND = [
    ['article', 'مقاله'], ['prompt', 'پرامپت'], ['lesson', 'درس'],
    ['gallery', 'گالری'], ['video', 'ویدیو']
  ];
  var SOURCE = [
    ['prompt', 'یک درخواست ثابت'],
    ['rss',    'خوراک RSS'],
    ['manual', 'دستی']
  ];
  var KIND_FA = {}, SOURCE_FA = {};
  KIND.forEach(function (k) { KIND_FA[k[0]] = k[1]; });
  SOURCE.forEach(function (s) { SOURCE_FA[s[0]] = s[1]; });

  var RUN_FA = {
    running: 'در حال اجرا', done: 'تمام', failed: 'ناموفق',
    awaiting_review: 'منتظر بازبینی'
  };


  /* ===================================================================
     the editor
     =================================================================== */
  function form(host, row, back) {
    A.clear(host);
    var isNew = !row.id;

    A.page(host, {
      title: (isNew ? 'ورک‌فلوی تازه' : 'ویرایش ورک‌فلو'),
      sub: isNew ? null : row.name
    });

    var grid = el('div', 'aform');
    var main = el('div', 'aform__main');
    var side = el('div', 'aform__side');
    grid.appendChild(main);
    grid.appendChild(side);

    function card(t) {
      var c = el('div', 'acard');
      if (t) c.appendChild(el('p', 'acard__h', t));
      return c;
    }

    function input(label, value, help, ltr) {
      var f = el('div', 'afield');
      f.appendChild(el('label', 'alabel', label));
      var i = el('input', 'ainput' + (ltr ? ' ainput--ltr' : ''));
      i.type = 'text';
      i.value = value == null ? '' : value;
      f.appendChild(i);
      if (help) f.appendChild(el('p', 'ahelp', help));
      return { wrap: f, node: i };
    }

    function area(label, value, help) {
      var f = el('div', 'afield');
      f.appendChild(el('label', 'alabel', label));
      var i = el('textarea', 'atextarea');
      i.value = value == null ? '' : value;
      f.appendChild(i);
      if (help) f.appendChild(el('p', 'ahelp', help));
      return { wrap: f, node: i };
    }

    function select(label, value, opts, help) {
      var f = el('div', 'afield');
      f.appendChild(el('label', 'alabel', label));
      var s = el('select', 'aselect');
      opts.forEach(function (o) {
        var op = el('option', '', o[1]);
        op.value = o[0];
        if (value === o[0]) op.selected = true;
        s.appendChild(op);
      });
      f.appendChild(s);
      if (help) f.appendChild(el('p', 'ahelp', help));
      return { wrap: f, node: s };
    }

    function toggle(label, value, on, help) {
      var f = el('div', 'afield');
      f.appendChild(el('label', 'alabel', label));
      var sw = el('label', 'aswitch');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!value;
      sw.appendChild(cb);
      sw.appendChild(el('span', '', on));
      f.appendChild(sw);
      if (help) f.appendChild(el('p', 'ahelp', help));
      return { wrap: f, node: cb };
    }

    var cfg = row.source_config || {};

    var fName = input('نام', row.name, 'برای خودت — در فهرست همین را می‌بینی.');
    var fDesc = area('توضیح', row.description, 'این ورک‌فلو قرار است چه کاری بکند.');
    var fPrompt = area('درخواست به مدل', cfg.prompt,
      'همان چیزی که در دستیار می‌نوشتی، ولی ذخیره‌شده تا هر بار تکرار شود.');

    var cMain = card(null);
    cMain.appendChild(fName.wrap);
    cMain.appendChild(fDesc.wrap);
    cMain.appendChild(fPrompt.wrap);
    main.appendChild(cMain);

    var fKind = select('نوع خروجی', row.kind || 'article', KIND);
    var fSrc = select('منبع', row.source_type || 'prompt', SOURCE,
      'فعلاً فقط «یک درخواست ثابت» اجرا می‌شود؛ بقیه ذخیره می‌شوند برای بعد.');

    var cWhat = card('چه می‌سازد');
    cWhat.appendChild(fKind.wrap);
    cWhat.appendChild(fSrc.wrap);
    side.appendChild(cWhat);

    var fOn = toggle('فعال', row.enabled, 'این ورک‌فلو قابل اجراست',
      'خاموش باشد، اجرا نمی‌شود — نه دستی و نه زمان‌بندی‌شده.');
    var fAuto = toggle('انتشار خودکار', row.auto_publish,
      'خروجی خودش زمان‌بندی شود',
      'حتی روشن هم مستقیم منتشر نمی‌کند: به «زمان‌بندی‌شده» می‌رود با تأخیری که ' +
      'در بخش دستیار تعیین کرده‌ای.');
    var fCron = input('زمان‌بندی (cron)', row.schedule_cron,
      'فقط ذخیره می‌شود. برای اینکه واقعاً اجرا شود باید در Supabase به pg_cron ' +
      'وصلش کنی — راهش در supabase/cms-ai.sql نوشته شده.', true);

    var cRun = card('اجرا');
    cRun.appendChild(fOn.wrap);
    cRun.appendChild(fAuto.wrap);
    cRun.appendChild(fCron.wrap);
    side.appendChild(cRun);

    host.appendChild(grid);

    var bar = el('div', 'abar');
    var save = A.button(isNew ? 'بساز' : 'ذخیره', 'primary', 'check');
    bar.appendChild(save);
    bar.appendChild(el('span', 'aspacer'));
    bar.appendChild(A.button('برگرد', null, null, back));
    host.appendChild(bar);

    save.addEventListener('click', function () {
      var name = fName.node.value.trim();
      if (!name) { A.toast('نام را بنویس.', 'bad'); return; }

      var payload = {
        name: name,
        description: fDesc.node.value.trim() || null,
        kind: fKind.node.value,
        source_type: fSrc.node.value,
        source_config: { prompt: fPrompt.node.value.trim() },
        enabled: fOn.node.checked,
        auto_publish: fAuto.node.checked,
        schedule_cron: fCron.node.value.trim() || null
      };

      save.disabled = true;
      var job = isNew
        ? A.db.insert('ai_workflows', payload)
        : A.db.update('ai_workflows', 'id=eq.' + row.id, payload);

      job.then(function () {
        A.toast(isNew ? 'ساخته شد' : 'ذخیره شد', 'good');
        back();
      }, function (e) {
        A.toast(e.message, 'bad');
        save.disabled = false;
      });
    });
  }


  /* ===================================================================
     runs
     =================================================================== */
  function runs(host, wf, back) {
    A.clear(host);
    A.page(host, {
      title: 'اجراهای «' + wf.name + '»',
      sub: 'هر بار که این ورک‌فلو اجرا شده. اجرایی که در «در حال اجرا» مانده یعنی ' +
           'هیچ‌کس کارش را برنداشته — تابع ai-assistant مستقر نشده یا خطا خورده.',
      actions: [A.button('برگرد', null, null, back)]
    });

    var body = el('div');
    host.appendChild(body);
    body.appendChild(A.skeleton(5));

    A.db.select('ai_runs?select=*&workflow_id=eq.' + wf.id +
                '&order=started_at.desc&limit=50').then(function (rows) {
      A.clear(body);
      if (!rows.length) {
        body.appendChild(A.emptyState('هنوز اجرا نشده',
          'از فهرست ورک‌فلوها دکمه‌ی «اجرا» را بزن.'));
        return;
      }

      var t = el('table'), thead = el('thead'), hd = el('tr');
      ['شروع', 'وضعیت', 'پایان', 'خطا'].forEach(function (h) {
        hd.appendChild(el('th', '', h));
      });
      thead.appendChild(hd);
      t.appendChild(thead);

      var tb = el('tbody');
      rows.forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', '', A.when(r.started_at, true)));
        var ts = el('td');
        ts.appendChild(el('span', 'abadge abadge--' +
          (r.status === 'done' ? 'published' : r.status === 'failed' ? 'off' : 'scheduled'),
          RUN_FA[r.status] || r.status));
        tr.appendChild(ts);
        tr.appendChild(el('td', '', r.ended_at ? A.when(r.ended_at, true) : '—'));
        tr.appendChild(el('td', '', r.error || '—'));
        tb.appendChild(tr);
      });
      t.appendChild(tb);

      var panel = el('div', 'panel');
      var sc = el('div', 'scroll');
      sc.appendChild(t);
      panel.appendChild(sc);
      body.appendChild(panel);

    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e, 'supabase/cms-ai.sql'));
    });
  }


  /* ===================================================================
     the list
     =================================================================== */
  function list(host) {
    A.clear(host);

    var acts = [];
    if (A.can('settings.manage')) {
      acts.push(A.button('ورک‌فلوی تازه', 'primary', 'plus', function () {
        form(host, {}, function () { list(host); });
      }));
    }

    A.page(host, {
      title: 'ورک‌فلوهای هوش مصنوعی',
      sub: 'منبع ← پردازش مدل ← پیش‌نویس ← بازبینی آدم ← انتشار. هر ورک‌فلو یک ' +
           'دستور ذخیره‌شده است؛ اجرایش کار را در صف می‌گذارد و تابع ai-assistant ' +
           'برش می‌دارد.',
      actions: acts
    });

    var body = el('div');
    host.appendChild(body);
    body.appendChild(A.skeleton(5));

    A.db.select('ai_workflows?select=*&order=sort_order.asc,created_at.desc')
      .then(function (rows) {
        A.clear(body);

        if (!rows.length) {
          body.appendChild(A.emptyState('هنوز ورک‌فلویی نساخته‌ای',
            'یک دستور ثابت بنویس تا هر بار همان را تکرار کند.',
            A.can('settings.manage')
              ? A.button('ورک‌فلوی تازه', 'primary', 'plus', function () {
                  form(host, {}, function () { list(host); });
                })
              : null));
          return;
        }

        var t = el('table'), thead = el('thead'), hd = el('tr');
        ['نام', 'خروجی', 'منبع', 'وضعیت', 'آخرین اجرا', ''].forEach(function (h, i) {
          hd.appendChild(el('th', i === 5 ? 'n' : '', h));
        });
        thead.appendChild(hd);
        t.appendChild(thead);

        var tb = el('tbody');
        rows.forEach(function (r) {
          var tr = el('tr');

          var td = el('td');
          td.appendChild(el('span', '', r.name));
          if (r.description) td.appendChild(el('span', 'path', r.description.slice(0, 60)));
          tr.appendChild(td);

          tr.appendChild(el('td', '', KIND_FA[r.kind] || r.kind));
          tr.appendChild(el('td', '', SOURCE_FA[r.source_type] || r.source_type));

          var ts = el('td');
          ts.appendChild(el('span', 'abadge abadge--' + (r.enabled ? 'published' : 'draft'),
                            r.enabled ? 'فعال' : 'خاموش'));
          if (r.auto_publish) {
            ts.appendChild(document.createTextNode(' '));
            ts.appendChild(el('span', 'abadge abadge--scheduled', 'خودکار'));
          }
          tr.appendChild(ts);

          tr.appendChild(el('td', '', r.last_run_at ? A.when(r.last_run_at, true) : '—'));

          var act = el('td', 'n');
          var bar = el('div', 'arowacts');

          if (A.can('settings.manage')) {
            var run = A.button('اجرا');
            run.className = 'abtn abtn--sm';
            run.disabled = !r.enabled;
            run.addEventListener('click', function () {
              run.disabled = true;
              A.db.rpc('ai_start_run', { p_workflow_id: r.id }).then(function () {
                A.toast('در صف اجرا قرار گرفت', 'good');
                list(host);
              }, function (e) {
                run.disabled = false;
                A.toast(e.message, 'bad');
              });
            });
            bar.appendChild(run);
          }

          var hist = A.button('اجراها');
          hist.className = 'abtn abtn--sm';
          hist.addEventListener('click', function () {
            runs(host, r, function () { list(host); });
          });
          bar.appendChild(hist);

          if (A.can('settings.manage')) {
            var ed = A.button('ویرایش');
            ed.className = 'abtn abtn--sm';
            ed.addEventListener('click', function () {
              form(host, r, function () { list(host); });
            });
            bar.appendChild(ed);

            var rm = A.button('✕');
            rm.className = 'abtn abtn--sm abtn--danger';
            rm.addEventListener('click', function () {
              A.confirm('حذف شود؟', '«' + r.name + '» و همه‌ی اجراهایش پاک می‌شوند.',
                'حذف کن').then(function (ok) {
                if (!ok) return;
                A.db.remove('ai_workflows', 'id=eq.' + r.id).then(function () {
                  A.toast('حذف شد', 'good');
                  list(host);
                }, function (e) { A.toast(e.message, 'bad'); });
              });
            });
            bar.appendChild(rm);
          }

          act.appendChild(bar);
          tr.appendChild(act);
          tb.appendChild(tr);
        });
        t.appendChild(tb);

        var panel = el('div', 'panel');
        var sc = el('div', 'scroll');
        sc.appendChild(t);
        panel.appendChild(sc);
        body.appendChild(panel);

      }, function (e) {
        A.clear(body);
        body.appendChild(A.note(e, 'supabase/cms-ai.sql'));
      });
  }

  A.register({
    id: 'workflows',
    title: 'ورک‌فلوها',
    group: 'ai',
    icon: 'flow',
    perm: 'settings.manage',
    render: list
  });
})();
