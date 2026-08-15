/* nvx-studio.js — استودیو تصویر نویدیکس
   =====================================================================

   این فایل مدل نمی‌سازد و مدل هم ندارد. کاری که می‌کند دو چیز است، و
   هر دو همان چیزی است که آدمِ بلد موقع کار با این ابزارها انجام می‌دهد:

     ۱. پرامپت را کامل می‌کند. «مرد کنار پنجره‌ی بارانی» یک سوژه است، نه
        یک قاب. نور، لنز، فاصله‌ی نما و حسِ رنگ باید گفته شود وگرنه مدل
        خودش یک چیزی برمی‌دارد. این‌ها همان‌هایی است که در درس‌های «نور و
        ترکیب‌بندی» و «زبان دوربین» گفته شده.

     ۲. مدل را انتخاب می‌کند. مدلی که چهره‌ی واقع‌گرا خوب می‌دهد، همان مدلی
        نیست که متن روی پوستر را درست می‌نویسد.

   اسمش را «مدلِ آموزش‌دیده‌ی نویدیکس» نمی‌گذاریم، چون نیست و دروغ است.
   انتخاب و تنظیم است — و همان چیزی است که ارزش دارد.


   دو موتور، و چرا
   ---------------
   موتورِ پیش‌فرض کلید نمی‌خواهد و از سهمیه‌ی هیچ‌کس خرج نمی‌کند، پس هر
   بازدیدکننده‌ای می‌تواند بی‌هیچ کاری امتحانش کند. سقف روزانه دارد، نه
   برای اینکه چیزی گران است، بلکه چون سرویسِ رایگانِ مشترکی است و کوبیدنش
   بی‌ادبی است. کیفیتش هم در همان حد است: قابل قبول، نه بیشتر.

   موتور دوم FLUX.1 [schnell] است روی Workers AI، با حسابِ خودِ کاربر.
   شناسه و توکن در همین مرورگر می‌مانند و هیچ‌جا فرستاده نمی‌شوند — سایت
   اصلاً سروری ندارد که بفرستد.
   ===================================================================== */
