/* =====================================================================
   NAVIDIX — admin › the three things that were only ever in HTML.

   The introduction, the studio's services and the social accounts lived
   inside about.html, system.html and channels.html. Changing an Instagram
   handle meant editing HTML and pushing a commit — which is exactly the
   kind of thing a panel is for.

   Two of the three are ordinary resources and are declared as such;
   nvx-admin-resource.js draws them. The introduction is one row and never
   more than one, so it gets a form of its own rather than a list with a
   single item in it and a "new" button that must never be pressed.

   The permission on all three is settings.manage, which is the same one
   the RLS policies in cms-site.sql check. The two have to agree: a
   mismatch here would not open a hole, it would draw a button that always
   fails.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  var R = window.NVX_RESOURCE;
  if (!A) return;

  var el = A.el;


  /* ---- خدمات --------------------------------------------------------
     is_active rather than the usual draft/published: a service is not
     written over days and then released, it is either offered or it is
     not. Turning one off takes it off the site without deleting what was
     written about it. */
  if (R) {
    R({
      id: 'services',
      icon: 'briefcase',
      title: 'خدمات',
      singular: 'خدمت',
      table: 'services',
      labelField: 'title',
      slugField: 'slug',
      status: false,
      ordering: true,
      perms: { create: 'settings.manage', edit: 'settings.manage', del: 'settings.manage' },
      intro: 'خدماتی که در صفحه‌ی «خدمات استودیو» نشان داده می‌شوند. ترتیبشان ' +
             'همان ترتیب این فهرست است. خدمتی که «فعال» نباشد از سایت برداشته ' +
             'می‌شود ولی پاک نمی‌شود.',
      order: 'sort_order.asc,created_at.asc',
      columnLabel: 'عنوان',
      fields: [
        { key: 'title',      label: 'عنوان', type: 'text', required: true },
        { key: 'title_en',   label: 'عنوان انگلیسی', type: 'text', ltr: true },
        { key: 'slug',       label: 'نشانی (slug)', type: 'text', ltr: true,
          help: 'اگر خالی بگذاری خودش ساخته می‌شود.' },
        { key: 'summary',    label: 'خلاصه', type: 'textarea',
          help: 'یکی دو جمله. همان چیزی که روی کارت خدمت دیده می‌شود.' },
        { key: 'body',       label: 'شرح کامل', type: 'markdown',
          placeholder: 'چه چیزی تحویل داده می‌شود، در چه مدت، و چه چیزی نه.' },
        { key: 'price_note', label: 'یادداشت قیمت', type: 'text',
          help: 'مثلاً «از ۱۲ میلیون» یا «بسته به دامنه‌ی کار». خالی هم اشکالی ندارد.' },
        { key: 'cta_label',  label: 'متن دکمه', type: 'text',
          help: 'مثلاً «گفت‌وگو درباره‌ی پروژه». اگر خالی باشد دکمه‌ای نمی‌آید.' },
        { key: 'cta_url',    label: 'لینک دکمه', type: 'url', ltr: true },
        { key: 'is_active',  label: 'فعال', type: 'bool' }
      ]
    });


    /* ---- شبکه‌های اجتماعی -------------------------------------------
       platform is free text on purpose. The site picks an icon from it
       and falls back to a generic one, so a network nobody has heard of
       yet can be added here today without a change anywhere else. */
    R({
      id: 'social',
      icon: 'link',
      title: 'شبکه‌های اجتماعی',
      singular: 'شبکه',
      table: 'social_links',
      labelField: 'label',
      status: false,
      ordering: true,
      perms: { create: 'settings.manage', edit: 'settings.manage', del: 'settings.manage' },
      intro: 'حساب‌های رسمی. عوض‌کردن نشانی اینجا، همه‌جای سایت را عوض می‌کند — ' +
             'صفحه‌ی کانال‌ها و هر لینکی که در صفحه‌های دیگر به همان شبکه می‌رود. ' +
             'شبکه‌ی تازه را هم می‌شود همین‌جا اضافه کرد.',
      order: 'sort_order.asc,created_at.asc',
      columnLabel: 'نام',
      fields: [
        { key: 'label',       label: 'نام', type: 'text', required: true,
          help: 'همان چیزی که روی کارت نوشته می‌شود، مثل YouTube.' },
        { key: 'platform',    label: 'شبکه', type: 'text', ltr: true, required: true,
          help: 'youtube، telegram، instagram، linkedin، x، github، threads، ' +
                'tiktok، discord، whatsapp یا هر چیز دیگر. آیکون از روی همین ' +
                'انتخاب می‌شود؛ چیزی که ناشناس باشد آیکون عمومی می‌گیرد.' },
        { key: 'handle',      label: 'آیدی', type: 'text', ltr: true,
          help: 'مثل @navidix. فقط نمایشی است.' },
        { key: 'url',         label: 'نشانی کامل', type: 'url', ltr: true, required: true },
        { key: 'description', label: 'توضیح', type: 'textarea',
          help: 'یک جمله درباره‌ی اینکه در این شبکه چه می‌گذارد.' },
        { key: 'is_active',   label: 'فعال', type: 'bool' }
      ]
    });
  }


  /* ---- معرفی --------------------------------------------------------
     One row, enforced in the database by a primary key that only accepts
     true. So this is a form, not a list. */
  var FIELDS = [
    ['display_name', 'نام', 'text',     'همان نامی که بالای صفحه‌ی «درباره» می‌آید.'],
    ['role_fa',      'عنوان', 'text',   'مثلاً «سازنده‌ی نویدیکس · پژوهش، سینما و هوش مصنوعی».'],
    ['role_en',      'عنوان انگلیسی', 'text', ''],
    ['email',        'ایمیل', 'text',   'اگر خالی باشد جایی نشان داده نمی‌شود.'],
    ['photo_path',   'عکس', 'media',    'از کتابخانه‌ی رسانه انتخاب کن.'],
    ['bio',          'معرفی', 'markdown',
     'متن اصلی. Markdown هم می‌شود نوشت: ## برای عنوان، **پررنگ**، و فهرست با -.']
  ];

  function control(f, value, onChange) {
    var wrap = el('div', 'afield');
    wrap.appendChild(el('label', 'alabel', f[1]));

    var node;
    if (f[2] === 'markdown') {
      node = el('textarea', 'ainput ataller');
      node.rows = 14;
      node.value = value || '';
    } else if (f[2] === 'media') {
      node = el('input', 'ainput');
      node.type = 'text';
      node.dir = 'ltr';
      node.value = value || '';
      node.placeholder = 'مسیر فایل در کتابخانه';
    } else {
      node = el('input', 'ainput');
      node.type = 'text';
      node.value = value || '';
      if (f[0] === 'email' || f[0] === 'role_en') node.dir = 'ltr';
    }
    node.addEventListener('input', function () { onChange(f[0], node.value); });
    wrap.appendChild(node);

    if (f[2] === 'media') {
      var row = el('div', 'arow');
      var pick = el('button', 'abtn abtn--sm', 'انتخاب از کتابخانه');
      pick.type = 'button';
      pick.addEventListener('click', function () {
        if (!window.NVX_ADMIN_MEDIA || !NVX_ADMIN_MEDIA.pick) return;
        NVX_ADMIN_MEDIA.pick().then(function (asset) {
          if (!asset) return;
          node.value = asset.path;
          onChange(f[0], asset.path);
        });
      });
      var clear = el('button', 'abtn abtn--sm', 'پاک کن');
      clear.type = 'button';
      clear.addEventListener('click', function () {
        node.value = '';
        onChange(f[0], '');
      });
      row.appendChild(pick);
      row.appendChild(clear);
      wrap.appendChild(row);
    }

    if (f[3]) wrap.appendChild(el('p', 'ahelp', f[3]));
    return wrap;
  }

  A.register({
    id: 'profile',
    title: 'معرفی',
    group: 'admin',
    icon: 'user',
    perm: 'settings.manage',
    render: function (host) {
      A.clear(host);
      A.page(host, {
        title: 'معرفی',
        sub: 'متنی که در صفحه‌ی «درباره» و هر جای دیگری از سایت که معرفی می‌خواهد ' +
             'نشان داده می‌شود. تا وقتی این را پر نکنی، صفحه همان متنی را نشان ' +
             'می‌دهد که امروز در خودش نوشته شده.'
      });

      var load = A.skeleton(3);
      host.appendChild(load);

      A.db.select('site_profile?select=*&limit=1').then(function (rows) {
        host.removeChild(load);

        var row = (rows || [])[0];
        if (!row) {
          host.appendChild(A.note(new Error(
            'جدول معرفی هنوز ساخته نشده. فایل supabase/cms-site.sql را اجرا کن.')));
          return;
        }

        var dirty = {};
        function mark(key, value) { dirty[key] = value === '' ? null : value; }

        var form = el('div', 'aform');
        FIELDS.forEach(function (f) { form.appendChild(control(f, row[f[0]], mark)); });
        host.appendChild(form);

        var bar = el('div', 'abar');
        var save = A.button('ذخیره', 'primary', 'check', function () {
          var keys = Object.keys(dirty);
          if (!keys.length) { A.toast('چیزی عوض نشده.'); return; }
          save.disabled = true;
          A.db.update('site_profile', 'id=eq.true', dirty).then(function () {
            save.disabled = false;
            dirty = {};
            A.toast('ذخیره شد. روی سایت هم عوض شد.', 'good');
          }, function (e) {
            save.disabled = false;
            A.toast(e.message, 'bad');
          });
        });
        bar.appendChild(save);
        host.appendChild(bar);

      }, function (e) {
        host.removeChild(load);
        host.appendChild(A.note(e));
      });
    }
  });
})();
