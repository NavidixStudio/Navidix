/* =====================================================================
   THE HIDDEN NETWORK — an experiment, not an illustration.

   WHAT THIS SCENE IS FOR

   Networks that have nothing to do with each other — neurons, the
   internet, who knows whom, which protein binds which — keep turning out
   to share a structural habit: a few nodes with enormous numbers of
   connections, and a very long tail of nodes with almost none. Hubs.

   That similarity is interesting on its own, but it is not what makes
   this worth building. What makes it worth building is that the habit
   has a consequence you can *test*, and testing it is two buttons:

     remove nodes at random     the network barely notices
     remove the hubs first      the network falls apart

   And there is a control, which is the part most popular treatments
   leave out. Build a network where connections are spread evenly instead
   of concentrated, and the two attacks do the *same* thing. So the
   fragility is not a property of networks in general — it is a property
   of networks with hubs, which is the claim actually being made.

   The measurement is the standard one: the size of the largest connected
   component, computed here with union-find over whatever nodes are still
   alive. Not a proxy, not an animation of an idea — the number that
   network scientists use, recomputed as you drag.

   HOW THE TWO NETWORKS ARE BUILT

   Both have the same node count and the same edge count, so the
   comparison is fair and any difference is structural rather than a
   matter of one being denser.

     with hubs   preferential attachment (Barabasi-Albert). Each new node
                 attaches to existing ones with probability proportional
                 to how many connections they already have. Rich get
                 richer, and hubs appear without anyone placing them.
     even        each edge joins two nodes picked uniformly at random
                 (Erdos-Renyi). Degrees end up clustered around the mean;
                 no hubs.

   WHERE THIS IS OVERSTATED, WHICH MATTERS

   In the 2000s "everything is a scale-free network" became a very
   fashionable claim, and it was pushed much further than the evidence
   supported. Broido and Clauset's 2019 survey of nearly a thousand real
   networks found strict scale-free structure to be rare; heavy-tailed,
   often — but the strong version of the claim did not hold up. The page
   says this plainly rather than selling the tidy version.

   And the cosmic web, which every "networks at all scales" montage
   reaches for, is not a network in this sense at all. It is a density
   field — matter distributed in filaments and sheets — not a graph with
   nodes and edges. It looks like one in a picture. It is not one. That
   distinction is in the page too, because the honest version of this
   idea is more interesting than the tidy one.

   LAYOUT

   Radius falls with degree, so hubs sit near the middle and the sparse
   tail sits outside. That is a drawing decision and it carries no claim;
   it is there because a network drawn as an even ball is unreadable, and
   because the difference between the two networks becomes visible at a
   glance — one has a dense core, the other is a uniform shell.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  var N = 260, M = 2;                     /* nodes, and edges added per node */

  /* Everything random in here is drawn from one seeded generator, and that
     is not a detail. The prose quotes specific numbers — 76% against 68%,
     76% collapsing to 7% — and those numbers have to be the ones the reader
     actually sees on the readout. Left unseeded, the graph is rebuilt
     differently on every page load and the text drifts away from the
     measurement. Seeded, the experiment is the same experiment for
     everybody, which is what lets the page make a checkable claim. */
  var seed = 0x9e3779b9;
  function rand() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function build(kind) {
    var edges = [], deg = new Int16Array(N);
    if (kind === 'hub') {
      /* preferential attachment: a target is chosen by picking a random
         endpoint of a random existing edge, which is exactly
         proportional-to-degree without needing a running tally */
      var stubs = [];
      for (var i = 0; i < M + 1; i++)
        for (var j = i + 1; j < M + 1; j++) { edges.push([i, j]); stubs.push(i, j); deg[i]++; deg[j]++; }
      for (var n = M + 1; n < N; n++) {
        var picked = {};
        for (var k = 0; k < M; k++) {
          var t, guard = 0;
          do { t = stubs[(rand() * stubs.length) | 0]; } while (picked[t] && ++guard < 40);
          picked[t] = 1;
          edges.push([n, t]); stubs.push(n, t); deg[n]++; deg[t]++;
        }
      }
    } else {
      /* the control: same edge count, endpoints uniform */
      var want = Math.round((M * (N - M - 1)) + (M * (M + 1) / 2));
      var seen = {};
      while (edges.length < want) {
        var a = (rand() * N) | 0, b = (rand() * N) | 0;
        if (a === b) continue;
        var key = a < b ? a + ':' + b : b + ':' + a;
        if (seen[key]) continue;
        seen[key] = 1;
        edges.push([a, b]); deg[a]++; deg[b]++;
      }
    }
    return { edges: edges, deg: deg };
  }

  /* a deterministic shuffle, so "random attack" is the same experiment
     every time rather than a new one each frame */
  function order(n, seedFn) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    a.sort(function (x, y) { return seedFn(x) - seedFn(y); });
    return a;
  }

  function layout(deg) {
    var maxD = 1;
    for (var i = 0; i < N; i++) maxD = Math.max(maxD, deg[i]);
    var pos = new Float32Array(N * 3);
    for (var k = 0; k < N; k++) {
      /* hubs pulled inward. A drawing decision, not a claim. */
      var t = Math.pow(deg[k] / maxD, 0.55);
      var r = 42 + (1 - t) * 118;
      var u = rand() * 2 - 1, ph = rand() * Math.PI * 2;
      var sr = Math.sqrt(1 - u * u);
      pos[k * 3]     = r * sr * Math.cos(ph);
      pos[k * 3 + 1] = r * u * 0.82;
      pos[k * 3 + 2] = r * sr * Math.sin(ph);
    }
    return { pos: pos, maxD: maxD };
  }

  var NETS = {};
  ['hub', 'even'].forEach(function (kind) {
    var g = build(kind);
    var lay = layout(g.deg);
    /* removal orders, precomputed: by degree for the targeted attack, and
       one fixed shuffle for the random one */
    var byDeg = order(N, function (i) { return -g.deg[i]; });
    var rnd = [];
    for (var i = 0; i < N; i++) rnd.push(i);
    for (var s = N - 1; s > 0; s--) { var j = (rand() * (s + 1)) | 0; var tmp = rnd[s]; rnd[s] = rnd[j]; rnd[j] = tmp; }
    NETS[kind] = { edges: g.edges, deg: g.deg, pos: lay.pos, maxD: lay.maxD, byDeg: byDeg, rnd: rnd };
  });

  /* ---- largest connected component, by union-find ---- */
  var parent = new Int16Array(N);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function giant(net, dead) {
    for (var i = 0; i < N; i++) parent[i] = i;
    for (var e = 0; e < net.edges.length; e++) {
      var a = net.edges[e][0], b = net.edges[e][1];
      if (dead[a] || dead[b]) continue;
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }
    var count = {}, best = 0, alive = 0;
    for (var k = 0; k < N; k++) {
      if (dead[k]) continue;
      alive++;
      var r = find(k);
      count[r] = (count[r] || 0) + 1;
      if (count[r] > best) best = count[r];
    }
    return { best: best, alive: alive };
  }

  NVXExperiment.scene('network', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070B, 0.0022);
    var camera = new THREE.PerspectiveCamera(44, ctx.width / ctx.height, 1, 3000);

    var LIVE = new THREE.Color(0x8FDBFF);
    var HUB = new THREE.Color(0xFF6A5A);
    var GONE = new THREE.Color(0x1A2433);

    /* nodes as one point cloud */
    var nGeo = new THREE.BufferGeometry();
    var nPos = new Float32Array(N * 3), nCol = new Float32Array(N * 3), nSize = new Float32Array(N);
    var npAttr = new THREE.BufferAttribute(nPos, 3);
    var ncAttr = new THREE.BufferAttribute(nCol, 3);
    npAttr.setUsage && npAttr.setUsage(THREE.DynamicDrawUsage);
    ncAttr.setUsage && ncAttr.setUsage(THREE.DynamicDrawUsage);
    nGeo.setAttribute('position', npAttr);
    nGeo.setAttribute('color', ncAttr);
    var nodesPts = new THREE.Points(nGeo, new THREE.PointsMaterial({
      size: 6, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false
    }));
    nodesPts.frustumCulled = false;
    scene.add(nodesPts);

    /* hubs get a second, larger cloud so they read as hubs */
    var hGeo = new THREE.BufferGeometry();
    var hPos = new Float32Array(N * 3), hCol = new Float32Array(N * 3);
    var hpAttr = new THREE.BufferAttribute(hPos, 3);
    var hcAttr = new THREE.BufferAttribute(hCol, 3);
    hpAttr.setUsage && hpAttr.setUsage(THREE.DynamicDrawUsage);
    hcAttr.setUsage && hcAttr.setUsage(THREE.DynamicDrawUsage);
    hGeo.setAttribute('position', hpAttr);
    hGeo.setAttribute('color', hcAttr);
    var hubPts = new THREE.Points(hGeo, new THREE.PointsMaterial({
      size: 15, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false
    }));
    hubPts.frustumCulled = false;
    scene.add(hubPts);

    /* edges, capped so the buffer is allocated once */
    var MAXE = 900;
    var eGeo = new THREE.BufferGeometry();
    var ePos = new Float32Array(MAXE * 6), eCol = new Float32Array(MAXE * 6);
    var epAttr = new THREE.BufferAttribute(ePos, 3);
    var ecAttr = new THREE.BufferAttribute(eCol, 3);
    epAttr.setUsage && epAttr.setUsage(THREE.DynamicDrawUsage);
    ecAttr.setUsage && ecAttr.setUsage(THREE.DynamicDrawUsage);
    eGeo.setAttribute('position', epAttr);
    eGeo.setAttribute('color', ecAttr);
    var links = new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.5
    }));
    links.frustumCulled = false;
    scene.add(links);

    var dead = new Uint8Array(N);
    var state = { alive: N, giant: N, pct: 100, removed: 0, maxD: 0, kind: 'hub', broken: false };
    var lastKey = '';
    var spin = 0;

    var anchors = {
      hub: { position: new THREE.Vector3(0, 150, 0), hidden: false, text: 'هاب‌ها: پرارتباط‌ترین گره‌ها، وسط' }
    };

    function rebuild(p) {
      var kind = p.net >= 0.5 ? 'hub' : 'even';
      var net = NETS[kind];
      state.kind = kind;
      state.maxD = net.maxD;

      var nRemove = Math.round(p.removed * N);
      var seq = p.attack >= 0.5 ? net.byDeg : net.rnd;
      dead.fill(0);
      for (var i = 0; i < nRemove; i++) dead[seq[i]] = 1;

      var g = giant(net, dead);
      state.alive = g.alive;
      state.giant = g.best;
      state.pct = Math.round(g.best / N * 100);
      state.removed = nRemove;
      state.broken = state.pct < 40;

      /* nodes */
      var hubCut = Math.max(6, net.maxD * 0.45);
      var nc = 0, hc = 0;
      for (var k = 0; k < N; k++) {
        var o = k * 3;
        var isHub = net.deg[k] >= hubCut;
        var col = dead[k] ? GONE : (isHub ? HUB : LIVE);
        var arr = isHub ? hPos : nPos, carr = isHub ? hCol : nCol;
        var idx = isHub ? hc++ : nc++;
        arr[idx * 3] = net.pos[o]; arr[idx * 3 + 1] = net.pos[o + 1]; arr[idx * 3 + 2] = net.pos[o + 2];
        var f = dead[k] ? 0.5 : 1;
        carr[idx * 3] = col.r * f; carr[idx * 3 + 1] = col.g * f; carr[idx * 3 + 2] = col.b * f;
      }
      nGeo.setDrawRange(0, nc); hGeo.setDrawRange(0, hc);
      nGeo.attributes.position.needsUpdate = true; nGeo.attributes.color.needsUpdate = true;
      hGeo.attributes.position.needsUpdate = true; hGeo.attributes.color.needsUpdate = true;

      /* edges: an edge is drawn only if both ends are alive */
      var ec = 0;
      for (var e = 0; e < net.edges.length && ec < MAXE; e++) {
        var a = net.edges[e][0], b = net.edges[e][1];
        if (dead[a] || dead[b]) continue;
        var oo = ec * 6;
        ePos[oo] = net.pos[a * 3]; ePos[oo + 1] = net.pos[a * 3 + 1]; ePos[oo + 2] = net.pos[a * 3 + 2];
        ePos[oo + 3] = net.pos[b * 3]; ePos[oo + 4] = net.pos[b * 3 + 1]; ePos[oo + 5] = net.pos[b * 3 + 2];
        var lit = (net.deg[a] >= hubCut || net.deg[b] >= hubCut) ? 0.62 : 0.3;
        for (var v = 0; v < 6; v += 3) {
          eCol[oo + v] = LIVE.r * lit; eCol[oo + v + 1] = LIVE.g * lit; eCol[oo + v + 2] = LIVE.b * lit;
        }
        ec++;
      }
      eGeo.setDrawRange(0, ec * 2);
      eGeo.attributes.position.needsUpdate = true;
      eGeo.attributes.color.needsUpdate = true;

      anchors.hub.hidden = kind !== 'hub';
    }

    return {
      scene: scene,
      camera: camera,
      anchors: anchors,
      state: state,

      chapter: function () {},

      update: function (dt, t, p) {
        var key = (p.net >= 0.5 ? 'h' : 'e') + '|' + p.removed.toFixed(3) + '|' + (p.attack >= 0.5 ? 'a' : 'r');
        if (key !== lastKey) { rebuild(p); lastKey = key; }
        spin += dt * 0.08;
        nodesPts.rotation.y = hubPts.rotation.y = links.rotation.y = spin;
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      reset: function () { lastKey = ''; spin = 0; },
      dispose: function () { nGeo.dispose(); hGeo.dispose(); eGeo.dispose(); }
    };
  });
})();
