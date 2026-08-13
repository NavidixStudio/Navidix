/* =====================================================================
   THE WORLD OF ATOMS & MOLECULES — the real wavefunctions.

   The most common wrong picture of an atom is the one where electrons run
   round the nucleus like planets. That model was abandoned a century ago,
   and it is worth not reprinting it: an electron in an atom has no
   trajectory. What it has is an orbital — a function giving the
   probability of finding it in a region of space. So this scene never
   draws a path. It draws samples from a probability density, and it keeps
   redrawing them, because that is the honest visual grammar for a
   distribution: each dot is one possible answer to "where is it", not a
   particle at a location.

   WHAT IS ACTUALLY COMPUTED HERE

   These are the exact hydrogen wavefunctions, not stand-ins. For each
   orbital the radial part R_nl(r) is the analytic solution of the
   Schrödinger equation for a one-electron atom, in Bohr radii:

     R10 = 2e^-r
     R20 = (2-r)e^(-r/2) / (2*sqrt2)
     R21 = r e^(-r/2) / (2*sqrt6)
     R30 = (27 - 18r + 2r^2) e^(-r/3) * 2/(81*sqrt3)
     R31 = (6r - r^2) e^(-r/3) * 4/(81*sqrt6)
     R32 = r^2 e^(-r/3) * 4/(81*sqrt30)

   and the angular part is a real spherical harmonic — the combinations
   chemists actually name, so 2p_z, 3d_z2 and 3d_xy come out with the
   shapes they have in every textbook, because they are the same
   functions.

   Sampling is exact rather than decorative. The radius is drawn from
   P(r) = r^2 R(r)^2 by inverse transform through a CDF built once per
   orbital; the direction is drawn from |Y|^2 by rejection on the sphere.
   Nothing is fudged to make a nicer shape: the two lobes of a p orbital,
   the ring of a d, and the hollow shells inside 3s are all consequences
   of those formulas.

   COLOUR IS PHASE, AND THAT IS THE POINT

   Dots are tinted by the *sign* of psi, not by distance. That is not
   decoration either — the sign is why chemistry works. Two atoms whose
   wavefunctions meet in phase get electron density piling up between the
   nuclei, and both nuclei are pulled toward that shared density: a bond.
   Out of phase, they cancel between the nuclei and leave a node there:
   antibonding, and the molecule falls apart. The molecule chapter samples
   the real combination psi_A +/- psi_B rather than drawing two atoms next
   to each other, so the node is there because the maths puts it there.

   WHAT IS SIMPLIFIED, SAID PLAINLY

   One electron. These are hydrogen's orbitals; a many-electron atom has
   the same shapes but different energies and sizes, and the Pauli
   principle and shell filling are not modelled. The molecule is the
   textbook LCAO approximation of H2+, not a solved molecular
   Schrödinger equation. Sizes across orbitals are in true proportion —
   3s really is that much larger than 1s — which is why the tour has to
   pull the camera back as it goes.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  var SCALE = 4.6;                       /* scene units per Bohr radius */
  var A0_PM = 52.9;                      /* Bohr radius in picometres   */

  /* ---- radial parts, r in Bohr radii ---- */
  var R = {
    '10': function (r) { return 2 * Math.exp(-r); },
    '20': function (r) { return (2 - r) * Math.exp(-r / 2) / (2 * Math.SQRT2); },
    '21': function (r) { return r * Math.exp(-r / 2) / (2 * Math.sqrt(6)); },
    '30': function (r) { return (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3) * 2 / (81 * Math.sqrt(3)); },
    '31': function (r) { return (6 * r - r * r) * Math.exp(-r / 3) * 4 / (81 * Math.sqrt(6)); },
    '32': function (r) { return r * r * Math.exp(-r / 3) * 4 / (81 * Math.sqrt(30)); }
  };

  /* ---- real spherical harmonics, on a unit direction ---- */
  var Y = {
    s:    function () { return 1; },
    pz:   function (x, y, z) { return z; },
    dz2:  function (x, y, z) { return 3 * z * z - 1; },
    dxy:  function (x, y, z) { return 2 * x * y; }
  };
  var YMAX2 = { s: 1, pz: 1, dz2: 4, dxy: 1 };

  /* The orbitals offered, in the order a reader should meet them: one
     shell, then more shells, then shapes. */
  var ORB = [
    { id: '1s',   nl: '10', ang: 's',   rmax: 6,   label: '۱s',      fa: 'اوربیتال ۱s' },
    { id: '2s',   nl: '20', ang: 's',   rmax: 16,  label: '۲s',      fa: 'اوربیتال ۲s' },
    { id: '2pz',  nl: '21', ang: 'pz',  rmax: 16,  label: '۲p',      fa: 'اوربیتال ۲p' },
    { id: '3s',   nl: '30', ang: 's',   rmax: 30,  label: '۳s',      fa: 'اوربیتال ۳s' },
    { id: '3pz',  nl: '31', ang: 'pz',  rmax: 30,  label: '۳p',      fa: 'اوربیتال ۳p' },
    { id: '3dz2', nl: '32', ang: 'dz2', rmax: 30,  label: '۳d_z²',   fa: 'اوربیتال ۳d (z²)' },
    { id: '3dxy', nl: '32', ang: 'dxy', rmax: 30,  label: '۳d_xy',   fa: 'اوربیتال ۳d (xy)' }
  ];

  /* radial CDF, built once per orbital, so drawing a radius is a binary
     search rather than a rejection loop */
  var STEPS = 700;
  ORB.forEach(function (o) {
    var f = R[o.nl], cdf = new Float32Array(STEPS + 1), acc = 0;
    var nodes = 0, prev = 0;
    for (var i = 0; i <= STEPS; i++) {
      var r = o.rmax * i / STEPS, v = f(r);
      acc += r * r * v * v;
      cdf[i] = acc;
      if (i > 1 && prev * v < 0) nodes++;         /* radial nodes, counted */
      prev = v;
    }
    for (var k = 0; k <= STEPS; k++) cdf[k] /= acc;
    o.cdf = cdf;
    o.nodes = nodes;
    /* the mean radius, which is what "how big is this orbital" means */
    var num = 0, den = 0;
    for (var j = 0; j <= STEPS; j++) {
      var rr = o.rmax * j / STEPS, vv = f(rr), w = rr * rr * vv * vv;
      num += rr * w; den += w;
    }
    o.rMean = num / den;
  });

  function drawR(o) {
    var u = Math.random(), lo = 0, hi = STEPS;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (o.cdf[mid] < u) lo = mid + 1; else hi = mid; }
    return o.rmax * lo / STEPS;
  }

  NVXExperiment.scene('atoms', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(44, ctx.width / ctx.height, 0.5, 6000);

    var MAX = 5200;
    var positions = new Float32Array(MAX * 3);
    var colors = new Float32Array(MAX * 3);

    var geo = new THREE.BufferGeometry();
    var pAttr = new THREE.BufferAttribute(positions, 3);
    var cAttr = new THREE.BufferAttribute(colors, 3);
    pAttr.setUsage && pAttr.setUsage(THREE.DynamicDrawUsage);
    cAttr.setUsage && cAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pAttr);
    geo.setAttribute('color', cAttr);

    var cloud = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.5, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.8, depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    cloud.frustumCulled = false;
    scene.add(cloud);

    /* the nucleus (or two of them) */
    var nucGeo = new THREE.SphereGeometry(2.6, 20, 14);
    var nucMat = new THREE.MeshBasicMaterial({ color: 0xFFD9CF });
    var nucA = new THREE.Mesh(nucGeo, nucMat), nucB = new THREE.Mesh(nucGeo, nucMat);
    nucB.visible = false;
    scene.add(nucA, nucB);

    /* the axis the shapes are defined against — a p orbital points along
       something, and without the something it is just a blob */
    var axGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -170, 0), new THREE.Vector3(0, 170, 0)]);
    var axis = new THREE.Line(axGeo, new THREE.LineBasicMaterial({
      color: 0x8FDBFF, transparent: true, opacity: 0.16 }));
    scene.add(axis);

    var POS = new THREE.Color(0xFF5A4A);          /* psi > 0 */
    var NEG = new THREE.Color(0x4C8DFF);          /* psi < 0 */

    var count = 0, refresh = 0, mode = 'atom', orb = ORB[0];
    var state = { orbital: ORB[0], nodes: 0, rMean: 0, mode: 'atom', bonding: true, pm: 0 };

    /* ---- one sample of a single-atom orbital ---- */
    function sampleAtom(i, cut) {
      var f = R[orb.nl], ang = Y[orb.ang], ymax2 = YMAX2[orb.ang];
      var r = drawR(orb), dx, dy, dz, a = 0;
      /* direction from |Y|^2 by rejection — cheap at these l */
      for (var t = 0; t < 40; t++) {
        var u = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, sr = Math.sqrt(1 - u * u);
        dx = sr * Math.cos(ph); dy = sr * Math.sin(ph); dz = u;
        a = ang(dx, dy, dz);
        if (Math.random() * ymax2 <= a * a) break;
      }
      var sgn = f(r) * a;
      var x = dx * r * SCALE, y = dz * r * SCALE, z = dy * r * SCALE;   /* dz is up on screen */

      /* The cutaway keeps a slab through the middle, which is the only way
         the hollow shells inside 3s are visible from outside. It has to be
         normal to the *depth* axis: slicing across the screen instead
         leaves the slab edge-on to the default camera, which looks like a
         thinned-out cloud rather than a cross-section. */
      if (cut < 0.98 && Math.abs(dy * r) > cut * orb.rmax) return false;
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      var c = sgn >= 0 ? POS : NEG;
      var fade = 0.35 + 0.65 * Math.min(1, 1.6 * Math.exp(-r / (orb.rMean * 1.3)));
      colors[i * 3] = c.r * fade; colors[i * 3 + 1] = c.g * fade; colors[i * 3 + 2] = c.b * fade;
      return true;
    }

    /* ---- one sample of the two-atom combination ----
       Rejection against |psi_A +/- psi_B|^2 in a snug box, so the node of
       the antibonding combination is there because the maths puts it
       there and not because it was drawn in. */
    /* ---- one sample of the two-atom combination ----

       Importance sampling, not rejection in a box. The box version looked
       correct and was correct, and still drew almost nothing: the cloud
       occupies about one percent of any box that contains it, so at ~0.9%
       acceptance more than half of the attempts ran out of tries and the
       chapter rendered two bare nuclei.

       So the proposal is the thing we already know how to draw from
       exactly — a point distributed as one atom's own |psi_1s|^2, using
       the same radial CDF as every other orbital here — and the weight
       corrects it to the molecular density:

           w = |psi_A +/- psi_B|^2 / (|psi_A|^2 + |psi_B|^2)

       which is at most 2, reached where the two atoms contribute equally
       and in phase. Accepting with probability w/2 is exact, and lands
       around 45% instead of 0.9%.

       The node of the antibonding combination is still there because the
       maths puts it there: where psi_A equals psi_B the difference is
       zero, w is zero, and nothing is ever placed. */
    var H1S = ORB[0];
    function sampleMol(i, half, bonding, cut) {
      var sign = bonding ? 1 : -1;
      for (var t = 0; t < 24; t++) {
        var side = Math.random() < 0.5 ? -1 : 1;
        var r = drawR(H1S);
        var u = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, sr = Math.sqrt(1 - u * u);
        var x = side * half + sr * Math.cos(ph) * r,
            y = sr * Math.sin(ph) * r,
            z = u * r;

        var ra = Math.sqrt((x + half) * (x + half) + y * y + z * z);
        var rb = Math.sqrt((x - half) * (x - half) + y * y + z * z);
        var a = Math.exp(-ra), b = Math.exp(-rb);
        var psi = a + sign * b;
        var w = (psi * psi) / (a * a + b * b + 1e-12);
        if (Math.random() * 2 > w) continue;
        /* normal to the depth axis, matching the single-atom cutaway, so
           the slice faces the default camera instead of being edge-on */
        if (cut < 0.98 && Math.abs(y) > cut * 4.6) continue;

        positions[i * 3] = x * SCALE; positions[i * 3 + 1] = z * SCALE; positions[i * 3 + 2] = y * SCALE;
        var c = psi >= 0 ? POS : NEG;
        var fade = 0.34 + 0.66 * Math.min(1, w * 0.62);
        colors[i * 3] = c.r * fade; colors[i * 3 + 1] = c.g * fade; colors[i * 3 + 2] = c.b * fade;
        return true;
      }
      return false;
    }

    function place(i, p) {
      var ok = mode === 'mol'
        ? sampleMol(i, p.bond / 2, p.phase >= 0.5, p.cut)
        : sampleAtom(i, p.cut);
      if (!ok) { positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 1e6; }
    }

    var anchors = {
      nucleus: { position: new THREE.Vector3(0, 0, 0), hidden: false, dim: true, text: 'هسته' }
    };

    var lastOrb = -1, lastMode = '', lastCount = -1;

    return {
      scene: scene,
      camera: camera,
      anchors: anchors,
      state: state,

      chapter: function (id) {
        mode = (id === 'bond') ? 'mol' : 'atom';
        state.mode = mode;
        axis.visible = mode === 'atom';
        nucB.visible = mode === 'mol';
      },

      update: function (dt, t, p) {
        var idx = Math.max(0, Math.min(ORB.length - 1, Math.round(p.orbital)));
        orb = ORB[idx];
        state.orbital = orb;
        state.nodes = orb.nodes;
        state.rMean = orb.rMean;
        state.bonding = p.phase >= 0.5;
        state.pm = orb.rMean * A0_PM;

        var want = Math.min(MAX, Math.round(p.samples * 520));
        if (idx !== lastOrb || mode !== lastMode || want !== lastCount) {
          count = want;
          for (var i = 0; i < count; i++) place(i, p);
          geo.setDrawRange(0, count);
          lastOrb = idx; lastMode = mode; lastCount = want;
        }

        if (mode === 'mol') {
          nucA.position.x = -p.bond / 2 * SCALE;
          nucB.position.x = p.bond / 2 * SCALE;
          anchors.nucleus.position.set(nucA.position.x, 20, 0);
        } else {
          nucA.position.set(0, 0, 0);
          anchors.nucleus.position.set(0, 16, 0);
        }

        /* Resample a slice every frame. The whole cloud turns over about
           three times a second, which is what makes it read as a
           distribution being sampled rather than an object being moved. */
        var slice = Math.max(1, Math.round(count * Math.min(0.3, dt * 3)));
        for (var n = 0; n < slice; n++) {
          refresh = (refresh + 1) % Math.max(1, count);
          place(refresh, p);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      reset: function () { lastOrb = -1; },
      dispose: function () { geo.dispose(); nucGeo.dispose(); axGeo.dispose(); }
    };
  });
})();
