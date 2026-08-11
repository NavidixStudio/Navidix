# -*- coding: utf-8 -*-
"""Prints the 27 plate prompts, ready to paste into an image model.

A plate is not decoration invented next to the style — it is that style's own
`img` prompt with its own `subject` dropped into {SUBJECT}. So the picture over
a style genuinely is what the prompt on that page produces, and if the prompt
changes the plate is regenerated from the new wording rather than re-imagined.

Only one thing is added, the same for every style: SUFFIX. Image models like to
sign posters, and a poster carrying invented lettering would be reproducing
gibberish rather than the style.

    python3 tools/plate-prompts.py            # id <tab> prompt
    python3 tools/plate-prompts.py --json     # batch payload for an API
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from styles import STYLES

SUFFIX = '. No text, lettering, signature or watermark.'
MODEL  = 'seedream_v4_5'
# 3:2 is the closest offered ratio to the 8:5 the cards are cut to, so the
# import crop takes a sliver off the height and never invents pixels.
RATIO  = '3:2'


def prompt_for(s):
    return s['img'].replace('{SUBJECT}', s['subject']) + SUFFIX


def main():
    if '--json' in sys.argv:
        json.dump([{'index': i,
                    'params': {'model': MODEL, 'aspect_ratio': RATIO,
                               'quality': 'basic', 'prompt': prompt_for(s)}}
                   for i, s in enumerate(STYLES)],
                  sys.stdout, ensure_ascii=False, indent=1)
        print()
    else:
        for s in STYLES:
            print(f"{s['id']}\t{prompt_for(s)}")


if __name__ == '__main__':
    main()
