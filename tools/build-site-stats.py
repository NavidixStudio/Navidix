# -*- coding: utf-8 -*-
"""Counts what is already published on the site and writes it beside the
panel's own numbers.

The dashboard reads admin_cms_overview(), which counts rows in the CMS
tables. Those tables started empty, so the panel opened on a wall of
zeros — while the site itself was already serving two hundred prompts,
fifty-six gallery shots, seven films and fourteen lessons. A zero is a
claim about the world, and that one was false.

The counts are taken from the built pages rather than from the builders'
own Python literals. The pages are what a visitor actually receives, so
counting them cannot drift from what is on the site the way a second copy
of the data would. Run this after any tools/build-*.py.

    python3 tools/build-site-stats.py
"""

import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(name):
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        return ''
    return io.open(path, encoding='utf-8').read()


def count(name, pattern):
    return len(re.findall(pattern, read(name)))


# هر شمارش از روی نشانه‌ی تکرارشونده‌ی همان صفحه گرفته می‌شود، نه از روی
# داده‌ی سازنده — چون صفحه همان چیزی است که بازدیدکننده می‌گیرد.
STATS = {
    # هر کارت پرامپت در کتابخانه یک .pc است
    'prompts': count('prompts.html', r'class="pc"'),
    # هر عکس گالری یک .gs__shot است (نه هر مجموعه)
    'gallery': count('gallery.html', r'class="gs__shot"'),
    # مستندها و مجموعه‌ها هر دو کارت ویدیو دارند
    'videos': (count('documentaries.html', r'class="vcard[ "]') +
               count('collections.html',   r'class="vcard[ "]')),
    # هر بخش صفحه‌ی آموزش یک دوره است و هر کارت داخلش یک درس
    'courses': count('training.html', r'<section class="grp"'),
    'lessons': count('training.html', r'<span class="no">'),
}

# مقاله‌های مخزن از همان فایلی خوانده می‌شوند که خود سایت می‌خواند
try:
    STATS['articles'] = len(json.loads(read('content/articles.json')) or [])
except ValueError:
    STATS['articles'] = 0

out = os.path.join(ROOT, 'content', 'site-stats.json')
io.open(out, 'w', encoding='utf-8').write(
    json.dumps(STATS, ensure_ascii=False, indent=2, sort_keys=True) + '\n')

for k in sorted(STATS):
    print('%-10s %d' % (k, STATS[k]))
print('\nwrote ' + os.path.relpath(out, ROOT))
