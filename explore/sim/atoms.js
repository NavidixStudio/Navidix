/* =====================================================================
   THE WORLD OF ATOMS & MOLECULES — a cloud, not an orbit.

   The single most common wrong picture of an atom is the one where
   electrons run round the nucleus like planets. That model was abandoned
   a century ago, and it is worth not reprinting it: an electron in an
   atom has no trajectory. What it has is an orbital — a distribution
   giving the probability of finding it in a region of space.

   So this scene never draws a path. It draws a cloud of samples, and the
   samples are redrawn constantly, because that is the honest visual
   grammar for a probability density: each dot is one possible answer to
   "where is it", not a particle at a location.

   The radial distribution is the real hydrogen 1s density, sampled by
   rejection against P(r) proportional to r^2 e^(-2r/a). Bring two nuclei
   together and density accumulates *between* them rather than staying on
   each — which is not a decoration, it is what a covalent bond is: a
   molecular orbital with electron density in the internuclear region,
   and the electrostatic attraction of both nuclei to that shared density
   is what holds the molecule together.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  NVXExperiment.scene('atoms', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(44, ctx.width / ctx.height, 0.5, 2000);
    camera.position.set(0, 20, 168);
    camera.lookAt(0, 0, 0);

    var MAX = 3000, A = 21;                     /* Bohr radius, in scene units */

    /* ---- sample a radius from the 1s radial distribution ----
       Rejection sampling against r^2 e^(-2r/a), whose mode is at r = a.
       Cheap, exact, and done once per point per refresh. */
    function radius1s() {
      var peak = 4 / (A * Math.E * Math.E) * A * A;   /* P(a) */
      for (var i = 0; i < 24; i++) {
        var r = Math.random() * A * 2.8;
        var p = r * r * Math.exp(-2 * r / A);
        if (Math.random() * peak * 1.02 < p) return r;
      }
      return A;
    }

    var positions = new Float32Array(MAX * 3);
    var colors = new Float32Array(MAX * 3);
    var side = new Uint8Array(MAX);             /* which nucleus a sample belongs to */

    var geo = new THREE.BufferGeometry();
    var pAttr = new THREE.BufferAttribute(positions, 3);
    pAttr.setUsage && pAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pAttr);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var cloud = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.6, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    cloud.frustumCulled = false;
    scene.add(cloud);

    /* ---- the two nuclei ---- */
    var nucGeo = new THREE.SphereGeometry(4.2, 22, 16);
    var nucMat = new THREE.MeshBasicMaterial({ color: 0xE31B23 });
    var nucA = new THREE.Mesh(nucGeo, nucMat), nucB = new THREE.Mesh(nucGeo, nucMat);
    scene.add(nucA); scene.add(nucB);

    var glowGeo = new THREE.SphereGeometry(9, 18, 14);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xE31B23, transparent: true, opacity: 0.12, depthWrite: false });
    var glowA = new THREE.Mesh(glowGeo, glowMat), glowB = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowA); scene.add(glowB);

    var COOL = new THREE.Color(0x2B6CFF), HOT = new THREE.Color(0x8FDBFF), BOND = new THREE.Color(0xFF6A5A);

    var count = 0, half = 0, bondStrength = 0, refresh = 0;

    /* One point: pick a side, pick a direction, pick a radius, then let
       the bond pull it toward the midpoint. The pull is stronger for
       samples that already sit on the inner face of their atom, which is
       what makes the density pile up between the nuclei instead of the
       whole cloud sliding across. */
    function place(i) {
      var s = side[i];
      var cx = s ? half : -half;
      var r = radius1s();
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      var sr = Math.sqrt(1 - u * u);
      var dx = sr * Math.cos(th), dy = sr * Math.sin(th), dz = u;

      var x = cx + dx * r, y = dy * r, z = dz * r;

      /* inward-facing samples get drawn toward the midpoint */
      var facing = s ? -dx : dx;                 /* 1 when pointing at the other nucleus */
      var pull = bondStrength * Math.max(0, facing) * 0.62;
      x += (0 - x) * pull; y += (0 - y) * pull * 0.5; z += (0 - z) * pull * 0.5;

      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;

      /* Colour reports where the density is. Bright at the core and
         falling outward — the other way round makes the sparse tail the
         loudest thing on screen and the cloud reads as uniform noise,
         which is the opposite of what a density plot is for. */
      var near = 1 - Math.min(1, r / (A * 2.4));
      var mid = 1 - Math.min(1, Math.abs(x) / (half + A * 0.7 + 0.001));
      var c = COOL.clone().lerp(HOT, near * near);
      if (bondStrength > 0.02) c.lerp(BOND, Math.min(0.85, mid * bondStrength));
      var fade = 0.25 + near * 0.75;
      c.multiplyScalar(fade);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    function reseed(p) {
      count = Math.min(MAX, Math.round(p.electrons * 320));
      for (var i = 0; i < count; i++) {
        side[i] = i % 2;
        place(i);
      }
      geo.setDrawRange(0, count);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    var px = 0, py = 0, spin = 0, lastE = -1;

    return {
      scene: scene,
      camera: camera,

      update: function (dt, t, p) {
        half = p.bond / 2;
        /* the bond only forms as the nuclei come within a couple of Bohr
           radii — far apart they are simply two atoms */
        bondStrength = Math.max(0, 1 - p.bond / (A * 2.6));

        if (p.electrons !== lastE) { reseed(p); lastE = p.electrons; }

        nucA.position.x = -half; nucB.position.x = half;
        glowA.position.x = -half; glowB.position.x = half;

        /* Resample a slice of the cloud every frame. The whole cloud is
           replaced about three times a second, which is what makes it
           read as a distribution being sampled rather than a solid object
           being moved. */
        var slice = Math.max(1, Math.round(count * Math.min(0.34, dt * 3.2)));
        for (var n = 0; n < slice; n++) {
          refresh = (refresh + 1) % Math.max(1, count);
          place(refresh);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;

        spin += dt * 0.16;
        cloud.rotation.y = spin;
        var gp = 1 + Math.sin(t * 1.6) * 0.06;
        glowA.scale.setScalar(gp); glowB.scale.setScalar(gp);

        camera.position.x += ((px * 46) - camera.position.x) * Math.min(1, dt * 3);
        camera.position.y += ((20 - py * 26) - camera.position.y) * Math.min(1, dt * 3);
        camera.lookAt(0, 0, 0);
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      pointer: function (x, y) { px = x; py = y; },
      reset: function () { px = py = 0; spin = 0; lastE = -1; },
      dispose: function () { geo.dispose(); nucGeo.dispose(); glowGeo.dispose(); }
    };
  });
})();
