# -*- coding: utf-8 -*-
"""Takes the site off Google Fonts and off cdnjs.

Almost everyone reading this site is in Iran, and both of those hosts are
unreliable there. What that cost, measured:

  · The font link is a render-blocking stylesheet on all 43 pages. When the
    host hangs rather than failing, nothing paints until the browser gives up.
    That is the "site takes a while to come up" everyone was describing.

  · three.js and gsap on the homepage are worse than slow. The boot curtain is
    a fixed black layer removed by the opening timeline, and that timeline is
    gsap driving three. If either script never arrives, the timeline never
    runs, the curtain never lifts, and the homepage is a black screen for
    good. Blocking cdnjs in a browser reproduces it exactly: curtain up, zero
    panels, no text.

Both are now served from the site's own origin, so a reader who can reach the
site can read it. One variable Vazirmatn covers every weight the site asks
for, which is smaller than the six static files it replaces.

Idempotent.
"""

import glob
import re

FACES = '''<style>
/* Served from this origin. Google Fonts is unreliable for most of this
   site's readers, and a render-blocking stylesheet on a host that hangs
   means nothing paints at all. One variable file per family covers every
   weight used here. swap, so text is readable before the file lands. */
@font-face{font-family:'Vazirmatn';src:url('/assets/vazirmatn-var.woff2')format('woff2');
  font-weight:100 900;font-display:swap;font-style:normal}
@font-face{font-family:'Sora';src:url('/assets/sora-var.woff2')format('woff2');
  font-weight:100 800;font-display:swap;font-style:normal}
@font-face{font-family:'Inter';src:url('/assets/inter-var.woff2')format('woff2');
  font-weight:100 900;font-display:swap;font-style:normal}
</style>'''

GOOGLE = re.compile(
    r'[ \t]*<link rel="preconnect" href="https://fonts\.googleapis\.com">\n'
    r'[ \t]*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n'
    r'[ \t]*<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">\n')

CDNJS = re.compile(
    r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/three\.js/r128/three\.min\.js"></script>\n'
    r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/gsap/3\.12\.5/gsap\.min\.js"></script>')

LOCAL_LIBS = ('<script src="assets/three.min.js"></script>\n'
              '<script src="assets/gsap.min.js"></script>')

fonts, libs, missed = [], [], []

for path in sorted(glob.glob('/home/user/Navidix/*.html') +
                   glob.glob('/home/user/Navidix/style/*.html')):
    if 'google' in path.rsplit('/', 1)[-1]:
        continue
    html = open(path, encoding='utf-8').read()
    orig = html
    name = path.split('/Navidix/')[-1]

    html, n = GOOGLE.subn(FACES + '\n', html)
    if n:
        fonts.append(name)
    elif 'fonts.googleapis.com/css2' in html:
        missed.append(name)

    html, n = CDNJS.subn(LOCAL_LIBS, html)
    if n:
        libs.append(name)

    if html != orig:
        open(path, 'w', encoding='utf-8').write(html)

print('fonts localised on %d pages' % len(fonts))
print('libraries localised on %d pages: %s' % (len(libs), ', '.join(libs) or '—'))
if missed:
    print('!! still linking Google Fonts, pattern did not match: %s' % ', '.join(missed))
