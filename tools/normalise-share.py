# -*- coding: utf-8 -*-
"""Gives every page the same complete set of share tags.

Every page already had an og:image pointing at a real, correct cover — the
covers were never the problem. What differed was the paperwork around them:
some pages declared the image's type and alt text, some did not, and no page
carried twitter:title or twitter:description, which means clients that read
the Twitter card rather than Open Graph fell back to guessing from the page.

This reads what each page already declares and fills in only what is missing,
derived from the tags that are there. It never invents a title, a description
or an image — if a page has none, it is left alone and reported.

Idempotent: running it twice changes nothing.
"""

import glob
import re

PAGES = [f for f in sorted(glob.glob('/home/user/Navidix/*.html') +
                           glob.glob('/home/user/Navidix/style/*.html'))
         if 'google' not in f]


def get(html, kind, name):
    m = re.search(r'<meta %s="%s" content="([^"]*)"' % (kind, re.escape(name)), html)
    return m.group(1) if m else None


def after(html, anchor_re, line):
    """Insert `line` on its own line directly after the first match."""
    m = re.search(anchor_re, html)
    if not m:
        return html
    end = html.index('\n', m.end()) + 1
    return html[:end] + line + '\n' + html[end:]


changed, skipped = [], []

for path in PAGES:
    html = open(path, encoding='utf-8').read()
    orig = html

    title = get(html, 'property', 'og:title')
    desc  = get(html, 'property', 'og:description')
    img   = get(html, 'property', 'og:image')
    if not (title and desc and img):
        skipped.append((path.split('/')[-1], 'no og:title/description/image'))
        continue

    # og:image:alt falls back to the title, which is what the image says anyway
    alt = get(html, 'property', 'og:image:alt') or title

    def q(s):
        return s.replace('"', '&quot;')

    # --- Open Graph: the image's own paperwork, next to the image ---
    if not get(html, 'property', 'og:image:secure_url'):
        html = after(html, r'<meta property="og:image" content="',
                     '<meta property="og:image:secure_url" content="%s" />' % q(img))
    if not get(html, 'property', 'og:image:type'):
        html = after(html, r'<meta property="og:image:secure_url" content="',
                     '<meta property="og:image:type" content="image/png" />')
    if not get(html, 'property', 'og:image:alt'):
        anchor = r'<meta property="og:image:height" content="'
        if not re.search(anchor, html):
            anchor = r'<meta property="og:image:type" content="'
        html = after(html, anchor, '<meta property="og:image:alt" content="%s" />' % q(alt))

    # --- Twitter: a card with no title falls back to guessing from the page ---
    if not get(html, 'name', 'twitter:title'):
        html = after(html, r'<meta name="twitter:card" content="',
                     '<meta name="twitter:title" content="%s" />' % q(title))
    if not get(html, 'name', 'twitter:description'):
        html = after(html, r'<meta name="twitter:title" content="',
                     '<meta name="twitter:description" content="%s" />' % q(desc))
    if not get(html, 'name', 'twitter:image:alt'):
        html = after(html, r'<meta name="twitter:image" content="',
                     '<meta name="twitter:image:alt" content="%s" />' % q(alt))

    if html != orig:
        open(path, 'w', encoding='utf-8').write(html)
        changed.append(path.split('/')[-1])

print('%d pages completed' % len(changed))
for name, why in skipped:
    print('  skipped %s — %s' % (name, why))
