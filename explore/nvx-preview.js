/* =====================================================================
   NAVIDIX — THE CARD PREVIEWS

   The three previews on /explore/ are Canvas 2D and nothing else. No
   three.js, no WebGL context, no shader compile: the landing page's whole
   job is to get a reader into an experience, and paying 600KB and three
   GPU contexts to advertise that is the wrong trade.

   Each is a reduced sketch of its experience — the same idea, drawn with
   a few dozen strokes — so the card promises something the page behind it
   actually delivers.

   They are decoration and are marked as such: aria-hidden, and every word
   a reader needs is in the card's real text. Nothing here draws while it
   is off screen or while the tab is hidden, and prefers-reduced-motion
   gets one still frame rather than no frame — a blank card would read as
   broken.
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RED = '227,27,35', ION = '143,219,255', BLUE = '43,108,255', PAPER = '237,242,250';

  function setup(canvas) {
    var g = canvas.getContext('2d', { alpha: true });
    if (!g) return null;
    var w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2);

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = r.width; h = r.height;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    return { g: g, size: size, dim: function () { return { w: w, h: h }; } };
  }

  /* ---- 01 — space-time: a grid sagging into a well ---- */
  function spaceTime(g, w, h, t) {
    var cx = w * 0.5, cy = h * 0.56, R = Math.min(w, h) * 0.44;
    g.clearRect(0, 0, w, h);

    /* concentric rings, pulled down toward the centre */
    for (var i = 1; i <= 7; i++) {
      var r = (i / 7) * R * 1.85;
      g.beginPath();
      for (var a = 0; a <= 64; a++) {
        var th = (a / 64) * Math.PI * 2;
        var sag = 1 / (1 + Math.pow(r / (R * 0.5), 2));
        var x = cx + Math.cos(th) * r;
        var y = cy + Math.sin(th) * r * 0.34 + sag * R * 0.5;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
      g.strokeStyle = 'rgba(' + BLUE + ',' + (0.34 - i * 0.03) + ')';
      g.lineWidth = 1;
      g.stroke();
    }
    /* radial spokes */
    for (var k = 0; k < 12; k++) {
      var th2 = (k / 12) * Math.PI * 2;
      g.beginPath();
      for (var s = 0; s <= 20; s++) {
        var rr = (s / 20) * R * 1.85;
        var sag2 = 1 / (1 + Math.pow(rr / (R * 0.5), 2));
        g.lineTo(cx + Math.cos(th2) * rr, cy + Math.sin(th2) * rr * 0.34 + sag2 * R * 0.5);
      }
      g.strokeStyle = 'rgba(' + BLUE + ',.16)';
      g.stroke();
    }
    /* the mass, and a body in the well */
    g.beginPath(); g.arc(cx, cy + R * 0.5, R * 0.11, 0, 7);
    g.fillStyle = 'rgba(' + RED + ',.95)'; g.fill();
    g.beginPath(); g.arc(cx, cy + R * 0.5, R * 0.26, 0, 7);
    g.fillStyle = 'rgba(' + RED + ',.1)'; g.fill();

    var ang = t * 0.55, orb = R * 1.15;
    var sag3 = 1 / (1 + Math.pow(orb / (R * 0.5), 2));
    g.beginPath();
    g.arc(cx + Math.cos(ang) * orb, cy + Math.sin(ang) * orb * 0.34 + sag3 * R * 0.5, 3, 0, 7);
    g.fillStyle = 'rgba(' + PAPER + ',.92)'; g.fill();
  }

  /* ---- 02 — human to machine: two tracks, one emitted from the other ---- */
  function humanMachine(g, w, h, t) {
    g.clearRect(0, 0, w, h);
    var bio = h * 0.72, tech = h * 0.3, L = w * 0.1, R2 = w * 0.9;

    /* biology: continuous, all the way across, evenly spaced */
    g.beginPath(); g.moveTo(L, bio); g.lineTo(R2, bio);
    g.strokeStyle = 'rgba(' + ION + ',.55)'; g.lineWidth = 1.2; g.stroke();

    var sweep = L + (Math.sin(t * 0.5) * 0.5 + 0.5) * (R2 - L);

    for (var i = 0; i < 7; i++) {
      var x = L + (i / 6) * (R2 - L);
      g.beginPath(); g.arc(x, bio, x <= sweep ? 3.4 : 2.4, 0, 7);
      g.fillStyle = 'rgba(' + ION + ',' + (x <= sweep ? .95 : .5) + ')'; g.fill();
    }

    /* artefacts: begins later, spacing contracts toward the present */
    var start = L + (R2 - L) * 0.34;
    var xs = [];
    for (var k = 0; k < 8; k++) {
      var u = Math.pow(k / 7, 2.1);
      xs.push(start + u * (R2 - start));
    }
    g.beginPath();
    xs.forEach(function (x, n) { n ? g.lineTo(x, tech) : g.moveTo(x, tech); });
    g.strokeStyle = 'rgba(255,106,90,.6)'; g.lineWidth = 1.2; g.stroke();

    xs.forEach(function (x, n) {
      /* authorship: every artefact joined back to the humans who made it */
      g.beginPath(); g.moveTo(x, tech + 4); g.lineTo(x, bio - 4);
      g.strokeStyle = 'rgba(154,166,188,.17)'; g.lineWidth = 1; g.stroke();
      g.beginPath(); g.arc(x, tech, (x <= sweep ? 3.6 : 2.6) * (0.7 + n / 12), 0, 7);
      g.fillStyle = 'rgba(' + RED + ',' + (x <= sweep ? .95 : .5) + ')'; g.fill();
    });

    g.beginPath(); g.moveTo(sweep, tech - 18); g.lineTo(sweep, bio + 18);
    g.strokeStyle = 'rgba(' + PAPER + ',.18)'; g.lineWidth = 1; g.stroke();
  }

  /* ---- 03 — atoms: a sampled cloud, never an orbit ---- */
  var seeds = null;
  function atoms(g, w, h, t) {
    g.clearRect(0, 0, w, h);
    var cx = w * 0.5, cy = h * 0.5, A = Math.min(w, h) * 0.15;
    var half = A * (1.5 + Math.sin(t * 0.42) * 0.62);
    var bond = Math.max(0, 1 - (half * 2) / (A * 2.6));

    if (!seeds) {
      seeds = [];
      for (var i = 0; i < 260; i++) {
        var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
        var sr = Math.sqrt(1 - u * u);
        /* r^2 e^(-2r/a) by rejection, same law as the full scene */
        var r = A;
        for (var q = 0; q < 20; q++) {
          var cand = Math.random() * A * 4;
          var pr = cand * cand * Math.exp(-2 * cand / A);
          if (Math.random() * (4 / (A * Math.E * Math.E) * A * A) < pr) { r = cand; break; }
        }
        seeds.push({ s: i % 2, dx: sr * Math.cos(th), dy: sr * Math.sin(th), dz: u, r: r, p: Math.random() * 7 });
      }
    }

    for (var n = 0; n < seeds.length; n++) {
      var s = seeds[n];
      var ox = s.s ? half : -half;
      var wob = Math.sin(t * 1.2 + s.p) * 0.05 + 1;
      var x = ox + s.dx * s.r * wob, y = s.dy * s.r * wob;
      var facing = s.s ? -s.dx : s.dx;
      var pull = bond * Math.max(0, facing) * 0.62;
      x += (cx - x - (cx - x)) * 0 + (0 - x) * pull;
      y += (0 - y) * pull * 0.5;
      var depth = (s.dz + 1) / 2;
      g.beginPath();
      g.arc(cx + x, cy + y, 1 + depth * 0.9, 0, 7);
      var mid = 1 - Math.min(1, Math.abs(x) / (half + A * 0.7 + 0.001));
      g.fillStyle = bond > 0.02 && mid > 0.5
        ? 'rgba(255,106,90,' + (0.28 + depth * 0.4) + ')'
        : 'rgba(' + (depth > 0.5 ? ION : BLUE) + ',' + (0.24 + depth * 0.42) + ')';
      g.fill();
    }
    [-half, half].forEach(function (ox) {
      g.beginPath(); g.arc(cx + ox, cy, A * 0.42, 0, 7);
      g.fillStyle = 'rgba(' + RED + ',.1)'; g.fill();
      g.beginPath(); g.arc(cx + ox, cy, A * 0.17, 0, 7);
      g.fillStyle = 'rgba(' + RED + ',.95)'; g.fill();
    });
  }

  /* ---- 04 — the tree of life: branching, and every tip on one line ---- */
  var twigs = null;
  function evolution(g, w, h, t) {
    g.clearRect(0, 0, w, h);
    var top = h * 0.16, bot = h * 0.9, L = w * 0.12, R2 = w * 0.88;

    if (!twigs) {
      /* a small recursive tree, built once so it does not shimmer */
      twigs = [];
      (function grow(x0, y0, x1, y1, depth) {
        twigs.push({ x0: x0, y0: y0, x1: x1, y1: y1, d: depth });
        if (depth >= 4) return;
        var span = (R2 - L) / Math.pow(2, depth + 2);
        var mid = (y1 + top) / 2;
        grow(x1, y1, x1 - span, mid, depth + 1);
        grow(x1, y1, x1 + span, mid, depth + 1);
      })(w * 0.5, bot, w * 0.5, bot - (bot - top) * 0.3, 0);
    }

    twigs.forEach(function (b) {
      g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1);
      g.strokeStyle = 'rgba(' + ION + ',' + (0.5 - b.d * 0.06) + ')';
      g.lineWidth = Math.max(1, 2.4 - b.d * 0.5);
      g.stroke();
    });

    /* every living tip sits on the same line — the whole point */
    g.beginPath(); g.moveTo(L * 0.6, top); g.lineTo(R2 + L * 0.4, top);
    g.strokeStyle = 'rgba(' + PAPER + ',.22)'; g.lineWidth = 1; g.stroke();

    var tips = twigs.filter(function (b) { return b.d === 4; });
    var pulse = Math.floor(t * 0.7) % Math.max(1, tips.length);
    tips.forEach(function (b, i) {
      g.beginPath(); g.arc(b.x1, top, i === pulse ? 4 : 2.6, 0, 7);
      g.fillStyle = i === pulse ? 'rgba(255,106,90,.95)' : 'rgba(' + ION + ',.75)';
      g.fill();
      g.beginPath(); g.moveTo(b.x1, b.y1); g.lineTo(b.x1, top);
      g.strokeStyle = i === pulse ? 'rgba(255,106,90,.5)' : 'rgba(' + ION + ',.22)';
      g.lineWidth = 1; g.stroke();
    });

    g.beginPath(); g.arc(w * 0.5, bot, 3.4, 0, 7);
    g.fillStyle = 'rgba(' + RED + ',.9)'; g.fill();
  }

  /* ---- 05 — the hidden network: hubs, and what happens when they go ---- */
  var net = null;
  function network(g, w, h, t) {
    g.clearRect(0, 0, w, h);
    var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.42;

    if (!net) {
      /* preferential attachment in miniature, so the sketch has real hubs */
      net = { n: [], e: [] };
      for (var i = 0; i < 54; i++) net.n.push({ d: 0 });
      var stubs = [0, 1, 2];
      net.e.push([0, 1], [1, 2]); net.n[0].d = 1; net.n[1].d = 2; net.n[2].d = 1;
      for (var k = 3; k < 54; k++) {
        var tgt = stubs[(Math.random() * stubs.length) | 0];
        net.e.push([k, tgt]); net.n[k].d++; net.n[tgt].d++;
        stubs.push(k, tgt);
      }
      var maxd = 1;
      net.n.forEach(function (o) { maxd = Math.max(maxd, o.d); });
      net.n.forEach(function (o, i) {
        var rr = R * (1 - Math.pow(o.d / maxd, 0.6) * 0.72);
        var a = (i * 2.399);                       /* golden-angle spread */
        o.x = cx + Math.cos(a) * rr;
        o.y = cy + Math.sin(a) * rr * 0.86;
        o.hub = o.d >= maxd * 0.45;
      });
    }

    /* the sweep: hubs blink out, then come back — the whole idea in one loop */
    var phase = (Math.sin(t * 0.5) * 0.5 + 0.5);
    var cut = phase > 0.55;

    net.e.forEach(function (e) {
      var a = net.n[e[0]], b = net.n[e[1]];
      if (cut && (a.hub || b.hub)) return;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
      g.strokeStyle = 'rgba(' + ION + ',' + (a.hub || b.hub ? .3 : .16) + ')';
      g.lineWidth = 1; g.stroke();
    });

    net.n.forEach(function (o) {
      var gone = cut && o.hub;
      g.beginPath(); g.arc(o.x, o.y, o.hub ? 4.6 : 2, 0, 7);
      g.fillStyle = gone ? 'rgba(26,36,51,.9)'
                  : o.hub ? 'rgba(255,106,90,.95)' : 'rgba(' + ION + ',.72)';
      g.fill();
    });
  }

  var PAINTERS = { 'space-time': spaceTime, 'human-to-machine': humanMachine,
                   'atoms': atoms, 'evolution': evolution, 'network': network };

  /* ---- drive them ---- */
  var live = [];
  document.querySelectorAll('[data-preview]').forEach(function (canvas) {
    var paint = PAINTERS[canvas.dataset.preview];
    if (!paint) return;
    var c = setup(canvas);
    if (!c) return;
    var item = { canvas: canvas, c: c, paint: paint, on: false, t: Math.random() * 40 };
    live.push(item);

    function draw() { if (c.size()) { var d = c.dim(); paint(c.g, d.w, d.h, item.t); } }
    item.draw = draw;

    if ('ResizeObserver' in window) new ResizeObserver(function () { if (!running) draw(); }).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { item.on = e.isIntersecting; });
        kick();
      }, { rootMargin: '120px 0px' }).observe(canvas);
    } else { item.on = true; kick(); }

    draw();                                      /* a still frame immediately */
  });

  var running = false, raf = 0, last = 0;
  function kick() {
    if (REDUCED || running) return;
    if (!live.some(function (i) { return i.on; })) return;
    running = true; last = 0;
    raf = requestAnimationFrame(loop);
  }
  function loop(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;
    var any = false;
    for (var i = 0; i < live.length; i++) {
      if (!live[i].on) continue;
      any = true;
      live[i].t += dt;
      live[i].draw();
    }
    if (!any || document.hidden) { running = false; return; }
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else kick();
  });
})();
