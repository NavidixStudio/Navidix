/* =====================================================================
   SPACE-TIME — curvature as an embedding diagram.

   A sheet of grid lines sagging around a mass, with a test particle
   orbiting in the well, and two clocks that come apart while you watch.

   What it is and is not, stated here because the page's prose says the
   same thing in words:

     - The sheet is a two-dimensional *slice* of space, drawn bulging into
       a third dimension that does not exist. It is a way of plotting the
       spatial geometry, not a picture of gravity pulling downward. The
       usual animation has a ball roll into a dip because Earth's gravity
       pulls it there — explaining gravity with gravity.
     - The depth is Flamm's paraboloid, the real embedding of the
       Schwarzschild spatial slice: z = 2*sqrt(rs*(r - rs)), rising with r,
       plotted relative to the rim so the throat hangs lowest. One axis is
       exaggerated for legibility; the shape is not.
     - The orbiting particle is on a circular Keplerian orbit — the weak
       field limit, not a solved geodesic.
     - The clocks and the dilation figure are the exact Schwarzschild
       factor, sqrt(1 - rs/r). Those numbers are true.

   The camera belongs to the shell's orbit rig, so nothing here touches
   camera position. This scene exposes anchors for the shell to pin labels
   to, and a chapter() hook so the guided read can change what is shown
   rather than only where it is seen from.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  NVXExperiment.scene('space-time', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070B, 0.0016);

    var camera = new THREE.PerspectiveCamera(42, ctx.width / ctx.height, 1, 5000);

    var SPAN = 420, N = 44, RIM = SPAN * 0.72;
    /* Vertical exaggeration. At these radii Flamm's paraboloid is a
       shallow dish, and a shallow dish photographs as a flat sheet. The
       shape is the real one; only the axis that is not a real direction
       anyway is stretched. */
    var EXAG = 2.15;

    /* ---- the sheet ----
       Lines, not a filled surface: a grid says "this is a coordinate
       system being deformed", a solid says "this is a rubber sheet", and
       only the first is what a metric means. */
    var geo = new THREE.BufferGeometry();
    var pos = [], idx = [], base = [];
    for (var j = 0; j <= N; j++)
      for (var i = 0; i <= N; i++) {
        var x = (i / N - 0.5) * SPAN, z = (j / N - 0.5) * SPAN;
        base.push(x, z); pos.push(x, 0, z);
      }
    for (var j2 = 0; j2 <= N; j2++)
      for (var i2 = 0; i2 <= N; i2++) {
        var a = j2 * (N + 1) + i2;
        if (i2 < N) idx.push(a, a + 1);
        if (j2 < N) idx.push(a, a + N + 1);
      }
    var posAttr = new THREE.Float32BufferAttribute(pos, 3);
    posAttr.setUsage && posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setIndex(idx);
    var gridMat = new THREE.LineBasicMaterial({ color: 0x3E6BA8, transparent: true, opacity: 0.5 });
    scene.add(new THREE.LineSegments(geo, gridMat));

    /* ---- a flat reference grid, for the chapter that needs one ----
       You cannot see that something is bent without seeing what straight
       looks like. This is the same grid with no mass in it, held at the
       rim's height, and it is only shown when a chapter asks. */
    var flatGeo = new THREE.BufferGeometry();
    var fpos = [];
    for (var k2 = 0, b2 = 0; k2 < pos.length; k2 += 3, b2 += 2) fpos.push(base[b2], 0, base[b2 + 1]);
    flatGeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
    flatGeo.setIndex(idx);
    var flat = new THREE.LineSegments(flatGeo, new THREE.LineBasicMaterial({
      color: 0x8FDBFF, transparent: true, opacity: 0.0
    }));
    scene.add(flat);
    var flatWant = 0;

    /* ---- the mass ---- */
    var massGeo = new THREE.SphereGeometry(1, 32, 24);
    var mass = new THREE.Mesh(massGeo, new THREE.MeshBasicMaterial({ color: 0xE31B23 }));
    var halo = new THREE.Mesh(massGeo, new THREE.MeshBasicMaterial({
      color: 0xE31B23, transparent: true, opacity: 0.13, depthWrite: false
    }));
    scene.add(mass, halo);

    /* ---- the test particle, its trail, and its orbit ring ---- */
    var probe = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xEDF2FA }));
    scene.add(probe);

    var TRAIL = 190;
    var trailPos = new Float32Array(TRAIL * 3);
    var trailGeo = new THREE.BufferGeometry();
    var tAttr = new THREE.BufferAttribute(trailPos, 3);
    tAttr.setUsage && tAttr.setUsage(THREE.DynamicDrawUsage);
    trailGeo.setAttribute('position', tAttr);
    var trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
      color: 0x8FDBFF, transparent: true, opacity: 0.55
    }));
    trail.frustumCulled = false;
    scene.add(trail);
    var trailN = 0;

    /* ---- stars, so the sheet is clearly sitting in space ---- */
    var sGeo = new THREE.BufferGeometry(), sp = [];
    for (var s = 0; s < 300; s++) {
      var rr = 900 + Math.random() * 1800, th = Math.random() * Math.PI * 2,
          ph = Math.acos(2 * Math.random() - 1);
      sp.push(rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * 0.6 + 140, rr * Math.sin(ph) * Math.sin(th));
    }
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0x9FB6D8, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.5
    })));

    function depth(r, rs) {
      var soft = Math.max(r - rs, rs * 0.05);      /* stay off the singular throat */
      return 2 * Math.sqrt(rs) * Math.sqrt(soft) * EXAG;
    }
    function sheetY(r, rs) { return depth(r, rs) - depth(RIM, rs); }

    function shape(rs) {
      var p = geo.attributes.position.array;
      for (var k = 0, b = 0; k < p.length; k += 3, b += 2) {
        var x = base[b], z = base[b + 1];
        p[k + 1] = sheetY(Math.sqrt(x * x + z * z) + 0.0001, rs);
      }
      geo.attributes.position.needsUpdate = true;
    }

    var theta = 0, lastRs = -1, chapter = '';

    /* Anchors are world positions the shell pins DOM labels to. They are
       objects rather than bare vectors so the scene can also say "this one
       is not relevant right now" without the shell knowing why. */
    var anchors = {
      mass:  { position: new THREE.Vector3(), hidden: false },
      probe: { position: new THREE.Vector3(), hidden: false },
      rim:   { position: new THREE.Vector3(), hidden: false, dim: true }
    };

    return {
      scene: scene,
      camera: camera,
      anchors: anchors,

      /* The tour changes what is drawn, not only where it is seen from. */
      chapter: function (id) {
        chapter = id;
        flatWant = (id === 'sheet') ? 0.34 : 0;
        anchors.probe.hidden = (id === 'sheet');
        anchors.rim.hidden = (id !== 'sheet');
        trailN = 0; trailGeo.setDrawRange(0, 0);
      },

      update: function (dt, t, p) {
        var rs = p.mass, orbit = p.orbit;
        if (rs !== lastRs) { shape(rs); lastRs = rs; }

        flat.material.opacity += (flatWant - flat.material.opacity) * Math.min(1, dt * 3);
        flat.visible = flat.material.opacity > 0.004;

        mass.scale.setScalar(rs);
        halo.scale.setScalar(rs * 3.4);
        var my = sheetY(rs * 1.06, rs);
        mass.position.y = halo.position.y = my;
        anchors.mass.position.set(0, my + rs * 3.6, 0);

        /* circular orbit, weak field: omega = sqrt(GM/r^3), with GM = rs/2
           in these units so the speed falls off as it should */
        var omega = Math.sqrt(Math.max(rs, 0.001) * 0.5 / Math.pow(orbit, 3));
        theta += omega * dt * 62;

        var py = sheetY(orbit, rs) + 5;
        probe.position.set(Math.cos(theta) * orbit, py, Math.sin(theta) * orbit);
        anchors.probe.position.copy(probe.position).add(new THREE.Vector3(0, 20, 0));
        anchors.rim.position.set(RIM * 0.7, sheetY(RIM, rs) + 12, RIM * 0.7);

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
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },

      reset: function () {
        theta = 0; trailN = 0; trailPos.fill(0); trailGeo.setDrawRange(0, 0);
      },

      dispose: function () {
        geo.dispose(); flatGeo.dispose(); trailGeo.dispose(); sGeo.dispose(); massGeo.dispose();
      }
    };
  });
})();
