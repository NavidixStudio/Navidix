/* =====================================================================
   FROM HUMAN TO MACHINE — two lineages on one real time axis.

   THE SCIENTIFIC CONSTRAINT THIS WAS BUILT AROUND

   Technology is not the next step of human biological evolution. It is
   not our descendant and we are not its ancestor in any evolutionary
   sense. Biological evolution is descent with modification through
   inheritance — it needs populations, generations and heritable
   variation. A tool has none of those. A hand axe has no offspring; a
   transistor was not born from an earlier transistor, someone *made* it.
   The artefact lineage is one of design and copying, and the two
   processes only look alike because both branch and both accumulate.

   So this draws two tracks that never merge. The lower one is biology:
   continuous, running the full width, and it does not stop, thin out or
   hand over at any point. The upper one is artefacts, and every node on
   it is tied back down by a thin authorship line to the people who made
   it — the line that separates "was made" from "was born".

   WHY THERE IS REAL DATA IN HERE

   The first version of this scene was a shape: evenly spaced dots on one
   rail, contracting dots on the other, with a slider to exaggerate the
   contraction. It illustrated a claim rather than showing one. Every
   position below is now a real date, so the acceleration is not a
   parameter someone chose — it is what the dates do.

   And that turns the zoom into the lesson. At the full span of our
   species every technological milestone collapses into an invisible
   sliver at the right-hand edge; you cannot see any of it until you fly
   in. That is not a rendering limitation, it is the point, and it is a
   thing a reader discovers by moving a control rather than by being told.

   The biological track carries real dates too, and that is deliberate:
   the second half of the wrong picture is that human evolution stopped
   when culture started. Lactase persistence, the malaria-resistance
   alleles and the high-altitude adaptations are all more recent than
   agriculture. Zoom into the last ten thousand years and *both* tracks
   have events in it.

   Dates are approximate and rounded, as dates at this scale have to be;
   the ones with live scholarly disagreement are flagged in the page's
   prose rather than presented as settled.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  /* years before present, rounded. present = 2020s. */
  var TECH = [
    { t: 300000, n: 'ابزار سنگی پیچیده' },
    { t: 45000,  n: 'هنر غار و نمادپردازی' },
    { t: 12000,  n: 'کشاورزی' },
    { t: 5200,   n: 'نوشتار' },
    { t: 576,    n: 'چاپ با حروف متحرک' },
    { t: 250,    n: 'موتور بخار' },
    { t: 144,    n: 'برق شهری' },
    { t: 79,     n: 'ترانزیستور' },
    { t: 57,     n: 'آرپانت' },
    { t: 35,     n: 'وب جهان‌گستر' },
    { t: 19,     n: 'گوشی هوشمند' },
    { t: 8,      n: 'مدل‌های زبانی بزرگ' }
  ];

  /* Documented recent adaptations in human populations — the evidence
     that the lower track is still running. */
  var BIO = [
    { t: 300000, n: 'انسان خردمند آناتومیک' },
    { t: 7500,   n: 'تداوم لاکتاز' },
    { t: 7300,   n: 'مقاومت در برابر مالاریا' },
    { t: 4000,   n: 'سازگاری با ارتفاع' }
  ];

  var GEN = 25;                                  /* years per human generation */

  NVXExperiment.scene('human-to-machine', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070B, 0.0011);
    var camera = new THREE.PerspectiveCamera(40, ctx.width / ctx.height, 1, 4000);

    /* The gap between the rails carries the argument, but 124 units of it
       left a dead band across the middle of the frame with two thin lines
       stranded at the edges. At 88 the two tracks read as one diagram
       with two rows, which is what they are. */
    var SPAN = 372, BIO_Y = -44, TECH_Y = 44;

    function lineMat(c, o) { return new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o }); }

    /* ---- the two rails ---- */
    function rail(y, mat) {
      var g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-SPAN / 2, y, 0), new THREE.Vector3(SPAN / 2, y, 0)]);
      var l = new THREE.Line(g, mat);
      scene.add(l);
      return g;
    }
    var bioRailGeo = rail(BIO_Y, lineMat(0x8FDBFF, 0.5));
    /* The artefact rail is drawn only across the part of the window where
       artefacts actually exist. It is not a thing that has always been
       there, and a rail running off both edges would say it was. */
    var techRailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    var techRail = new THREE.Line(techRailGeo, lineMat(0xFF6A5A, 0.42));
    techRail.frustumCulled = false;
    scene.add(techRail);

    /* ---- generation ticks: the rate biology actually runs at ----
       Drawn only when the window is short enough for them to be
       countable. Past that they would be a solid bar pretending to be
       information, and the readout gives the number instead. */
    var TICKS = 90, tickGeo = new THREE.BufferGeometry();
    var tickPos = new Float32Array(TICKS * 6);
    var tAttr = new THREE.BufferAttribute(tickPos, 3);
    tAttr.setUsage && tAttr.setUsage(THREE.DynamicDrawUsage);
    tickGeo.setAttribute('position', tAttr);
    var ticks = new THREE.LineSegments(tickGeo, lineMat(0x8FDBFF, 0.3));
    ticks.frustumCulled = false;
    scene.add(ticks);

    /* ---- event nodes, pooled ---- */
    var nodeGeo = new THREE.SphereGeometry(1, 16, 12);
    function pool(n, color) {
      var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
      var arr = [];
      for (var i = 0; i < n; i++) {
        var m = new THREE.Mesh(nodeGeo, mat);
        m.visible = false; scene.add(m); arr.push(m);
      }
      return arr;
    }
    var techNodes = pool(TECH.length, 0xE31B23);
    var bioNodes = pool(BIO.length, 0x8FDBFF);

    /* one authorship line per artefact */
    var authorMat = lineMat(0x9AA6BC, 0.22), authors = [];
    for (var a = 0; a < TECH.length; a++) {
      var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      var l = new THREE.Line(g, authorMat);
      l.frustumCulled = false; l.visible = false;
      scene.add(l); authors.push(l);
    }

    /* the present, marked once */
    var nowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(SPAN / 2, BIO_Y - 26, 0), new THREE.Vector3(SPAN / 2, TECH_Y + 26, 0)]);
    scene.add(new THREE.Line(nowGeo, lineMat(0xFFFFFF, 0.3)));

    /* a quiet field behind it */
    var fg = new THREE.BufferGeometry(), fp = [];
    for (var f = 0; f < 240; f++)
      fp.push((Math.random() - 0.5) * 1100, (Math.random() - 0.5) * 500, -160 - Math.random() * 620);
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({
      color: 0x5A6B88, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.5
    })));

    var anchors = {
      techA: { position: new THREE.Vector3(), hidden: true, text: '' },
      techB: { position: new THREE.Vector3(), hidden: true, text: '' },
      bioA:  { position: new THREE.Vector3(), hidden: true, text: '', dim: true },
      /* Below the axis, not above it. The two most recent artefacts are
         always crowded into the right-hand end, and a label for "now"
         sitting up there collided with them at every zoom level. */
      now:   { position: new THREE.Vector3(SPAN / 2, BIO_Y - 42, 0), hidden: false, dim: true, text: 'اکنون' }
    };

    /* live figures the page reads for its readout — one source, so the
       picture and the numbers cannot drift apart */
    var state = { span: 0, tech: 0, bio: 0, generations: 0, ticksShown: false };
    var chapter = '';

    function xOf(yearsAgo, span) { return (1 - yearsAgo / span) * SPAN - SPAN / 2; }

    return {
      scene: scene,
      camera: camera,
      anchors: anchors,
      state: state,

      chapter: function (id) { chapter = id; },

      update: function (dt, t, p) {
        var span = Math.pow(10, p.window);
        state.span = span;
        state.generations = span / GEN;

        /* ---- artefacts ---- */
        var seen = 0, firstX = SPAN / 2, named = [];
        for (var i = 0; i < TECH.length; i++) {
          var e = TECH[i], on = e.t <= span, m = techNodes[i];
          m.visible = on;
          authors[i].visible = false;
          if (!on) continue;
          seen++;
          var x = xOf(e.t, span);
          if (x < firstX) firstX = x;
          m.position.set(x, TECH_Y, 0);
          m.scale.setScalar(3.2 + (1 - e.t / span) * 1.1);
          named.push({ x: x, n: e.n });

          /* down to the people who made it */
          var show = (i / (TECH.length - 1)) <= p.links;
          authors[i].visible = show;
          if (show) {
            var arr = authors[i].geometry.attributes.position.array;
            arr[0] = x; arr[1] = TECH_Y - 4; arr[2] = 0;
            arr[3] = x; arr[4] = BIO_Y + 4;  arr[5] = 0;
            authors[i].geometry.attributes.position.needsUpdate = true;
          }
        }
        state.tech = seen;

        var tr = techRailGeo.attributes.position.array;
        tr[0] = firstX; tr[1] = TECH_Y; tr[2] = 0;
        tr[3] = SPAN / 2; tr[4] = TECH_Y; tr[5] = 0;
        techRailGeo.attributes.position.needsUpdate = true;
        techRail.visible = seen > 0;

        /* ---- biology ---- */
        var bseen = 0, lastBio = null;
        for (var j = 0; j < BIO.length; j++) {
          var b = BIO[j], bon = b.t <= span, bm = bioNodes[j];
          bm.visible = bon;
          if (!bon) continue;
          bseen++;
          var bx = xOf(b.t, span);
          bm.position.set(bx, BIO_Y, 0);
          bm.scale.setScalar(3.2);
          if (!lastBio || b.t < lastBio.t) lastBio = { t: b.t, x: bx, n: b.n };
        }
        state.bio = bseen;

        /* ---- generation ticks ---- */
        var gcount = span / GEN;
        var showTicks = gcount <= TICKS;
        state.ticksShown = showTicks;
        ticks.visible = showTicks;
        if (showTicks) {
          var n = Math.floor(gcount);
          for (var k = 0; k < TICKS; k++) {
            var o = k * 6;
            if (k < n) {
              var gx = xOf(k * GEN, span);
              tickPos[o] = gx; tickPos[o + 1] = BIO_Y - 7; tickPos[o + 2] = 0;
              tickPos[o + 3] = gx; tickPos[o + 4] = BIO_Y + 7; tickPos[o + 5] = 0;
            } else {
              tickPos[o] = tickPos[o + 3] = 0;
              tickPos[o + 1] = tickPos[o + 4] = BIO_Y;
              tickPos[o + 2] = tickPos[o + 5] = 0;
            }
          }
          tickGeo.attributes.position.needsUpdate = true;
        }

        /* ---- the two most recent artefacts get named, and the most
               recent biological adaptation, so the reader can see that
               both tracks have entries in the same window ---- */
        named.sort(function (u, v) { return v.x - u.x; });
        [['techA', 0], ['techB', 1]].forEach(function (pair) {
          var an = anchors[pair[0]], src = named[pair[1]];
          if (!src) { an.hidden = true; return; }
          an.hidden = false; an.text = src.n;
          an.position.set(src.x, TECH_Y + 20 + pair[1] * 30, 0);
        });
        if (lastBio) {
          anchors.bioA.hidden = false;
          anchors.bioA.text = lastBio.n;
          anchors.bioA.position.set(lastBio.x, BIO_Y - 20, 0);
        } else anchors.bioA.hidden = true;
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      reset: function () {},
      dispose: function () {
        nodeGeo.dispose(); tickGeo.dispose(); fg.dispose();
        bioRailGeo.dispose(); techRailGeo.dispose(); nowGeo.dispose();
        authors.forEach(function (l) { l.geometry.dispose(); });
      }
    };
  });
})();
