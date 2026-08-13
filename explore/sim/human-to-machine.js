/* =====================================================================
   FROM HUMAN TO MACHINE — two lineages, not one.

   The scientific constraint this scene was built around, and the reason
   it is drawn the way it is:

     Technology is not the next step of human biological evolution. It is
     not our descendant and we are not its ancestor in any evolutionary
     sense. Biological evolution is descent with modification through
     inheritance; a tool is an *artefact* — made, not born — and its
     lineage is one of design and copying, not of genes.

   So the picture is deliberately two tracks that never merge:

     the lower track   biology. Continuous, still running, and it does not
                       stop, thin out or hand over at any point. It runs
                       past the far end of the technological one.
     the upper track   artefacts. It does not begin at the start of the
                       diagram; it is emitted from the lower track, and
                       every node on it is joined back to the humans who
                       made it by a thin authorship line.

   The two things a reader should be able to read off it: the artefact
   track accelerates enormously while the biological one does not, and
   the artefact track is attached to the biological one all the way
   along — it never becomes free-standing, and biology never ends.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  NVXExperiment.scene('human-to-machine', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, ctx.width / ctx.height, 1, 3000);
    /* the diagram is 400 wide and must not run off either end — at this
       field of view that needs the camera a little further back than the
       span itself */
    camera.position.set(0, 6, 302);
    camera.lookAt(0, 0, 0);

    /* Sized so the two tracks fill the frame rather than floating in the
       middle of it: the span has to clear the horizontal field at this
       distance, and the gap between the tracks is what carries the whole
       point of the diagram, so it gets the height. */
    var SPAN = 350, BIO_Y = -60, TECH_Y = 60;

    function line(color, opacity) {
      return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
    }
    function seg(points, mat) {
      var g = new THREE.BufferGeometry().setFromPoints(points);
      return new THREE.Line(g, mat);
    }

    /* ---- the biological track: one unbroken line, end to end ---- */
    var bioPts = [];
    for (var i = 0; i <= 120; i++) {
      var x = (i / 120 - 0.5) * SPAN;
      bioPts.push(new THREE.Vector3(x, BIO_Y + Math.sin(i * 0.19) * 2.2, 0));
    }
    var bioLine = seg(bioPts, line(0x8FDBFF, 0.62));
    scene.add(bioLine);

    /* Nodes on it are evenly spaced in time — the point being that this
       track does not accelerate. */
    var BIO_N = 9, bioNodes = [];
    var nodeGeo = new THREE.SphereGeometry(2.6, 14, 10);
    var bioMat = new THREE.MeshBasicMaterial({ color: 0x8FDBFF });
    for (var b = 0; b < BIO_N; b++) {
      var m = new THREE.Mesh(nodeGeo, bioMat);
      m.position.set((b / (BIO_N - 1) - 0.5) * SPAN, BIO_Y, 0);
      scene.add(m); bioNodes.push(m);
    }

    /* ---- the artefact track ----
       Starts a third of the way along — there were humans long before
       there were tools — and its spacing contracts toward the present. */
    var TECH_N = 11, techNodes = [], techMat = new THREE.MeshBasicMaterial({ color: 0xE31B23 });
    var techGeo = new THREE.SphereGeometry(3.0, 14, 10);
    var authorMat = line(0x9AA6BC, 0.2);
    var authors = [];
    var techLine = null;

    for (var k = 0; k < TECH_N; k++) {
      var mm = new THREE.Mesh(techGeo, techMat);
      scene.add(mm); techNodes.push(mm);
      var a = seg([new THREE.Vector3(), new THREE.Vector3()], authorMat);
      a.frustumCulled = false;
      scene.add(a); authors.push(a);
    }

    /* the marker that walks the diagram */
    var nowMat = line(0xFFFFFF, 0.22);
    var now = seg([new THREE.Vector3(0, BIO_Y - 22, 0), new THREE.Vector3(0, TECH_Y + 24, 0)], nowMat);
    scene.add(now);

    /* a quiet field behind it all */
    var fg = new THREE.BufferGeometry(), fp = [];
    for (var f = 0; f < 220; f++)
      fp.push((Math.random() - 0.5) * 900, (Math.random() - 0.5) * 420, -120 - Math.random() * 500);
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({
      color: 0x5A6B88, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.5
    })));

    var px = 0, py = 0, techGeoLine = null;

    /* Node k sits at a fraction of the span that contracts by `accel`:
       with accel at 1 the spacing is even, and as it rises the later
       nodes crowd toward the present. Start is fixed at 0.34. */
    function techX(k, accel) {
      var u = k / (TECH_N - 1);
      var warped = Math.pow(u, accel);
      return (0.34 + warped * 0.66 - 0.5) * SPAN;
    }

    function rebuild(p) {
      var pts = [];
      for (var k = 0; k < TECH_N; k++) {
        var x = techX(k, p.accel);
        var y = TECH_Y - (1 - k / (TECH_N - 1)) * 10;
        techNodes[k].position.set(x, y, 0);
        techNodes[k].scale.setScalar(0.75 + (k / (TECH_N - 1)) * 0.85);
        pts.push(new THREE.Vector3(x, y, 0));

        /* the authorship line: back down to the biological track directly
           beneath, because every one of these was made by the people
           alive at that moment */
        var g = authors[k].geometry;
        var arr = g.attributes.position.array;
        arr[0] = x; arr[1] = y;            arr[2] = 0;
        arr[3] = x; arr[4] = BIO_Y + 1.6;  arr[5] = 0;
        g.attributes.position.needsUpdate = true;
        authors[k].visible = k / (TECH_N - 1) <= p.links;
      }
      if (techLine) { scene.remove(techLine); techLine.geometry.dispose(); }
      techGeoLine = new THREE.BufferGeometry().setFromPoints(pts);
      techLine = new THREE.Line(techGeoLine, line(0xFF6A5A, 0.55));
      scene.add(techLine);
    }

    var lastAccel = -1, lastLinks = -1;

    return {
      scene: scene,
      camera: camera,

      update: function (dt, t, p) {
        if (p.accel !== lastAccel || p.links !== lastLinks) {
          rebuild(p); lastAccel = p.accel; lastLinks = p.links;
        }

        /* the marker sweeps, and each track lights the nodes it has
           already passed — biology all the way across, artefacts only
           from where they actually begin */
        var u = (Math.sin(t * 0.34) * 0.5 + 0.5);
        var mx = (u - 0.5) * SPAN;
        now.position.x = mx;

        for (var b = 0; b < BIO_N; b++) {
          var on = bioNodes[b].position.x <= mx;
          bioNodes[b].scale.setScalar(on ? 1.25 : 0.85);
        }
        for (var k = 0; k < TECH_N; k++) {
          var base = 0.75 + (k / (TECH_N - 1)) * 0.85;
          techNodes[k].scale.setScalar(techNodes[k].position.x <= mx ? base * 1.3 : base * 0.8);
        }

        camera.position.x += (px * 46 - camera.position.x) * Math.min(1, dt * 3);
        camera.position.y += ((6 - py * 34) - camera.position.y) * Math.min(1, dt * 3);
        camera.position.z += ((302 + Math.abs(px) * 22) - camera.position.z) * Math.min(1, dt * 3);
        camera.lookAt(0, 0, 0);
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      pointer: function (x, y) { px = x; py = y; },
      reset: function () { px = py = 0; lastAccel = -1; },
      dispose: function () {
        nodeGeo.dispose(); techGeo.dispose(); fg.dispose();
        if (techGeoLine) techGeoLine.dispose();
      }
    };
  });
})();
