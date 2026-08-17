/* =====================================================================
   NAVIDIX — mobile navigation drawer.

   Every bar on this site was built as a desktop row: a brand mark at one
   end, links and the account button at the other. On a phone that row runs
   out of width and the items slide over each other — the account button in
   particular, which carries a full username and is injected late by
   nvx-auth.js.

   Below the breakpoint everything except the brand mark moves into a panel
   behind a menu button, and moves back on resize or rotate. Items are moved
   rather than duplicated, so the account button keeps the handlers
   nvx-auth.js bound to it, and a comment node holds each one's place in the
   bar so the order survives the trip back.
   ===================================================================== */
(function () {
  'use strict';

  var MQ   = window.matchMedia('(max-width: 820px)');
  var BAR  = '.sitebar .row, .xbar__row, .bar__row, .topbar__row';
  var HOME = '.home, .xbar__home, .bar__home, .topbar__home';

  var row = document.querySelector(BAR);
  if (!row) return;

  /* The homepage keeps its language switch pinned to the hero corner and
     only reveals its bar once the landing has been scrolled past. Hosting
     the button there means the menu is reachable from the first frame. */
  var host = document.getElementById('lang') || row;

  var css = document.createElement('style');
  css.textContent = [
    '.nvxnav__burger{display:none;align-items:center;justify-content:center;',
    '  width:26px;height:26px;padding:0;background:none;border:0;cursor:pointer;',
    '  flex:none;gap:5px;flex-direction:column;}',
    '.nvxnav__burger span{display:block;width:17px;height:1.5px;border-radius:2px;',
    '  background:currentColor;color:inherit;transition:transform .3s,opacity .3s;}',
    '.nvxnav__panel{position:fixed;z-index:2147483000;top:0;bottom:0;inset-inline-end:0;',
    '  width:min(78vw,320px);padding:76px 26px 30px;overflow-y:auto;',
    '  background:#0B0D11;border-inline-start:1px solid rgba(255,255,255,.1);',
    '  box-shadow:-24px 0 60px -20px rgba(0,0,0,.8);',
    '  transform:translateX(100%);transition:transform .32s cubic-bezier(.16,1,.3,1);',
    '  display:flex;flex-direction:column;align-items:stretch;gap:4px;}',
    'html[dir="rtl"] .nvxnav__panel{transform:translateX(-100%);}',
    /* the direction rule above carries an extra selector, so the open state
       has to match it or the panel never leaves its off-screen position */
    '.nvxnav__panel[data-open],html[dir="rtl"] .nvxnav__panel[data-open]{transform:translateX(0);}',
    '.nvxnav__scrim{position:fixed;z-index:2147482999;inset:0;background:rgba(0,0,0,.55);',
    '  opacity:0;transition:opacity .32s;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}',
    '.nvxnav__scrim[data-open]{opacity:1;}',
    /* The moved items arrive with whatever the bar styled them as — inline
       links sized for a row. In the panel they are a stacked list. */
    '.nvxnav__panel > *{display:block;width:100%;margin:0;text-align:start;',
    '  font-size:15px;line-height:1.9;padding:11px 2px;}',
    /* Out of the bar these links lose the colour the bar gave them and fall
       back to the browser default blue, so the panel states it itself. */
    '.nvxnav__panel a{display:block;color:#C9D1D9;text-decoration:none;font-size:15.5px;',
    '  padding:13px 2px;border-bottom:1px solid rgba(255,255,255,.08);}',
    '.nvxnav__panel a:hover,.nvxnav__panel a:focus-visible{color:var(--nvx-red,#E5202A);}',
    '.nvxnav__panel > span, .nvxnav__panel > .topbar__links{display:flex;flex-direction:column;',
    '  align-items:stretch;gap:0;padding:0;}',
    '.nvxnav__panel .nvxa{margin-top:18px;padding:12px 14px;font-size:14.5px;}',
    '.nvxnav__close{position:absolute;top:20px;inset-inline-end:22px;width:30px;height:30px;',
    '  padding:0;background:none;border:0;color:#8C939B;font-size:26px;line-height:1;cursor:pointer;}',
    '.nvxnav__close:hover{color:var(--nvx-red,#E5202A);}',
    '@media (max-width:820px){',
    '  .nvxnav__burger{display:flex;}',
    '  html.nvxnav-open,html.nvxnav-open body{overflow:hidden;}',
    '}'
  ].join('');
  document.head.appendChild(css);

  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'nvxnav__burger';
  burger.setAttribute('aria-label', 'منو');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';

  var scrim = document.createElement('div');
  scrim.className = 'nvxnav__scrim';
  scrim.hidden = true;

  var panel = document.createElement('div');
  panel.className = 'nvxnav__panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'منو');

  var closer = document.createElement('button');
  closer.type = 'button';
  closer.className = 'nvxnav__close';
  closer.setAttribute('aria-label', 'بستن');
  closer.textContent = '×';
  panel.appendChild(closer);

  host.appendChild(burger);
  document.body.appendChild(scrim);
  document.body.appendChild(panel);

  var moved = [];

  /* The brand mark and the theme button stay in the bar: one is the way back
     to the homepage, the other is a single tap that should not cost a menu. */
  function movable(el) {
    return el !== burger && el.nodeType === 1 && !el.matches(HOME) &&
           el.id !== 'themeToggle' && !el.classList.contains('nvxnav__burger');
  }

  function collapse() {
    if (moved.length) return;
    Array.prototype.slice.call(row.children).forEach(function (el) {
      if (!movable(el)) return;
      var mark = document.createComment('nvxnav');
      row.insertBefore(mark, el);
      panel.appendChild(el);
      moved.push({ el: el, mark: mark });
    });
  }

  function restore() {
    close();
    moved.forEach(function (m) {
      if (m.mark.parentNode) m.mark.parentNode.replaceChild(m.el, m.mark);
    });
    moved = [];
  }

  function open() {
    scrim.hidden = false; panel.hidden = false;
    /* one frame, so the transition has a start state to move from */
    requestAnimationFrame(function () {
      scrim.setAttribute('data-open', '');
      panel.setAttribute('data-open', '');
    });
    burger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('nvxnav-open');
  }

  function close() {
    scrim.removeAttribute('data-open');
    panel.removeAttribute('data-open');
    burger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('nvxnav-open');
    setTimeout(function () {
      if (!panel.hasAttribute('data-open')) { scrim.hidden = true; panel.hidden = true; }
    }, 340);
  }

  burger.addEventListener('click', function () {
    if (panel.hasAttribute('data-open')) close(); else open();
  });
  closer.addEventListener('click', close);
  scrim.addEventListener('click', close);
  panel.addEventListener('click', function (e) {
    /* A link inside the panel is navigating away; the theme button is not. */
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.hasAttribute('data-open')) close();
  });

  /* nvx-auth.js appends the account button after this runs. While the bar is
     collapsed anything landing in it belongs in the panel instead. */
  new MutationObserver(function (records) {
    if (!moved.length) return;
    records.forEach(function (r) {
      Array.prototype.slice.call(r.addedNodes).forEach(function (n) {
        if (n.nodeType !== 1 || !movable(n)) return;
        var mark = document.createComment('nvxnav');
        row.insertBefore(mark, n);
        panel.appendChild(n);
        moved.push({ el: n, mark: mark });
      });
    });
  }).observe(row, { childList: true });

  function sync() { if (MQ.matches) collapse(); else restore(); }
  if (MQ.addEventListener) MQ.addEventListener('change', sync);
  else MQ.addListener(sync);
  sync();
})();
