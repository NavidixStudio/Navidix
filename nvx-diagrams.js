/* =====================================================================
   NAVIDIX — lesson diagrams.

   Three figures, one mechanism. A figure declares its type and carries a
   row of buttons; each button carries the key of a state and the sentence
   that describes it. This file owns the geometry and nothing else — every
   word a reader sees lives in the page, where the person writing the
   lesson can edit it without opening a script.

       <figure class="nvx-dg" data-nvx-dg="angle" data-start="eye">
         <div class="nvx-dg__ctrls">
           <button type="button" data-k="high" data-say="…">…</button>
         </div>
         <p class="nvx-dg__read"></p>
       </figure>

   The stage is inserted at the top of the figure on load, so a reader
   without JS gets the buttons and the lesson text and misses only the
   drawing — never a hole where content should be.

   Why svg and not a canvas or a library: these are line drawings of six
   camera positions and seven crops. They are a few hundred bytes of path
   data, they scale to any screen without a redraw, they inherit the
   page's colours, and they animate on the compositor because the only
   thing that ever changes is a transform on a group.
   ===================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function e(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  /* CSS transforms on svg elements need a box to resolve against, and the
     origin has to be stated or each browser picks its own. Every moving
     group in here goes through this. */
  function pivot(node, x, y) {
    node.style.transformBox = 'view-box';
    node.style.transformOrigin = x + 'px ' + y + 'px';
    return node;
  }

  function stage(fig, vb) {
    var s = e('svg', {
      class: 'nvx-dg__stage', viewBox: vb,
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true', focusable: 'false'
    });
    fig.insertBefore(s, fig.firstChild);
    return s;
  }

  /* A standing figure, drawn once and reused at three sizes. The ratios
     are roughly the eight-heads-tall rule an art class would teach: the
     first pass made the head a seventh of the body's height and wider
     than the shoulders, which read as a blob rather than a person and
     left the close-up crops framing nothing recognisable. */
  function person(cx, feet, h) {
    var top = feet - h;
    return e('g', null, [
      e('circle', { class: 'subject-head', cx: cx, cy: top + h * 0.075, r: h * 0.065 }),
      e('rect', {
        class: 'subject', x: cx - h * 0.085, y: top + h * 0.15,
        width: h * 0.17, height: h * 0.36, rx: h * 0.055
      }),
      e('path', {
        class: 'limb', d:
          'M' + (cx - h * 0.042) + ' ' + (top + h * 0.5) +
          'L' + (cx - h * 0.052) + ' ' + feet +
          'M' + (cx + h * 0.042) + ' ' + (top + h * 0.5) +
          'L' + (cx + h * 0.052) + ' ' + feet,
        'stroke-width': h * 0.035
      })
    ]);
  }

  /* =================================================================
     1 — the vertical axis

     Left: the set, seen from the side. The camera sits on a rig at eye
     level and the whole rig orbits the subject, so the camera travels
     the arc it would really travel and keeps pointing at what it is
     filming without anyone having to aim it.

     Right: the frame that camera produces. It is the half that answers
     the question the lesson is actually asking — not where the camera
     is, but what the shot then says.
     ================================================================= */
  var ANGLE = {                   /* degrees above the horizontal */
    bird:  84, high:  42, eye: 0, low: -38, worm: -66, dutch: 0
  };
  /* frame: [subject scale, subject shift, horizon shift, roll] */
  var FRAME = {
    bird:  [0.52,  16,  62, 0],
    high:  [0.78,   9,  27, 0],
    eye:   [1.00,   0,   0, 0],
    low:   [1.32, -11, -27, 0],
    worm:  [1.70, -24, -46, 0],
    dutch: [1.00,   0,   0, 13]
  };

  function buildAngle(fig) {
    /* the box is cropped to the drawing rather than started at the
       origin: an untrimmed viewBox left a third of the stage empty and
       made the figure taller than the section it belongs to */
    var s = stage(fig, '112 16 428 250');
    var SX = 175, SY = 150;                        /* subject centre */
    var id = 'nvxdg' + (++uid);

    s.appendChild(e('path', { class: 'arc', d: arc(SX, SY, 105, 92, -74) }));
    s.appendChild(e('line', { class: 'ground', x1: 120, y1: 213, x2: 230, y2: 213 }));
    s.appendChild(e('line', { class: 'axis', x1: SX, y1: 30, x2: SX, y2: 213 }));
    s.appendChild(person(SX, 208, 100));

    /* the rig, parked at eye level; the orbit above it does the moving */
    var rig = e('g', { transform: 'translate(' + (SX + 105) + ',' + SY + ')' }, [
      e('path', { class: 'cone', d: 'M0 0 L-105 -30 L-105 30 Z' }),
      e('rect', { class: 'cam-body', x: -2, y: -11, width: 26, height: 22, rx: 3 }),
      e('path', { class: 'cam', d: 'M-2 -6 L-13 -11 L-13 11 L-2 6 Z' })
    ]);
    var orbit = pivot(e('g', { 'data-move': '' }, [rig]), SX, SY);
    s.appendChild(orbit);

    /* the resulting frame */
    var FX = 350, FY = 96, FW = 190, FH = 107;
    s.appendChild(e('clipPath', { id: id },
      [e('rect', { x: FX, y: FY, width: FW, height: FH })]));
    s.appendChild(e('rect', {
      x: FX, y: FY, width: FW, height: FH, rx: 3,
      fill: '#06080B', stroke: '#262A31'
    }));

    var horizon = e('line', {
      class: 'axis', x1: FX, y1: FY + FH * 0.52, x2: FX + FW, y2: FY + FH * 0.52,
      'data-move': ''
    });
    var who = e('g', { 'data-move': '' }, [person(FX + FW / 2, FY + FH * 0.88, FH * 0.72)]);
    pivot(who, FX + FW / 2, FY + FH / 2);
    pivot(horizon, FX + FW / 2, FY + FH / 2);

    var inner = e('g', { 'clip-path': 'url(#' + id + ')', 'data-move': '' }, [horizon, who]);
    pivot(inner, FX + FW / 2, FY + FH / 2);
    s.appendChild(inner);
    s.appendChild(e('text', { x: FX, y: FY - 10 }, [txt('THE FRAME')]));
    s.appendChild(e('text', { x: 120, y: 34 }, [txt('SET / SIDE VIEW')]));

    return {
      set: function (k) {
        var a = ANGLE[k] || 0, f = FRAME[k] || FRAME.eye;
        orbit.style.transform = 'rotate(' + (-a) + 'deg)';
        who.style.transform = 'translate(0px,' + f[1] + 'px) scale(' + f[0] + ')';
        horizon.style.transform = 'translate(0px,' + f[2] + 'px)';
        inner.style.transform = 'rotate(' + f[3] + 'deg)';
      }
    };
  }

  function txt(t) { return document.createTextNode(t); }

  function arc(cx, cy, r, a1, a2) {
    var p = function (a) {
      var rad = a * Math.PI / 180;
      return (cx + r * Math.cos(rad)).toFixed(1) + ' ' + (cy - r * Math.sin(rad)).toFixed(1);
    };
    return 'M' + p(a1) + 'A' + r + ' ' + r + ' 0 0 1 ' + p(a2);
  }

  /* =================================================================
     2 — shot size

     One figure, drawn once, at a fixed size. Nothing about the subject
     changes between the seven sizes — only how much of the world is
     left in the frame, which is the entire point the section is making
     and the thing a row of seven example photographs would obscure.
     ================================================================= */
  /* Measured off the figure below, not guessed: with feet at 250 and a
     height of 214 the head sits at 38–66, the waist at 145 and the knees
     at 198, so each crop is named for the body part it actually cuts at. */
  var CROP = {
    els: [24, 12, 512, 256], ls:  [79, 24, 402, 226], mls: [134, 32, 292, 164],
    ms:  [182, 30, 196, 110], mcu: [214, 32, 132, 74], cu:  [230, 32, 96, 54],
    ecu: [253, 36, 42, 24]
  };

  function buildShot(fig) {
    var s = stage(fig, '0 0 560 280');
    var id = 'nvxdg' + (++uid);

    /* the world the subject is standing in, so a wide crop has something
       to be wide about */
    s.appendChild(e('g', { class: 'grid' }, [
      e('line', { x1: 0, y1: 250, x2: 560, y2: 250 }),
      e('line', { x1: 0, y1: 210, x2: 560, y2: 210 }),
      e('line', { x1: 92, y1: 90, x2: 92, y2: 250 }),
      e('line', { x1: 468, y1: 90, x2: 468, y2: 250 })
    ]));
    s.appendChild(e('rect', { class: 'prop', x: 96, y: 148, width: 54, height: 102, rx: 2 }));
    s.appendChild(e('rect', { class: 'prop', x: 414, y: 174, width: 46, height: 76, rx: 2 }));
    s.appendChild(person(280, 250, 214));
    /* the eye an extreme close-up is actually about */
    s.appendChild(e('circle', { cx: 274, cy: 48, r: 3, fill: '#E5202A' }));

    var mask = e('mask', { id: id }, [
      e('rect', { x: 0, y: 0, width: 560, height: 280, fill: '#fff' }),
      e('rect', { class: 'crop-hole', x: 24, y: 12, width: 512, height: 256 })
    ]);
    s.appendChild(mask);
    var hole = mask.lastChild;
    s.appendChild(e('rect', {
      x: 0, y: 0, width: 560, height: 280,
      fill: 'rgba(4,6,9,.88)', mask: 'url(#' + id + ')'
    }));
    var box = e('rect', { class: 'crop', x: 24, y: 12, width: 512, height: 256 });
    s.appendChild(box);
    s.appendChild(e('text', { x: 16, y: 274 }, [txt('SUBJECT FIXED / FRAME MOVES')]));

    return {
      set: function (k) {
        var c = CROP[k] || CROP.els;
        [hole, box].forEach(function (r) {
          r.setAttribute('x', c[0]); r.setAttribute('y', c[1]);
          r.setAttribute('width', c[2]); r.setAttribute('height', c[3]);
        });
      }
    };
  }

  /* =================================================================
     3 — movement

     A move is a thing that happens over time; a still picture of one is
     an arrow, and an arrow is what every book on this already has. So
     this figure runs — but only the move currently selected, and only
     once a reader has selected it. The animation itself is in the
     stylesheet, keyed off data-run, which is also what makes it free to
     switch off under reduced motion.
     ================================================================= */
  var ORIGIN = {                /* what the selected move pivots around */
    pan: 'cam', handheld: 'cam', arc: 'subject', dolly: 'cam', truck: 'cam'
  };

  /* Seen from above, not from the side. Four of these five moves are
     horizontal — a pan sweeps sideways, a truck steps sideways, an arc
     goes round — and a side view can show none of them. Tilt is the one
     move a plan cannot draw, and it is the one move the angle figure
     further up this page already draws better than a plan could. */
  function buildMove(fig) {
    var s = stage(fig, '0 0 560 300');
    var SX = 250, SY = 150, R = 140, CX = SX + R, CY = SY;

    s.appendChild(e('g', { class: 'grid' }, [
      e('line', { x1: 0, y1: SY, x2: 560, y2: SY }),
      e('line', { x1: SX, y1: 0, x2: SX, y2: 300 })
    ]));
    s.appendChild(e('circle', { class: 'arc', cx: SX, cy: SY, r: R, fill: 'none' }));

    /* a person from overhead is a head and the way they are facing */
    s.appendChild(e('circle', { class: 'subject-head', cx: SX, cy: SY, r: 17 }));
    s.appendChild(e('path', { class: 'subject', d: 'M' + (SX + 15) + ' ' + (SY - 9) +
      'L' + (SX + 29) + ' ' + SY + 'L' + (SX + 15) + ' ' + (SY + 9) + 'Z' }));

    var rig = e('g', { transform: 'translate(' + CX + ',' + CY + ')' }, [
      e('path', { class: 'cone', d: 'M0 0 L-116 -42 L-116 42 Z' }),
      e('rect', { class: 'cam-body', x: -3, y: -13, width: 30, height: 26, rx: 3 }),
      e('path', { class: 'cam', d: 'M-3 -7 L-16 -13 L-16 13 L-3 7 Z' })
    ]);
    var runner = e('g', { class: 'runner', 'data-move': '' }, [rig]);
    s.appendChild(runner);
    s.appendChild(e('text', { x: 16, y: 22 }, [txt('SET / PLAN VIEW')]));

    return {
      set: function (k) {
        var o = ORIGIN[k] === 'subject' ? [SX, SY] : [CX, CY];
        pivot(runner, o[0], o[1]);
        /* the stylesheet keys every loop off this one attribute, so the
           previous move stops the instant the next one is chosen */
        fig.setAttribute('data-run', k);
      }
    };
  }

  /* =================================================================
     the lit subject

     Everything the light lesson has to say, it has to say about a face:
     direction is only visible as the edge between lit and unlit skin, and
     ratio is only visible as how dark the unlit side is allowed to get.
     So one head-and-shoulders is drawn here and two figures share it.

     Built fresh on every call rather than cloned, because the shadow is
     clipped to the same silhouette and a node cannot be in two places at
     once.
     ================================================================= */
  function bust(cx, base, r, features) {
    var hy = base - r * 3.15;                       /* eye line */
    var parts = [
      e('rect', { class: 'subject', x: cx - .42 * r, y: hy + .7 * r, width: .84 * r, height: r }),
      e('path', {
        class: 'subject', d:
          'M' + (cx - 2.45 * r) + ' ' + base +
          'C' + (cx - 2.3 * r) + ' ' + (hy + 2.0 * r) + ',' + (cx - 1.05 * r) + ' ' + (hy + 1.5 * r) + ',' + cx + ' ' + (hy + 1.5 * r) +
          'C' + (cx + 1.05 * r) + ' ' + (hy + 1.5 * r) + ',' + (cx + 2.3 * r) + ' ' + (hy + 2.0 * r) + ',' + (cx + 2.45 * r) + ' ' + base + 'Z'
      }),
      e('ellipse', { class: 'subject-head', cx: cx, cy: hy, rx: r, ry: r * 1.18 })
    ];
    if (features) {
      parts.push(e('path', {
        class: 'face', d:
          'M' + (cx - .58 * r) + ' ' + (hy - .2 * r) + 'h' + (.34 * r) +
          'M' + (cx + .24 * r) + ' ' + (hy - .2 * r) + 'h' + (.34 * r) +
          'M' + cx + ' ' + (hy - .04 * r) + 'v' + (.46 * r) +
          'M' + (cx - .28 * r) + ' ' + (hy + .76 * r) + 'h' + (.56 * r)
      }));
    }
    /* returned loose rather than in a group: a <g> inside a <clipPath> is
       ignored by the spec, and a clip path with no shapes in it clips
       everything away — which is exactly the silent failure that leaves
       the shadow invisible and the figure looking merely flat. */
    return parts;
  }

  /* The frame half of both light figures: a wall, a bust in front of it,
     and three slabs of shadow clipped to the bust — one with a vertical
     edge that slides across the face for the horizontal directions, and
     two with horizontal edges for the two vertical ones. A rim outline
     sits on top for the directions where the light is behind the head.

     Only transforms and opacities move, so the whole thing is one
     compositor pass however fast a reader clicks through the row. */
  function litFrame(s, FX, FY, FW, FH) {
    var id = 'nvxdg' + (++uid);
    var cx = FX + FW * .5, base = FY + FH, r = Math.min(FH * .18, FW * .19);
    var hy = base - r * 3.15;

    /* everything inside the frame is clipped to the frame, so the
       shoulders can run off its edges the way a real bust does */
    var box = 'nvxdg' + (++uid);
    s.appendChild(e('clipPath', { id: box },
      [e('rect', { x: FX, y: FY, width: FW, height: FH, rx: 3 })]));
    var g = e('g', { 'clip-path': 'url(#' + box + ')' });
    s.appendChild(g);
    var put = function (n) { g.appendChild(n); return n; };

    put(e('rect', { x: FX, y: FY, width: FW, height: FH, rx: 3, class: 'wall' }));
    /* The pool the light throws on the wall behind the subject — the
       thing that separates a silhouette from a black rectangle. A hard
       ellipse would read as a prop standing there, so it falls off. */
    var gid = 'nvxdg' + (++uid);
    put(e('radialGradient', { id: gid }, [
      e('stop', { offset: '0%',   'stop-color': '#EAF1FA', 'stop-opacity': '.55' }),
      e('stop', { offset: '58%',  'stop-color': '#EAF1FA', 'stop-opacity': '.17' }),
      e('stop', { offset: '100%', 'stop-color': '#EAF1FA', 'stop-opacity': '0' })
    ]));
    var pool = put(e('ellipse', {
      cx: cx, cy: hy + r * .4, rx: FW * .46, ry: FH * .5,
      fill: 'url(#' + gid + ')', opacity: 0, 'data-fade': ''
    }));
    put(e('g', null, bust(cx, base, r, true)));

    put(e('clipPath', { id: id }, bust(cx, base, r, false)));
    var shade = put(e('g', { 'clip-path': 'url(#' + id + ')' }));
    var slab = function (x, y, w, h) {
      return shade.appendChild(e('rect', {
        class: 'shade', x: x, y: y, width: w, height: h, 'data-move': '', 'data-fade': ''
      }));
    };
    var sideward = slab(cx - 300, FY - 20, 300, FH + 40);   /* right edge at cx */
    var upward   = slab(cx - 200, hy - 400, 400, 400);      /* bottom edge at hy */
    /* The overhead slab stops at the shoulders rather than running to the
       floor: a light directly above puts the eyes and the underside of
       the chin in shadow and lights the top of the chest, and a slab that
       blacked out the whole body would be drawing a different lamp. */
    var downward = slab(cx - 200, hy, 400, r * 2);          /* top edge at hy */

    /* The rim: the subject's own outline, lit. Two copies — one cropped
       to the lit edge for a three-quarter back light, one whole for a
       true silhouette — because fading between them is cheaper and
       steadier than animating a clip. The crop is on the right, which is
       the side every state here lights: the lamp walks the plan's north
       half, and north of a camera looking west is the frame's right. */
    var crop = 'nvxdg' + (++uid);
    put(e('clipPath', { id: crop },
      [e('rect', { x: cx + r, y: FY, width: 1.7 * r, height: FH })]));
    var outline = function () {
      return e('g', { class: 'rim', opacity: 0, 'data-fade': '' }, [
        e('ellipse', { cx: cx, cy: hy, rx: r, ry: r * 1.18 }),
        e('path', {
          d: 'M' + (cx - 2.45 * r) + ' ' + base +
             'C' + (cx - 2.3 * r) + ' ' + (hy + 2.0 * r) + ',' + (cx - 1.05 * r) + ' ' + (hy + 1.5 * r) + ',' + cx + ' ' + (hy + 1.5 * r) +
             'C' + (cx + 1.05 * r) + ' ' + (hy + 1.5 * r) + ',' + (cx + 2.3 * r) + ' ' + (hy + 2.0 * r) + ',' + (cx + 2.45 * r) + ' ' + base
        })
      ]);
    };
    var rimEdge = put(outline()); rimEdge.setAttribute('clip-path', 'url(#' + crop + ')');
    var rimFull = put(outline());
    s.appendChild(e('rect', {
      x: FX, y: FY, width: FW, height: FH, rx: 3, fill: 'none', stroke: '#262A31'
    }));

    return {
      r: r, hy: hy, cx: cx,
      /* c: [side edge, rim mode, wall pool, shadow density] */
      set: function (c) {
        sideward.style.transform = 'translateX(' + c.side + 'px)';
        upward.style.transform   = 'translateY(' + (c.up   == null ? -420 : c.up)   + 'px)';
        downward.style.transform = 'translateY(' + (c.down == null ?  420 : c.down) + 'px)';
        var d = c.dark == null ? .9 : c.dark;
        [sideward, upward, downward].forEach(function (n) { n.style.opacity = d; });
        rimEdge.style.opacity = c.rim === 'edge' ? 1 : 0;
        rimFull.style.opacity = c.rim === 'full' ? 1 : 0;
        pool.style.opacity = c.pool || 0;
      }
    };
  }

  /* a bare bulb with its rays, and the cone it throws. White, not amber:
     the ember in these figures already means "camera", and a second
     saturated colour would make the reader learn a legend. */
  function lamp(coneLen) {
    var rays = 'M0 -16v-7M0 16v7M-16 0h-7M16 0h7' +
               'M-11.3 -11.3l-5 -5M11.3 11.3l5 5M11.3 -11.3l5 -5M-11.3 11.3l-5 5';
    return e('g', null, [
      e('path', { class: 'lamp-cone', 'data-fade': '',
        d: 'M0 0 L-' + coneLen + ' -34 L-' + coneLen + ' 34 Z' }),
      e('path', { class: 'lamp-ray', d: rays }),
      e('circle', { class: 'lamp', cx: 0, cy: 0, r: 9 })
    ]);
  }

  /* =================================================================
     4 — where the key light stands

     Left: the plan. The subject is fixed, the camera is fixed, and the
     lamp walks the ring around them — which is the only thing a lighting
     decision actually is. A light directly overhead sits, in plan, on
     the subject's own head; that is not a cheat, it is what a plan of it
     looks like, so the two vertical positions are drawn there with a
     chevron and a word rather than a second view the reader has to
     reconcile with the first.

     Right: the face that plan produces.
     ================================================================= */
  var KEY = {
    front: { az:   0, side:  -96, rim: 0,      pool: .05, say: 'FLAT' },
    r45:   { az:  45, side:  -21, rim: 0,      pool: .09, say: '45°' },
    side:  { az:  90, side:    2, rim: 0,      pool: .13, say: 'SPLIT' },
    kick:  { az: 135, side:  118, rim: 'edge', pool: .26, say: 'RIM' },
    back:  { az: 180, side:  118, rim: 'full', pool: .5,  say: 'BACKLIT' },
    top:   { az: null, side: -130, down:  4, rim: 0, pool: .07, say: 'TOP' },
    under: { az: null, side: -130, up:   18, rim: 0, pool: .07, say: 'UNDER' }
  };

  function buildKey(fig) {
    var s = stage(fig, '0 0 560 300');
    var PX = 168, PY = 158, R = 92;

    s.appendChild(e('g', { class: 'grid' }, [
      e('line', { x1: 24, y1: PY, x2: 312, y2: PY }),
      e('line', { x1: PX, y1: 44, x2: PX, y2: 286 })
    ]));
    s.appendChild(e('circle', { class: 'arc', cx: PX, cy: PY, r: R, fill: 'none' }));

    /* subject from overhead, facing the camera */
    s.appendChild(e('circle', { class: 'subject-head', cx: PX, cy: PY, r: 15 }));
    s.appendChild(e('path', { class: 'subject', d: 'M' + (PX + 13) + ' ' + (PY - 8) +
      'L' + (PX + 26) + ' ' + PY + 'L' + (PX + 13) + ' ' + (PY + 8) + 'Z' }));

    s.appendChild(e('g', { transform: 'translate(' + (PX + 122) + ',' + PY + ')' }, [
      e('path', { class: 'cone', d: 'M0 0 L-122 -40 L-122 40 Z' }),
      e('rect', { class: 'cam-body', x: -3, y: -12, width: 28, height: 24, rx: 3 }),
      e('path', { class: 'cam', d: 'M-3 -7 L-15 -12 L-15 12 L-3 7 Z' })
    ]));

    /* The lamp is parked out on the ring by a static attribute; the arm
       inside the ring retracts it to the centre for the two vertical
       positions, and the ring itself carries it round for the other
       five. Attribute transform on the child, CSS transform on the
       parents — a CSS transform on the same node would overwrite the
       attribute and drop the lamp at the origin. */
    var head = lamp(88);
    var arm = e('g', { 'data-move': '' },
      [e('g', { transform: 'translate(' + (PX + R) + ',' + PY + ')' }, [head])]);
    var ring = pivot(e('g', { 'data-move': '' }, [arm]), PX, PY);
    s.appendChild(ring);

    /* one chevron for a light above the head, one for a light under the
       chin — drawn twice rather than flipped, so neither is a transform
       a reader watches unwind */
    var chevD = e('path', { class: 'lamp-ray', 'data-fade': '', opacity: 0,
      d: 'M' + (PX - 9) + ' ' + (PY + 28) + 'L' + PX + ' ' + (PY + 38) + 'L' + (PX + 9) + ' ' + (PY + 28) });
    var chevU = e('path', { class: 'lamp-ray', 'data-fade': '', opacity: 0,
      d: 'M' + (PX - 9) + ' ' + (PY + 38) + 'L' + PX + ' ' + (PY + 28) + 'L' + (PX + 9) + ' ' + (PY + 38) });
    s.appendChild(chevD); s.appendChild(chevU);
    var where = e('text', { x: PX - 26, y: PY + 58, 'data-fade': '', opacity: 0 }, [txt('')]);
    s.appendChild(where);

    s.appendChild(e('text', { x: 24, y: 30 }, [txt('SET / PLAN VIEW')]));
    s.appendChild(e('text', { x: 340, y: 30 }, [txt('THE FRAME')]));
    var read = e('text', { class: 'stamp', x: 340, y: 288 }, [txt('')]);
    s.appendChild(read);

    var frame = litFrame(s, 340, 44, 196, 226);

    return {
      set: function (k) {
        var c = KEY[k] || KEY.r45;
        var up = c.az == null;
        frame.set(c);
        arm.style.transform = 'translateX(' + (up ? -R : 0) + 'px)';
        /* a cone thrown from the subject's own position is a wedge over
           the subject, which says nothing — so overhead and underneath
           keep the bulb and drop the beam */
        head.firstChild.style.opacity = up ? 0 : 1;
        if (!up) ring.style.transform = 'rotate(' + (-c.az) + 'deg)';
        chevD.style.opacity = k === 'top' ? 1 : 0;
        chevU.style.opacity = k === 'under' ? 1 : 0;
        where.style.opacity = up ? 1 : 0;
        if (up) where.firstChild.nodeValue = k === 'under' ? 'KEY BELOW' : 'KEY ABOVE';
        read.firstChild.nodeValue = c.say;
      }
    };
  }

  /* =================================================================
     5 — how dark the shadow is allowed to get

     Same face, same key at 45°, and the only variable is the fill: the
     second, softer light that decides how much of the shadow side the
     audience is still allowed to see. Ratio is the one lighting decision
     that is a number, so the number is on the stage.
     ================================================================= */
  var RATIO = {
    flat: { dark: .16, fill: 1,   wall: .17, say: '1:1',  stops: 0 },
    soft: { dark: .42, fill: .62, wall: .1,  say: '2:1',  stops: 1 },
    std:  { dark: .68, fill: .32, wall: .06, say: '4:1',  stops: 2 },
    low:  { dark: .93, fill: .08, wall: .02, say: '8:1',  stops: 3 }
  };

  function buildRatio(fig) {
    var s = stage(fig, '0 0 560 300');
    var frame = litFrame(s, 176, 30, 208, 240);

    s.appendChild(e('text', { x: 176, y: 20 }, [txt('THE FRAME')]));

    /* The two lamps, either side of the frame, at the height they would
       really sit: key high on one side, fill low on the other. Each is
       rotated so its beam points at the subject — the cone leaves a lamp
       along its own -x, so the angle is the bearing to the frame's
       centre, turned half a circle. */
    var aim = function (x, y) {
      return 'translate(' + x + ',' + y + ') rotate(' +
        (Math.atan2(150 - y, 280 - x) * 180 / Math.PI + 180).toFixed(1) + ')';
    };
    /* key on the right, fill on the left — the shadow below falls on the
       left of the face, and a key on the same side as its own shadow
       would teach the reader the wrong thing about every other figure */
    s.appendChild(e('g', { transform: aim(456, 92) }, [lamp(58)]));
    var fillG = e('g', { transform: aim(104, 196), 'data-fade': '' }, [lamp(58)]);
    s.appendChild(fillG);
    s.appendChild(e('text', { x: 452, y: 62 }, [txt('KEY')]));
    s.appendChild(e('text', { x: 78, y: 246 }, [txt('FILL')]));

    /* the ratio itself, and the stops between the two lamps */
    var num = e('text', { class: 'stamp big', x: 176, y: 292 }, [txt('')]);
    s.appendChild(num);
    var pips = [];
    for (var i = 0; i < 3; i++) {
      var p = e('rect', {
        class: 'pip', x: 238 + i * 19, y: 281, width: 12, height: 6, rx: 1,
        'data-fade': '', opacity: .14
      });
      pips.push(p); s.appendChild(p);
    }
    s.appendChild(e('text', { x: 302, y: 292 }, [txt('STOPS BETWEEN KEY AND FILL')]));

    return {
      set: function (k) {
        var c = RATIO[k] || RATIO.std;
        frame.set({ side: -21, dark: c.dark, pool: c.wall, rim: 0 });
        fillG.style.opacity = c.fill;
        num.firstChild.nodeValue = c.say;
        pips.forEach(function (p, i) { p.style.opacity = i < c.stops ? 1 : .14; });
      }
    };
  }

  /* =================================================================
     6 — where the subject stands in the frame

     One frame, one subject, and the five decisions that are made about
     where in the rectangle that subject goes. Every state is the same
     drawing with different things switched on, so what a reader sees is
     the difference between them rather than five separate pictures.
     ================================================================= */
  var COMP = {
    center: { x:   0, grid: 0, mid: 1, dots: 0, head: 0, gaze: 0, depth: 0 },
    thirds: { x: -78, grid: 1, mid: 0, dots: 1, head: 0, gaze: 0, depth: 0 },
    head:   { x:   0, grid: 1, mid: 0, dots: 0, head: 1, gaze: 0, depth: 0 },
    gaze:   { x: -78, grid: 1, mid: 0, dots: 0, head: 0, gaze: 1, depth: 0 },
    depth:  { x: -58, grid: 0, mid: 0, dots: 0, head: 0, gaze: 0, depth: 1 }
  };

  function buildComp(fig) {
    var s = stage(fig, '0 0 560 316');
    var FX = 40, FY = 26, FW = 480, FH = 270;
    var id = 'nvxdg' + (++uid);
    var cx = FX + FW / 2, floor = FY + FH * .93;

    s.appendChild(e('clipPath', { id: id },
      [e('rect', { x: FX, y: FY, width: FW, height: FH })]));
    var inner = e('g', { 'clip-path': 'url(#' + id + ')' });
    s.appendChild(inner);
    inner.appendChild(e('rect', { x: FX, y: FY, width: FW, height: FH, class: 'wall' }));
    inner.appendChild(e('g', { class: 'grid' }, [
      e('line', { x1: FX, y1: floor, x2: FX + FW, y2: floor }),
      e('line', { x1: FX, y1: FY + FH * .5, x2: FX + FW, y2: FY + FH * .5 })
    ]));

    /* the far layer and the near one, for the depth state */
    var bg = e('g', { 'data-fade': '', opacity: 0 }, [
      e('rect', { class: 'prop', x: FX + 300, y: FY + 118, width: 66, height: 133, rx: 2 }),
      e('rect', { class: 'prop', x: FX + 372, y: FY + 148, width: 40, height: 103, rx: 2 })
    ]);
    inner.appendChild(bg);

    var H = FH * .78, headTop = floor - H, eye = headTop + H * .075;
    /* which way the subject is facing. Without it there is no such thing
       as look room — a symmetrical figure has no front. */
    var nose = e('path', {
      class: 'subject', 'data-fade': '', opacity: 0,
      d: 'M' + (cx + 9) + ' ' + (eye - 5) + 'l10 5l-10 5Z'
    });
    var who = e('g', { 'data-move': '' }, [person(cx, floor, H), nose]);
    inner.appendChild(who);

    var fg = e('g', { 'data-fade': '', opacity: 0 }, [
      e('path', { class: 'fore', d: 'M' + FX + ' ' + (FY + FH) + 'v-96 q34 -22 74 -8 q28 10 30 104 Z' })
    ]);
    inner.appendChild(fg);

    var thirds = e('g', { 'data-fade': '', opacity: 0 }, [
      e('line', { class: 'third', x1: FX + FW / 3, y1: FY, x2: FX + FW / 3, y2: FY + FH }),
      e('line', { class: 'third', x1: FX + FW * 2 / 3, y1: FY, x2: FX + FW * 2 / 3, y2: FY + FH }),
      e('line', { class: 'third', x1: FX, y1: FY + FH / 3, x2: FX + FW, y2: FY + FH / 3 }),
      e('line', { class: 'third', x1: FX, y1: FY + FH * 2 / 3, x2: FX + FW, y2: FY + FH * 2 / 3 })
    ]);
    inner.appendChild(thirds);

    var mid = e('g', { 'data-fade': '', opacity: 0 }, [
      e('line', { class: 'third', x1: cx, y1: FY, x2: cx, y2: FY + FH }),
      e('line', { class: 'third', x1: FX, y1: FY + FH / 2, x2: FX + FW, y2: FY + FH / 2 })
    ]);
    inner.appendChild(mid);

    var dots = e('g', { 'data-fade': '', opacity: 0 }, [
      e('circle', { class: 'dot', cx: FX + FW / 3, cy: FY + FH / 3, r: 4 }),
      e('circle', { class: 'dot', cx: FX + FW * 2 / 3, cy: FY + FH / 3, r: 4 }),
      e('circle', { class: 'dot', cx: FX + FW / 3, cy: FY + FH * 2 / 3, r: 4 }),
      e('circle', { class: 'dot', cx: FX + FW * 2 / 3, cy: FY + FH * 2 / 3, r: 4 })
    ]);
    inner.appendChild(dots);

    /* headroom: the gap the eye actually measures, called by its name */
    var head = e('g', { 'data-fade': '', opacity: 0 }, [
      e('path', { class: 'lead', d: 'M' + cx + ' ' + (FY + 4) + 'V' + (headTop - 2) +
        'M' + (cx - 6) + ' ' + (FY + 10) + 'L' + cx + ' ' + (FY + 4) + 'L' + (cx + 6) + ' ' + (FY + 10) +
        'M' + (cx - 6) + ' ' + (headTop - 8) + 'L' + cx + ' ' + (headTop - 2) + 'L' + (cx + 6) + ' ' + (headTop - 8) }),
      e('text', { x: cx + 10, y: FY + 26 }, [txt('HEADROOM')])
    ]);
    inner.appendChild(head);

    /* look room: the space the subject is facing into */
    var gaze = e('g', { 'data-fade': '', opacity: 0 }, [
      e('path', { class: 'lead', d: 'M' + (cx - 52) + ' ' + (headTop + 30) + 'H' + (FX + FW - 24) +
        'M' + (FX + FW - 34) + ' ' + (headTop + 24) + 'L' + (FX + FW - 24) + ' ' + (headTop + 30) +
        'L' + (FX + FW - 34) + ' ' + (headTop + 36) }),
      e('text', { x: cx + 24, y: headTop + 22 }, [txt('LOOK ROOM')])
    ]);
    inner.appendChild(gaze);

    var depthLbl = e('g', { 'data-fade': '', opacity: 0 }, [
      e('text', { x: FX + 12, y: FY + FH - 12 }, [txt('FG')]),
      e('text', { x: FX + 168, y: FY + FH - 12 }, [txt('SUBJECT')]),
      e('text', { x: FX + 330, y: FY + FH - 12 }, [txt('BG')])
    ]);
    inner.appendChild(depthLbl);

    s.appendChild(e('rect', {
      x: FX, y: FY, width: FW, height: FH, rx: 3, fill: 'none', stroke: '#262A31'
    }));
    s.appendChild(e('text', { x: FX, y: 18 }, [txt('THE FRAME')]));

    return {
      set: function (k) {
        var c = COMP[k] || COMP.center;
        who.style.transform = 'translateX(' + c.x + 'px)';
        thirds.style.opacity = c.grid;
        mid.style.opacity = c.mid;
        dots.style.opacity = c.dots;
        head.style.opacity = c.head;
        gaze.style.opacity = c.gaze;
        nose.style.opacity = c.gaze;
        fg.style.opacity = c.depth;
        bg.style.opacity = c.depth;
        depthLbl.style.opacity = c.depth;
      }
    };
  }

  /* =================================================================
     wiring
     ================================================================= */
  var BUILD = {
    angle: buildAngle, shot: buildShot, move: buildMove,
    key: buildKey, ratio: buildRatio, comp: buildComp
  };

  function init(fig) {
    var build = BUILD[fig.getAttribute('data-nvx-dg')];
    if (!build) return;
    var ctrls = fig.querySelector('.nvx-dg__ctrls');
    var read  = fig.querySelector('.nvx-dg__read');
    if (!ctrls) return;

    var api = build(fig);
    var btns = [].slice.call(ctrls.querySelectorAll('button'));

    function pick(btn) {
      btns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === btn)); });
      api.set(btn.getAttribute('data-k'));
      /* data-say is authored markup from the page itself, not input */
      if (read) read.innerHTML = btn.getAttribute('data-say') || '';
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { pick(b); });
    });

    /* arrow keys walk the row, the way a radio group does */
    ctrls.addEventListener('keydown', function (ev) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      var d = ev.key === 'ArrowLeft' ? 1 : ev.key === 'ArrowRight' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      var n = btns[(i + d + btns.length) % btns.length];
      n.focus(); pick(n);
    });

    var start = btns.filter(function (o) {
      return o.getAttribute('data-k') === fig.getAttribute('data-start');
    })[0] || btns[0];
    if (start) pick(start);
  }

  function boot() {
    [].slice.call(document.querySelectorAll('[data-nvx-dg]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
