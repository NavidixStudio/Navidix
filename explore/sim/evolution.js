/* =====================================================================
   THE EVOLUTION OF LIFE — a tree, and the reason it must not be a ladder.

   THE PICTURE THIS IS BUILT AGAINST

   Everyone has seen the march of progress: a stooped ape, then a less
   stooped one, then a man with a spear, then us. A straight line with
   humans at the end. It is the single most reproduced image in popular
   biology and it is wrong in a specific, fixable way — it says evolution
   is a ladder aimed at us.

   A real phylogeny is a tree, and a tree has two properties the ladder
   destroys:

     1. Humans are one twig. Not the trunk, not the top — one branch
        among millions, and the branch we are on is not privileged in any
        way a biologist could point at.

     2. EVERY LIVING TIP IS THE SAME AGE. This is the fact worth the
        whole page. A bacterium alive today is not "primitive" and not
        "behind" us; its lineage has been evolving for exactly as long as
        ours, because we both descend from the same root and we are both
        alive now. Draw the tree with time on one axis and it becomes
        undeniable: every living thing lines up on the same line, and
        that line is today.

   That second point is why the tree is drawn with time as a real axis
   rather than laid out for looks. It is not a diagram that happens to be
   shaped like a tree; it is a plot, and the alignment of the tips is a
   measurement rather than a design choice.

   THE DATES

   Divergence times are in millions of years, rounded, and they are
   estimates — molecular clocks and the fossil record do not always agree
   and several of these carry real uncertainty of tens of millions of
   years. The page says so. What is not uncertain is the branching order
   and the fact that all the tips are contemporaries.

   Time runs linearly, which is a deliberate and slightly brutal choice:
   it means the animals everyone came here to see are crushed into the
   top tenth of the picture, and the vast middle is nothing but single
   cells. That is not a layout failure. For most of the history of life
   on Earth, single cells were the entire story, and a chart that hid
   that to make room for the vertebrates would be lying about the shape
   of the thing.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.NVXExperiment) return;

  var ROOT_MA = 3800;                    /* million years ago */

  /* t = divergence time in Ma. Leaves sit at 0, which is today. */
  var TREE = {
    n: 'نیای مشترک همه‌ی زندگان', t: 3800, c: [
      { n: 'باکتری‌ها', t: 3400, c: [ { n: 'باکتری', t: 0, tip: 1 } ] },
      { n: '', t: 3400, c: [
        { n: 'آرکی‌ها', t: 2700, c: [ { n: 'آرکی', t: 0, tip: 1 } ] },
        { n: 'یاخته‌های هسته‌دار', t: 1900, c: [
          { n: 'گیاهان', t: 1500, c: [ { n: 'درخت بلوط', t: 0, tip: 1 } ] },
          { n: '', t: 1300, c: [
            { n: 'قارچ‌ها', t: 1100, c: [ { n: 'قارچ', t: 0, tip: 1 } ] },
            { n: 'جانوران', t: 800, c: [
              { n: '', t: 690, c: [ { n: 'اسفنج دریایی', t: 0, tip: 1 } ] },
              { n: '', t: 600, c: [
                { n: 'بی‌مهرگان', t: 560, c: [
                  { n: 'سوسک', t: 0, tip: 1 },
                  { n: 'اختاپوس', t: 0, tip: 1 }
                ] },
                { n: 'مهره‌داران', t: 530, c: [
                  { n: '', t: 450, c: [ { n: 'کوسه', t: 0, tip: 1 } ] },
                  { n: 'چهارپایان', t: 390, c: [
                    { n: '', t: 350, c: [ { n: 'قورباغه', t: 0, tip: 1 } ] },
                    { n: '', t: 320, c: [
                      { n: 'خزندگان و پرندگان', t: 250, c: [ { n: 'عقاب', t: 0, tip: 1 } ] },
                      { n: 'پستانداران', t: 180, c: [
                        { n: '', t: 95, c: [ { n: 'نهنگ', t: 0, tip: 1 } ] },
                        { n: 'نخستی‌ها', t: 65, c: [
                          { n: '', t: 7, c: [
                            { n: 'شامپانزه', t: 0, tip: 1 },
                            { n: 'انسان', t: 0, tip: 1, me: 1 }
                          ] }
                        ] }
                      ] }
                    ] }
                  ] }
                ] }
              ] }
            ] }
          ] }
        ] }
      ] }
    ]
  };

  /* ---- lay the tree out once ----
     Leaves get evenly spaced slots; an internal node sits above the mean
     of its children. Time is the vertical axis, so nothing about the
     vertical position is a design decision. */
  var SPAN_X = 420, HEIGHT = 300;
  var leaves = [], nodes = [], links = [];

  function collectLeaves(node) {
    if (!node.c || !node.c.length) { leaves.push(node); return; }
    node.c.forEach(collectLeaves);
  }
  collectLeaves(TREE);

  function place(node, depth, parent) {
    node.depth = depth;
    node.parent = parent || null;
    node.y = (1 - node.t / ROOT_MA) * HEIGHT - HEIGHT / 2;
    if (!node.c || !node.c.length) {
      node.x = (leaves.indexOf(node) / (leaves.length - 1) - 0.5) * SPAN_X;
    } else {
      node.c.forEach(function (k) { place(k, depth + 1, node); });
      var sum = 0;
      node.c.forEach(function (k) { sum += k.x; });
      node.x = sum / node.c.length;
    }
    /* A little depth so neighbouring branches separate instead of matting
       together. It carries no information.

       But the tips get none of it. The entire argument of this scene is
       that every living thing sits on one line, and a tip pushed forward
       or back in depth projects to a different height as soon as the
       camera tilts — which quietly bends the one line the reader is being
       asked to trust. Internal branches may float; the present may not. */
    node.z = (!node.c || !node.c.length) ? 0
           : Math.sin(node.x * 0.021) * 34 + (depth % 2 ? 9 : -9);
    nodes.push(node);
    if (parent) links.push({ a: parent, b: node });
    return node;
  }
  place(TREE, 0, null);

  /* the path from the root down to a given tip */
  function lineageOf(tip) {
    var path = [], n = tip;
    while (n) { path.push(n); n = n.parent; }
    return path.reverse();
  }
  var TIPS = leaves.map(function (l) {
    return { node: l, name: l.n, path: lineageOf(l), splits: lineageOf(l).length - 2 };
  });
  var MEIDX = TIPS.findIndex(function (t) { return t.node.me; });

  NVXExperiment.scene('evolution', function (ctx) {
    var THREE = ctx.THREE;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070B, 0.0016);
    var camera = new THREE.PerspectiveCamera(42, ctx.width / ctx.height, 1, 4000);

    var DIM = new THREE.Color(0x2F4A6B);
    var LIVE = new THREE.Color(0x8FDBFF);
    var PATH = new THREE.Color(0xFF6A5A);

    /* ---- every branch as one line segment, coloured per vertex ---- */
    var segGeo = new THREE.BufferGeometry();
    var segPos = new Float32Array(links.length * 6);
    var segCol = new Float32Array(links.length * 6);
    links.forEach(function (l, i) {
      var o = i * 6;
      segPos[o] = l.a.x; segPos[o + 1] = l.a.y; segPos[o + 2] = l.a.z;
      segPos[o + 3] = l.b.x; segPos[o + 4] = l.b.y; segPos[o + 5] = l.b.z;
    });
    var sAttr = new THREE.BufferAttribute(segPos, 3);
    var cAttr = new THREE.BufferAttribute(segCol, 3);
    cAttr.setUsage && cAttr.setUsage(THREE.DynamicDrawUsage);
    segGeo.setAttribute('position', sAttr);
    segGeo.setAttribute('color', cAttr);
    var branches = new THREE.LineSegments(segGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.92
    }));
    branches.frustumCulled = false;
    scene.add(branches);

    /* ---- the tips, which are the whole argument ---- */
    var tipGeo = new THREE.SphereGeometry(3.4, 14, 10);
    var tipMeshes = TIPS.map(function (t) {
      var m = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0x8FDBFF }));
      m.position.set(t.node.x, t.node.y, t.node.z);
      scene.add(m);
      return m;
    });

    /* ---- "today": the line every living thing sits on ---- */
    var todayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-SPAN_X / 2 - 22, HEIGHT / 2, 0),
      new THREE.Vector3(SPAN_X / 2 + 22, HEIGHT / 2, 0)]);
    var today = new THREE.Line(todayGeo, new THREE.LineBasicMaterial({
      color: 0xFFFFFF, transparent: true, opacity: 0.34 }));
    scene.add(today);

    /* ---- the time axis, with real numbers ---- */
    var AX_X = -SPAN_X / 2 - 34;
    var axGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(AX_X, -HEIGHT / 2, 0), new THREE.Vector3(AX_X, HEIGHT / 2, 0)]);
    scene.add(new THREE.Line(axGeo, new THREE.LineBasicMaterial({
      color: 0x9AA6BC, transparent: true, opacity: 0.32 })));

    var MARKS = [3800, 2000, 1000, 500, 0];
    var mGeo = new THREE.BufferGeometry();
    var mPos = new Float32Array(MARKS.length * 6);
    MARKS.forEach(function (ma, i) {
      var y = (1 - ma / ROOT_MA) * HEIGHT - HEIGHT / 2, o = i * 6;
      mPos[o] = AX_X - 7; mPos[o + 1] = y; mPos[o + 2] = 0;
      mPos[o + 3] = AX_X + 7; mPos[o + 4] = y; mPos[o + 5] = 0;
    });
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    scene.add(new THREE.LineSegments(mGeo, new THREE.LineBasicMaterial({
      color: 0x9AA6BC, transparent: true, opacity: 0.45 })));

    /* a quiet field behind it */
    var fg = new THREE.BufferGeometry(), fp = [];
    for (var f = 0; f < 260; f++)
      fp.push((Math.random() - 0.5) * 1200, (Math.random() - 0.5) * 700, -200 - Math.random() * 700);
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({
      color: 0x5A6B88, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.45 })));

    function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
    function maText(ma) {
      if (ma >= 1000) return fa((ma / 1000).toFixed(1)) + ' میلیارد سال پیش';
      if (ma === 0) return 'امروز';
      return fa(ma) + ' میلیون سال پیش';
    }

    var anchors = {
      today:  { position: new THREE.Vector3(SPAN_X / 2 + 40, HEIGHT / 2, 0), hidden: false, text: 'امروز — همه اینجا' },
      root:   { position: new THREE.Vector3(0, -HEIGHT / 2 - 22, 0), hidden: false, dim: true, text: 'نیای مشترک همه‌ی زندگان' },
      ax0:    { position: new THREE.Vector3(AX_X - 30, -HEIGHT / 2, 0), hidden: false, dim: true, text: maText(3800) },
      ax1:    { position: new THREE.Vector3(AX_X - 30, (1 - 2000 / ROOT_MA) * HEIGHT - HEIGHT / 2, 0), hidden: false, dim: true, text: maText(2000) },
      ax2:    { position: new THREE.Vector3(AX_X - 30, (1 - 500 / ROOT_MA) * HEIGHT - HEIGHT / 2, 0), hidden: false, dim: true, text: maText(500) },
      pick:   { position: new THREE.Vector3(), hidden: false, text: '' },
      me:     { position: new THREE.Vector3(), hidden: false, text: 'انسان' },
      split:  { position: new THREE.Vector3(), hidden: true, text: '' }
    };

    var state = { tip: TIPS[MEIDX], splits: 0, ma: 0, shownMa: ROOT_MA };
    var lastTip = -1, lastTime = -1;

    return {
      scene: scene,
      camera: camera,
      anchors: anchors,
      state: state,

      chapter: function () {},

      update: function (dt, t, p) {
        var idx = Math.max(0, Math.min(TIPS.length - 1, Math.round(p.lineage)));
        var pick = TIPS[idx];
        /* the front of time: everything older than this is drawn */
        var frontMa = ROOT_MA * (1 - p.time);
        state.tip = pick;
        state.splits = pick.splits;
        state.shownMa = frontMa;

        if (idx !== lastTip || p.time !== lastTime) {
          var onPath = {};
          pick.path.forEach(function (n) { onPath[nodes.indexOf(n)] = 1; });

          links.forEach(function (l, i) {
            var o = i * 6;
            /* a branch exists only once time has passed its parent's split */
            var born = l.a.t >= frontMa;
            var lit = onPath[nodes.indexOf(l.a)] && onPath[nodes.indexOf(l.b)];
            var c = !born ? DIM : (lit ? PATH : LIVE);
            var k = !born ? 0.06 : (lit ? 1 : 0.42);
            for (var e = 0; e < 6; e += 3) {
              segCol[o + e] = c.r * k; segCol[o + e + 1] = c.g * k; segCol[o + e + 2] = c.b * k;
            }
          });
          segGeo.attributes.color.needsUpdate = true;

          tipMeshes.forEach(function (m, i) {
            var alive = frontMa <= 0.5;
            m.visible = alive;
            var isPick = i === idx, isMe = TIPS[i].node.me;
            m.material.color.set(isPick ? 0xFF6A5A : (isMe ? 0xFFD9CF : 0x8FDBFF));
            m.scale.setScalar(isPick ? 1.7 : 1);
          });
          today.material.opacity = frontMa <= 0.5 ? 0.34 : 0.05;

          anchors.pick.text = pick.name;
          anchors.pick.position.set(pick.node.x, pick.node.y + 22, pick.node.z);
          anchors.pick.hidden = frontMa > 0.5;
          anchors.me.position.set(TIPS[MEIDX].node.x, TIPS[MEIDX].node.y + 44, TIPS[MEIDX].node.z);
          anchors.me.hidden = frontMa > 0.5 || idx === MEIDX;
          anchors.today.hidden = frontMa > 0.5;

          lastTip = idx; lastTime = p.time;
        }
      },

      resize: function (w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      reset: function () { lastTip = -1; },
      dispose: function () {
        segGeo.dispose(); tipGeo.dispose(); todayGeo.dispose(); axGeo.dispose();
        mGeo.dispose(); fg.dispose();
      }
    };
  });

  /* the page needs the tip list to build its slider labels */
  window.NVX_EVO_TIPS = TIPS.map(function (t) { return t.name; });
})();
