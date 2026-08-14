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
     7 — the production line

     Seven stages on one rail. The figure exists because the lesson's
     whole claim is that the stages have an order and that skipping one
     is what costs the money — and an order is a shape, not a paragraph.
     The rail fills up to wherever the reader is standing, so the cost of
     the stage they are reading about is visible as the distance still
     ahead of it.
     ================================================================= */
  function buildPipe(fig) {
    var s = stage(fig, '0 0 560 132');
    var X0 = 48, X1 = 512, Y = 74, N = 7;
    var at = function (i) { return X0 + (X1 - X0) * i / (N - 1); };

    s.appendChild(e('line', { class: 'rail', x1: X0, y1: Y, x2: X1, y2: Y }));
    var live = e('line', { class: 'rail-live', x1: X0, y1: Y, x2: X0, y2: Y });
    s.appendChild(live);
    for (var i = 0; i < N; i++) {
      s.appendChild(e('circle', { class: 'pin', cx: at(i), cy: Y, r: 5.5 }));
      s.appendChild(e('text', { x: at(i) - 6, y: Y + 26 }, [txt('0' + (i + 1))]));
    }
    var mark = e('g', { 'data-move': '' }, [
      e('circle', { class: 'pin-halo', cx: X0, cy: Y, r: 15 }),
      e('circle', { class: 'pin-on',   cx: X0, cy: Y, r: 10 }),
      e('circle', { class: 'pin-core', cx: X0, cy: Y, r: 4.5 })
    ]);
    s.appendChild(mark);
    s.appendChild(e('text', { x: X0 - 8, y: Y - 28 }, [txt('IDEA')]));
    s.appendChild(e('text', { x: X1 - 54, y: Y - 28 }, [txt('FINAL CUT')]));

    return {
      set: function (k) {
        var i = Math.min(N - 1, Math.max(0, (parseInt(k.replace(/\D/g, ''), 10) || 1) - 1));
        mark.style.transform = 'translateX(' + (at(i) - X0) + 'px)';
        live.setAttribute('x2', at(i));
      }
    };
  }

  /* =================================================================
     8 — the shape of the thing being made

     Story structure is taught as five names and left there, which leaves
     a reader with no idea how long any of it is. Here the same five
     beats are laid against three real running times, and each carries
     the number the reader actually needs: how many seconds it gets, and
     therefore how many shots have to exist to fill it.
     ================================================================= */
  var BEAT_FA = ['قلاب', 'موقعیت', 'تنش', 'اوج', 'فرود'];
  var BEATS = {
    reel:   { total: 30,  shots: 8,  cut: [.17, .18, .33, .19, .13] },
    teaser: { total: 90,  shots: 18, cut: [.11, .21, .34, .20, .14] },
    ep:     { total: 300, shots: 55, cut: [.06, .24, .38, .19, .13] }
  };

  function buildBeats(fig) {
    var s = stage(fig, '0 0 560 172');
    var X0 = 34, X1 = 526, Y = 58, H = 48;

    s.appendChild(e('rect', { class: 'track', x: X0, y: Y, width: X1 - X0, height: H, rx: 3 }));
    var bars = [], tags = [];
    for (var i = 0; i < 5; i++) {
      bars.push(s.appendChild(e('rect', {
        class: 'beat' + (i === 3 ? ' peak' : ''), x: X0, y: Y, width: 10, height: H, rx: 2
      })));
      /* the two labels ride one group, so a beat's name and its length
         travel together and neither can drift off its own block */
      var g = e('g', { 'data-move': '' }, [
        e('text', { class: 'fa', x: 0, y: Y - 12 }, [txt(BEAT_FA[i])]),
        e('text', { class: 'mid', x: 0, y: Y + H + 20 }, [txt('')])
      ]);
      tags.push(s.appendChild(g));
    }
    var sum = e('text', { x: X0, y: 158 }, [txt('')]);
    s.appendChild(sum);

    return {
      set: function (k) {
        var c = BEATS[k] || BEATS.reel, W = X1 - X0, x = X0;
        c.cut.forEach(function (f, i) {
          var w = W * f;
          bars[i].setAttribute('x', x + 1);
          bars[i].setAttribute('width', Math.max(2, w - 2));
          tags[i].style.transform = 'translateX(' + (x + w / 2) + 'px)';
          tags[i].lastChild.firstChild.nodeValue = Math.round(c.total * f) + 's';
          x += w;
        });
        sum.firstChild.nodeValue =
          c.total + ' SECONDS  ·  ~' + c.shots + ' SHOTS  ·  ~' +
          (Math.round(c.total / c.shots * 10) / 10) + 's AVERAGE CUT';
      }
    };
  }

  /* =================================================================
     9 — one line of script, four shots

     The payoff figure for the whole track: a single action line is not a
     shot, it is a decision about how many shots it is worth. Each of the
     four is drawn with the vocabulary of the two lessons before this one
     — a size, an angle, a light — so the reader can see the earlier
     parts being spent rather than being told they will be useful.
     ================================================================= */
  function mini(s, x, y, w, h, kind) {
    var id = 'nvxdg' + (++uid);
    s.appendChild(e('clipPath', { id: id },
      [e('rect', { x: x, y: y, width: w, height: h, rx: 2 })]));
    var g = e('g', { 'clip-path': 'url(#' + id + ')' });
    g.appendChild(e('rect', { class: 'wall', x: x, y: y, width: w, height: h, rx: 2 }));
    var cx = x + w / 2, floor = y + h * .86;

    if (kind === 'els') {
      g.appendChild(e('line', { class: 'horizon', x1: x, y1: floor, x2: x + w, y2: floor }));
      g.appendChild(e('rect', { class: 'prop', x: x + w * .58, y: floor - h * .34, width: w * .2, height: h * .34 }));
      g.appendChild(e('rect', { class: 'prop', x: x + w * .78, y: floor - h * .22, width: w * .13, height: h * .22 }));
      g.appendChild(person(x + w * .3, floor, h * .3));
    } else if (kind === 'ms') {
      g.appendChild(e('line', { class: 'horizon', x1: x, y1: y + h * .42, x2: x + w, y2: y + h * .42 }));
      g.appendChild(person(cx, y + h * 2.05, h * 1.9));
    } else if (kind === 'cu') {
      bust(cx, y + h * 1.62, h * .42, true).forEach(function (n) { g.appendChild(n); });
    } else {
      /* the insert: a thing, not a person — the shot the reader forgets
         to list and then misses in the edit */
      g.appendChild(e('rect', { class: 'prop', x: cx - w * .17, y: y + h * .3, width: w * .34, height: h * .4, rx: 2 }));
      g.appendChild(e('path', { class: 'limb', 'stroke-width': 3,
        d: 'M' + (cx - w * .3) + ' ' + (y + h * .82) + 'h' + (w * .28) }));
      g.appendChild(e('circle', { cx: cx + w * .05, cy: y + h * .44, r: 2.6, fill: '#E5202A' }));
    }
    s.appendChild(g);
    var box = e('rect', { class: 'mini-box', x: x, y: y, width: w, height: h, rx: 2 });
    s.appendChild(box);
    return { g: g, box: box, cx: cx, cy: y + h / 2 };
  }

  function buildShots(fig) {
    var s = stage(fig, '0 0 560 150');
    var W = 118, H = 66, Y = 48, kinds = ['els', 'ms', 'cu', 'in'];
    var LAB = ['01 · ELS', '02 · MS', '03 · CU', '04 · INSERT'];
    var cells = kinds.map(function (kind, i) {
      var x = 22 + i * 132;
      var c = mini(s, x, Y, W, H, kind);
      c.lab = s.appendChild(e('text', { class: 'mini-lab', x: x, y: Y - 12 }, [txt(LAB[i])]));
      c.wrap = e('g', { 'data-move': '', 'data-fade': '' });
      /* the cell is built in place and then adopted, so the geometry
         above stays written in plain stage coordinates */
      c.wrap.appendChild(c.g); c.wrap.appendChild(c.box);
      pivot(c.wrap, c.cx, c.cy);
      s.insertBefore(c.wrap, c.lab);
      return c;
    });
    s.appendChild(e('text', { x: 22, y: 138 }, [txt('ONE ACTION LINE  →  FOUR SHOTS')]));

    return {
      set: function (k) {
        var n = Math.min(3, Math.max(0, (parseInt(k.replace(/\D/g, ''), 10) || 1) - 1));
        cells.forEach(function (c, i) {
          var on = i === n;
          c.wrap.style.transform = on ? 'scale(1.07)' : 'scale(1)';
          c.wrap.style.opacity = on ? 1 : .4;
          c.box.setAttribute('class', on ? 'mini-box is-on' : 'mini-box');
          c.lab.setAttribute('class', on ? 'mini-lab is-on' : 'mini-lab');
        });
      }
    };
  }

  /* =================================================================
     10 — the three things that can move

     A video model is given one instruction and asked to move a whole
     world with it, so the reader's job is to know which of three layers
     they are actually asking to move: the camera, the subject, or the
     air between them. Each runs on its own here, and the fourth control
     runs all three at once — which is the state most first prompts are
     asking for without meaning to, and it is not a state anyone would
     choose after watching it.

     The loops are the stylesheet's, keyed off one attribute, so the
     previous motion stops the instant the next is picked.
     ================================================================= */
  function buildMotion(fig) {
    var s = stage(fig, '0 0 560 250');
    var FX = 30, FY = 26, FW = 500, FH = 196;
    var id = 'nvxdg' + (++uid);
    var cx = FX + FW / 2, floor = FY + FH * .9;

    s.appendChild(e('clipPath', { id: id },
      [e('rect', { x: FX, y: FY, width: FW, height: FH, rx: 3 })]));
    var box = e('g', { 'clip-path': 'url(#' + id + ')' });
    s.appendChild(box);
    box.appendChild(e('rect', { x: FX, y: FY, width: FW, height: FH, class: 'wall' }));

    /* the camera layer is everything at once: when the camera moves, the
       whole world moves with it, which is the difference the figure has
       to show */
    var world = e('g', { class: 'lyr-cam' });
    box.appendChild(world);
    world.appendChild(e('line', { class: 'horizon', x1: FX, y1: floor, x2: FX + FW, y2: floor }));
    world.appendChild(e('rect', { class: 'prop', x: FX + 46, y: floor - 104, width: 74, height: 104, rx: 2 }));
    world.appendChild(e('rect', { class: 'prop', x: FX + 372, y: floor - 132, width: 62, height: 132, rx: 2 }));

    /* the air: three drifting banks, the cheapest thing to ask a model
       for and the first thing that sells a shot as a place */
    var air = e('g', { class: 'lyr-air' });
    [[.16, .58, 84], [.52, .72, 62], [.78, .46, 70]].forEach(function (p) {
      air.appendChild(e('ellipse', {
        class: 'haze', cx: FX + FW * p[0], cy: FY + FH * p[1], rx: p[2], ry: p[2] * .3
      }));
    });
    world.appendChild(air);

    var who = e('g', { class: 'lyr-sub' }, [person(cx - 40, floor, FH * .56)]);
    world.appendChild(who);

    s.appendChild(e('rect', {
      x: FX, y: FY, width: FW, height: FH, rx: 3, fill: 'none', stroke: '#262A31'
    }));
    var tag = e('text', { class: 'stamp', x: FX, y: 18 }, [txt('')]);
    s.appendChild(tag);

    var SAY = { cam: 'CAMERA MOVES', sub: 'SUBJECT MOVES', air: 'THE AIR MOVES', all: 'ALL THREE — UNREADABLE' };
    return {
      set: function (k) {
        fig.setAttribute('data-run', 'm-' + k);
        tag.firstChild.nodeValue = SAY[k] || '';
      }
    };
  }

  /* =================================================================
     11 — one frame in two shots

     The technique that turns a wall of five-second clips into a
     sequence: the last frame of a shot is handed to the next shot as
     its first. The figure exists because the idea is spatial — the
     shared frame belongs to both shots at once, and a paragraph has to
     say that twice where a drawing says it in one shape.
     ================================================================= */
  var CHAIN = ['a', 'bridge', 'b'];

  function buildChain(fig) {
    var s = stage(fig, '0 0 560 190');
    var W = 150, H = 84, Y = 56, GAP = 28;
    var xs = [40, 40 + W + GAP, 40 + (W + GAP) * 2];

    /* the two brackets naming which shot owns which frames; the middle
       frame sits under both, which is the whole point */
    var span = function (x1, x2, y, label, cls) {
      return e('g', { class: cls }, [
        e('path', { class: 'lead', d: 'M' + x1 + ' ' + (y + 8) + 'V' + y + 'H' + x2 + 'V' + (y + 8) }),
        e('text', { class: 'mini-lab', x: (x1 + x2) / 2 - 24, y: y - 6 }, [txt(label)])
      ]);
    };
    s.appendChild(span(xs[0], xs[1] + W, 34, 'SHOT 01', 'sp-a'));
    s.appendChild(span(xs[1], xs[2] + W, 176, 'SHOT 02', 'sp-b'));

    var cells = xs.map(function (x, i) {
      var c = mini(s, x, Y, W, H, ['ms', 'cu', 'els'][i]);
      c.wrap = e('g', { 'data-fade': '' });
      c.wrap.appendChild(c.g); c.wrap.appendChild(c.box);
      s.appendChild(c.wrap);
      return c;
    });
    var mark = e('text', { class: 'stamp', x: xs[1] + 34, y: Y + H + 22 }, [txt('SHARED FRAME')]);
    s.appendChild(mark);

    return {
      set: function (k) {
        var n = Math.max(0, CHAIN.indexOf(k));
        cells.forEach(function (c, i) {
          /* the bridge lights both outer frames, because it is the one
             frame that is genuinely in two shots */
          var on = n === 1 ? i === 1 : i === (n ? 2 : 0);
          c.wrap.style.opacity = on ? 1 : .28;
          c.box.setAttribute('class', on ? 'mini-box is-on' : 'mini-box');
        });
        mark.style.opacity = n === 1 ? 1 : .3;
      }
    };
  }


  /* =================================================================
     12 — where the cut lands

     A cut is the only tool on this track that costs nothing and changes
     everything, and it is invisible in a still. So the figure holds one
     pair of shots and moves only the boundary between them: the reader
     watches the same two clips become dead, tight, or seamless purely by
     where the join sits. The dead tail is drawn rather than described
     because on a generated clip that is exactly where the picture starts
     to come apart, and a reader who has seen it once starts trimming.
     ================================================================= */
  var CUTS = {
    late:   { at: .78, dead: true },
    motion: { at: .52 },
    match:  { at: .52, match: true },
    jcut:   { at: .52, pre: .34 }
  };

  function buildCut(fig) {
    var s = stage(fig, '0 0 560 158');
    var X0 = 34, X1 = 526, W = X1 - X0, Y = 46, H = 46;
    var ACT = .52;                     /* where the action in shot 1 peaks */

    s.appendChild(e('rect', { class: 'track', x: X0, y: Y, width: W, height: H, rx: 3 }));

    /* shot one fills up to the join; shot two takes the rest */
    var a = s.appendChild(e('rect', { class: 'beat', 'data-move': '', x: X0 + 1, y: Y + 1, width: 10, height: H - 2, rx: 2 }));
    var b = s.appendChild(e('rect', { class: 'beat peak', 'data-move': '', x: X0, y: Y + 1, width: 10, height: H - 2, rx: 2 }));

    /* the stretch of shot one after its action is over — the part a
       generated clip spends drifting */
    var dead = s.appendChild(e('rect', { class: 'cut-dead', 'data-fade': '', x: X0, y: Y + 1, width: 0, height: H - 2 }));

    /* the action itself, so "cut on the motion" has something to be on */
    var peak = s.appendChild(e('path', { class: 'cut-act', d: '' }));

    var join = s.appendChild(e('line', { class: 'cut-line', 'data-move': '', x1: 0, y1: Y - 14, x2: 0, y2: Y + H + 14 }));

    /* the shapes that rhyme across a match cut */
    var m1 = s.appendChild(e('circle', { class: 'cut-rhyme', 'data-fade': '', cx: 0, cy: Y + H / 2, r: 7 }));
    var m2 = s.appendChild(e('circle', { class: 'cut-rhyme', 'data-fade': '', cx: 0, cy: Y + H / 2, r: 7 }));

    /* sound running ahead of picture */
    var snd = s.appendChild(e('rect', { class: 'cut-snd', 'data-fade': '', 'data-move': '', x: X0, y: Y + H + 22, width: 10, height: 8, rx: 2 }));
    var sndLab = s.appendChild(e('text', { class: 'mid', 'data-fade': '', x: 0, y: Y + H + 46 }, [txt('AUDIO LEADS')]));

    var la = s.appendChild(e('text', { class: 'fa', 'data-move': '', x: 0, y: Y - 20 }, [txt('نمای ۱')]));
    var lb = s.appendChild(e('text', { class: 'fa', 'data-move': '', x: 0, y: Y - 20 }, [txt('نمای ۲')]));

    /* the action arc is fixed: only the join moves against it */
    var ax = X0 + W * ACT;
    peak.setAttribute('d', 'M' + (ax - 46) + ' ' + (Y - 4) + ' Q' + ax + ' ' + (Y - 30) + ' ' + (ax + 46) + ' ' + (Y - 4));

    return {
      set: function (k) {
        var c = CUTS[k] || CUTS.motion, x = X0 + W * c.at;

        a.setAttribute('width', Math.max(2, x - X0 - 2));
        b.setAttribute('x', x + 1);
        b.setAttribute('width', Math.max(2, X1 - x - 2));
        join.setAttribute('x1', x); join.setAttribute('x2', x);
        la.style.transform = 'translateX(' + ((X0 + x) / 2) + 'px)';
        lb.style.transform = 'translateX(' + ((x + X1) / 2) + 'px)';

        dead.setAttribute('x', ax);
        dead.setAttribute('width', c.dead ? Math.max(0, x - ax) : 0);
        dead.style.opacity = c.dead ? 1 : 0;

        m1.style.opacity = m2.style.opacity = c.match ? 1 : 0;
        m1.setAttribute('cx', x - 34);
        m2.setAttribute('cx', x + 34);

        var on = c.pre != null;
        snd.style.opacity = sndLab.style.opacity = on ? 1 : 0;
        snd.setAttribute('x', on ? X0 + W * c.pre : x);
        snd.setAttribute('width', on ? Math.max(2, X1 - (X0 + W * c.pre)) : 2);
        sndLab.setAttribute('x', X0 + W * (c.pre != null ? c.pre : .5) + 4);
      }
    };
  }

  /* =================================================================
     13 — the three layers of sound

     The claim this figure has to carry is the one that surprises people:
     continuous sound is what lets a viewer forgive a picture that is not
     quite continuous. Drawn as three lanes against the picture's cuts,
     the reason is visible rather than asserted — the ambience is the only
     thing on the stage that does not break where the picture does.
     ================================================================= */
  var SND = { none: [0,0,0], amb: [1,0,0], fx: [1,1,0], all: [1,1,1] };

  function buildSound(fig) {
    var s = stage(fig, '0 0 560 206');
    var X0 = 34, X1 = 526, W = X1 - X0;
    var CUT = [.22, .41, .58, .79];          /* where the picture cuts */

    /* the picture strip, which does break */
    s.appendChild(e('rect', { class: 'track', x: X0, y: 18, width: W, height: 26, rx: 3 }));
    CUT.forEach(function (f) {
      s.appendChild(e('line', { class: 'cut-line', x1: X0 + W * f, y1: 14, x2: X0 + W * f, y2: 48 }));
    });
    s.appendChild(e('text', { x: X0, y: 60 }, [txt('PICTURE — CUTS HERE')]));

    var lanes = [];
    var Y = [86, 132, 178];
    var NAME = ['آمبیانس', 'افکت', 'موسیقی'];
    var LAT = ['AMBIENCE — never stops', 'EFFECTS — on what you can see', 'MUSIC — one shape, under it all'];

    for (var i = 0; i < 3; i++) {
      var g = e('g', { 'data-fade': '' });
      if (i === 0) {
        g.appendChild(e('rect', { class: 'snd-amb', x: X0, y: Y[i] - 12, width: W, height: 16, rx: 2 }));
      } else if (i === 1) {
        [.16, .3, .46, .63, .74, .88].forEach(function (f) {
          var h = 8 + (f * 41 % 13);
          g.appendChild(e('rect', { class: 'snd-fx', x: X0 + W * f, y: Y[1] + 4 - h, width: 4, height: h, rx: 1 }));
        });
      } else {
        var d = 'M' + X0 + ' ' + Y[2], n;
        for (n = 1; n <= 24; n++) {
          d += ' L' + (X0 + W * n / 24) + ' ' + (Y[2] - 9 * Math.sin(n / 24 * Math.PI * 1.6) - 2);
        }
        g.appendChild(e('path', { class: 'snd-mus', d: d }));
      }
      g.appendChild(e('text', { class: 'fa', x: X1 - 46, y: Y[i] - 20 }, [txt(NAME[i])]));
      g.appendChild(e('text', { x: X0, y: Y[i] + 22 }, [txt(LAT[i])]));
      lanes.push(s.appendChild(g));
    }

    return {
      set: function (k) {
        var on = SND[k] || SND.none;
        lanes.forEach(function (g, i) { g.style.opacity = on[i] ? 1 : .14; });
      }
    };
  }

  /* =================================================================
     wiring
     ================================================================= */
  var BUILD = {
    angle: buildAngle, shot: buildShot, move: buildMove,
    key: buildKey, ratio: buildRatio, comp: buildComp,
    pipe: buildPipe, beats: buildBeats, shots: buildShots,
    motion: buildMotion, chain: buildChain,
    cut: buildCut, sound: buildSound
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
