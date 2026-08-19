/* =====================================================================
   NAVIDIX — admin › what the content types are.

   Six descriptions and no logic. Everything these produce — the list, the
   filters, the form, the status control, the ordering, the delete — comes
   from nvx-admin-resource.js. If a control is wrong for all six, it is
   wrong in that file; if it is wrong for one, it is wrong here.

   The permission on each type is the one the RLS policy in
   cms-content.sql checks for the same table, and the two lists have to
   agree: a mismatch here does not create a hole, it creates a button
   that always fails. Articles are the only type using the split
   create/edit/delete permissions, which is what lets a Writer draft an
   article and touch nothing else on the site.
   ===================================================================== */
(function () {
  'use strict';

  var R = window.NVX_RESOURCE;
  if (!R) return;

  var LEVELS = [
    ['beginner', 'مقدماتی'],
    ['intermediate', 'متوسط'],
    ['advanced', 'پیشرفته']
  ];


  /* ---- مقاله‌ها -----------------------------------------------------
     The only type whose body is long-form. `body` is Markdown, kept as
     plain text: HTML coming out of a browser editor would have to be
     sanitised before it is ever rendered, and a static site has nowhere
     safe to do that. */
  R({
    id: 'articles',
    title: 'مقاله‌ها',
    singular: 'مقاله',
    table: 'articles',
    kind: 'article',
    slugField: 'slug',
    authorField: 'author_id',
    hasCategory: true,
    status: true,
    ordering: true,
    perms: { create: 'content.create', edit: 'content.edit', del: 'content.delete' },
    intro: 'مقاله‌ها. متن به شکل Markdown ذخیره می‌شود. تا وقتی صفحه‌های عمومی سایت ' +
           'از این جدول نخوانند، آنچه اینجا منتشر می‌کنی روی سایت ظاهر نمی‌شود — آن اتصال فاز بعدی است.',
    fields: [
      { key: 'title',   label: 'عنوان', type: 'text', required: true },
      { key: 'slug',    label: 'نشانی (slug)', type: 'text', ltr: true,
        help: 'اگر خالی بگذاری خودش ساخته می‌شود. فقط حروف انگلیسی، عدد و خط تیره.' },
      { key: 'excerpt', label: 'خلاصه', type: 'textarea',
        help: 'یکی دو جمله. در فهرست مقاله‌ها و در نتیجه‌ی جست‌وجو دیده می‌شود.' },
      { key: 'body',    label: 'متن', type: 'markdown',
        placeholder: '## عنوان بخش\n\nمتن…' },
      { key: 'cover_path',  label: 'تصویر شاخص', type: 'media' },
      { key: 'category_id', label: 'دسته', type: 'category' },
      { key: 'tags',        label: 'تگ‌ها', type: 'tags' },
      { key: 'seo_title',       label: 'عنوان SEO', type: 'text',
        help: 'اگر خالی باشد از عنوان مقاله استفاده می‌شود.' },
      { key: 'seo_description', label: 'توضیح متا', type: 'textarea',
        help: 'همان متنی که زیر عنوان در گوگل می‌آید.' },
      { key: 'seo_keywords',    label: 'کلیدواژه‌ها', type: 'tags' }
    ]
  });


  /* ---- پرامپت‌ها -----------------------------------------------------
     Three prompt columns because the library on the site already has
     three. One combined field would mean anyone who wants the video
     prompt has to cut the text apart by hand every time. */
  R({
    id: 'prompts',
    title: 'پرامپت‌ها',
    singular: 'پرامپت',
    table: 'prompts',
    kind: 'prompt',
    labelField: 'title_fa',
    slugField: 'slug',
    hasCategory: true,
    status: true,
    ordering: true,
    featured: true,
    perms: { create: 'prompts.manage', edit: 'prompts.manage', del: 'prompts.manage' },
    intro: 'کتابخانه‌ی پرامپت. ۲۷۰ سبک فعلی سایت هنوز از tools/styles.py ساخته می‌شوند ' +
           'و اینجا نیستند؛ این جدول برای پرامپت‌هایی است که از این به بعد اضافه می‌کنی.',
    fields: [
      { key: 'title_fa', label: 'عنوان فارسی', type: 'text', required: true },
      { key: 'title_en', label: 'عنوان انگلیسی', type: 'text', ltr: true },
      { key: 'slug',     label: 'نشانی (slug)', type: 'text', ltr: true },
      { key: 'prompt_image',    label: 'پرامپت تصویر', type: 'textarea', ltr: true },
      { key: 'prompt_video',    label: 'پرامپت ویدیو', type: 'textarea', ltr: true },
      { key: 'prompt_negative', label: 'پرامپت منفی', type: 'textarea', ltr: true },
      { key: 'recipe', label: 'توضیح', type: 'textarea',
        help: 'کلید این سبک چیست — به فارسی، برای کسی که می‌خواهد بفهمد نه فقط کپی کند.' },
      { key: 'model',  label: 'مدل مرتبط', type: 'text', ltr: true,
        placeholder: 'مثلاً Midjourney v7' },
      { key: 'cover_path',  label: 'تصویر نمونه', type: 'media' },
      { key: 'category_id', label: 'دسته', type: 'category' },
      { key: 'tags',        label: 'تگ‌ها', type: 'tags' }
    ]
  });


  /* ---- دوره‌ها -------------------------------------------------------
     A course is a container with a status of its own: unpublishing a
     course hides its chapters too, because the chapter read policy in
     cms-content.sql looks at the course rather than at itself. */
  R({
    id: 'courses',
    title: 'دوره‌ها',
    singular: 'دوره',
    table: 'courses',
    kind: 'lesson',
    slugField: 'slug',
    hasCategory: true,
    status: true,
    ordering: true,
    perms: { create: 'lessons.manage', edit: 'lessons.manage', del: 'lessons.manage' },
    intro: 'دوره‌ها. هر دوره می‌تواند فصل داشته باشد و هر فصل درس — ولی هیچ‌کدام اجباری ' +
           'نیست: یک درس می‌تواند مستقیم زیر دوره بنشیند یا اصلاً دوره نداشته باشد.',
    fields: [
      { key: 'title',       label: 'عنوان', type: 'text', required: true },
      { key: 'slug',        label: 'نشانی (slug)', type: 'text', ltr: true },
      { key: 'description', label: 'توضیح', type: 'textarea' },
      { key: 'cover_path',  label: 'کاور', type: 'media' },
      { key: 'level',       label: 'سطح', type: 'select', options: LEVELS },
      { key: 'category_id', label: 'دسته', type: 'category' },
      { key: 'tags',        label: 'تگ‌ها', type: 'tags' }
    ]
  });


  /* ---- فصل‌ها --------------------------------------------------------
     No status and no category: a chapter is furniture. It is visible
     exactly when its course is, which is why it is the one type here
     without a publish control. */
  R({
    id: 'chapters',
    title: 'فصل‌ها',
    singular: 'فصل',
    table: 'chapters',
    slugField: null,
    status: false,
    ordering: true,
    perms: { create: 'lessons.manage', edit: 'lessons.manage', del: 'lessons.manage' },
    intro: 'فصل‌های داخل دوره‌ها. فصل وضعیت انتشار ندارد — هر وقت دوره‌اش منتشر باشد ' +
           'دیده می‌شود. حذف یک دوره فصل‌هایش را هم پاک می‌کند.',
    order: 'sort_order.asc',
    fields: [
      { key: 'title',       label: 'عنوان', type: 'text', required: true },
      { key: 'course_id',   label: 'دوره', type: 'ref', refTable: 'courses',
        refLabel: 'title', required: true },
      { key: 'description', label: 'توضیح', type: 'textarea' }
    ]
  });


  /* ---- درس‌ها -------------------------------------------------------- */
  R({
    id: 'lessons',
    title: 'درس‌ها',
    singular: 'درس',
    table: 'lessons',
    kind: 'lesson',
    slugField: 'slug',
    hasCategory: true,
    status: true,
    ordering: true,
    perms: { create: 'lessons.manage', edit: 'lessons.manage', del: 'lessons.manage' },
    intro: 'درس‌ها. چهارده درس فعلی سایت هنوز صفحه‌های جداگانه‌ی HTML‌اند و از ' +
           'curriculum.js می‌آیند؛ این جدول جایشان را نگرفته است.',
    fields: [
      { key: 'title',       label: 'عنوان', type: 'text', required: true },
      { key: 'slug',        label: 'نشانی (slug)', type: 'text', ltr: true },
      { key: 'description', label: 'توضیح', type: 'textarea' },
      { key: 'course_id',   label: 'دوره', type: 'ref', refTable: 'courses', refLabel: 'title' },
      { key: 'chapter_id',  label: 'فصل', type: 'ref', refTable: 'chapters', refLabel: 'title',
        help: 'اختیاری. اگر دوره فصل ندارد خالی بگذار.' },
      { key: 'thumbnail_path', label: 'تصویر', type: 'media' },
      { key: 'video_url',      label: 'لینک ویدیو', type: 'url', ltr: true },
      { key: 'level',            label: 'سطح', type: 'select', options: LEVELS },
      { key: 'duration_minutes', label: 'مدت (دقیقه)', type: 'number', min: 0 },
      { key: 'category_id', label: 'دسته', type: 'category' },
      { key: 'tags',        label: 'تگ‌ها', type: 'tags' }
    ]
  });


  /* ---- گالری --------------------------------------------------------
     media_path is required, and it is a path inside the media bucket
     rather than a URL — so replacing an image is picking a different one
     from the library, and nothing in the row has to know where the
     storage domain lives. */
  R({
    id: 'gallery',
    title: 'گالری',
    singular: 'تصویر',
    table: 'gallery_items',
    kind: 'gallery',
    slugField: null,
    hasCategory: true,
    status: true,
    ordering: true,
    featured: true,
    perms: { create: 'gallery.manage', edit: 'gallery.manage', del: 'gallery.manage' },
    intro: 'گالری. تصویر از کتابخانه‌ی رسانه انتخاب می‌شود، پس جایگزین‌کردنش یعنی ' +
           'انتخاب یک فایل دیگر — نه آپلود دوباره.',
    fields: [
      { key: 'title',       label: 'عنوان', type: 'text', required: true },
      { key: 'description', label: 'توضیح', type: 'textarea' },
      { key: 'media_path',  label: 'تصویر', type: 'media', required: true },
      { key: 'alt_text',    label: 'متن جایگزین', type: 'text',
        help: 'برای کسی که تصویر را نمی‌بیند، و برای موتور جست‌وجو.' },
      { key: 'category_id', label: 'دسته', type: 'category' },
      { key: 'tags',        label: 'تگ‌ها', type: 'tags' }
    ]
  });


  /* ---- ویدیوها ------------------------------------------------------ */
  R({
    id: 'videos',
    title: 'ویدیوها',
    singular: 'ویدیو',
    table: 'videos',
    kind: 'video',
    slugField: null,
    hasCategory: true,
    status: true,
    ordering: true,
    featured: true,
    perms: { create: 'videos.manage', edit: 'videos.manage', del: 'videos.manage' },
    intro: 'ویدیوها و مستندها. خودِ ویدیو روی یوتیوب می‌ماند و اینجا فقط نشانی و ' +
           'کاورش نگه داشته می‌شود.',
    fields: [
      { key: 'title',       label: 'عنوان', type: 'text', required: true },
      { key: 'description', label: 'توضیح', type: 'textarea' },
      { key: 'youtube_url', label: 'لینک یوتیوب', type: 'url', ltr: true, required: true,
        placeholder: 'https://www.youtube.com/watch?v=…' },
      { key: 'thumbnail_path', label: 'کاور', type: 'media' },
      { key: 'category_id',    label: 'دسته', type: 'category' },
      { key: 'tags',           label: 'تگ‌ها', type: 'tags' }
    ]
  });


  /* ---- دسته‌بندی‌ها ---------------------------------------------------
     Shared across all five content kinds, told apart by `kind`. It is a
     resource like any other, which is why it is here rather than being a
     corner of each type's own screen. */
  R({
    id: 'categories',
    title: 'دسته‌بندی',
    singular: 'دسته',
    table: 'categories',
    labelField: 'name_fa',
    slugField: 'slug',
    status: false,
    ordering: true,
    perms: { create: 'content.edit', edit: 'content.edit', del: 'content.edit' },
    intro: 'دسته‌بندی‌ها برای هر پنج نوع محتوا در یک جدول‌اند و با ستون «نوع» از هم ' +
           'جدا می‌شوند. حذف یک دسته محتوایش را پاک نمی‌کند — فقط بی‌دسته می‌شوند.',
    order: 'kind.asc,sort_order.asc',
    columnLabel: 'نام',
    fields: [
      { key: 'name_fa', label: 'نام فارسی', type: 'text', required: true },
      { key: 'name_en', label: 'نام انگلیسی', type: 'text', ltr: true },
      { key: 'slug',    label: 'نشانی (slug)', type: 'text', ltr: true, required: true },
      { key: 'kind',    label: 'نوع محتوا', type: 'select', required: true, options: [
        ['article', 'مقاله'], ['prompt', 'پرامپت'], ['lesson', 'درس'],
        ['gallery', 'گالری'], ['video', 'ویدیو']
      ] }
    ]
  });
})();
