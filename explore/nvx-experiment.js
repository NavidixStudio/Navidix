/* =====================================================================
   NAVIDIX — THE EXPERIMENT SHELL

   One frame that every interactive experience is poured into, so that
   adding the fourth is a matter of writing a scene and some prose rather
   than rebuilding the page around it.

   The split is the whole point:

     the shell   owns the renderer, the clock, resize, the pointer, the
                 controls, the parameter panel, when to load three.js at
                 all, and when to stop drawing.
     a scene     owns nothing but its own contents. It is handed a THREE,
                 a size and the current parameters, and returns an object
                 with update / resize / dispose. It never touches the DOM,
                 never starts a loop and never reads the viewport.

   That boundary is what makes a scene ~120 lines instead of ~400, and it
   is why the performance rules below only have to be written once.

   Performance, in order of how much they matter:

     1. three.js is not loaded by this file, or by the page, until a stage
        is actually approaching the viewport. A reader who never scrolls
        to an experiment downloads none of it. The homepage and every
        other page on the site are untouched by this section entirely.
     2. Nothing draws while it is off screen, while the tab is hidden, or
        while the reader has paused it.
     3. Device pixel ratio is capped at 2. Past that the cost is quadratic
        and nobody can see the difference.
     4. If the machine cannot give a workable frame rate, the shell says
        so and settles rather than grinding.

   Accessibility: prefers-reduced-motion does not disable the experiment —
   it would leave a page whose entire subject is interaction with nothing
   to interact with. It starts paused instead, on one settled frame, with
   the controls right there. The reader chooses.
   ===================================================================== */
