# -*- coding: utf-8 -*-
"""Turns generated art into the plates the cards actually load.

Source images come in at whatever the model produced — a 3:2 PNG a couple of
thousand pixels wide. The cards want 800×500 JPEG at a weight that will not
stall a phone, so this crops to 8:5 about the centre, resizes once, and writes
prompts/<id>.jpg.

Two ways to feed it, because the network policy decides which one you get:

    python3 tools/plates-import.py --from-dir ~/Downloads/plates
    python3 tools/plates-import.py --fetch

--from-dir takes files named after the style id (studio.png, oil.jpg, …) and
touches nothing else. --fetch reads plates.local.json, which is untracked on
purpose: a result URL carries the account id in its path, and this repo is a
public site. It also only works where the CDN is reachable; where it is not the
proxy answers 403 and this says so rather than half-finishing.

A full import flips PLATES_ARE_SAMPLES in styles.py, because at that moment the
caption under every plate stops being true. Run build-library.py afterwards to
put the corrected caption on the pages.
"""
import argparse, io, json, os, re, sys, urllib.request

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, 'prompts')
W, H = 800, 500
QUALITY = 82


def load_manifest():
    with open(os.path.join(HERE, 'plates.json'), encoding='utf-8') as f:
        return json.load(f)


def load_urls():
    """id → result URL, from the untracked sidecar. Absent is a normal state:
    it means nobody has generated into this checkout yet."""
    path = os.path.join(HERE, 'plates.local.json')
    if not os.path.exists(path):
        sys.exit('tools/plates.local.json not found — it holds the result URLs '
                 'and is untracked. Generate the plates first, or use --from-dir.')
    with open(path, encoding='utf-8') as f:
        return json.load(f)['plates']


def source_bytes(plate, from_dir, urls):
    """The raw image for one style, from disk or from its recorded URL."""
    if from_dir:
        for ext in ('png', 'jpg', 'jpeg', 'webp'):
            path = os.path.join(from_dir, f"{plate['id']}.{ext}")
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    return f.read()
        return None
    url = urls.get(plate['id'])
    if not url:
        return None
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def to_plate(raw):
    """Centre-crop to 8:5 and resize once, so nothing is ever upscaled twice."""
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size
    want = W / H
    if w / h > want:                      # too wide: trim the sides
        new_w = round(h * want)
        left = (w - new_w) // 2
        im = im.crop((left, 0, left + new_w, h))
    else:                                 # too tall: trim top and bottom
        new_h = round(w / want)
        top = (h - new_h) // 2
        im = im.crop((0, top, w, top + new_h))
    return im.resize((W, H), Image.LANCZOS)


def mark_plates_real():
    """The caption under a plate claims it is not a sample. Once it is one,
    that sentence is a lie, so the flag it hangs on moves with the images."""
    path = os.path.join(HERE, 'styles.py')
    src = open(path, encoding='utf-8').read()
    out = re.sub(r'^PLATES_ARE_SAMPLES = False$', 'PLATES_ARE_SAMPLES = True',
                 src, count=1, flags=re.M)
    if out != src:
        open(path, 'w', encoding='utf-8').write(out)
        print('styles.py: PLATES_ARE_SAMPLES → True')


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--from-dir', help='directory of files named <style-id>.png')
    g.add_argument('--fetch', action='store_true',
                   help='download the URLs in the untracked plates.local.json')
    args = ap.parse_args()

    man = load_manifest()
    urls = {} if args.from_dir else load_urls()
    os.makedirs(OUT, exist_ok=True)
    done, missing = [], []

    for plate in man['plates']:
        try:
            raw = source_bytes(plate, args.from_dir, urls)
        except Exception as e:                      # noqa: BLE001 — reported below
            missing.append(f"{plate['id']}: {e}")
            continue
        if not raw:
            where = (f"no file named {plate['id']}.* in the folder"
                     if args.from_dir else 'no URL in plates.local.json')
            missing.append(f"{plate['id']}: {where}")
            continue
        path = os.path.join(OUT, f"{plate['id']}.jpg")
        to_plate(raw).save(path, 'JPEG', quality=QUALITY, optimize=True,
                           progressive=True)
        done.append(plate['id'])
        print(f"  {plate['id']:<14} {os.path.getsize(path) // 1024:>4} KB")

    print(f"\n{len(done)}/{len(man['plates'])} plates written to prompts/")
    if missing:
        print('\nnot imported:')
        for m in missing:
            print('  ' + m)
        print('\nNothing was flipped — fix these and run again.')
        return 1
    mark_plates_real()
    print('Now run: python3 tools/build-library.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
