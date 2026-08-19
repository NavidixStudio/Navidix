/* =====================================================================
   NAVIDIX — admin › site settings.

   site_settings is a key/value table with a jsonb value, so a setting can
   be a string, a flag, or a whole object without a migration per field.
   The cost of that is a form that has to decide how to draw a value it
   has never seen; KNOWN below is that decision for the keys we ship, and
   anything else falls through to a JSON box rather than being hidden.

   Reading is open to everyone, including signed-out visitors — most of
   these values are already visible in the page source of the site today.
   Writing needs settings.manage, enforced by the policy on the table.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  var el = A.el;

  var KNOWN = [
    ['site_title',       'عنوان سایت',              'text',
     'در تب مرورگر و نتیجه‌ی جست‌وجو دیده می‌شود.'],
    ['site_description', 'توضیح سایت',              'textarea',
     'همان متنی که زیر عنوان سایت در گوگل می‌آید. یکی دو جمله.'],
    ['seo_defaults',     'پیش‌فرض‌های SEO',          'json',
     'مثل پسوند عنوان و تصویر پیش‌فرض اشتراک‌گذاری.'],
    ['social_links',     'لینک‌های اجتماعی',        'json',
     'مثلاً {"youtube": "…", "telegram": "…"}'],
    ['contact',          'اطلاعات تماس',            'json',
     'مثلاً {"email": "…"}'],
    ['maintenance_mode', 'حالت تعمیر',              'bool',
     'وقتی روشن باشد صفحات عمومی می‌توانند پیام «به‌زودی برمی‌گردیم» نشان دهند.'],
    ['homepage_sections','بخش‌های صفحه‌ی اصلی',      'json',
     'ترتیب و روشن/خاموش‌بودن بخش‌های صفحه‌ی اصلی، به شکل آرایه.']
  ];

  var META = {};
  KNOWN.forEach(function (k) { META[k[0]] = { label: k[1], type: k[2], help: k[3] }; });

  var dirty = {};

  function typeOf(key, value) {
    if (META[key]) return META[key].type;
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'string') return value.length > 90 ? 'textarea' : 'text';
    return 'json';
  }

  /* Reads the control back into the value that will be stored. Throws for
     malformed JSON, which the save handler turns into a message beside
     that one field rather than a failed save with no explanation. */
  function readControl(node, type, key) {
    if (type === 'bool') return node.checked;
    if (type === 'json') {
      var raw = node.value.trim();
      if (!raw) return null;
      try { return JSON.parse(raw); }
      catch (e) { throw new Error('«' + (META[key] ? META[key].label : key) + '» JSON معتبر نیست.'); }
    }
    return node.value;
  }

  function field(row) {
    var key = row.key, value = row.value;
    var type = typeOf(key, value);
    var meta = META[key] || {};

    var wrap = el('div', 'afield');
    var label = el('label', 'alabel', meta.label || key);
    wrap.appendChild(label);

    var node;
    if (type === 'bool') {
      var sw = el('label', 'aswitch');
      node = el('input');
      node.type = 'checkbox';
      node.checked = value === true;
      sw.appendChild(node);
      sw.appendChild(el('span', '', 'روشن'));
      wrap.appendChild(sw);
    } else if (type === 'json') {
      node = el('textarea', 'atextarea atextarea--code');
      node.value = value == null ? '' : JSON.stringify(value, null, 2);
      wrap.appendChild(node);
    } else if (type === 'textarea') {
      node = el('textarea', 'atextarea');
      node.value = value == null ? '' : String(value);
      wrap.appendChild(node);
    } else {
      node = el('input', 'ainput');
      node.type = 'text';
      node.value = value == null ? '' : String(value);
      wrap.appendChild(node);
    }

    var can = A.can('settings.manage');
    node.disabled = !can;

    if (!META[key]) {
      label.appendChild(document.createTextNode(' '));
      label.appendChild(el('span', 'abadge', 'کلید دلخواه'));
    }
    if (meta.help) wrap.appendChild(el('p', 'ahelp', meta.help));

    var err = el('p', 'ahelp');
    err.style.color = '#FF8A80';
    err.hidden = true;
    wrap.appendChild(err);

    var mark = function () { dirty[key] = { node: node, type: type }; };
    node.addEventListener('input', mark);
    node.addEventListener('change', mark);

    wrap.setAttribute('data-key', key);
    wrap._err = err;
    return wrap;
  }

  function save(host, rows, button) {
    var keys = Object.keys(dirty);
    if (!keys.length) { A.toast('چیزی عوض نشده.'); return; }

    /* Everything is parsed before anything is sent. A save that writes
       three keys and then stops on the fourth leaves the settings in a
       state nobody asked for. */
    var payload = [], i, k, v;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      var box = host.querySelector('[data-key="' + k + '"]');
      if (box && box._err) box._err.hidden = true;
      try {
        v = readControl(dirty[k].node, dirty[k].type, k);
      } catch (e) {
        if (box && box._err) { box._err.textContent = e.message; box._err.hidden = false; }
        A.toast(e.message, 'bad');
        return;
      }
      payload.push({ key: k, value: v });
    }

    button.disabled = true;
    button.textContent = 'یک لحظه…';

    /* One upsert, so the whole change lands or none of it does. Existing
       keys merge on the primary key; a key added below is created here. */
    A.db.upsert('site_settings', payload).then(function () {
      dirty = {};
      A.toast(A.fa(payload.length) + ' تنظیم ذخیره شد', 'good');
      load(host);
    }, function (e) {
      A.toast(e.message, 'bad');
    }).then(function () {
      button.disabled = false;
      button.textContent = 'ذخیره';
    });
  }

  function addKey(host) {
    var input = el('input', 'ainput ainput--ltr');
    input.placeholder = 'my_new_setting';

    A.modal({
      title: 'کلید تازه',
      body: 'یک کلید تازه با مقدار خالی ساخته می‌شود و بعد می‌توانی مقدارش را بنویسی. ' +
            'نام کلید فقط حروف انگلیسی کوچک، عدد و زیرخط.',
      node: input, confirm: 'بساز'
    }).then(function (ok) {
      if (!ok) return;
      var key = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!key) { A.toast('نام کلید خالی است.', 'bad'); return; }
      A.db.insert('site_settings', { key: key, value: null }).then(function () {
        A.toast('ساخته شد', 'good');
        load(host);
      }, function (e) { A.toast(e.message, 'bad'); });
    });
  }

  function draw(host, rows) {
    var body = host.querySelector('[data-body]');
    A.clear(body);
    dirty = {};

    if (!rows.length) {
      body.appendChild(A.empty('هیچ تنظیمی در پایگاه داده نیست.'));
      return;
    }

    /* Known keys first and in the order they are declared, so the form
       reads top to bottom the way the settings were designed rather than
       the way Postgres happened to return them. */
    var order = KNOWN.map(function (k) { return k[0]; });
    var sorted = rows.slice().sort(function (a, b) {
      var ia = order.indexOf(a.key), ib = order.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.key < b.key ? -1 : 1;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    var panel = el('div', 'panel');
    sorted.forEach(function (r) { panel.appendChild(field(r)); });
    body.appendChild(panel);

    if (!A.can('settings.manage')) {
      body.appendChild(el('p', 'hint',
        'برای تغییر این مقدارها دسترسی settings.manage لازم است.'));
      return;
    }

    var row = el('div', 'arow');
    row.style.marginTop = '16px';

    var saveBtn = el('button', 'abtn abtn--primary', 'ذخیره');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', function () { save(host, rows, saveBtn); });
    row.appendChild(saveBtn);

    var add = el('button', 'abtn', '+ کلید تازه');
    add.type = 'button';
    add.addEventListener('click', function () { addKey(host); });
    row.appendChild(add);

    body.appendChild(row);
  }

  function load(host) {
    var body = host.querySelector('[data-body]');
    A.clear(body);
    body.appendChild(A.skeleton(7));
    A.db.select('site_settings?select=key,value,updated_at&order=key').then(function (rows) {
      draw(host, rows);
    }, function (e) {
      A.clear(body);
      body.appendChild(A.note(e));
    });
  }

  A.register({
    id: 'settings',
    title: 'تنظیمات',
    group: 'admin',
    icon: 'settings',
    perm: 'settings.manage',
    render: function (host) {
      A.clear(host);
      A.page(host, {
        title: 'تنظیمات سایت',
        sub: 'مقدارهای عمومی سایت. تغییرشان در گزارش فعالیت ثبت می‌شود. هر صفحه‌ای که ' +
             'nvx-content.js را لود کند این مقدارها را می‌خواند.'
      });

      var body = el('div');
      body.setAttribute('data-body', '');
      host.appendChild(body);
      load(host);
    }
  });
})();
