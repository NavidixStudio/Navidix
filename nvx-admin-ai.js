/* =====================================================================
   NAVIDIX — admin › AI assistant.

   Ask for an article, read what came back, then decide. The deciding is
   the point: nothing on this screen publishes anything. The generate
   button writes a row in ai_jobs; the insert button calls ai_apply_job(),
   which runs in the database and always produces a draft.

   Auto-publish is a per-type switch further down, and even switched on it
   does not publish — it schedules, with a delay you choose, so a bad
   generation has a window in which it can still be caught. Turning it on
   needs content.publish, because deciding that the machine may publish is
   a publishing decision.

   The panel never sees the model key. It calls the ai-assistant Edge
   Function, which holds it. If that function is not deployed, the request
   fails with a message naming the command that deploys it rather than a
   network error nobody can act on.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el, fa = A.fa;
  var CFG = window.NVX_SUPABASE || {};
  var FN = (CFG.url || '').replace(/\/+$/, '') + '/functions/v1/ai-assistant';

  /* Said in two places — a 404 with a body, and a fetch that never got a
     body at all — so it is written once. */
  var NOT_DEPLOYED =
    'تابع ai-assistant هنوز روی Supabase مستقر نشده. در ترمینال دو دستور زیر را بزن:\n' +
    'supabase secrets set ANTHROPIC_API_KEY=…\n' +
    'supabase functions deploy ai-assistant\n' +
    '(اگر مستقرش کرده‌ای، یعنی شبکه به آن نمی‌رسد — VPN را خاموش کن و دوباره امتحان کن.)';

  var EXAMPLES = [
    'یک مقاله درباره ۵ ابزار جدید AI برای طراحی سایت بنویس',
    'مقاله‌ای درباره‌ی تفاوت پرامپت‌نویسی برای تصویر و ویدیو',
    'راهنمای شروع کار با مدل‌های تولید ویدیو برای کسی که تازه‌کار است'
  ];


  /* ===================================================================
     calling the function
     =================================================================== */
  function generate(prompt, kind) {
    return NVX_AUTH.token().then(function (t) {
      if (!t) throw new Error('وارد نشده‌ای');
      return fetch(FN, {
        method: 'POST',
        headers: {
          'apikey': CFG.key,
          'Authorization': 'Bearer ' + t,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt, kind: kind || 'article' })
      }).then(function (r) {
        return r.text().then(function (txt) {
          var d = null;
          try { d = txt ? JSON.parse(txt) : null; } catch (e) {}
          if (r.ok) return d;
          if (r.status === 404) throw new Error(NOT_DEPLOYED);
          throw new Error((d && d.error) || ('HTTP ' + r.status));
        });

      }, function () {
        /* The undeployed case never reaches the handler above. There is no
           function to answer the CORS preflight, so the browser rejects
           the fetch itself with a bare "Failed to fetch" and no status to
           read — which is exactly what the first person to open this
           screen saw. It is the most likely failure here by a wide margin,
           so a network rejection is reported as the missing deployment it
           almost always is, with the connection named as the alternative
           rather than the other way round. */
        throw new Error(NOT_DEPLOYED);
      });
    });
  }


  /* ===================================================================
     showing what came back

     Every field the model produced, each with its own copy button,
     because the useful thing is rarely all of it — sometimes the body is
     wrong and the headings are exactly right.
     =================================================================== */
  var FIELDS = [
    ['title',           'عنوان'],
    ['slug',            'نشانی (slug)'],
    ['excerpt',         'خلاصه'],
    ['seo_title',       'عنوان سئو'],
    ['seo_description', 'توضیح متا'],
    ['keywords',        'کلیدواژه‌ها'],
    ['tags',            'تگ‌ها'],
    ['headings',        'ساختار سرتیترها'],
    ['image_prompt',    'پیشنهاد تصویر شاخص'],
    ['body',            'متن مقاله']
  ];

  function copyable(text) {
    var b = A.button('کپی', null, null, function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          A.toast('کپی شد', 'good');
        }, function () { A.toast('مرورگر اجازه‌ی کپی نداد.', 'bad'); });
      } else { A.toast('مرورگر اجازه‌ی کپی نداد.', 'bad'); }
    });
    b.className = 'abtn abtn--sm';
    return b;
  }

  function asText(v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.join('، ');
    return String(v);
  }

  function result(out, jobId, host) {
    var wrap = el('div');

    var card = el('div', 'acard');
    card.appendChild(el('p', 'acard__h', 'خروجی مدل'));

    FIELDS.forEach(function (f) {
      var v = out[f[0]];
      if (v == null || v === '') return;

      var row = el('div', 'afield');
      var head = el('div', 'arow');
      head.appendChild(el('label', 'alabel', f[1]));
      head.appendChild(el('span', 'aspacer'));
      head.appendChild(copyable(asText(v)));
      row.appendChild(head);

      var box = el(f[0] === 'body' ? 'pre' : 'p', f[0] === 'body' ? 'alog__j' : '');
      if (f[0] === 'body') {
        box.style.maxHeight = '340px';
        box.style.direction = 'rtl';
        box.style.textAlign = 'start';
        box.style.fontFamily = 'inherit';
        box.style.fontSize = '13px';
        box.style.lineHeight = '2';
      } else {
        box.style.cssText = 'margin:0;font-size:13.5px;line-height:1.95;color:var(--a-ink2)';
      }
      box.textContent = asText(v);
      row.appendChild(box);
      card.appendChild(row);
    });

    wrap.appendChild(card);

    /* ---- the only action that touches content ---- */
    var bar = el('div', 'abar');

    var insert = A.button('ثبت به‌عنوان پیش‌نویس', 'primary', 'check');
    insert.addEventListener('click', function () {
      insert.disabled = true;
      A.db.rpc('ai_apply_job', { p_job_id: jobId }).then(function (r) {
        var made = r || {};
        if (made.status === 'scheduled') {
          A.toast('پیش‌نویس ساخته شد و برای ' + A.when(made.scheduled_for, true) +
                  ' زمان‌بندی شد', 'good');
        } else {
          A.toast('پیش‌نویس ساخته شد — در بخش مقاله‌ها ویرایشش کن', 'good');
        }
        setTimeout(function () { A.go('articles'); }, 900);
      }, function (e) {
        insert.disabled = false;
        A.toast(e.message, 'bad');
      });
    });
    bar.appendChild(insert);

    bar.appendChild(A.button('دور بریز', null, null, function () {
      A.clear(host);
      render(host);
    }));

    bar.appendChild(el('span', 'aspacer'));
    var n = el('span', 'ahelp', 'انتشار نهایی جدا از این دکمه است.');
    n.style.margin = '0';
    bar.appendChild(n);

    wrap.appendChild(bar);
    return wrap;
  }


  /* ===================================================================
     auto-publish switches
     =================================================================== */
  var KIND_FA = {
    article: 'مقاله', prompt: 'پرامپت', lesson: 'درس',
    gallery: 'گالری', video: 'ویدیو'
  };

  function autoPublish(host) {
    A.clear(host);
    A.page(host, {
      title: 'انتشار خودکار',
      sub: 'برای هر نوع محتوا جدا. روشن‌بودنش یعنی خروجی مدل به‌جای پیش‌نویس، ' +
           'زمان‌بندی‌شده ثبت می‌شود — با تأخیری که خودت تعیین می‌کنی، تا اگر ' +
           'نظرت عوض شد فرصت جلوگیری داشته باشی. صفر یعنی بی‌درنگ.'
    });

    var body = el('div');
    host.appendChild(body);
    body.appendChild(A.skeleton(5));

    A.db.select('ai_auto_publish?select=*&order=kind').then(function (rows) {
      A.clear(body);

      if (!A.can('content.publish')) {
        body.appendChild(el('p', 'ahelp',
          'برای تغییر این کلیدها دسترسی content.publish لازم است.'));
      }

      var card = el('div', 'acard');
      rows.forEach(function (r) {
        var f = el('div', 'afield');

        var sw = el('label', 'aswitch');
        var cb = el('input');
        cb.type = 'checkbox';
        cb.checked = r.enabled;
        cb.disabled = !A.can('content.publish');
        sw.appendChild(cb);
        sw.appendChild(el('span', '', KIND_FA[r.kind] || r.kind));
        f.appendChild(sw);

        var d = el('div', 'arow');
        d.style.marginTop = '9px';
        d.appendChild(el('span', 'ahelp', 'تأخیر (دقیقه)'));
        var num = el('input', 'ainput ainput--ltr');
        num.type = 'number';
        num.min = 0;
        num.value = r.delay_minutes;
        num.style.width = '110px';
        num.disabled = !A.can('content.publish');
        d.appendChild(num);

        var save = A.button('ذخیره', null, null, function () {
          save.disabled = true;
          A.db.update('ai_auto_publish', 'kind=eq.' + r.kind, {
            enabled: cb.checked,
            delay_minutes: Math.max(0, parseInt(num.value, 10) || 0)
          }).then(function () {
            A.toast('ذخیره شد', 'good');
            save.disabled = false;
          }, function (e) {
            A.toast(e.message, 'bad');
            save.disabled = false;
          });
        });
        save.className = 'abtn abtn--sm';
        save.disabled = !A.can('content.publish');
        d.appendChild(save);

        f.appendChild(d);
        card.appendChild(f);
      });
      body.appendChild(card);

    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e, 'supabase/cms-ai.sql'));
    });
  }


  /* ===================================================================
     history
     =================================================================== */
  function history(host) {
    var box = el('div');
    box.appendChild(el('h2', '', 'درخواست‌های اخیر'));
    var body = el('div');
    box.appendChild(body);
    body.appendChild(A.skeleton(4));

    A.db.select('ai_jobs?select=*&order=created_at.desc&limit=20').then(function (rows) {
      A.clear(body);
      if (!rows.length) {
        body.appendChild(A.emptyState('هنوز چیزی از مدل نخواسته‌ای',
          'اولین درخواستت بالا ثبت می‌شود.'));
        return;
      }

      var panel = el('div', 'panel');
      var ul = el('ul', 'alog');
      rows.forEach(function (r) {
        var li = el('li');
        li.appendChild(el('span', '', (r.prompt || '').slice(0, 110)));

        var meta = el('span', 'alog__w');
        meta.textContent = A.when(r.created_at, true) +
          ' · ' + (r.status === 'done' ? 'موفق' : r.status === 'failed' ? 'ناموفق' : 'در انتظار') +
          (r.entity_id ? ' · ثبت‌شده' : '') +
          (r.tokens_out ? ' · ' + fa(r.tokens_out) + ' توکن' : '');
        li.appendChild(meta);

        if (r.error) {
          var e = el('p', 'ahelp', r.error);
          e.style.color = '#FF8F86';
          li.appendChild(e);
        }
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      body.appendChild(panel);
    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e, 'supabase/cms-ai.sql'));
    });

    return box;
  }


  /* ===================================================================
     the ask screen
     =================================================================== */
  function render(host) {
    A.clear(host);

    A.page(host, {
      title: 'دستیار محتوا',
      sub: 'بنویس چه می‌خواهی. مدل عنوان، متن، خلاصه، سئو و کلیدواژه می‌سازد و ' +
           'همه‌اش را اینجا نشانت می‌دهد. هیچ‌چیز بدون تأیید تو منتشر نمی‌شود.',
      actions: [A.button('انتشار خودکار', null, 'settings', function () {
        autoPublish(host);
      })]
    });

    var card = el('div', 'acard');
    var f = el('div', 'afield');
    f.appendChild(el('label', 'alabel', 'چه می‌خواهی بنویسد؟'));

    var ta = el('textarea', 'atextarea');
    ta.style.minHeight = '120px';
    ta.placeholder = EXAMPLES[0];
    f.appendChild(ta);
    f.appendChild(el('p', 'ahelp',
      'هرچه دقیق‌تر بگویی خروجی نزدیک‌تر است: مخاطب، طول، لحن، و اینکه چه چیزی ' +
      'را نباید بنویسد.'));
    card.appendChild(f);

    var ex = el('div', 'arow');
    ex.style.marginTop = '4px';
    EXAMPLES.forEach(function (t) {
      var b = A.button(t.slice(0, 34) + '…', null, null, function () { ta.value = t; ta.focus(); });
      b.className = 'abtn abtn--sm';
      ex.appendChild(b);
    });
    card.appendChild(ex);
    host.appendChild(card);

    var bar = el('div', 'arow');
    bar.style.margin = '16px 0 0';

    var go = A.button('بنویس', 'primary', 'ai');
    bar.appendChild(go);
    host.appendChild(bar);

    var out = el('div');
    out.style.marginTop = '20px';
    host.appendChild(out);

    var hist = history(el('div'));
    host.appendChild(hist);

    go.addEventListener('click', function () {
      var prompt = ta.value.trim();
      if (prompt.length < 8) { A.toast('کمی بیشتر توضیح بده.', 'bad'); return; }

      go.disabled = true;
      A.clear(out);
      out.appendChild(A.skeleton(7));

      generate(prompt, 'article').then(function (r) {
        A.clear(out);
        go.disabled = false;
        if (!r || !r.output) {
          out.appendChild(A.note(new Error('مدل چیزی برنگرداند.')));
          return;
        }
        out.appendChild(result(r.output, r.job_id, host));
        out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, function (e) {
        A.clear(out);
        go.disabled = false;
        var n = el('div', 'aempty');
        n.appendChild(A.icon('warn'));
        n.appendChild(el('b', '', 'ساختن محتوا ممکن نشد'));
        /* The deployment message is three lines and two of them are shell
           commands. Collapsing that into one run-on paragraph is how a
           message that names the fix stops looking like one. */
        var msg = el('span', '', e.message);
        msg.style.whiteSpace = 'pre-line';
        msg.style.display = 'block';
        n.appendChild(msg);
        out.appendChild(n);
      });
    });
  }

  A.register({
    id: 'assistant',
    title: 'دستیار محتوا',
    group: 'ai',
    icon: 'ai',
    perm: 'content.create',
    render: render
  });
})();
