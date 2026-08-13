/* =====================================================================
   SPACE-TIME — curvature as an embedding diagram.

   A sheet of grid lines sagging around a mass, with a test particle
   orbiting in the well. It is the picture everyone has seen, and it is
   worth being exact about what it is and is not, because the page's prose
   makes the same point in words:

     - The sheet is a two-dimensional *slice* of space, drawn bulging into
       a third dimension that does not exist. It is a way of plotting the
       spatial geometry, not a picture of gravity pulling downward.
     - The depth used here is Flamm's paraboloid, the real embedding of
       the Schwarzschild spatial slice: z proportional to sqrt(r - rs).
       Softened near the centre so a single vertex does not shoot to
       infinity, which is a drawing decision, not physics.
     - The orbiting particle is on a circular Keplerian orbit, which is
       the weak-field limit. It is not solving the geodesic equation.

   The time-dilation figure in the readout, however, is the real
   Schwarzschild factor, so the number a reader takes away is true.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  NVXExperiment.scene('space-time', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070B, 0.0022);

    var camera = new THREE.PerspectiveCamera(42, ctx.width / ctx.height, 1, 4000);
    /* far enough back that the full 460-unit sheet clears the frame at
       this field of view, and high enough to look down into the well
       rather than along the surface */
    camera.position.set(0, 300, 404);
    camera.lookAt(0, -96, 0);

    /* ---- the sheet ----
       Drawn as lines rather than a filled surface: a grid says "this is a
       coordinate system being deformed", a solid says "this is a rubber
       sheet", and only the first one is what a metric means. */
    var SPAN = 420, N = 44;                     /* 44x44 cells, ~3.9k verts */
    /* Vertical exaggeration. Flamm's paraboloid at these radii is a
       shallow dish, and a shallow dish photographs as a flat sheet — the
       well has to be readable as a well. The shape is the real one; only
       the scale on one axis is stretched, which is what an embedding
       diagram is free to do since that axis is not a real direction. */
    var EXAG = 2.15;
    var geo = new THREE.BufferGeometry();
    var pos = [], idx = [], base = [];
    for (var j = 0; j <= N; j++) {
      for (var i = 0; i <= N; i++) {
        var x = (i / N - 0.5) * SPAN, z = (j / N - 0.5) * SPAN;
        base.push(x, z);
        pos.push(x, 0, z);
      }
    }
    for (var j2 = 0; j2 <= N; j2++) {
      for (var i2 = 0; i2 <= N; i2++) {
        var a = j2 * (N + 1) + i2;
        if (i2 < N) idx.push(a, a + 1);
        if (j2 < N) idx.push(a, a + N + 1);
      }
    }
    var posAttr = new THREE.Float32BufferAttribute(pos, 3);
    posAttr.setUsage && posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setIndex(idx);

    var grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0x3E6BA8, transparent: true, opacity: 0.5
    }));
    scene.add(grid);

    /* ---- the mass ---- */
    var mass = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xE31B23 })
    );
    scene.add(mass);
    var halo = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xE31B23, transparent: true, opacity: 0.13 })
    );
    scene.add(halo);

    /* ---- the test particle and the path it has taken ---- */
    var probe = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xEDF2FA })
    );
    scene.add(probe);

    var TRAIL = 150;
    var trailGeo = new THREE.BufferGeometry();
    var trailPos = new Float32Array(TRAIL * 3);
    var tAttr = new THREE.BufferAttribute(trailPos, 3);
    tAttr.setUsage && tAttr.setUsage(THREE.DynamicDrawUsage);
    trailGeo.setAttribute('position', tAttr);
    var trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
      color: 0x8FDBFF, transparent: true, opacity: 0.5
    }));
    trail.frustumCulled = false;
    scene.add(trail);
    var trailN = 0;

    /* ---- a few stars, so the sheet is clearly sitting in space ---- */
    var sGeo = new THREE.BufferGeometry(), sp = [];
    for (var s = 0; s < 260; s++) {
      var r = 700 + Math.random() * 1400, th = Math.random() * Math.PI * 2,
          ph = Math.acos(2 * Math.random() - 1);
      sp.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.55 + 120, r * Math.sin(ph) * Math.sin(th));
    }
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0x9FB6D8, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.5
    })));

    var px = 0, py = 0, theta = 0;

    /* Flamm's paraboloid: z = 2*sqrt(rs*(r - rs)), which *rises* with r —
       the throat is the low point and the surface flares out to flat.
       Everything below plots it relative to the rim, so the far field
       sits at zero and the well hangs beneath it.

       Getting the sqrt argument wrong here is not a cosmetic slip: with
       sqrt(r) instead of sqrt(r - rs) the whole sheet inverts and the
       mass sits on top of a hill, which says the exact opposite of what
       the page says. rs is the Schwarzschild radius in the arbitrary
       units the sheet is drawn in. */
    var RIM = SPAN * 0.72;
    function depth(r, rs) {
      var soft = Math.max(r - rs, rs * 0.05);   /* stay off the singular throat */
      return 2 * Math.sqrt(rs) * Math.sqrt(soft) * EXAG;
    }

    function shape(rs) {
      var p = geo.attributes.position.array;
      for (var k = 0, b = 0; k < p.length; k += 3, b += 2) {
        var x = base[b], z = base[b + 1];
        var r = Math.sqrt(x * x + z * z) + 0.0001;
        p[k + 1] = depth(r, rs) - depth(RIM, rs);
      }
      geo.attributes.position.needsUpdate = true;
    }

    var lastRs = -1;

    return {
      scene: scene,
      camera: camera,

      update: function (dt, t, p) {
        var rs = p.mass;                          /* Schwarzschild radius */
        var orbit = p.orbit;                      /* orbital radius       */

        if (rs !== lastRs) { shape(rs); lastRs = rs; }

        mass.scale.setScalar(rs);
        halo.scale.setScalar(rs * 3.4);
        mass.position.y = depth(rs * 1.06, rs) - depth(RIM, rs);
        halo.position.y = mass.position.y;

        /* circular orbit, weak-field: omega = sqrt(GM/r^3), and with
           GM = rs/2 in these units the speed falls off as it should */
        var omega = Math.sqrt(Math.max(rs, 0.001) * 0.5 / Math.pow(orbit, 3));
        theta += omega * dt * 62;

        var ox = Math.cos(theta) * orbit, oz = Math.sin(theta) * orbit;
        probe.position.set(ox, depth(orbit, rs) - depth(RIM, rs) + 4, oz);

        /* the trail is a ring buffer drawn as one polyline */
        if (dt > 0) {
          for (var i = TRAIL - 1; i > 0; i--) {
            trailPos[i * 3]     = trailPos[(i - 1) * 3];
            trailPos[i * 3 + 1] = trailPos[(i - 1) * 3 + 1];
            trailPos[i * 3 + 2] = trailPos[(i - 1) * 3 + 2];
          }
          trailPos[0] = probe.position.x;
          trailPos[1] = probe.position.y;
          trailPos[2] = probe.position.z;
          if (trailN < TRAIL) trailN++;
          trailGeo.setDrawRange(0, trailN);
          trailGeo.attributes.position.needsUpdate = true;
        }

        /* the pointer tilts the view; it never takes the camera over */
        var ty = 300 - py * 78, tz = 404 + py * 40;
        camera.position.x += (px * 84 - camera.position.x) * Math.min(1, dt * 3);
        camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 3);
        camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 3);
        camera.lookAt(0, -96, 0);
      },

      resize: function (w, h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },

      pointer: function (x, y) { px = x; py = y; },

      reset: function () {
        theta = 0; trailN = 0;
        trailPos.fill(0);
        trailGeo.setDrawRange(0, 0);
        px = py = 0;
      },

      dispose: function () {
        geo.dispose(); trailGeo.dispose(); sGeo.dispose();
      }
    };
  });
})();
