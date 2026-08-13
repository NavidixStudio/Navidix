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
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.2V9h-4.8"/></svg>'
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
     mount(opts)

     opts.root     selector or element for the .xp block
     opts.scene    registered scene name
     opts.params   [{ key, label, min, max, step, value, format }]
     opts.note     function(params) -> HTML for the annotation line
     opts.copy     { play, pause, reset, loading, noGL, slow, hint }
     ===================================================================== */
  function mount(opts) {
    var root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    if (!root) return null;

    var stage  = root.querySelector('.xstage');
    var canvas = root.querySelector('.xstage__canvas');
    var note   = root.querySelector('.xstage__note');
    var copy   = opts.copy || {};

    /* ---- parameters: the shell's own state, handed to the scene ---- */
    var params = {};
    (opts.params || []).forEach(function (p) { params[p.key] = p.value; });
    var initial = JSON.parse(JSON.stringify(params));

    var api = {
      running: false, ready: false, dead: false,
      params: params, scene: null
    };

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

      btnPlay.addEventListener('click', function () { api.running ? pause() : play(); });
      btnReset.addEventListener('click', reset);
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
        readouts[p.key] = { input: input, val: val, spec: p };
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
        api.ready = true;
        silence();
        draw(0);                                  /* one settled frame */

        /* Reduced motion, or a reader who arrived paused, gets that frame
           and a Play button. Everyone else starts moving. */
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
      sc.update(dt, clock, params);
      renderer.render(sc.scene, sc.camera);
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
      if (api.ready && !api.running) draw(0);
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
