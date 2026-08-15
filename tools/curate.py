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
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import curriculum          # noqa: E402  — مسیر یادگیری
import resources           # noqa: E402  — فهرست فعلی و ابزار یوتیوب

BASE = 'https://generativelanguage.googleapis.com'
VERSIONS = ('v1beta', 'v1')

# اسم مدل حدس زده نمی‌شود — سه بار پشت سر هم همین حدس ۴۰۴ گرفت. حالا از
# خودِ API پرسیده می‌شود و این فقط ترتیبِ ترجیح است بین آنچه واقعاً هست.
PREFER = ('gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash',
          'gemini-2.5-pro', 'gemini-pro-latest')

PER_LESSON = 3          # چند پیشنهاد از مدل بخواهیم
KEEP = 3                # حداکثر چندتا نگه داریم

# نام ابزار جست‌وجو بین نسل‌های مدل فرق می‌کند، و کدام‌یک را قبول می‌کند
# چیزی نیست که از بیرون معلوم باشد. هر سه حالت امتحان می‌شود؛ آخری بدون
# جست‌وجوست، که ضعیف‌تر است ولی تأیید oEmbed همچنان جلوی شناسه‌ی ساختگی
# را می‌گیرد — پس بدترین حالتش «پیشنهاد کمتر» است، نه «پیشنهاد بی‌اعتبار».
TOOLSETS = [
    ('با جست‌وجوی زنده',        [{'google_search': {}}]),
    ('با جست‌وجوی نسل قبل',     [{'google_search_retrieval': {}}]),
    ('بدون جست‌وجو',            None),
]


# ------------------------------------------------------------------- gemini

class ApiError(Exception):
    """خطای گوگل با حرفِ خودِ گوگل، نه فقط با کدش."""

    def __init__(self, code, msg, wait=0):
        Exception.__init__(self, 'HTTP %s — %s' % (code, msg))
        self.code = code
        self.msg = msg
        self.wait = wait


def once(url, payload=None):
    req = urllib.request.Request(url)
    if payload is not None:
        req.data = json.dumps(payload).encode()
        req.add_header('Content-Type', 'application/json')
    try:
        return json.loads(urllib.request.urlopen(req, timeout=120).read())
    except urllib.error.HTTPError as e:
        # همین چند خط بود که جا افتاده بود. یک ۴۰۴ خالی هیچ نمی‌گوید؛ متنِ
        # پاسخ دقیقاً می‌گوید مدل نیست، نسخه فرق دارد، یا ابزار پشتیبانی
        # نمی‌شود — و بدون آن آدم فقط اسم مدل حدس می‌زند.
        err = {}
        try:
            err = json.loads(e.read()).get('error', {})
        except Exception:
            pass
        wait = 0
        for d in err.get('details', []):
            m = re.match(r'(\d+)s$', str(d.get('retryDelay', '')))
            if m:
                wait = min(int(m.group(1)), 30)
        raise ApiError(e.code,
                       (err.get('message') or 'بدون توضیح').strip()[:300],
                       wait)


# ۴۲۹ یعنی «الان نه»، نه «هرگز». ۵۰۳ هم خودش می‌گوید موقتی است. اگر این دو
# را مثل بقیه‌ی خطاها شکستِ نهایی حساب کنیم، سراغ مدل بعدی می‌رویم و در
# عمل مدلی را کنار می‌گذاریم که هیچ ایرادی نداشت.
AGAIN = (429, 503)


def http(url, payload=None, tries=3):
    for n in range(tries):
        try:
            return once(url, payload)
        except ApiError as e:
            if e.code not in AGAIN or n == tries - 1:
                raise
            time.sleep(e.wait or 5 * (n + 1))


def catalog(key, version):
    d = http('%s/%s/models?pageSize=200&key=%s' % (BASE, version, key))
    return [m['name'].split('/')[-1] for m in d.get('models', [])
            if 'generateContent' in m.get('supportedGenerationMethods', [])]


# generateContent را پشتیبانی می‌کنند ولی خروجی‌شان متن نیست، پس اینجا به
# درد نمی‌خورند. gemini-2.5-flash-preview-tts در همان فهرست بود و یک جای
# آزمایش را گرفت تا بگوید فقط AUDIO می‌دهد.
NOT_TEXT = ('tts', 'image', 'embedding', 'video-understanding', 'vision')


def ordered(have):
    have = [n for n in have if not any(x in n for x in NOT_TEXT)]
    out = [n for n in PREFER if n in have]
    out += [n for n in have if 'flash' in n and n not in out]
    out += [n for n in have if n not in out]
    return out


