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

  var RENDER = {
    articles: function (rows) {
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

    prompts: function (rows) {
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

    videos: function (rows) {
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

      node.textContent = '';
      node.appendChild(RENDER[kind](rows));
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
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NVX_CONTENT = {
    get: get, media: media, markdown: markdown, when: when, card: card, el: el,
    articles: articles, article: article
  };
})();