(function () {
  'use strict';

  var DAY   = 'nvx-studio-day';
  var WORK  = 'nvx-studio-worker';
  var FREE  = 3;                      // سقف روزانه‌ی موتور بی‌کلید

  var $ = function (id) { return document.getElementById(id); };
  if (!$('p')) return;

  /* ---------------------------------------------------------------- ابزار */

  function today() {
    // مرزِ روز به وقت تهران، مثل بقیه‌ی سایت — وگرنه ساعت ۳ بامداد
    // سهمیه‌ی «فردا» باز می‌شود و برای خواننده بی‌معنی است.
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' })
        .format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function used() {
    try {
      var d = JSON.parse(localStorage.getItem(DAY) || '{}');
      return d.d === today() ? (d.n || 0) : 0;
    } catch (e) { return 0; }
  }

  function bump() {
    try { localStorage.setItem(DAY, JSON.stringify({ d: today(), n: used() + 1 })); }
    catch (e) {}
  }

  function myKey() {
    try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; }
  }

  function myWorker() {
    try { return (localStorage.getItem(WORK) || '').trim(); } catch (e) { return ''; }
  }

  function cleanWorker(v) {
    v = String(v || '').trim().replace(/\/+$/, '');
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }

  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  /* ------------------------------------------------------------ انتخابگر
     قانون است، نه مدل. هر قاعده یک نشانه در پرامپت می‌گیرد و یک تصمیم
     می‌دهد. فارسی و انگلیسی هر دو، چون آدم‌ها هر دو را می‌نویسند. */

  // ترتیب مهم است و تصادفی نیست: اولین قاعده‌ای که بگیرد برنده است، پس
  // نشانه‌های سبک باید جلوتر از نشانه‌های سوژه باشند. «انیمه دختری با چتر»
  // هم انیمه است هم دختر؛ اگر «دختر» زودتر بگیرد، پرتره‌ی واقع‌گرا تحویل
  // می‌دهد که غلط است. سوژه در هر پرامپتی هست، سبک فقط وقتی گفته می‌شود
  // که طرف واقعاً همان را می‌خواهد.
  var RULES = [
    { id: 'text',
      fa: 'متن یا لوگو',
      hit: /لوگو|نوشت|متن|تایپوگراف|پوستر|جلد|بنر|logo|text|poster|typograph|banner/i,
      craft: ['clean legible lettering, centred composition, high contrast, flat graphic design',
              'bold display type, generous negative space, single accent colour, crisp edges'],
      note: 'نوشته‌ی داخل تصویر کارِ سختی است؛ مدل‌ها معمولاً حروف را خراب می‌کنند. قاب ساده و پرکنتراست بیشترین شانس را می‌دهد.' },

    { id: 'anime',
      fa: 'تصویرسازی',
      hit: /انیمه|کارتون|نقاشی|ایلاستر|کمیک|anime|cartoon|illustration|comic|drawing/i,
      craft: ['clean line art, cel shading, flat colour blocking, expressive silhouette',
              'painterly brushwork, limited palette, strong shape language, soft rim light'],
      note: 'سبک تصویرسازی انتخاب شد: خط تمیز و رنگ‌گذاری تخت، نه بافتِ عکاسی.' },

    { id: 'face',
      fa: 'پرتره',
      hit: /پرتره|چهره|صورت|مرد|زن|دختر|پسر|بازیگر|portrait|face|man|woman|person/i,
      craft: ['soft key light from one side, 85mm lens, shallow depth of field, natural skin texture, catchlight in the eyes',
              'window light, 50mm, medium close-up, gentle falloff, honest unretouched skin',
              'low key portrait, single hard source, deep shadow side, 105mm compression'],
      note: 'برای چهره، نورِ یک‌طرفه و لنز ۸۵ اضافه شد — همان چیزی که در «نور و ترکیب‌بندی» به آن می‌گوییم نورِ کلیدی.' },

    { id: 'animal',
      fa: 'جانور',
      hit: /گربه|سگ|پرنده|اسب|حیوان|جانور|cat|dog|bird|horse|animal|wolf|fox/i,
      craft: ['telephoto, eye level with the animal, shallow depth of field, fur detail held in the light',
              'close observation, natural light, alert gaze, background thrown well out of focus'],
      note: 'سوژه یک جانور است، پس دوربین به سطحِ چشمِ او آمد و پس‌زمینه رفت روی محو — نه نمای باز، که جانور در آن گم می‌شود.' },

    { id: 'place',
      fa: 'لوکیشن و فضا',
      hit: /منظره|شهر|خیابان|جنگل|کوه|اتاق|فضا|لوکیشن|دریا|ساحل|بیابان|آسمان|landscape|city|street|forest|room|interior|mountain|sea|beach|desert|sky|valley|village/i,
      craft: ['wide establishing shot, atmospheric depth, layered foreground and background, volumetric light',
              'high vantage point, receding planes, haze separating distance, cool ambient light'],
      note: 'نمای باز با لایه‌ی جلو و عقب — همان کاری که در «زبان دوربین» به آن نمای معرف می‌گوییم.' },

    { id: 'product',
      fa: 'محصول',
      hit: /محصول|پکیج|بسته‌بندی|تبلیغ|product|packshot|advert/i,
      craft: ['studio softbox lighting, seamless backdrop, crisp product focus, subtle reflection',
              'raking side light, matte surface, tight macro detail, controlled specular highlight'],
      note: 'نور استودیویی و پس‌زمینه‌ی یکدست انتخاب شد تا خودِ محصول دیده شود.' }
  ];

  var DEFAULT = {
    id: 'cinema',
    fa: 'سینمایی',
    craft: ['cinematic lighting, filmic colour grade, 35mm, shallow depth of field, deliberate composition',
            'anamorphic framing, practical light sources in shot, muted contrast, 40mm',
            'natural available light, handheld feel, documentary framing, honest colour'],
    note: 'قاعده‌ی خاصی در پرامپتت پیدا نشد، پس حالت سینمایی گرفت: نور، رنگ و عمقِ میدانِ فیلم.'
  };

  var MOOD = [
    { hit: /غمگین|دلگیر|تنها|سرد|melanchol|sad|lonely/i, add: 'muted desaturated palette, cool shadows' },
    { hit: /شاد|گرم|آفتاب|روشن|happy|warm|sunny|bright/i, add: 'warm golden light, gentle highlights' },
    { hit: /ترسناک|تاریک|وحشت|horror|dark|scary/i,       add: 'low key lighting, heavy shadow, high contrast' },
    { hit: /شب|بارانی|مه|night|rain|fog|neon/i,          add: 'wet reflective surfaces, atmospheric haze' }
  ];

  function route(text) {
    var r = DEFAULT;
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].hit.test(text)) { r = RULES[i]; break; }
    }
    var extra = [];
    for (var j = 0; j < MOOD.length; j++) {
      if (MOOD[j].hit.test(text)) extra.push(MOOD[j].add);
    }
    // قاعده‌ها روی متنِ فارسی اجرا می‌شوند و باید هم بشوند؛ ساختنِ پرامپتِ
    // نهایی اما تا بعد از ترجمه صبر می‌کند.
    return {
      kind: r.fa,
      note: r.note,
      // یک رشته‌ی ثابت یعنی هر تصویرِ این دسته شبیه قبلی درمی‌آید. چند
      // حالت هست و هر بار یکی برداشته می‌شود، پس دوباره‌زدن واقعاً چیز
      // تازه‌ای می‌دهد نه همان قاب با دانه‌ی دیگر.
      build: function (subject) {
        var c = r.craft;
        if (typeof c !== 'string') c = c[Math.floor(Math.random() * c.length)];
        return [subject, c].concat(extra).join(', ');
      }
    };
  }

  /* ------------------------------------------------------------- ترجمه

     مدل‌های تصویر فارسی نمی‌فهمند. «یک سگ» برایشان یک رشته‌ی بی‌معنی است و
     جوابش یک لکه‌ی تصادفی است — که دقیقاً همان چیزی بود که اول کار از این
     صفحه درآمد. پس سوژه پیش از رفتن، انگلیسی می‌شود.

     نقطه‌ی ضعفش را هم بگویم: این سرویسِ ترجمه‌ی عمومیِ گوگل است و قرارداد
     رسمی ندارد، پس ممکن است روزی جواب ندهد. آن روز صفحه ساکت نمی‌ماند و
     نمی‌گذارد فارسی خام برود بیرون — می‌گوید نشد و می‌گوید چه کار کنی. */

  var TR = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=';

  function needsTranslating(s) { return /[؀-ۿ]/.test(s); }

  function translate(text) {
    return fetch(TR + encodeURIComponent(text))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var out = (j[0] || []).map(function (seg) { return (seg && seg[0]) || ''; })
                              .join('').trim();
        if (!out) throw new Error('پاسخ خالی بود');
        return out;
      });
  }

  /* -------------------------------------------------------------- نسبت‌ها */

  var RATIOS = [
    { fa: '۱:۱',  w: 1024, h: 1024 },
    { fa: '۱۶:۹', w: 1280, h: 720 },
    { fa: '۹:۱۶', w: 720,  h: 1280 },
    { fa: '۴:۵',  w: 896,  h: 1120 }
  ];
  var ratio = RATIOS[1];

  /* --------------------------------------------------------- موتور رایگان
     یک تگ <img> است و نه بیشتر. کلید نمی‌خواهد، هیچ چیزی از کاربر بیرون
     نمی‌فرستد جز خود پرامپت، و اگر سرویس بالا نباشد onerror می‌گیرد و
     صریح می‌گوید — به‌جای اینکه صفحه بی‌صدا خالی بماند. */

  function freeUrl(prompt, seed, flux) {
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt)
      + '?width=' + ratio.w + '&height=' + ratio.h
      + '&seed=' + seed + '&nologo=true&referrer=navidixstudio.com'
      + (flux ? '&model=flux' : '');
  }

  /* --------------------------------------------- موتور خوب: FLUX روی Cloudflare

     گوگل از این صفحه برداشته شد. دلیلش سلیقه نبود: کلیدِ رایگانِ گوگل برای
     تصویر «limit: 0» می‌دهد — یعنی نه سهمیه‌ای مانده، بلکه اصلاً سهمیه‌ای
     وجود ندارد. ماندنش فقط یک دکمه بود که همیشه خطا می‌داد.

     جایش FLUX.1 [schnell] است روی Workers AI؛ سهمیه‌ی رایگانِ روزانه‌ی واقعی
     دارد و کارت بانکی نمی‌خواهد. دو چیز لازم دارد نه یکی — شناسه‌ی حساب و
     توکن — که یک قدم بیشتر است، و همان یک قدم فرقِ «عکسِ عمومیِ هوش مصنوعی»
     با چیزی است که بشود زیرش اسم گذاشت.

     CORS این سرویس را از اینجا نتوانستم امتحان کنم؛ پراکسیِ محیطِ من فقط چند
     دامنه‌ی گوگل را باز می‌گذارد. پس اگر مرورگر جلویش را بگیرد، صفحه ساکت
     نمی‌ماند: پیامش را می‌گوید و کار را با موتور پیش‌فرض تمام می‌کند. */

  function flux(worker, prompt) {
    return fetch(worker, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, steps: 4 })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
      }, function () { throw new Error('HTTP ' + r.status + ' — پاسخ JSON نبود'); });
    }).then(function (j) {
      var img = j.image || (j.result && j.result.image);
      if (!img) throw new Error('پاسخ آمد ولی تصویری در آن نبود.');
      return 'data:image/jpeg;base64,' + img;
    });
  }

  /* ------------------------------------------------------------- نمایش */

  var shots = [];

  function quota() {
    var on = myWorker();
    if (on) {
      $('quota').innerHTML = '<b>FLUX schnell</b> از Worker خودت — بی‌سقف';
      $('keysum').textContent = 'Worker خودت وصل است — برای تغییر بزن';
    } else {
      var left = Math.max(0, FREE - used());
      $('quota').innerHTML = 'امروز <b>' + fa(left) + '</b> تا از ' + fa(FREE) + ' مانده';
      $('keysum').textContent = 'کیفیت بالاتر می‌خواهی؟ Worker خودت را وصل کن — رایگان';
    }
  }

  function fail(title, detail) {
    var d = document.createElement('div');
    d.className = 'err';
    var b = document.createElement('b'); b.textContent = title; d.appendChild(b);
    if (detail) {
      var c = document.createElement('code'); c.textContent = detail; d.appendChild(c);
    }
    $('out').insertBefore(d, $('out').firstChild);
  }

  function show(src, plan, engine) {
    var card = document.createElement('div');
    card.className = 'shot';

    var img = document.createElement('img');
    img.src = src; img.alt = plan.prompt; img.loading = 'lazy';
    card.appendChild(img);

    var b = document.createElement('div'); b.className = 'shot__b';
    var p = document.createElement('p'); p.className = 'shot__p'; p.textContent = plan.prompt;
    var m = document.createElement('p'); m.className = 'shot__m';
    m.textContent = plan.kind + ' · ' + engine + ' — ';
    var a = document.createElement('a');
    a.href = src; a.download = 'navidix-' + Date.now() + '.png';
    a.textContent = 'ذخیره'; a.target = '_blank'; a.rel = 'noopener';
    m.appendChild(a);
    b.appendChild(p); b.appendChild(m);
    card.appendChild(b);

    $('out').insertBefore(card, $('out').firstChild);

    shots.unshift(src);
    $('galhint').style.display = 'none';
    var g = document.createElement('a');
    g.href = src; g.target = '_blank'; g.rel = 'noopener';
    var gi = document.createElement('img'); gi.src = src; gi.alt = ''; gi.loading = 'lazy';
    g.appendChild(gi);
    $('gal').insertBefore(g, $('gal').firstChild);
  }

  // یادداشتِ آرام — نه خطا، نه سکوت. برای وقتی که کار انجام شد ولی نه
  // آن‌طور که کاربر انتظار داشت.
  function soft(text) {
    var d = document.createElement('p');
    d.className = 'soft';
    d.textContent = text;
    $('out').insertBefore(d, $('out').firstChild);
  }

  function freeShot(plan, done) {
    // بارگذاری خودِ تصویر تنها آزمونِ درست است — و همین اجازه می‌دهد بدون
    // خطر، مدلِ بهتر را اول امتحان کنیم: اگر این سرویس پارامتر flux را
    // نشناسد، تصویر بار نمی‌شود و بی‌سروصدا برمی‌گردیم سر حالتِ ساده.
    var seed = Math.floor(Math.random() * 1e9);

    function attempt(flux) {
      return new Promise(function (ok, no) {
        var url = freeUrl(plan.prompt, seed, flux);
        var probe = new Image();
        probe.onload = function () {
          done(); bump(); quota();
          show(url, plan, flux ? 'FLUX (رایگان)' : 'موتور پیش‌فرض');
          ok();
        };
        probe.onerror = function () { no(new Error('__free__')); };
        probe.src = url;
      });
    }

    return attempt(true).catch(function () { return attempt(false); });
  }

  function waiting() {
    var w = document.createElement('div');
    w.className = 'shot';
    w.innerHTML = '<div class="wait"><span class="spin"></span><span>در حال ساختن…</span></div>';
    $('out').insertBefore(w, $('out').firstChild);
    return w;
  }

  /* --------------------------------------------------------------- کار */

  function make() {
    var text = $('p').value.trim();
    if (!text) { $('p').focus(); return; }

    var worker = myWorker();
    if (!worker && used() >= FREE) {
      fail('سهمیه‌ی امروزت تمام شد.',
           null);
      $('out').firstChild.appendChild(document.createTextNode(
        'فردا دوباره باز می‌شود. یا اگر می‌خواهی همین حالا ادامه بدهی و ' +
        'کیفیت بالاتری هم بگیری، Worker خودت را وصل کن — پایین همین صفحه.'));
      $('keybox').open = true;
      $('keybox').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var plan = route(text);
    var why = $('why');
    why.className = 'why on';
    why.innerHTML = '';
    var strong = document.createElement('b');
    strong.textContent = 'انتخاب نویدیکس: ' + plan.kind + '. ';
    why.appendChild(strong);
    why.appendChild(document.createTextNode(plan.note));
    var line = document.createElement('span');
    line.className = 'why__p';
    why.appendChild(line);

    $('go').disabled = true;
    var w = waiting();

    function done() { $('go').disabled = false; w.remove(); }

    var subject = needsTranslating(text) ? translate(text) : Promise.resolve(text);

    subject.then(function (en) {
      plan.prompt = plan.build(en);
      // آنچه واقعاً فرستاده می‌شود، پیش از چشمِ کاربر — نه بعدش. اگر ترجمه
      // بد بوده باشد همان‌جا می‌بیند و پرامپتش را عوض می‌کند، به‌جای اینکه
      // منتظر یک تصویرِ غلط بماند و نداند چرا غلط است.
      line.textContent = plan.prompt;

      if (worker) {
        return flux(worker, plan.prompt).then(function (src) {
          done(); show(src, plan, 'FLUX schnell');
        }, function (e) {
          // «limit: 0» یعنی سهمیه تمام نشده — از اول صفر بوده. مدل‌های
          // تصویرِ گوگل روی حساب رایگان باز نیستند. نشان‌دادنِ یک دیوار
          // انگلیسی و دست خالی، بدترین کارِ ممکن است؛ تصویر را با موتور
          // رایگان می‌سازیم و در یک جمله می‌گوییم چرا.
          // «Failed to fetch» یعنی درخواست اصلاً بیرون نرفت، و روی یک Worker
          // تازه‌ساخته تقریباً همیشه یک دلیل دارد: کدِ Hello World هنوز
          // آنجاست و OPTIONS را با سرآیندهای CORS جواب نمی‌دهد. گفتنِ
          // «Failed to fetch» به کاربر هیچ کمکی نمی‌کند؛ گفتنِ راهِ تشخیص
          // می‌کند.
          soft(/Failed to fetch|NetworkError/i.test(e.message)
            ? 'مرورگر نتوانست به Worker وصل شود. آدرسش را در مرورگر باز کن: ' +
              'اگر «Hello World!» نوشت یعنی کد هنوز چسبانده نشده — برو Edit code، ' +
              'همه را پاک کن، کد را بچسبان و Deploy بزن. اگر «POST only» نوشت ' +
              'یعنی کد سرِ جایش است و اشکال جای دیگری است.'
            : 'Worker جواب نداد: ' + e.message.slice(0, 120) +
              ' — اتصال (Binding) با نام AI را چک کن.');
          return freeShot(plan, done);
        });
      }

      return freeShot(plan, done);
    }).catch(function (e) {
      done();
      if (e && e.message === '__free__') {
        fail('موتور رایگان الان جواب نداد.',
             'این سرویسِ عمومی و رایگان است و گاهی شلوغ می‌شود. چند لحظه بعد ' +
             'دوباره بزن، یا کلید خودت را بگذار تا مستقیم از گوگل بگیرد.');
      } else if (!plan.prompt) {
        fail('نتوانستم پرامپتت را به انگلیسی برگردانم.',
             'مدل‌های تصویر فارسی نمی‌فهمند، و فرستادنِ فارسیِ خام فقط یک ' +
             'تصویرِ بی‌ربط تحویل می‌دهد — پس نفرستادم. یا چند لحظه بعد دوباره ' +
             'بزن، یا همین پرامپت را به انگلیسی بنویس.');
      } else {
        fail('گوگل این را برگرداند:', e.message);
      }
    });
  }

  /* --------------------------------------------------------------- راه‌اندازی */

  RATIOS.forEach(function (r, i) {
    var b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = r.fa;
    b.setAttribute('aria-pressed', i === 1 ? 'true' : 'false');
    b.addEventListener('click', function () {
      ratio = r;
      $('ratios').querySelectorAll('.chip').forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
    });
    $('ratios').appendChild(b);
  });

  $('go').addEventListener('click', make);
  $('p').addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') make();
  });

  var box = $('work');
  box.value = myWorker();

  function saveKey() {
    var v = cleanWorker(box.value);
    box.value = v;
    var msg = $('keymsg');
    try { v ? localStorage.setItem(WORK, v) : localStorage.removeItem(WORK); } catch (e) {}
    quota();
    if (!v) {
      msg.className = 'keymsg';
      msg.textContent = 'پاک شد. دوباره با موتور پیش‌فرض کار می‌کند.';
    } else if (!/^https:\/\/[^\s.]+\.[^\s]+$/i.test(v)) {
      msg.className = 'keymsg no';
      msg.textContent = 'این آدرسِ کاملی به‌نظر نمی‌رسد. باید چیزی شبیه ' +
                        'https://navidix-flux.<نام‌تو>.workers.dev باشد.';
    } else {
      msg.className = 'keymsg ok';
      msg.textContent = 'ثبت شد. برو بالا و بساز — اگر Worker درست کار کند، ' +
                        'زیر تصویر می‌نویسد FLUX schnell.';
      $('out').innerHTML = '';
    }
  }

  $('keygo').addEventListener('click', saveKey);
  box.addEventListener('change', saveKey);
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });

  // کپی‌کردنِ کدِ Worker روی گوشی با انگشت شدنی نیست؛ دکمه لازم دارد.
  var cp = $('copycode');
  if (cp) cp.addEventListener('click', function () {
    var t = $('wcode').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
      .then(function () { cp.textContent = '✓ کپی شد'; },
            function () { cp.textContent = 'کپی نشد — دستی انتخابش کن'; });
    setTimeout(function () { cp.textContent = 'کپی کد'; }, 2600);
  });

  quota();
})();
