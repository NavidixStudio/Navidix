/* =====================================================================
   NAVIDIX — the public reader.

   The other side of the admin panel. Where nvx-admin-* writes to the
   content tables as a signed-in member of the team, this reads them as
   nobody in particular: the anon key, no session, no token refresh.

   Which is the whole security model, and it is worth being precise about
   it. This file asks for every row in `articles`. What comes back is only
   the published ones, because the read policy in cms-content.sql says so
   and PostgREST applies it on the server before a byte is sent. A draft
   is not hidden here; it never arrives. Reading this file, or editing it
   in a browser, does not reveal one.

   Two jobs:

     1. fetch published content and render it into whatever container
        asked for it, via a data-nvx attribute
     2. apply the values in site_settings to any element that asks

   Both are opt-in per page. A page that carries no data-nvx attribute
   loads this file and does nothing, which is why it is safe to add to
   pages that are still built from tools/.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.NVX_SUPABASE;
  if (!CFG || !CFG.url || !CFG.key) return;

  var URL_ = CFG.url.replace(/\/+$/, '');

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }


  /* ===================================================================
     1 — reading

     No Authorization header. Supplying one would mean the page behaves
     differently for a signed-in reader than a signed-out one, and the
     public side of this site has never done that.
     =================================================================== */
  function get(path) {
    return fetch(URL_ + '/rest/v1/' + path, {
      headers: { 'apikey': CFG.key, 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function media(path) {
    if (!path) return null;
    /* Already a full URL — a thumbnail that came from somewhere else. */
    if (/^https?:\/\//i.test(path)) return path;
    /* A path rooted at the site is a file in the repository, put there by
       whoever wrote the article. Articles have two publishers and only one
       of them uploads to Storage; the other commits its pictures beside its
       markdown, and had no way to point at them until now. Rejects '//',
       which is a different site wearing a relative path. */
    if (path.charAt(0) === '/' && path.charAt(1) !== '/') return path;
    return URL_ + '/storage/v1/object/public/media/' + path;
  }


  /* ===================================================================
     2 — markdown, narrowly

     Article bodies are written by people with accounts on this site, but
     "trusted author" is not a security model — an account can be taken,
     and a body that reaches innerHTML unescaped is a stored XSS on every
     page that shows it. So the text is escaped first and formatting is
     applied to the escaped text afterwards. There is no path here by
     which a < in the source becomes a tag in the output.

     Link targets are checked separately, because escaping does nothing
     about javascript: in an href.
     =================================================================== */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:)?\/\//i.test(u)) return u;
    if (/^[\/#]/.test(u)) return u;
    if (/^[\w.-]+\.html?([?#].*)?$/i.test(u)) return u;
    /* mailto:, tel: and anything else — including javascript: — do not
       become links. The text stays, so nothing is lost from the page. */
    return null;
  }

  function inline(s) {
    var out = esc(s);

    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      var u = safeUrl(src) || media(src);
      return u ? '<img src="' + esc(u) + '" alt="' + alt + '" loading="lazy" />' : alt;
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, href) {
      var u = safeUrl(href);
      return u ? '<a href="' + esc(u) + '">' + text + '</a>' : text;
    });

    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return out;
  }

  function markdown(src) {
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    var html = [], list = null, para = [];

    function flushPara() {
      if (para.length) { html.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    }
    function flushList() {
      if (list) { html.push('<' + list.tag + '>' + list.items.join('') + '</' + list.tag + '>'); list = null; }
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');

      if (!line.trim()) { flushPara(); flushList(); return; }

      var h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) {
        flushPara(); flushList();
        var lvl = Math.min(h[1].length + 1, 5);
        html.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        return;
      }

      var ul = /^\s*[-*+]\s+(.*)$/.exec(line);
      var ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        var tag = ul ? 'ul' : 'ol';
        if (!list || list.tag !== tag) { flushList(); list = { tag: tag, items: [] }; }
        list.items.push('<li>' + inline((ul || ol)[1]) + '</li>');
        return;
      }

      if (/^>\s?/.test(line)) {
        flushPara(); flushList();
        html.push('<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>');
        return;
      }

      flushList();
      para.push(line);
    });

    flushPara();
    flushList();
    return html.join('\n');
  }


  /* ===================================================================
     3 — dates
     =================================================================== */
  var DATE = null;
  try { DATE = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }); } catch (e) {}

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    if (DATE) { try { return DATE.format(d); } catch (e) {} }
    return d.toISOString().slice(0, 10);
  }


  /* ===================================================================
     4 — the renderers

     One per content type, each taking rows and producing a document
     fragment. They build nodes rather than HTML strings — the only place
     a string becomes markup in this file is the article body, which went
     through markdown() above.
     =================================================================== */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(opts) {
    var a = el(opts.href ? 'a' : 'div', 'nvxc');
    if (opts.href) a.href = opts.href;

    if (opts.image) {
      var img = el('img', 'nvxc__i');
      img.src = opts.image;
      img.alt = opts.alt || '';
      img.loading = 'lazy';
      a.appendChild(img);
    }

    var b = el('div', 'nvxc__b');
    if (opts.eyebrow) b.appendChild(el('p', 'nvxc__e', opts.eyebrow));
    b.appendChild(el('h3', 'nvxc__t', opts.title));
    if (opts.text) b.appendChild(el('p', 'nvxc__x', opts.text));

    if (opts.tags && opts.tags.length) {
      var t = el('div', 'nvxc__g');
      opts.tags.slice(0, 4).forEach(function (x) { t.appendChild(el('span', 'nvxc__tag', x)); });
      b.appendChild(t);
    }

    a.appendChild(b);
    return a;
  }

  /* The homepage speaks its own dialect: .tile inside a .band__rail, a
     meta line of dot-separated scraps, a heading, and nothing else. A
     mount there asks for data-nvx-style="tile" and gets markup that is
     indistinguishable from the hand-written rows beside it — which is the
     point. Content that announces it came from a database looks bolted
     on, and this one is not. */
  function tile(opts) {
    var a = el('a', 'tile');
    a.href = opts.href;

    /* A slim strip rather than a picture the card is built around: the
       homepage rail is four cards wide, and a tall image there would
       crowd out the one thing a reader is scanning for, which is the
       title. Cards without a cover simply have no strip - the title moves
       up, and the row still lines up because the rail stretches them. */
    if (opts.image) {
      var fig = el('span', 'tile__thumb');
      var img = el('img');
      img.src = opts.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      fig.appendChild(img);
      a.appendChild(fig);
    }

    var body = el('span', 'tile__body');
    var meta = el('span', 'tile__meta');
    meta.appendChild(el('span', 'no', opts.kind || 'مقاله'));
    (opts.bits || []).forEach(function (bit) {
      if (!bit) return;
      meta.appendChild(el('span', 'dot'));
      meta.appendChild(el('span', '', bit));
    });
    body.appendChild(meta);
    body.appendChild(el('h3', 'tile__title', opts.title));

    a.appendChild(body);
    return a;
  }

  /* Only the eleven-character id, and only from a YouTube address. The
     still is fetched from img.youtube.com by id, so a URL that is not
     YouTube's must not get to decide what that request asks for. */
  function youtubeId(url) {
    var m = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
      .exec(String(url || ''));
    return m ? m[1] : null;
  }

  function vcard(r) {
    var href = safeUrl(r.youtube_url);
    var a = el(href ? 'a' : 'div', 'vcard edge');
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }

    var cover = el('span', 'vcard__cover');
    var id = youtubeId(r.youtube_url);
    var src = media(r.thumbnail_path) ||
              (id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : null);
    if (src) {
      var img = el('img');
      img.src = src;
      img.alt = r.title || '';
      img.loading = 'lazy';
      img.width = 480;
      img.height = 270;
      cover.appendChild(img);
    }
    a.appendChild(cover);

    var body = el('span', 'vcard__body');
    body.appendChild(el('h2', '', r.title));
    if (r.description) body.appendChild(el('p', '', r.description));
    body.appendChild(el('span', 'vcard__go', 'تماشا در یوتیوب ←'));
    a.appendChild(body);
    return a;
  }

  /* ---- the studio's services ---------------------------------------
     The page keeps whatever it says today until the table has rows, so
     an empty panel never empties a page. */
  function serviceCard(r) {
    var box = el('article', 'nvxsvc');
    if (r.title_en) box.appendChild(el('p', 'nvxsvc__en lat', r.title_en));
    box.appendChild(el('h3', 'nvxsvc__t', r.title));
    if (r.summary) box.appendChild(el('p', 'nvxsvc__s', r.summary));
    if (r.body) {
      var body = el('div', 'nvxsvc__b');
      body.innerHTML = markdown(r.body);
      box.appendChild(body);
    }
    if (r.price_note) box.appendChild(el('p', 'nvxsvc__p', r.price_note));
    var href = safeUrl(r.cta_url);
    if (href && r.cta_label) {
      var a = el('a', 'nvxsvc__go', r.cta_label);
      a.href = href;
      box.appendChild(a);
    }
    return box;
  }

  /* ---- the social accounts -----------------------------------------
     The icon is chosen from the platform name and falls back to a
     generic link mark, so a network added in the panel today appears
     correctly today without a change to this file. */
  var SOCIAL_ICON = {
    youtube:   'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z',
    telegram:  'M21.9 4.3 2.9 11.6c-1.1.4-1.1 1.1-.2 1.4l4.8 1.5 1.8 5.6c.2.6.4.8 1 .8.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.6.2 1.8-.9l3.3-15.5c.3-1.3-.5-1.9-1.9-1.1zM8.6 14.4l10.4-6.6c.5-.3.9-.1.6.2l-8.9 8-.3 3.7z',
    instagram: 'M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.9c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-3.2-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.9s0-3.5.1-4.8c.1-3.2 1.7-4.8 4.9-4.9 1.3-.1 1.7-.1 4.9-.1zm0 3.8a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 9.9a3.9 3.9 0 1 1 0-7.8 3.9 3.9 0 0 1 0 7.8zm6.2-10.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z',
    linkedin:  'M20.4 20.4h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.2V9h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.2zM5.1 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM6.9 20.4H3.3V9h3.6v11.4z',
    x:         'M18.9 2.3h3.4l-7.5 8.5 8.8 11.6h-6.9l-5.4-7-6.2 7H1.7l8-9.1L1.3 2.3h7.1l4.9 6.4 5.6-6.4zm-1.2 18h1.9L6.4 4.2H4.3l13.4 16.1z',
    github:    'M12 1.5a10.5 10.5 0 0 0-3.3 20.5c.5.1.7-.2.7-.5v-1.9c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-.9-.7.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.3 0c2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.7 1.1 2.9 0 4-2.5 4.9-4.8 5.2.4.3.7 1 .7 2v3c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5z',
    tiktok:    'M16.5 2h-3v13.2a2.7 2.7 0 1 1-2.3-2.7v-3a5.7 5.7 0 1 0 5.3 5.7V8.7a7 7 0 0 0 4 1.3V7a4 4 0 0 1-4-4z',
    discord:   'M19.5 5.3A16 16 0 0 0 15.5 4l-.3.6a14 14 0 0 1 3.4 1.4 13 13 0 0 0-9.8-.5A13 13 0 0 0 8.8 4.6L8.5 4a16 16 0 0 0-4 1.3C2 9 1.3 12.6 1.6 16.1a16 16 0 0 0 4.9 2.5l.9-1.4a10 10 0 0 1-1.6-.8l.4-.3a11 11 0 0 0 9.6 0l.4.3c-.5.3-1 .6-1.6.8l.9 1.4a16 16 0 0 0 4.9-2.5c.4-4-.7-7.6-2.9-10.8zM8.5 14.1c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9c0 1-.8 1.9-1.7 1.9zm7 0c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9c0 1-.8 1.9-1.7 1.9z',
    whatsapp:  'M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1a14 14 0 0 1-6-5.3c-.4-.7-.9-1.6-.9-2.5s.5-1.4.7-1.6c.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6a9 9 0 0 0 4 3.5c.3.1.5.1.6-.1l.8-1c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3z',
    threads:   'M16.4 11.3c-.1-.1-.3-.1-.4-.2-.2-3.7-2.2-5.8-5.6-5.8-2 0-3.7.9-4.8 2.5l1.9 1.3c.8-1.2 2-1.5 2.9-1.5 1.1 0 1.9.3 2.4 1 .4.5.6 1.1.7 2a12 12 0 0 0-2.6-.2c-2.6 0-4.6 1.5-4.5 3.7 0 1.1.6 2 1.5 2.6.8.5 1.8.8 2.9.7 1.4-.1 2.6-.7 3.3-1.7.6-.8.9-1.8 1-3 .6.4 1 .9 1.3 1.5.4.9.4 2.4-.8 3.6l1.7 1.5c.8-.8 1.4-1.8 1.6-3 .3-1.5 0-3.2-1.5-4.5zm-5.6 4.6c-1.2.1-2.4-.4-2.5-1.5 0-.8.6-1.7 2.5-1.7.7 0 1.4.1 2 .2-.2 2.2-1.2 2.9-2 3z'
  };
  var SOCIAL_FALLBACK = 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7';

  function socialCard(r) {
    var href = safeUrl(r.url);
    var a = el(href ? 'a' : 'div', 'chan edge');
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; }
    if (r.platform) a.className += ' chan--' + String(r.platform).toLowerCase().slice(0, 2);

    var key = String(r.platform || '').toLowerCase();
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    if (SOCIAL_ICON[key]) {
      svg.setAttribute('fill', 'currentColor');
      path.setAttribute('d', SOCIAL_ICON[key]);
    } else {
      /* An unknown network still gets a mark rather than a hole. */
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.7');
      svg.setAttribute('stroke-linecap', 'round');
      path.setAttribute('d', SOCIAL_FALLBACK);
    }
    svg.appendChild(path);
    a.appendChild(svg);

    var body = el('span');
    body.appendChild(el('b', '', r.label));
    if (r.handle) body.appendChild(el('span', 'at lat', r.handle));
    if (r.description) body.appendChild(el('p', '', r.description));
    a.appendChild(body);
    return a;
  }

  var RENDER = {
    articles: function (rows, style) {
      if (style === 'tile') {
        /* A fragment, not a wrapper: the mount node is already the rail,
           and a div between it and its tiles would break the grid. */
        var f = document.createDocumentFragment();
        rows.forEach(function (r) {
          f.appendChild(tile({
            href: 'article.html?slug=' + encodeURIComponent(r.slug),
            kind: 'مقاله',
            image: media(r.cover_path),
            bits: [when(r.published_at), (r.tags || [])[0]],
            title: r.title
          }));
        });
        return f;
      }

      var g = el('div', 'nvxg');
      rows.forEach(function (r) {
        g.appendChild(card({
          href: 'article.html?slug=' + encodeURIComponent(r.slug),
          image: media(r.cover_path),
          eyebrow: when(r.published_at),
          title: r.title,
          text: r.excerpt,
          tags: r.tags
        }));
      });
      return g;
    },

    prompts: function (rows, style) {
      /* The library page has its own card, its own search index and its
         own category chips. A prompt from the panel wears that card and
         carries the same data-cat and data-tags, so it is filtered and
         searched by the machinery already on the page rather than sitting
         outside it. */
      if (style === 'pc') {
        var f = document.createDocumentFragment();
        rows.forEach(function (r) {
          var a = el('a', 'pc');
          a.href = 'prompts.html#' + encodeURIComponent(r.slug || '');
          a.setAttribute('data-cat', 'new');
          a.setAttribute('data-tags',
            [r.title_fa, r.title_en].concat(r.tags || []).filter(Boolean).join(' '));

          var sw = el('span', 'pc__sw');
          var cover = media(r.cover_path);
          if (cover) {
            var img = el('img');
            img.src = cover; img.alt = r.title_fa || '';
            img.loading = 'lazy'; img.decoding = 'async';
            img.width = 800; img.height = 500;
            sw.appendChild(img);
          }
          if (r.title_en) sw.appendChild(el('span', 'pc__tag', r.title_en));
          a.appendChild(sw);

          var body = el('span', 'pc__body');
          var h = el('h3', 'pc__title', r.title_fa);
          if (r.title_en) h.appendChild(el('span', 'pc__en', r.title_en));
          body.appendChild(h);
          if (r.recipe) body.appendChild(el('p', 'pc__hint', r.recipe));
          var go = el('span', 'pc__go');
          go.appendChild(el('span', '', 'باز کردن سبک'));
          body.appendChild(go);
          a.appendChild(body);
          f.appendChild(a);
        });
        return f;
      }

      var g = el('div', 'nvxg');
      rows.forEach(function (r) {
        g.appendChild(card({
          image: media(r.cover_path),
          eyebrow: r.title_en || '',
          title: r.title_fa,
          text: r.recipe,
          tags: r.tags
        }));
      });
      return g;
    },

    gallery: function (rows) {
      var g = el('div', 'nvxg nvxg--tight');
      rows.forEach(function (r) {
        g.appendChild(card({
          image: media(r.media_path),
          alt: r.alt_text || r.title,
          title: r.title,
          text: r.description,
          tags: r.tags
        }));
      });
      return g;
    },

    services: function (rows) {
      var g = el('div', 'nvxsvcs');
      rows.forEach(function (r) { g.appendChild(serviceCard(r)); });
      return g;
    },

    social: function (rows) {
      var f = document.createDocumentFragment();
      rows.forEach(function (r) { f.appendChild(socialCard(r)); });
      return f;
    },

    videos: function (rows, style) {
      /* The documentaries page draws its own card and takes the still
         from the YouTube id, so a video published from the panel needs
         nothing but a link to sit beside the four already on that page
         and look like one of them. Anything else gets the generic card. */
      if (style === 'vcard') {
        var f = document.createDocumentFragment();
        rows.forEach(function (r) { f.appendChild(vcard(r)); });
        return f;
      }

      var g = el('div', 'nvxg');
      rows.forEach(function (r) {
        g.appendChild(card({
          href: r.youtube_url,
          image: media(r.thumbnail_path),
          title: r.title,
          text: r.description,
          tags: r.tags
        }));
      });
      return g;
    },

    lessons: function (rows) {
      var g = el('div', 'nvxg');
      rows.forEach(function (r) {
        g.appendChild(card({
          href: r.video_url || null,
          image: media(r.thumbnail_path),
          eyebrow: r.duration_minutes ? fa(r.duration_minutes) + ' دقیقه' : '',
          title: r.title,
          text: r.description,
          tags: r.tags
        }));
      });
      return g;
    }
  };

  /* ===================================================================
     4.5 — two publishers, one list

     Articles reach this site two ways and both are first-class:

       the repo   content/articles/*.md → tools/build-content.py → JSON
       the panel  the articles table    → PostgREST

     The panel is for a person. The repo is for anything that can only
     reach git — which includes every agent working on this project, and
     is why "add an article" went from one step to a step that ended on
     the owner's phone. Restoring the file path restores that.

     Where a slug exists in both, the database wins: somebody edited that
     one on purpose, and the file is just where it started.

     A missing or unbuilt articles.json is not an error. It is a site
     that publishes only from the panel, which is a legitimate way to run
     this and must not put a message on a reader's screen.
     =================================================================== */
  function repoArticles() {
    return fetch('/content/articles.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; })
      .catch(function () { return []; });
  }

  function mergeArticles(dbRows, repoRows) {
    var out = [], seen = {}, i;

    for (i = 0; i < dbRows.length; i++) {
      out.push(dbRows[i]);
      seen[dbRows[i].slug] = true;
    }
    for (i = 0; i < repoRows.length; i++) {
      if (!seen[repoRows[i].slug]) out.push(repoRows[i]);
    }

    /* Newest first across both sources. Undated rows sort last rather
       than to the top, which is where a missing value would otherwise
       land them. */
    out.sort(function (a, b) {
      var x = a.published_at || '', y = b.published_at || '';
      if (!x) return 1;
      if (!y) return -1;
      return x < y ? 1 : x > y ? -1 : 0;
    });
    return out;
  }

  function articles() {
    return Promise.all([
      get(QUERY.articles).catch(function () { return []; }),
      repoArticles()
    ]).then(function (r) { return mergeArticles(r[0] || [], r[1] || []); });
  }

  /* Its own query rather than a scan of articles(): that list deliberately
     leaves `body` behind so a page of titles does not drag every article
     across the network, and this is the one caller that needs it. */
  function article(slug) {
    return Promise.all([
      get('articles?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1')
        .catch(function () { return []; }),
      repoArticles()
    ]).then(function (r) {
      var db = (r[0] || [])[0];
      if (db) return db;
      var repo = r[1] || [];
      for (var i = 0; i < repo.length; i++) {
        if (repo[i].slug === slug) return repo[i];
      }
      return null;
    });
  }


  /* Which columns each type needs, so a list page does not drag article
     bodies across the network to show titles. */
  var QUERY = {
    articles: 'articles?select=slug,title,excerpt,cover_path,tags,published_at' +
              '&order=sort_order.asc,published_at.desc',
    prompts:  'prompts?select=slug,title_fa,title_en,recipe,cover_path,tags,featured' +
              '&order=sort_order.asc,created_at.desc',
    gallery:  'gallery_items?select=title,description,media_path,alt_text,tags,featured' +
              '&order=sort_order.asc,created_at.desc',
    services: 'services?select=*&order=sort_order.asc,created_at.asc',
    social:   'social_links?select=*&order=sort_order.asc,created_at.asc',
    videos:   'videos?select=title,description,thumbnail_path,youtube_url,tags,featured' +
              '&order=sort_order.asc,created_at.desc',
    lessons:  'lessons?select=slug,title,description,thumbnail_path,video_url,' +
              'duration_minutes,tags&order=sort_order.asc,created_at.desc'
  };


  /* ===================================================================
     5 — mounting

     A container says what it wants and this fills it:

       <div data-nvx="articles" data-nvx-limit="6"></div>

     An empty result removes the container's whole section rather than
     leaving a heading over nothing. That matters on the pages that are
     still built from tools/: adding a mount point there must be invisible
     until the day something is actually published into it.
     =================================================================== */
  function mount(node) {
    var kind = node.getAttribute('data-nvx');
    if (!RENDER[kind]) return;

    var limit = parseInt(node.getAttribute('data-nvx-limit'), 10);
    var featured = node.getAttribute('data-nvx-featured') === 'true';

    /* Articles come from both publishers and are merged before anything
       is counted, so a limit means "the newest N of everything" rather
       than "the newest N the database happens to hold". */
    var source;
    if (kind === 'articles') {
      source = articles().then(function (rows) {
        return limit > 0 ? rows.slice(0, limit) : rows;
      });
    } else {
      var q = QUERY[kind];
      if (featured) q += '&featured=is.true';
      if (limit > 0) q += '&limit=' + limit;
      source = get(q);
    }

    node.setAttribute('data-nvx-state', 'loading');

    source.then(function (rows) {
      node.setAttribute('data-nvx-state', rows.length ? 'ready' : 'empty');

      if (!rows.length) {
        var hideSel = node.getAttribute('data-nvx-hide');
        if (hideSel) {
          var host = node.closest(hideSel);
          if (host) host.hidden = true;
        }
        node.hidden = !node.hasAttribute('data-nvx-keep');
        return;
      }

      /* Some pages already carry a hand-written version of the same
         list. When the panel has rows they are the truth, so the
         hand-written ones are removed rather than shown twice — but only
         once the rows have actually arrived, so a page whose database is
         unreachable keeps what it had. */
      /* A section that starts hidden - so it never flashes empty on a
         page whose database is slow or gone - has to be revealed once
         there is something to show. */
      var hideSel = node.getAttribute('data-nvx-hide');
      if (hideSel) {
        var reveal = node.closest(hideSel);
        if (reveal) reveal.hidden = false;
      }
      node.hidden = false;

      var replaces = node.getAttribute('data-nvx-replaces');
      if (replaces && node.parentNode) {
        Array.prototype.forEach.call(node.parentNode.querySelectorAll(replaces),
          function (old) { if (old !== node && !node.contains(old)) old.remove(); });
      }

      node.textContent = '';
      node.appendChild(RENDER[kind](rows, node.getAttribute('data-nvx-style')));
      node.dispatchEvent(new CustomEvent('nvx:content', { bubbles: true, detail: { rows: rows } }));

    }, function () {
      /* The tables may not exist yet, or the network may be gone. Either
         way this is a section that does not appear — never an error
         message on a page a reader came to for something else. */
      node.setAttribute('data-nvx-state', 'error');
      node.hidden = true;
    });
  }


  /* ===================================================================
     5b — the introduction, and keeping social links in step

     Two jobs that are not rendering a list.

     The first fills any element carrying data-nvx-profile with a field
     from the single row in site_profile, so the About page can be edited
     from the panel without its markup moving.

     The second is the one that matters when a handle changes. The social
     links are written into the HTML of a dozen pages, and rebuilding all
     of them is not something the owner of an Instagram account should
     have to do. So every anchor already on the page whose host matches a
     row in social_links is repointed at whatever the panel now says.

     It only ever rewrites a link that already pointed at that same
     network — the host of the old href has to match the host of the new
     one — so this cannot turn a link to somewhere else into a link to a
     social account, and cannot introduce a link the page did not have.
     =================================================================== */
  function host(u) {
    try { return new URL(u, location.href).host.replace(/^www\./, ''); }
    catch (e) { return null; }
  }

  function fillProfile(row) {
    document.querySelectorAll('[data-nvx-profile]').forEach(function (node) {
      var key = node.getAttribute('data-nvx-profile');
      var value = row[key];
      if (value == null || value === '') return;

      if (key === 'photo_path') {
        var url = media(value);
        if (!url) return;
        if (node.tagName === 'IMG') node.src = url;
        else node.style.backgroundImage = 'url(' + JSON.stringify(url) + ')';
        return;
      }
      if (key === 'bio' && node.hasAttribute('data-nvx-markdown')) {
        node.innerHTML = markdown(value);
        return;
      }
      node.textContent = value;
    });
  }

  function syncSocialLinks(rows) {
    var byHost = {};
    rows.forEach(function (r) {
      var h = host(r.url);
      if (h && safeUrl(r.url)) byHost[h] = r;
    });
    if (!Object.keys(byHost).length) return;

    document.querySelectorAll('a[href]').forEach(function (a) {
      var row = byHost[host(a.getAttribute('href'))];
      if (!row) return;
      a.href = row.url;
      /* Where the page shows the handle as its own scrap of text, that
         moves too — otherwise the link would be right and the label
         beside it would be a lie. */
      var at = a.querySelector('.at');
      if (at && row.handle) at.textContent = row.handle;
    });
  }

  function siteExtras() {
    if (document.querySelector('[data-nvx-profile]')) {
      get('site_profile?select=*&limit=1').then(function (rows) {
        if (rows && rows[0]) fillProfile(rows[0]);
      }, function () {});
    }

    get(QUERY.social).then(function (rows) {
      if (rows && rows.length) syncSocialLinks(rows);
    }, function () {});
  }


  /* ===================================================================
     6 — site settings

       <span data-nvx-setting="site_title"></span>

     Read from a table that is public by policy, so this works signed out.
     Maintenance mode is the one setting that does something rather than
     saying something — and it is honest about what it can do: on a static
     site a client-side notice is a notice, not a lock. Anyone determined
     still has the file. It is there to tell readers, not to stop them.
     =================================================================== */
  function settings() {
    var wants = document.querySelectorAll('[data-nvx-setting]');
    var needMaint = document.documentElement.hasAttribute('data-nvx-maintenance');
    if (!wants.length && !needMaint) return;

    get('site_settings?select=key,value').then(function (rows) {
      var by = {};
      rows.forEach(function (r) { by[r.key] = r.value; });

      Array.prototype.forEach.call(wants, function (n) {
        var v = by[n.getAttribute('data-nvx-setting')];
        if (v == null) return;
        if (typeof v === 'string') n.textContent = v;
        else n.textContent = JSON.stringify(v);
      });

      if (needMaint && by.maintenance_mode === true) {
        var bar = el('div', 'nvx-maint',
          'سایت در حال به‌روزرسانی است. ممکن است بعضی بخش‌ها موقتاً کامل نباشند.');
        document.body.insertBefore(bar, document.body.firstChild);
      }
    }, function () {});
  }


  /* ===================================================================
     7 — styles for what this file draws

     Injected rather than asked of every page, for the same reason
     nvx-ui.js does it: a page should be able to add a mount point without
     also having to be given a stylesheet.
     =================================================================== */
  function styles() {
    var css = document.createElement('style');
    css.textContent = [
      '.nvxg{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;margin:22px 0}',
      '.nvxg--tight{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}',
      '.nvxc{display:flex;flex-direction:column;border:1px solid #262A31;border-radius:14px;',
      '  overflow:hidden;background:#11151B;text-decoration:none;color:inherit;',
      '  transition:border-color .25s,transform .25s}',
      'a.nvxc:hover{border-color:rgba(150,196,255,.5);transform:translateY(-2px)}',
      '.nvxc__i{width:100%;aspect-ratio:8/5;object-fit:cover;display:block;background:#0E1116}',
      '.nvxc__b{padding:15px 16px;display:flex;flex-direction:column;gap:7px}',
      '.nvxc__e{margin:0;font-size:11.5px;color:#6B7280;letter-spacing:.04em}',
      '.nvxc__t{margin:0;font-size:15.5px;font-weight:700;line-height:1.8;color:#EDF2FA}',
      '.nvxc__x{margin:0;font-size:13px;line-height:1.95;color:#8C939B;',
      '  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.nvxc__g{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}',
      '.nvxc__tag{font-size:10.5px;color:#8C939B;border:1px solid #262A31;',
      '  border-radius:5px;padding:1px 7px}',
      '.nvx-maint{background:rgba(229,32,42,.12);border-bottom:1px solid rgba(229,32,42,.4);',
      '  color:#EDF2FA;font-size:13px;text-align:center;padding:10px 16px;line-height:1.8}',
      '[data-nvx][data-nvx-state="loading"]{min-height:60px}'
    ].join('');
    document.head.appendChild(css);
  }


  function boot() {
    styles();
    Array.prototype.forEach.call(document.querySelectorAll('[data-nvx]'), mount);
    settings();
    siteExtras();
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NVX_CONTENT = {
    get: get, media: media, markdown: markdown, when: when, card: card, el: el,
    articles: articles, article: article
  };
})();
