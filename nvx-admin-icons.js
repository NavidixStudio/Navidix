/* =====================================================================
   NAVIDIX — admin › icons.

   Drawn as paths rather than pulled from a set. Eighteen glyphs is not
   worth a dependency, and every icon library on a CDN is a third party
   that gets to run script on the page that manages the site — the same
   reasoning that put three.js and the fonts in assets/.

   All of them are 24×24, stroke-based, 1.7 weight, round caps. Uniform by
   construction rather than by luck, because they are all described the
   same way below and drawn by one function.
   ===================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var D = {
    dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z',
    article:   'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    prompt:    'M8 6l-4 6 4 6M16 6l4 6-4 6M13 4l-2 16',
    course:    'M3 8l9-4 9 4-9 4-9-4zM7 11v5c0 1 2 2 5 2s5-1 5-2v-5',
    chapter:   'M4 5h16M4 12h16M4 19h10',
    lesson:    'M5 4h11l3 3v13H5zM9 12h6M9 16h4',
    gallery:   'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9h.01',
    video:     'M3 6h13v12H3zM16 10l5-3v10l-5-3',
    tag:       'M3 12l8-8h6a2 2 0 012 2v6l-8 8zM16 8h.01',
    /* a chain link, for the social accounts */
    link:      'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7',
    /* one person, as against `users` which is the whole team */
    user:      'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
    briefcase: 'M3 8h18v12H3zM9 8V5a1 1 0 011-1h4a1 1 0 011 1v3M3 13h18',
    /* a speech bubble with its tail on the start edge, so it reads the
       same direction as the Persian beside it */
    comment:   'M21 12a8 7 0 01-8 7H9l-5 3v-4.2A7 7 0 013 12a8 7 0 018-7h2a8 7 0 018 7z',
    media:     'M4 5h16v14H4zM4 14l5-5 4 4 3-2 4 4M9 9h.01',
    search:    'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
    chart:     'M4 20V10M10 20V4M16 20v-7M22 20H2',
    users:     'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 8a3 3 0 100 6M22 21c0-3-2-4.5-4-5',
    settings:  'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-2-4-2 1-2-1-1-2H10L9 7 7 8 5 7 3 11l2 1v0l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4-2-1z',
    audit:     'M6 3h9l4 4v14H6zM10 12h6M10 16h4M14 3v5h5',
    ai:        'M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
    flow:      'M6 4h5v4H6zM13 10h5v4h-5zM6 16h5v4H6zM11 6h2v10M11 12h2',
    menu:      'M4 7h16M4 12h16M4 17h16',
    close:     'M6 6l12 12M18 6L6 18',
    plus:      'M12 5v14M5 12h14',
    warn:      'M12 4l9 16H3zM12 10v4M12 17h.01',
    info:      'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01',
    check:     'M4 12l5 5L20 6',
    upload:    'M12 16V4M8 8l4-4 4 4M4 17v3h16v-3'
  };

  /* One place decides the weight, so no icon can drift heavier than the
     rest by being written differently. */
  function icon(name) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', D[name] || D.article);
    svg.appendChild(p);
    return svg;
  }

  window.NVX_ICON = icon;
  window.NVX_ICON.has = function (n) { return !!D[n]; };
})();
