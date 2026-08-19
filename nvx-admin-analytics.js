/* =====================================================================
   NAVIDIX — admin › analytics, as a section.

   The charts themselves are not here. They are still the inline script at
   the bottom of admin.html, untouched, drawing into the same #body it has
   always drawn into — all this file does is hand the shell a handle to it
   and say where it belongs in the nav.

   Two things worth knowing:

   `legacy: true` is what keeps this section alive when the CMS schema has
   not been run yet. In that state the panel has no roles table to ask, so
   it draws nothing except the sections marked this way, and this one
   still works because it depends only on the five views that predate all
   of it.

   `once: true` is because boot() reads five views and one RPC. It carries
   its own refresh button, so re-reading all of that every time someone
   clicks back to this tab would be a cost with nothing bought.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.NVX_ADMIN;
  if (!A) return;

  A.register({
    id: 'analytics',
    title: 'آمار',
    group: 'insight',
    icon: 'chart',
    legacy: true,
    once: true,
    render: function () {
      /* The container is #sec-analytics, which already exists in the page
         with #sub and #body inside it — so unlike every other section,
         this one does not build its own body. It just starts. */
      if (window.NVX_ADMIN_ANALYTICS) NVX_ADMIN_ANALYTICS.boot();
    }
  });
})();
