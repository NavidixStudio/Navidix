# tools — سازنده‌ی کتابخانه‌ی پرامپت

کل کتابخانه از یک فایل ساخته می‌شود: `styles.py`. اگر سبک تازه‌ای اضافه کنی،
کارت فهرست، صفحه‌ی جداگانه‌ی سبک، ایندکس جست‌وجو، چیپ دسته‌بندی، تصویر سبک و
خط سایت‌مپ، همه خودشان ساخته می‌شوند. هیچ‌جای دیگری دست نمی‌زنی.

## اضافه کردن یک سبک

در `styles.py` یک `S(...)` تازه بنویس:

```python
S(id='cyanotype', cat='tech', fa='سیانوتایپ', en='Cyanotype', period='۱۸۴۲',
  plate=('wash','flat',['#0B2E4F','#1E5B8C','#E8E4D6']),
  dna=dict(medium='…', brush='…', light='…', palette='…',
           texture='…', comp='…', mood='…'),
  subject='…',              # سوژه‌ی نمونه، فقط برای ساختن تصویر سبک
  img='…{SUBJECT}…',        # پرامپت تصویر
  vid='…{SUBJECT}…',        # پرامپت ویدیو
  neg='…',                  # پرامپت منفی، مخصوص همین سبک
  recipe='…',               # توضیح فارسی: کلید این سبک چیست
  tags='… … …'),            # کلمه‌های جست‌وجو، فارسی و انگلیسی
```

`plate` سه چیز است: جنس قلم، نوع نور، و پالت. جنس قلم یکی از
`impasto · dabs · wash · flat · hatch · line · smooth · grain` و نور یکی از
`chiaro · golden · soft · neon · rim · back · top · flat`. تصویرِ سبک از همین
سه‌تا ساخته می‌شود، پس سبک هشتادم هم هزینه‌ی تازه‌ای ندارد.

## ساختن

```bash
python3 tools/build-library.py     # prompts.html + style/*.html + tools/styles.json
node    tools/style-plates.mjs     # لوح انتزاعی: prompts/<id>.jpg   (npm i playwright)
```

بعدش صفحه‌ی تازه را دستی به `sitemap.xml` اضافه کن — همان الگوی
`style/<id>.html` با `priority` برابر `0.7`.

## درباره‌ی تصویرها

دو جور تصویر ممکن است در `prompts/` باشد، و متن زیر عکس باید بگوید کدام است.
این را پرچم `PLATES_ARE_SAMPLES` در `styles.py` تعیین می‌کند و
`build-library.py` از رویش کپشن را انتخاب می‌کند.

**لوح انتزاعی** (`False`، حالت پیش‌فرض قدیمی): با `style-plates.mjs` و فقط با کد
ساخته می‌شود — همان پالت، همان جهت نور، همان جنس قلم. نه حق‌کپی دارد و نه به
شبکه وابسته است، ولی نمونه‌ی خروجی پرامپت نیست و نباید وانمود کند هست.

**خروجی واقعی** (`True`): همان `img` خودِ سبک، با `subject` خودش به جای
`{SUBJECT}`، اجرا شده روی یک مدل تصویر. یعنی عکسِ بالای صفحه دقیقاً همان چیزی
است که پرامپتِ پایین صفحه می‌سازد. تنها چیزی که اضافه می‌شود یک جمله است، برای
همه یکسان: «بدون متن و امضا» — چون مدل‌ها دوست دارند روی پوستر امضا بگذارند و
آن حروفِ بی‌معنی ربطی به سبک ندارد.

```bash
python3 tools/plate-prompts.py                     # ۲۷ پرامپت آماده
python3 tools/plate-prompts.py --json              # همان‌ها برای API

# بعد از ساختن تصویرها، یکی از این دو:
python3 tools/plates-import.py --from-dir ~/Downloads/plates
python3 tools/plates-import.py --fetch             # از URLهای plates.json
python3 tools/build-library.py                     # کپشن‌ها را درست می‌کند
```

`plates.json` می‌گوید هر لوح با کدام مدل و کدام job ساخته شده و فایلش کجاست.
`plates-import.py` تصویر را از مرکز به نسبت ۸:۵ می‌بُرد، یک‌بار به ۸۰۰×۵۰۰
می‌رساند و JPEG می‌نویسد؛ اگر حتی یکی از ۲۷ تا کم باشد هیچ پرچمی را جابه‌جا
نمی‌کند و می‌گوید کدام‌ها نیامدند.

`--fetch` فقط جایی کار می‌کند که دامنه‌ی CDN از فیلتر شبکه رد شود. اگر ۴۰۳
گرفتی، فایل‌ها را دستی از حساب Higgsfield بگیر، با نام `<id>.png` در یک پوشه
بریز و `--from-dir` را بزن.

## ساختن دوباره‌ی همه‌چیز

```bash
python3 tools/build-library.py            # prompts.html + style/*.html
python3 tools/build-sections.py           # documentaries / collections / gallery / channels
python3 tools/build-lesson-start.py       # قسمت ۱
python3 tools/build-lesson-prompting.py   # قسمت ۲
python3 tools/build-lesson-image-sound.py # قسمت ۳
python3 tools/build-lesson-systems.py     # قسمت ۴
node    tools/build-lesson-plate.mjs      # پلیت و کاور درس نور (npm i playwright)
python3 tools/normalise-share.py          # تگ‌های اشتراک‌گذاری را یکدست می‌کند
```

`build-lesson-plate.mjs` سه فایل می‌سازد و هر سه از یک ترکیب‌بندی واحد در
می‌آیند: `lessons/light-composition.jpg`، نسخه‌ی `webp` همان، و
`og-light.png` که عنوان درس رویش نوشته شده. برخلاف بقیه‌ی پلیت‌ها این یکی
با مدل تصویری ساخته نشده، با کد رسم شده — و کپشنِ زیرش در صفحه همین را
می‌گوید. اگر روزی خروجی یک مدل جایش را گرفت، آن کپشن هم باید عوض شود.

`normalise-share.py` را آخر از همه اجرا کن. کاری که می‌کند این است: هر صفحه‌ای
که تگ‌های کاورش ناقص باشد، از روی همان چیزی که خودش دارد کاملش می‌کند. دو بار
اجرا کردنش هیچ فرقی نمی‌کند، پس بی‌خطر است.

همه‌ی سازنده‌ها پوسته را با **نشانه** برش می‌زنند نه با شماره‌ی خط. اگر روزی
دوباره وسوسه شدی `src[25:30]` بنویسی: همین کار باعث شد سی‌ویک صفحه کاور اشتباه
تبلیغ کنند، چون سرِ پوسته بلندتر شد و برش، تگ‌های خودِ پوسته را برداشت.
