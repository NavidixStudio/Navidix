# -*- coding: utf-8 -*-
"""پیشنهاد منابع یوتیوب با جمینای — و تأیید هرکدام پیش از پذیرش.

    GEMINI_API_KEY=... python3 tools/curate.py            # درس‌های بی‌منبع
    GEMINI_API_KEY=... python3 tools/curate.py ai-start    # فقط همین درس‌ها

روی GitHub Actions اجرا می‌شود، نه اینجا: آنجا هم کلید هست و هم شبکه به
یوتیوب می‌رسد. خروجی‌اش یک Pull Request است، نه یک push — یعنی هیچ ویدیویی
بدون دیدن تو روی سایت نمی‌رود.


چرا این‌طور نوشته شده
---------------------
یک مدل زبانی وقتی از او «شناسه‌ی ویدیوی یوتیوب» بخواهی، شناسه می‌سازد. یازده
نویسه‌ی معتبر تولید می‌کند که یا به هیچ‌جا نمی‌رود یا — بدتر — به ویدیویی
می‌رود که هیچ ربطی به درس ندارد. این تنها شکست ممکن نیست، شکستِ محتمل است.

پس اینجا نقش جمینای فقط «پیشنهاد» است، و دو چیز جلویش را می‌گیرد:

  ۱. جست‌وجوی گوگل روشن است (google_search)، پس پاسخ از نتایج واقعی
     ساخته می‌شود نه از حافظه‌ی مدل.

  ۲. هر لینک پیش از پذیرش با oEmbed یوتیوب تأیید می‌شود. اگر ویدیو نباشد،
     خصوصی باشد یا حذف شده باشد، oEmbed خطا می‌دهد و آن پیشنهاد کنار
     گذاشته می‌شود.

و مهم‌تر: **عنوان و نام کانال از oEmbed برداشته می‌شود، نه از جمینای.** حتی
اگر مدل عنوان را اشتباه بگوید، چیزی که در سایت می‌نشیند همان است که یوتیوب
می‌گوید. تنها چیزی که از مدل می‌ماند، جمله‌ی «چرا این ویدیو» است — که
قضاوت است، نه واقعیتِ قابل‌جعل.
"""

import io
import json
import os
import re
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import curriculum          # noqa: E402  — مسیر یادگیری
import resources           # noqa: E402  — فهرست فعلی و ابزار یوتیوب

BASE = 'https://generativelanguage.googleapis.com/v1beta'

# اسم مدل حدس زده نمی‌شود. دو بار پشت سر هم همین حدس ۴۰۴ گرفت — یک بار
# gemini-1.5-flash در خبرساز قدیمی، یک بار gemini-2.5-flash اینجا — چون
# اینکه کدام مدل روی یک کلید مشخص فعال است چیزی نیست که بشود از حافظه
# دانست. حالا از خود API پرسیده می‌شود.
PREFER = ('gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash',
          'gemini-2.5-pro', 'gemini-pro-latest')


def models(key):
    d = json.loads(urllib.request.urlopen(BASE + '/models?key=' + key,
                                          timeout=30).read())
    return [m['name'].split('/')[-1] for m in d.get('models', [])
            if 'generateContent' in m.get('supportedGenerationMethods', [])]


def pick(key):
    have = models(key)
    if not have:
        raise RuntimeError('این کلید هیچ مدلی برای generateContent ندارد.')
    for want in PREFER:
        if want in have:
            return want, have
    for n in have:                      # هر flashی بهتر از هیچ
        if 'flash' in n:
            return n, have
    return have[0], have

PER_LESSON = 3          # چند پیشنهاد از مدل بخواهیم
KEEP = 3                # حداکثر چندتا نگه داریم


# ------------------------------------------------------------------- gemini

# نام ابزار جست‌وجو بین نسل‌های مدل فرق می‌کند، و کدام‌یک را قبول می‌کند
# چیزی نیست که از بیرون معلوم باشد. هر سه حالت امتحان می‌شود؛ آخری بدون
# جست‌وجوست، که ضعیف‌تر است ولی تأیید oEmbed همچنان جلوی شناسه‌ی ساختگی
# را می‌گیرد — پس بدترین حالتش «پیشنهاد کمتر» است، نه «پیشنهاد بی‌اعتبار».
TOOLSETS = [
    ('با جست‌وجوی زنده',        [{'google_search': {}}]),
    ('با جست‌وجوی نسل قبل',     [{'google_search_retrieval': {}}]),
    ('بدون جست‌وجو',            None),
]


def ask(key, model, prompt, note=None):
    last = None
    for label, tools in TOOLSETS:
        body = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': 0.3},
        }
        if tools:
            body['tools'] = tools
        req = urllib.request.Request(
            BASE + '/models/' + model + ':generateContent?key=' + key,
            data=json.dumps(body).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=120).read())
        except urllib.error.HTTPError as e:
            last = '%s → HTTP %s' % (label, e.code)
            continue
        if note and label != TOOLSETS[0][0]:
            note(label)
        parts = r['candidates'][0]['content']['parts']
        return ''.join(p.get('text', '') for p in parts)
    raise RuntimeError(last or 'پاسخی نگرفت')


def parse(text):
    """JSON را از هر چیزی که مدل دورش نوشته بیرون بکش."""
    m = re.search(r'\[.*\]', text, re.S)
    if not m:
        return []
    try:
        out = json.loads(m.group(0))
        return out if isinstance(out, list) else []
    except ValueError:
        return []