class NoModel(RuntimeError):
    """هیچ مدلی جواب نداد — و اینکه «چرا» فرق می‌کند.

    اگر دلیلش سهمیه باشد، ابزار سالم است و فقط باید بعداً دوباره زد. آن را
    مثل خرابی قرمز کردن، آدم را دنبال اشکالی می‌فرستد که وجود ندارد.
    """

    def __init__(self, text, quota):
        RuntimeError.__init__(self, text)
        self.quota = quota


def verdict(tried):
    """یک جمله‌ی فارسی به‌جای بیست خط خطای تکراری."""
    codes = {}
    for _, _, e in tried:
        codes[e.code] = codes.get(e.code, 0) + 1

    lines = ['هیچ مدلی جواب نداد.', '']
    for m, e in sorted({m: e for m, _, e in tried}.items()):
        lines.append('  %-26s %s' % (m, e))
    lines.append('')

    if codes.get(429):
        lines.append('سهمیه‌ی کلید تمام شده (خطای ۴۲۹). این ایرادِ کد نیست.')
        lines.append('یا چند ساعت بعد دوباره اجرا کن، یا در Google AI Studio')
        lines.append('برای همین پروژه صورت‌حساب را فعال کن.')
    elif codes.get(404):
        lines.append('گوگل این مدل‌ها را روی کلیدهای تازه بسته است. یعنی در')
        lines.append('فهرست هستند ولی صدا زدنشان ۴۰۴ می‌دهد — پس PREFER در')
        lines.append('tools/curate.py باید با نسل تازه‌تر به‌روز شود.')
    return '\n'.join(lines)


def probe(key):
    """با یک پیام دو حرفی بفهم کدام ترکیب جواب می‌دهد، بعد سراغ درس‌ها برو.

    قبلاً هر درس هر سه حالت را امتحان می‌کرد، پس یک اشکالِ واحد ۳۹ بار
    تکرار می‌شد و لاگ پر از یک خطای یکسان بود.
    """
    tried = []
    for version in VERSIONS:
        try:
            have = catalog(key, version)
        except ApiError as e:
            tried.append((version + '/فهرست', None, e))
            continue
        if not have:
            continue
        print('%s: %s' % (version, '، '.join(have[:10])))
        for model in ordered(have)[:5]:
            for label, tools in TOOLSETS:
                body = {'contents': [{'parts': [{'text': 'ping'}]}]}
                if tools:
                    body['tools'] = tools
                try:
                    http('%s/%s/models/%s:generateContent?key=%s'
                         % (BASE, version, model, key), body, tries=2)
                except ApiError as e:
                    tried.append(('%s/%s' % (version, model), label, e))
                    # ابزارِ دیگر روی مدلی که اصلاً وجود ندارد همان جواب را
                    # می‌دهد؛ سه بار پرسیدنش فقط لاگ را سه برابر می‌کند.
                    if e.code in (404, 429):
                        break
                    continue
                return dict(version=version, model=model,
                            tools=tools, label=label)
    raise NoModel(verdict(tried),
                  quota=any(e.code == 429 for _, _, e in tried))


def ask(key, combo, prompt):
    body = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.3},
    }
    if combo['tools']:
        body['tools'] = combo['tools']
    r = http('%s/%s/models/%s:generateContent?key=%s'
             % (BASE, combo['version'], combo['model'], key), body)
    cand = (r.get('candidates') or [{}])[0]
    parts = cand.get('content', {}).get('parts', [])
    if not parts:
        raise RuntimeError('پاسخ خالی بود (%s)'
                           % cand.get('finishReason', 'بی‌دلیل'))
    return ''.join(p.get('text', '') for p in parts)


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
    # وگرنه روی Actions همه‌ی خط‌ها ته کار با یک زمان چاپ می‌شوند و معلوم
    # نیست کدام درس چقدر طول کشیده.
    sys.stdout.reconfigure(line_buffering=True)

    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        print('GEMINI_API_KEY نیست.')
        return 1

    try:
        combo = probe(key)
    except NoModel as e:
        print(e)
        if e.quota:
            # سبز با هشدار، نه قرمز: کد کاری نکرده که خراب باشد. متن بالا
            # صریح می‌گوید هیچ منبعی اضافه نشد، پس با موفقیت اشتباه نمی‌شود.
            print('::warning::سهمیه‌ی جمینای تمام است. هیچ منبعی اضافه نشد — '
                  'بعداً دوباره اجرا کن.')
            return 0
        return 1
    except Exception as e:
        print(e)
        return 1
    print('\nمدل: %s   نسخه: %s   %s\n'
          % (combo['model'], combo['version'], combo['label']))

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
            text = ask(key, combo, prompt_for(l, st))
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