(function (global) {
  'use strict';

  var THREE_SRC = '/assets/three.min.js';
  var scenes = {};
  var threeLoading = null;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- one loader, however many stages ask for it ---- */
  function loadThree() {
    if (global.THREE) return Promise.resolve(global.THREE);
    if (threeLoading) return threeLoading;
    threeLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = THREE_SRC;
      s.async = true;
      s.onload = function () {
        global.THREE ? resolve(global.THREE) : reject(new Error('three loaded but absent'));
      };
      s.onerror = function () { reject(new Error('three failed to load')); };
      document.head.appendChild(s);
    });
    return threeLoading;
  }

  /* ---- is there a GPU path at all ----
     Asked once, on a throwaway canvas, because a page with three stages
     should not create three contexts to find out. */
  var _webgl = null;
  function hasWebGL() {
    if (_webgl !== null) return _webgl;
    try {
      var c = document.createElement('canvas');
      _webgl = !!(global.WebGLRenderingContext &&
                  (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { _webgl = false; }
    return _webgl;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  var ICON = {
    play:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.2V9h-4.8"/></svg>',
    full:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>',
    exit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"/></svg>'
  };

  /* =====================================================================
     A scene registers itself by name. Load order does not matter: a scene
     file may arrive before or after the page calls mount().
     ===================================================================== */
  function scene(name, factory) {
    scenes[name] = factory;
    document.dispatchEvent(new CustomEvent('nvx:scene', { detail: name }));
  }

  /* =====================================================================
     THE ORBIT RIG

     three r128 ships OrbitControls as a separate file the site does not
     carry, and pulling one in for this would mean a second network
     request to get a behaviour that is forty lines. So it lives here, in
     the shell, where every scene gets it for free.

     Spherical coordinates around a target: drag turns, wheel or pinch
     dollies, and everything is damped toward a goal rather than set
     directly, so a chapter change and a hand on the mouse move the camera
     through the same path instead of one snapping and the other gliding.

     phi is clamped off both poles. At exactly vertical the up-vector is
     undefined and the view rolls, which reads as the scene lurching.
     ===================================================================== */
  function makeOrbit(THREE, canvas, o) {
    var g = {                                        /* where it is going */
      target: new THREE.Vector3().fromArray(o.target || [0, 0, 0]),
      dist: o.distance || 400, phi: o.phi != null ? o.phi : 1.0,
      theta: o.theta != null ? o.theta : 0,
      /* World units of width that must stay in frame. Optional, and only
         wide scenes set it — see fitDist. */
      fit: o.fitWidth || 0
    };
    var c = {                                        /* where it is now */
      target: g.target.clone(), dist: g.dist, phi: g.phi, theta: g.theta
    };
    var minD = o.minDistance || 80, maxD = o.maxDistance || 1400;
    var minP = o.minPhi != null ? o.minPhi : 0.12, maxP = o.maxPhi != null ? o.maxPhi : Math.PI - 0.12;
    var drag = false, lastX = 0, lastY = 0, pinch = 0, touched = false;

    var snap = false;

    function goTo(t, immediate) {
      if (t.target) g.target.fromArray(t.target);
      if (t.distance != null) g.dist = t.distance;
      if (t.phi != null) g.phi = t.phi;
      if (t.theta != null) g.theta = t.theta;
      /* A chapter that says nothing about width falls back to the page
         default rather than inheriting whatever the previous chapter
         needed; a close-up opts out with fitWidth: 0. */
      g.fit = (t.fitWidth !== undefined ? t.fitWidth : o.fitWidth) || 0;
      g.dist = Math.max(minD, Math.min(maxD, g.dist));
      g.phi = Math.max(minP, Math.min(maxP, g.phi));
      if (immediate) { c.target.copy(g.target); c.phi = g.phi; c.theta = g.theta; snap = true; }
    }

    /* ---- keeping a wide scene inside a narrow frame ----
       Every chapter distance in this project was framed on a 16:9 stage,
       and a phone is not one. The vertical field of view is fixed, so a
       narrower stage shows proportionally less *width* at the same
       distance — which is why a timeline authored to fill a laptop had
       most of its length outside a phone's canvas, and why the tree of
       life arrived cropped on both sides.

       Pulling the camera back by a flat factor would fix those and ruin
       everything else: a roughly spherical scene that already fits
       vertically fits horizontally too, and moving it further away just
       makes it small for no reason. So the compensation is content-aware.
       A scene that is wider than it is tall declares the width it needs;
       everything else declares nothing and is left exactly as authored. */
    function fitDist(camera) {
      if (!g.fit || !camera.fov) return g.dist;
      var need = (g.fit / 2) /
                 (Math.tan(camera.fov * Math.PI / 360) * (camera.aspect || 1));
      return Math.min(maxD, Math.max(g.dist, need));
    }

    canvas.addEventListener('pointerdown', function (e) {
      drag = true; touched = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      g.theta -= (e.clientX - lastX) * 0.0055;
      g.phi = Math.max(minP, Math.min(maxP, g.phi - (e.clientY - lastY) * 0.0042));
      lastX = e.clientX; lastY = e.clientY;
      if (o.onUser) o.onUser();
    });
    function stop(e) {
      drag = false; canvas.style.cursor = '';
      if (e && e.pointerId != null && canvas.releasePointerCapture)
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', stop);

    /* Not passive, because the whole point is to stop the page scrolling
       while the wheel is dollying the camera. */
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      g.dist = Math.max(minD, Math.min(maxD, g.dist * (1 + (e.deltaY > 0 ? 0.12 : -0.12))));
      touched = true;
      if (o.onUser) o.onUser();
    }, { passive: false });

    /* Two fingers dolly; one finger is left to the page so a phone can
       still scroll past a stage it is not trying to use. */
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                         e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) {
        g.dist = Math.max(minD, Math.min(maxD, g.dist * (pinch / d)));
        touched = true;
        if (o.onUser) o.onUser();
      }
      pinch = d;
    }, { passive: false });
    canvas.addEventListener('touchend', function () { pinch = 0; });

    return {
      goTo: goTo,
      touched: function () { return touched; },
      clearTouched: function () { touched = false; },
      update: function (dt, camera) {
        var goal = fitDist(camera);
        if (snap) { c.dist = goal; snap = false; }
        var k = 1 - Math.pow(0.0015, Math.min(dt || 0.016, 0.05));
        c.dist += (goal - c.dist) * k;
        c.phi += (g.phi - c.phi) * k;
        c.theta += (g.theta - c.theta) * k;
        c.target.lerp(g.target, k);
        var sp = Math.sin(c.phi);
        camera.position.set(
          c.target.x + c.dist * sp * Math.sin(c.theta),
          c.target.y + c.dist * Math.cos(c.phi),
          c.target.z + c.dist * sp * Math.cos(c.theta)
        );
        camera.lookAt(c.target);
      }
    };
  }

  /* =====================================================================
     mount(opts)

     opts.root      selector or element for the .xp block
     opts.scene     registered scene name
     opts.params    [{ key, label, min, max, step, value, format }]
     opts.note      function(params) -> HTML for the annotation line
     opts.copy      { play, pause, reset, loading, noGL, slow, hint }
     opts.orbit     camera rig config — see makeOrbit. Given, the shell
                    drives the camera and the scene must not.
     opts.chapters  [{ id, title, body, camera:{}, params:{} }] — a guided
                    read that ends by handing the controls over.
     opts.labels    true if the scene exposes anchors to pin DOM labels to
     opts.readout   function(params, t) -> HTML, written every frame
     ===================================================================== */
  function mount(opts) {
    var root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    if (!root) return null;

    var stage  = root.querySelector('.xstage');
    var canvas = root.querySelector('.xstage__canvas');
    var note   = root.querySelector('.xstage__note');
    var copy   = opts.copy || {};

    /* ---- what the stage says it can do, phrased for the input at hand ----
       The hint printed in the markup tells the reader to drag a cursor and
       scroll a wheel, and it used to be hidden outright on a touch screen
       on the grounds that an instruction you cannot follow is worse than
       none. But the stage does answer a finger — it just answers a
       different gesture — and saying nothing left the whole scene reading
       as a picture rather than something to touch. So the instruction is
       rewritten for the device instead of withheld from it. */
    var hint = root.querySelector('.xstage__hint');
    if (hint && global.matchMedia && global.matchMedia('(pointer:coarse)').matches) {
      hint.textContent = copy.hintTouch || 'Drag to turn · pinch to zoom';
      hint.classList.add('xstage__hint--touch');
    }
    /* It has one job and it is done the moment it has been read or acted
       on. On a phone the stage is small enough that a line of standing
       text sits on top of the diagram it is describing, so it leaves. */
    if (hint) {
      var dismiss = function () { hint.classList.add('is-gone'); };
      setTimeout(dismiss, 7000);
      if (canvas) canvas.addEventListener('pointerdown', dismiss, { once: true, passive: true });
    }

    /* ---- parameters: the shell's own state, handed to the scene ---- */
    var params = {};
    (opts.params || []).forEach(function (p) { params[p.key] = p.value; });
    var initial = JSON.parse(JSON.stringify(params));

    var api = {
      running: false, ready: false, dead: false,
      params: params, scene: null
    };

    /* =====================================================================
       FULL SCREEN

       An experiment squeezed into a column beside a page of text is a
       diagram you glance at. The same thing filling the screen is
       something you use. This wraps the stage together with everything
       needed to drive it — the chapters, the sentence explaining the
       chapter, the controls, the sliders and the key — so going full
       screen hands over the whole instrument rather than a picture of it.

       The wrapper is built here rather than written into each page, so no
       page has to know this feature exists.
       ===================================================================== */
    var fsWrap = el('div', 'xfs');
    stage.parentNode.insertBefore(fsWrap, stage);
    ['.xstage', '.xlegend', '.xchapters', '.xchapter__body', '.xctl', '.xparams', '.xnote']
      .forEach(function (sel) {
        var n = root.querySelector(sel);
        if (n) fsWrap.appendChild(n);
      });

    /* ---- the key ----
       Colours and lines carry the meaning in every one of these scenes,
       and a reader who cannot tell which is which is looking at a pretty
       picture. Named up front, before the tour starts. */
    if (opts.legend && opts.legend.length) {
      var lg = el('ul', 'xlegend');
      lg.setAttribute('aria-label', copy.legendLabel || 'Key');
      opts.legend.forEach(function (k) {
        var li = el('li');
        li.innerHTML = '<i class="xlegend__' + (k.kind || 'dot') + '" style="--k:' + k.color + '"></i>' +
                       '<span>' + k.label + '</span>';
        lg.appendChild(li);
      });
      fsWrap.insertBefore(lg, fsWrap.firstChild.nextSibling);
    }

    /* ---- controls ---- */
    var ctl = root.querySelector('.xctl');
    var btnPlay = null, btnReset = null;
    if (ctl) {
      btnPlay = el('button', 'xbtn xbtn--go xbtn--icon');
      btnPlay.type = 'button';
      btnReset = el('button', 'xbtn xbtn--icon');
      btnReset.type = 'button';
      btnReset.innerHTML = ICON.reset + '<span>' + (copy.reset || 'Reset') + '</span>';
      var group = el('div', 'xctl__group');
      group.appendChild(btnPlay);
      group.appendChild(btnReset);
      ctl.insertBefore(group, ctl.firstChild);

      /* ---- full screen, including where there is no Fullscreen API ----
         This used to be gated on document.fullscreenEnabled, which meant
         the button did not exist on an iPhone: Safari on iOS implements
         element full screen for <video> and nothing else. The one place
         the reader most needs the extra room — a tree of life or a
         timeline on a 390px screen — was the one place the button was
         missing.

         So the API is now an optimisation rather than a requirement. Where
         it exists it is used, and the browser's own affordances (Escape,
         the system gesture) work as expected. Where it does not, or where
         the request is refused, the same layout is achieved by pinning the
         block over the viewport, which needs no permission and no API. */
      var btnFull = el('button', 'xbtn xbtn--icon xbtn--full');
      btnFull.type = 'button';
      var faux = false;
      var canNative = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
                      !!(fsWrap.requestFullscreen || fsWrap.webkitRequestFullscreen);

      var paintFull = function () {
        var on = isFull() || faux;
        btnFull.innerHTML = (on ? ICON.exit : ICON.full) +
          '<span>' + (on ? (copy.exitFull || 'Exit full screen') : (copy.full || 'Full screen')) + '</span>';
        btnFull.setAttribute('aria-pressed', String(on));
      };
      var applyFull = function () {
        var on = isFull() || faux;
        fsWrap.classList.toggle('is-full', on);
        fsWrap.classList.toggle('is-faux', faux);
        document.documentElement.classList.toggle('xp-locked', faux);
        paintFull();
        onResize();
      };
      var setFaux = function (on) { faux = on; applyFull(); };

      btnFull.addEventListener('click', function () {
        if (faux) { setFaux(false); return; }
        if (isFull()) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          return;
        }
        if (!canNative) { setFaux(true); return; }
        try {
          var p = (fsWrap.requestFullscreen || fsWrap.webkitRequestFullscreen).call(fsWrap);
          if (p && p.catch) p.catch(function () { setFaux(true); });
        } catch (_) { setFaux(true); }
      });
      ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
        document.addEventListener(ev, function () { if (!faux) applyFull(); });
      });
      /* Escape leaves the stand-in the same way it leaves the real thing. */
      document.addEventListener('keydown', function (e) {
        if (faux && (e.key === 'Escape' || e.key === 'Esc')) setFaux(false);
      });
      paintFull();
      ctl.appendChild(btnFull);

      btnPlay.addEventListener('click', function () { api.running ? pause() : play(); });
      btnReset.addEventListener('click', reset);
    }

    function isFull() {
      return (document.fullscreenElement || document.webkitFullscreenElement) === fsWrap;
    }

    function paintPlay() {
      if (!btnPlay) return;
      btnPlay.innerHTML = (api.running ? ICON.pause : ICON.play) +
        '<span>' + (api.running ? (copy.pause || 'Pause') : (copy.play || 'Play')) + '</span>';
      btnPlay.setAttribute('aria-pressed', String(api.running));
    }
    paintPlay();

    /* ---- parameter panel ----
       Built from the same array the scene reads, so a slider cannot drift
       out of step with the value it controls. */
    var panel = root.querySelector('.xparams');
    var readouts = {};
    if (panel && opts.params) {
      opts.params.forEach(function (p) {
        var wrap = el('div', 'xparam');
        var id = 'xp-' + p.key + '-' + Math.random().toString(36).slice(2, 7);
        var top = el('div', 'xparam__top');
        var name = el('label', 'xparam__name', p.label);
        name.setAttribute('for', id);
        var val = el('span', 'xparam__val', fmt(p, p.value));
        top.appendChild(name); top.appendChild(val);
        var input = document.createElement('input');
        input.type = 'range'; input.id = id;
        input.min = p.min; input.max = p.max; input.step = p.step;
        input.value = p.value;
        input.addEventListener('input', function () {
          params[p.key] = parseFloat(input.value);
          val.textContent = fmt(p, params[p.key]);
          paintNote();
          /* A change made while paused should still be visible, so the
             scene is stepped once with a zero delta rather than waiting
             for a frame that is not coming. */
          if (api.ready && !api.running) draw(0);
        });
        wrap.appendChild(top); wrap.appendChild(input);
        panel.appendChild(wrap);
        readouts[p.key] = { input: input, val: val, spec: p, wrap: wrap };
        /* A control that does nothing in the current chapter is worse than
           no control: it invites a reader to move it and then reports
           nothing back. `only` names the chapters a parameter belongs to,
           and it is hidden everywhere else. */
        if (p.only) wrap.hidden = true;
      });
    }

    function fmt(p, v) { return p.format ? p.format(v) : String(v); }

    var noteBox = root.querySelector('.xnote');
    function paintNote() {
      if (noteBox && opts.note) noteBox.innerHTML = opts.note(params);
    }
    paintNote();

    /* ---- the renderer, the clock and the loop ---- */
    var renderer = null, THREE = null, sc = null, raf = 0, last = 0, clock = 0;
    var visible = false, hidden = document.hidden;
    var slowFrames = 0;
    var orbit = null, labelBox = null, labels = {}, chapterIdx = -1, freed = false;
    var readoutBox = root.querySelector('.xreadout');
    var _v = null;

    /* =====================================================================
       CHAPTERS — the part that makes this a lesson rather than a toy.

       A 3D model in the middle of a page is a thing to fiddle with. What
       turns it into something you learn from is being walked through it
       first: here is what you are looking at, now here is the one thing
       that changes when I move this, now look at that. Each chapter is a
       camera position, a set of parameter values and a sentence, and the
       shell moves all three together.

       Then it gets out of the way. The last chapter hands the controls
       over explicitly, and touching the camera at any point does the same
       thing early — a tour that keeps grabbing the camera back from
       someone who has started exploring is worse than no tour.

       Chapters are addressable (?c=<id>), so a chapter can be linked to
       and lands with its camera and parameters already set.
       ===================================================================== */
    var rail = root.querySelector('.xchapters');
    var chapterBtns = [];
    var chapters = opts.chapters || [];

    function freeControls() {
      if (freed) return;
      freed = true;
      chapterIdx = -1;
      chapterBtns.forEach(function (b) { b.setAttribute('aria-current', 'false'); });
      if (rail) rail.classList.add('is-free');
      var body = root.querySelector('.xchapter__body');
      if (body && copy.freeBody) body.innerHTML = copy.freeBody;
      /* Once the tour is over nothing is out of scope. */
      Object.keys(readouts).forEach(function (k) { readouts[k].wrap.hidden = false; });
    }

    function goChapter(i, fromUser) {
      var ch = chapters[i];
      if (!ch) return;
      freed = false;
      chapterIdx = i;
      if (rail) rail.classList.remove('is-free');
      chapterBtns.forEach(function (b, n) { b.setAttribute('aria-current', String(n === i)); });

      var body = root.querySelector('.xchapter__body');
      if (body) body.innerHTML = ch.body;

      Object.keys(readouts).forEach(function (k) {
        var only = readouts[k].spec.only;
        readouts[k].wrap.hidden = !!only && only.indexOf(ch.id) < 0;
      });

      if (ch.params) Object.keys(ch.params).forEach(function (k) {
        params[k] = ch.params[k];
        if (readouts[k]) {
          readouts[k].input.value = ch.params[k];
          readouts[k].val.textContent = fmt(readouts[k].spec, ch.params[k]);
        }
      });
      paintNote();
      if (orbit && ch.camera) orbit.goTo(ch.camera);
      if (sc && sc.chapter) sc.chapter(ch.id, params);
      if (api.ready && !api.running) draw(0);

      if (fromUser) {
        try {
          var u = new URL(location.href);
          u.searchParams.set('c', ch.id);
          history.replaceState(null, '', u);
        } catch (_) {}
      }
    }

    if (rail && chapters.length) {
      chapters.forEach(function (ch, i) {
        var b = el('button', 'xchapter');
        b.type = 'button';
        b.innerHTML = '<i>' + (ch.no || (i + 1)) + '</i><span>' + ch.title + '</span>';
        b.setAttribute('aria-current', 'false');
        b.addEventListener('click', function () { goChapter(i, true); });
        rail.appendChild(b);
        chapterBtns.push(b);
      });
      var free = el('button', 'xchapter xchapter--free');
      free.type = 'button';
      free.innerHTML = '<i>◆</i><span>' + (copy.free || 'Free look') + '</span>';
      free.addEventListener('click', function () { freeControls(); });
      rail.appendChild(free);
    }
    api.goChapter = goChapter;

    function say(html, keep) {
      if (!note) return;
      note.hidden = false;
      note.innerHTML = html;
      if (!keep) stage.classList.add('is-noting');
    }
    function silence() { if (note) note.hidden = true; }

    function size() {
      var r = canvas.getBoundingClientRect();
      return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
    }

    function boot() {
      if (api.ready || api.dead) return;
      if (!hasWebGL()) {
        api.dead = true;
        say('<b>' + (copy.noGLTitle || 'This experience needs WebGL') + '</b>' +
            (copy.noGL || 'The written explanation below covers everything the simulation shows.'), true);
        if (btnPlay) btnPlay.setAttribute('aria-disabled', 'true');
        if (btnReset) btnReset.setAttribute('aria-disabled', 'true');
        return;
      }
      say('<b>' + (copy.loading || 'Loading…') + '</b>', true);
      loadThree().then(function (T) {
        var factory = scenes[opts.scene];
        if (!factory) {
          /* the scene file may still be in flight */
          return new Promise(function (res) {
            document.addEventListener('nvx:scene', function on(e) {
              if (e.detail === opts.scene) { document.removeEventListener('nvx:scene', on); res(T); }
            });
          });
        }
        return T;
      }).then(function (T) {
        if (api.dead) return;
        THREE = T;
        var d = size();
        renderer = new THREE.WebGLRenderer({
          canvas: canvas, antialias: true, alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        renderer.setSize(d.w, d.h, false);
        if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

        sc = scenes[opts.scene]({ THREE: THREE, renderer: renderer, width: d.w, height: d.h,
                                  params: params, reduced: REDUCED });
        api.scene = sc;

        if (opts.orbit) {
          orbit = makeOrbit(THREE, canvas, Object.assign({}, opts.orbit, {
            /* A hand on the camera means the reader has taken over, so the
               tour stops steering and says so rather than fighting them
               for control of the same camera. */
            onUser: function () { if (chapterIdx >= 0 && !freed) freeControls(); }
          }));
          orbit.goTo(opts.orbit, true);
          orbit.update(0, sc.camera);
          api.orbit = orbit;
          stage.classList.add('is-grabbable');
        }

        if (opts.labels && sc.anchors) {
          _v = new THREE.Vector3();
          labelBox = el('div', 'xlabels');
          labelBox.setAttribute('aria-hidden', 'true');
          stage.appendChild(labelBox);
          Object.keys(sc.anchors).forEach(function (k) {
            var n = el('span', 'xlabel');
            n.innerHTML = '<i></i><b>' + ((opts.labelText && opts.labelText[k]) || k) + '</b>';
            labelBox.appendChild(n);
            labels[k] = n;
          });
        }

        api.ready = true;
        silence();
        draw(0);                                  /* one settled frame */

        /* Reduced motion, or a reader who arrived paused, gets that frame
           and a Play button. Everyone else starts moving. */
        if (chapters.length) {
          var want = 0;
          try {
            var q = new URL(location.href).searchParams.get('c');
            if (q) { var f = chapters.findIndex(function (c) { return c.id === q; }); if (f >= 0) want = f; }
          } catch (_) {}
          goChapter(want, false);
        }

        if (!REDUCED && visible) play();
        else paintPlay();
      }).catch(function (e) {
        api.dead = true;
        console.warn('[navidix/explore]', e);
        say('<b>' + (copy.failTitle || 'The simulation could not start') + '</b>' +
            (copy.fail || 'The written explanation below covers everything it shows.'), true);
      });
    }

    function draw(dt) {
      if (!sc || !renderer) return;
      clock += dt;
      if (orbit) orbit.update(dt, sc.camera);
      sc.update(dt, clock, params);
      renderer.render(sc.scene, sc.camera);
      if (labelBox) paintLabels();
      /* The readout runs whether or not the page gave it a box to write
         into: it is a per-frame hook, and a page may well drive its own
         elements from it — the clocks on the space-time page do exactly
         that. Gating it on the container being present made those clocks
         sit at zero while everything around them ran. */
      if (opts.readout) {
        var out = opts.readout(params, clock, sc);
        if (readoutBox && out != null) readoutBox.innerHTML = out;
      }
    }

    /* ---- labels, pinned to the scene rather than drawn in it ----
       DOM rather than sprites: real text stays selectable, scales with the
       reader's font size, and never renders as a blurry quad. Each anchor
       is projected once a frame and the element is moved with a transform,
       which is the one property that does not force layout. Anything
       behind the camera, or behind the object it names, is hidden. */
    function paintLabels() {
      var r = canvas.getBoundingClientRect();
      var a = sc.anchors;
      var placed = [];
      for (var k in labels) {
        var n = labels[k], src = a[k];
        if (!src || src.hidden) { n.style.opacity = '0'; continue; }
        _v.copy(src.position).project(sc.camera);
        if (_v.z > 1) { n.style.opacity = '0'; continue; }
        /* An anchor may rename itself between frames — a scene whose
           contents depend on a zoom window has a different set of things
           worth naming at every scale, and re-creating the elements to
           say so would throw away their transitions. Written only on
           change, so this is not a per-frame DOM write. */
        if (src.text != null && n._t !== src.text) {
          n._t = src.text;
          n.querySelector('b').textContent = src.text;
        }
        /* Kept inside the frame. An anchor sitting on the scene's own edge
           — "now", at the right-hand end of a timeline — would otherwise
           hang half its label outside the canvas and read as clipped. */
        var lw = n.offsetWidth || 90, lh = n.offsetHeight || 24;
        var lx = Math.max(lw / 2 + 6, Math.min(r.width - lw / 2 - 6, (_v.x * 0.5 + 0.5) * r.width));
        var ly = Math.max(lh / 2 + 6, Math.min(r.height - lh / 2 - 6, (-_v.y * 0.5 + 0.5) * r.height));
        placed.push({ n: n, x: lx, y: ly, w: lw, h: lh, dim: !!src.dim });
      }

      /* ---- and then stop them sitting on top of each other ----
         On a laptop these never collide; on a phone the same anchors land
         in a third of the width and the tree's era labels ended up printed
         through its branch names, which is worse than saying nothing.

         So each label is offered its true position first and a short
         ladder of vertical offsets after it. A label is only ever moved
         along y — nudging one sideways would slide it off the thing it
         names — and one that cannot find room anywhere on the ladder is
         hidden rather than stacked. Full-strength labels are placed before
         dimmed ones, so when something has to go it is the label the scene
         itself marked as secondary. */
      placed.sort(function (p, q) { return (p.dim ? 1 : 0) - (q.dim ? 1 : 0); });
      var taken = [];
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i], step = p.h + 5, best = null;
        for (var s = 0; s < 7 && best === null; s++) {
          var cand = p.y + (s === 0 ? 0 : (s % 2 ? -1 : 1) * Math.ceil(s / 2) * step);
          if (cand < p.h / 2 + 4 || cand > r.height - p.h / 2 - 4) continue;
          var clash = false;
          for (var t = 0; t < taken.length; t++) {
            var q = taken[t];
            if (Math.abs(p.x - q.x) < (p.w + q.w) / 2 + 4 &&
                Math.abs(cand - q.y) < (p.h + q.h) / 2 + 3) { clash = true; break; }
          }
          if (!clash) best = cand;
        }
        if (best === null) { p.n.style.opacity = '0'; continue; }
        taken.push({ x: p.x, y: best, w: p.w, h: p.h });
        p.n.style.opacity = p.dim ? '.45' : '1';
        p.n.style.transform = 'translate(-50%,-50%) translate(' + p.x + 'px,' + best + 'px)';
      }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      /* Four seconds of frames worse than ~20fps is a machine that is not
         going to recover. Settle on the last frame rather than grind. */
      if (dt > 0.05) { if (++slowFrames > 80) { degrade(); return; } }
      else if (slowFrames) slowFrames--;
      draw(dt);
    }

    function degrade() {
      pause();
      say('<b>' + (copy.slowTitle || 'Paused — this device is struggling') + '</b>' +
          (copy.slow || 'The written explanation below covers everything the simulation shows.'), true);
    }

    function play() {
      if (!api.ready || api.running || api.dead) return;
      api.running = true; last = 0; slowFrames = 0;
      raf = requestAnimationFrame(frame);
      paintPlay();
    }
    function pause() {
      if (!api.running) return;
      api.running = false;
      cancelAnimationFrame(raf); raf = 0;
      paintPlay();
    }
    function reset() {
      clock = 0;
      Object.keys(initial).forEach(function (k) {
        params[k] = initial[k];
        if (readouts[k]) {
          readouts[k].input.value = initial[k];
          readouts[k].val.textContent = fmt(readouts[k].spec, initial[k]);
        }
      });
      paintNote();
      if (sc && sc.reset) sc.reset(params);
      if (chapters.length) goChapter(0, false);
      else if (api.ready && !api.running) draw(0);
    }

    /* ---- only draw what is on screen ---- */
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible) { api.ready ? (!REDUCED && play()) : boot(); }
          else pause();
        });
      }, { rootMargin: '200px 0px' }).observe(stage);
    } else {
      boot();
    }

    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      if (hidden) pause();
      else if (visible && api.ready && !REDUCED) play();
    });

    /* ---- resize, coalesced ---- */
    var rq = 0;
    function onResize() {
      if (rq) return;
      rq = requestAnimationFrame(function () {
        rq = 0;
        if (!renderer || !sc) return;
        var d = size();
        renderer.setSize(d.w, d.h, false);
        if (sc.resize) sc.resize(d.w, d.h);
        if (!api.running) draw(0);
      });
    }
    if ('ResizeObserver' in global) new ResizeObserver(onResize).observe(canvas);
    else addEventListener('resize', onResize);

    /* ---- the pointer, if the scene wants it ----
       Normalised to -1..1 and handed over; the scene decides what it
       means. Touch is included, and a vertical drag is left to the page
       so a phone can still scroll past a stage. */
    function point(e) {
      if (!sc || !sc.pointer) return;
      var r = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      sc.pointer(((p.clientX - r.left) / r.width) * 2 - 1,
                 -(((p.clientY - r.top) / r.height) * 2 - 1));
      if (api.ready && !api.running) draw(0);
    }
    canvas.addEventListener('pointermove', point, { passive: true });
    canvas.addEventListener('pointerleave', function () {
      if (sc && sc.pointer) { sc.pointer(0, 0); if (api.ready && !api.running) draw(0); }
    }, { passive: true });

    api.play = play; api.pause = pause; api.reset = reset;
    return api;
  }

  global.NVXExperiment = { scene: scene, mount: mount, loadThree: loadThree, hasWebGL: hasWebGL, reduced: REDUCED };
})(window);