def prompt_for(lesson, stage):
    return f'''You are choosing free YouTube videos for ONE lesson of a
Persian-language course on applied AI for filmmakers and content creators.

LESSON: {lesson['t']}
STAGE:  {stage['fa']} ({stage['en']})
COVERS: {stage['blurb']}

Search YouTube and find {PER_LESSON} videos that teach EXACTLY this lesson —
not the general topic around it.

Hard requirements:
- The video must currently exist and be public on YouTube. Do not invent IDs.
- Structured teaching, not a rambling vlog or a product advert.
- Practical: the viewer should be able to do something the same evening.
- Prefer uploads from the last 18 months. AI moves fast and old tutorials mislead.
- At most ONE video per channel.
- English is fine — viewers turn on auto-translated Persian subtitles.

Return ONLY a JSON array, no prose around it:
[
  {{"url": "https://www.youtube.com/watch?v=REAL_ID",
    "level": "beginner" | "intermediate" | "advanced",
    "why": "ONE short sentence IN PERSIAN saying what this video gives the
            reader that the lesson text does not."}}
]

"level" means what the viewer needs in order to follow it, not how advanced
the topic is. "why" must be in Persian and must be specific — never "very
useful video".'''


# -------------------------------------------------------------------- verify

def verify(url):
    """ویدیو واقعاً هست؟ اگر بله، عنوان و کانالِ واقعی‌اش را برگردان."""
    try:
        v = resources.vid(url)
    except ValueError:
        return None, 'لینک یوتیوب نبود'
    try:
        meta = resources.fetch(v)
    except urllib.error.HTTPError as e:
        return None, 'یوتیوب %s داد — ویدیو نیست یا خصوصی است' % e.code
    except Exception as e:
        return None, str(e)
    if not meta.get('title'):
        return None, 'عنوانی برنگشت'
    return (v, meta), None


# --------------------------------------------------------------------- write

def literal(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def write(rows):
    """فهرست را بین نشانه‌های RESOURCES بازنویسی کن."""
    p = os.path.join(HERE, 'resources.py')
    src = io.open(p, encoding='utf-8').read()
    a = src.index('RESOURCES = [')
    b = src.index('# RESOURCES:end')

    body = ''
    for r in rows:
        body += ("    R(%s, %s, %s,\n      %s),\n"
                 % (literal(r['lesson']), literal(r['url']),
                    literal(r['level']), literal(r['why'])))

    new = src[:a] + 'RESOURCES = [\n' + body + ']\n' + src[b:]
    io.open(p, 'w', encoding='utf-8').write(new)


def existing():
    """آنچه از قبل هست، تا دوباره پیشنهاد نشود و پاک هم نشود."""
    out = []
    for r in resources.RESOURCES:
        out.append(dict(lesson=r['lesson'], url=r['url'],
                        level=r['level'], why=r['why']))
    return out


# ---------------------------------------------------------------------- main

def main():
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        print('GEMINI_API_KEY نیست.')
        return 1

    try:
        model, avail = pick(key)
    except Exception as e:
        print('فهرست مدل‌ها خوانده نشد: %s' % e)
        return 1
    print('مدل: %s   (در دسترس: %s)\n' % (model, ', '.join(avail[:8])))

    have = existing()
    seen = {resources.vid(r['url']) for r in have}
    covered = {r['lesson'] for r in have}

    want = sys.argv[1:]
    targets = []
    for st in curriculum.JOURNEY:
        for l in st['lessons']:
            if want and l['slug'] not in want:
                continue
            if not want and l['slug'] in covered:
                continue
            targets.append((l, st))

    if not targets:
        print('همه‌ی درس‌ها منبع دارند. کاری نیست.')
        return 0

    print('%d درس بررسی می‌شود.\n' % len(targets))
    added = []

    for l, st in targets:
        print('— %s' % l['t'])
        try:
            text = ask(key, model, prompt_for(l, st),
                       note=lambda lb: print('   (%s)' % lb))
        except Exception as e:
            print('   جمینای جواب نداد: %s' % e)
            continue

        cands = parse(text)
        if not cands:
            print('   پیشنهادی برنگشت.')
            continue

        kept, channels = 0, set()
        for c in cands:
            if kept >= KEEP:
                break
            url = (c.get('url') or '').strip()
            level = (c.get('level') or '').strip()
            why = (c.get('why') or '').strip()

            if level not in resources.LEVELS or not why:
                print('   رد — سطح یا توضیح ناقص: %s' % url[:60])
                continue

            ok, err = verify(url)
            if not ok:
                # اینجا همان جایی است که شناسه‌ی ساختگی می‌افتد بیرون
                print('   رد — %s: %s' % (err, url[:60]))
                continue

            v, meta = ok
            if v in seen:
                print('   رد — تکراری: %s' % meta['title'][:50])
                continue
            if meta['channel'] in channels:
                print('   رد — کانال تکراری: %s' % meta['channel'])
                continue

            seen.add(v)
            channels.add(meta['channel'])
            kept += 1
            added.append(dict(lesson=l['slug'],
                              url='https://www.youtube.com/watch?v=' + v,
                              level=level, why=why))
            print('   ✓ %s — %s' % (meta['title'][:55], meta['channel']))

        if not kept:
            print('   هیچ‌کدام تأیید نشد.')

    if not added:
        print('\nهیچ منبع تأییدشده‌ای اضافه نشد.')
        return 0

    write(have + added)
    print('\n%d منبع تازه اضافه شد. حالا tools/resources.py را بخوان و اگر '
          'جمله‌ی «چرا» را نپسندیدی، خودت بنویس.' % len(added))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
