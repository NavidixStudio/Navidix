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
node    tools/style-plates.mjs     # prompts/<id>.jpg   (npm i playwright)
```

بعدش صفحه‌ی تازه را دستی به `sitemap.xml` اضافه کن — همان الگوی
`style/<id>.html` با `priority` برابر `0.7`.

## درباره‌ی تصویرها

تصویر بالای هر سبک، نمونه‌ی خروجی پرامپت نیست و نباید وانمود کند که هست: یک
لوح انتزاعی است که همان پالت، همان جهت نور و همان جنس قلم را نشان می‌دهد.
با کد ساخته می‌شود، پس نه حق‌کپی دارد و نه به شبکه وابسته است.

## ساختن دوباره‌ی همه‌چیز

```bash
python3 tools/build-library.py            # prompts.html + style/*.html
python3 tools/build-sections.py           # documentaries / collections / gallery / channels
python3 tools/build-lesson-start.py       # قسمت ۱
python3 tools/build-lesson-prompting.py   # قسمت ۲
python3 tools/build-lesson-image-sound.py # قسمت ۳
python3 tools/build-lesson-systems.py     # قسمت ۴
python3 tools/normalise-share.py          # تگ‌های اشتراک‌گذاری را یکدست می‌کند
```

`normalise-share.py` را آخر از همه اجرا کن. کاری که می‌کند این است: هر صفحه‌ای
که تگ‌های کاورش ناقص باشد، از روی همان چیزی که خودش دارد کاملش می‌کند. دو بار
اجرا کردنش هیچ فرقی نمی‌کند، پس بی‌خطر است.

همه‌ی سازنده‌ها پوسته را با **نشانه** برش می‌زنند نه با شماره‌ی خط. اگر روزی
دوباره وسوسه شدی `src[25:30]` بنویسی: همین کار باعث شد سی‌ویک صفحه کاور اشتباه
تبلیغ کنند، چون سرِ پوسته بلندتر شد و برش، تگ‌های خودِ پوسته را برداشت.
