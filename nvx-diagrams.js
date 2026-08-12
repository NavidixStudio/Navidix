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
     wiring
     ================================================================= */
  var BUILD = { angle: buildAngle, shot: buildShot, move: buildMove };

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
