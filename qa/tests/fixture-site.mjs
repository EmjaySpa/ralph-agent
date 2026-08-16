/**
 * A deliberately defective miniature site, served from memory over loopback.
 * Every defect class the suite claims to catch is seeded here exactly once, so
 * the self-tests prove the checks fire rather than merely that they run.
 */
import http from 'node:http';

export const SEEDED_DEFECTS = [
  'rogue colour #2EA3F2 (inline style + stylesheet)',
  'duplicate <title> across two pages',
  'missing meta description',
  'duplicate meta description',
  'missing canonical',
  'canonical pointing elsewhere',
  'noindex page listed in sitemap',
  'two H1s on one page',
  'empty H2',
  'skipped heading level',
  'image with no alt attribute',
  'linked image with empty alt',
  'internal link to a 404',
  'internal link to a redirect',
  'redirect chain of 3 hops',
  '302 instead of 301',
  'external link returning 404',
  'orphan page (in sitemap, unlinked)',
  'thin page',
  'near-duplicate page',
  'retired offer references (Midweek Reset, gift certificates)',
  'legacy location reference (Cleveland)',
  'generic-only booking link on a service page',
  'form field without a label',
  'form without a submit button',
  'invalid JSON-LD',
  'LocalBusiness missing required address',
  'mixed content (http:// image)',
  'placeholder copy (lorem ipsum)',
  'console error + uncaught page error',
  'mobile horizontal overflow',
  'low colour contrast',
  'unapproved font (Comic Sans MS)',
  'anchor link with no target',
  'missing lang attribute',
];

function page(body, { title = 'Emjay Wellness Test', head = '' } = {}) {
  return `<!doctype html>
<html lang="en-AU"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/theme.css">
${head}
</head><body>
<header><nav>
  <a href="/">Home</a>
  <a href="/services/skin-therapy/">Skin Therapy</a>
  <a href="/about/">About</a>
  <a href="/contact/">Contact</a>
</nav></header>
<main>${body}</main>
<footer><p>Emjay Wellness, Tinana QLD</p></footer>
</body></html>`;
}

const filler = (n) =>
  Array.from({ length: n }, (_, i) => `Steady nervous system support for women in midlife sentence number ${i}.`).join(' ');

const ROUTES = {
  '/': {
    body: page(
      `<h1>Emjay Wellness</h1>
       <h2>Nervous system support in Tinana</h2>
       <p>${filler(30)}</p>
       <p><a href="/services/skin-therapy/">Skin therapy</a> and
          <a href="/about/">about Bel</a>, plus <a href="/blog/post-one/">the blog</a>,
          <a href="/thin/">a short page</a>, <a href="/broken/">a broken link</a>,
          <a href="/old-service/">an old service</a> and
          <a href="https://example.invalid/does-not-exist">an external link</a>.</p>
       <img src="/hero.jpg" alt="Bel in the treatment room">
       <a href="#nowhere">Jump to nowhere</a>`,
      {
        title: 'Emjay Wellness — Nervous System Support Tinana',
        head: `<link rel="canonical" href="__BASE__/">
<meta name="description" content="Trauma informed nervous system support for women in midlife, in Tinana and online across Australia every week.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Emjay Wellness","url":"__BASE__/"}</script>`,
      },
    ),
  },

  '/services/skin-therapy/': {
    body: page(
      `<h1 style="color:#2EA3F2">Skin Therapy</h1>
       <h1>Second H1 that should not exist</h1>
       <h2></h2>
       <h4>Skipped from h2 to h4</h4>
       <p>${filler(25)}</p>
       <p class="faint">Low contrast copy that should fail the AA ratio.</p>
       <p class="rogue">Rogue themed paragraph.</p>
       <div style="width:1200px;background:#eee">Fixed width block that overflows a phone.</div>
       <img src="/treatment.jpg">
       <a href="/contact/"><img src="/icon.png" alt=""></a>
       <p><a href="https://squareup.com/appointments/book/emjay/">Book an appointment</a></p>
       <img src="http://insecure.example.com/tracker.gif" alt="tracker">
       <script>console.error('theme widget failed to initialise'); undefinedFunctionCall();</script>`,
      {
        title: 'Skin Therapy — Emjay Wellness',
        head: `<link rel="canonical" href="__BASE__/services/skin-therapy/">
<meta name="description" content="Clinical skin therapy informed by nervous system and hormonal knowledge, available in Tinana every week of the year.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Emjay Wellness"}</script>
<script type="application/ld+json">{ this is not valid json }</script>`,
      },
    ),
  },

  '/about/': {
    body: page(
      `<h1>About Bel</h1>
       <h2>Where we work</h2>
       <p>Sessions run from Tinana and from Cleveland. ${filler(20)}</p>
       <p>Ask about our Midweek Reset and gift certificates.</p>
       <p>Lorem ipsum dolor sit amet, placeholder copy left in the page.</p>
       <p style="font-family:'Comic Sans MS'">Wrong typeface entirely.</p>`,
      {
        title: 'About — Emjay Wellness',
        head: `<link rel="canonical" href="__BASE__/about/">
<meta name="description" content="About Belinda Evans, integrated wellness practitioner working with women in midlife across Queensland and online.">`,
      },
    ),
  },

  '/contact/': {
    body: page(
      `<h1>Contact</h1>
       <p>${filler(18)}</p>
       <form action="/submit" method="get">
         <label for="name">Your name</label>
         <input type="text" id="name" name="name" required>
         <input type="text" name="email" placeholder="Email address" required>
         <textarea name="message"></textarea>
       </form>`,
      {
        title: 'Contact — Emjay Wellness',
        head: `<link rel="canonical" href="__BASE__/contact/">`,
      },
    ),
  },

  // Duplicate title + duplicate meta description with /blog/post-two/.
  '/blog/post-one/': {
    body: page(`<h1>Post One</h1><p>${filler(40)}</p>`, {
      title: 'Blog — Emjay Wellness',
      head: `<link rel="canonical" href="__BASE__/blog/post-one/">
<meta name="description" content="A blog post from Emjay Wellness about nervous system regulation for women in midlife and what actually helps.">`,
    }),
  },
  '/blog/post-two/': {
    body: page(`<h1>Post Two</h1><p>${filler(40)}</p>`, {
      title: 'Blog — Emjay Wellness',
      head: `<link rel="canonical" href="__BASE__/blog/post-one/">
<meta name="description" content="A blog post from Emjay Wellness about nervous system regulation for women in midlife and what actually helps.">`,
    }),
  },

  '/thin/': {
    body: page(`<h1>Thin</h1><p>Not much here.</p>`, {
      title: 'Thin Page — Emjay Wellness',
      head: `<link rel="canonical" href="__BASE__/thin/">`,
    }),
  },

  // In the sitemap, linked from nowhere.
  '/orphan/': {
    body: page(`<h1>Orphan</h1><p>${filler(30)}</p>`, {
      title: 'Orphan Page — Emjay Wellness',
      head: `<link rel="canonical" href="__BASE__/orphan/">
<meta name="description" content="An orphan page that nothing links to, included in the sitemap so the orphan check has something to find.">`,
    }),
  },

  // noindex, yet listed in the sitemap.
  '/hidden/': {
    body: page(`<h1>Hidden</h1><p>${filler(30)}</p>`, {
      title: 'Hidden — Emjay Wellness',
      head: `<meta name="robots" content="noindex,follow">
<link rel="canonical" href="__BASE__/hidden/">`,
    }),
  },

  // No <html lang>, no canonical, no meta description.
  '/nolang/': {
    body: `<!doctype html><html><head><meta charset="utf-8"><title>No Lang — Emjay Wellness</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><h1>No Lang</h1><p>${filler(30)}</p><a href="/">Home</a></body></html>`,
  },
};

// Near-duplicate of /blog/post-one/.
ROUTES['/blog/post-one-copy/'] = {
  body: page(`<h1>Post One</h1><p>${filler(40)}</p>`, {
    title: 'Blog Copy — Emjay Wellness',
    head: `<link rel="canonical" href="__BASE__/blog/post-one-copy/">
<meta name="description" content="A near duplicate of post one, present so the duplicate content detector has a genuine pair to find here.">`,
  }),
};

const REDIRECTS = {
  '/old-service/': { to: '/old-service-2/', status: 301 },
  '/old-service-2/': { to: '/old-service-3/', status: 302 },
  '/old-service-3/': { to: '/services/skin-therapy/', status: 301 },
};

const SITEMAP_PATHS = [
  '/', '/services/skin-therapy/', '/about/', '/contact/',
  '/blog/post-one/', '/blog/post-two/', '/blog/post-one-copy/',
  '/thin/', '/orphan/', '/hidden/', '/nolang/',
];

export async function startFixtureSite() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    const base = `http://127.0.0.1:${server.address().port}`;

    const send = (status, type, body) => {
      res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) });
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    if (p === '/robots.txt') {
      return send(200, 'text/plain', `User-agent: *\nDisallow: /wp-admin/\nSitemap: ${base}/sitemap.xml\n`);
    }
    if (p === '/sitemap.xml') {
      const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_PATHS.map((sp) => `  <url><loc>${base}${sp}</loc><lastmod>2026-01-15</lastmod></url>`).join('\n')}
  <url><loc>${base}/old-service/</loc></url>
</urlset>`;
      return send(200, 'application/xml', body);
    }
    if (p === '/theme.css') {
      return send(200, 'text/css', `
body { font-family: Georgia, serif; color: #2e2c27; background: #ffffff; }
a { color: #2EA3F2; }
.faint { color: #c9c9c9; background: #ffffff; }
.rogue { color: #7EBEC5; }
h1, h2 { font-family: Georgia, serif; }
`);
    }
    if (REDIRECTS[p]) {
      res.writeHead(REDIRECTS[p].status, { location: base + REDIRECTS[p].to });
      return res.end();
    }
    if (ROUTES[p]) {
      return send(200, 'text/html; charset=utf-8', ROUTES[p].body.replaceAll('__BASE__', base));
    }
    if (/\.(?:jpg|png|gif)$/.test(p)) {
      return send(200, 'image/gif', 'GIF89a');
    }
    return send(404, 'text/html', page('<h1>Not found</h1><p>No such page.</p>', { title: '404 — Emjay Wellness' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** A config pointed at the fixture site, with the real rules intact. */
export async function fixtureConfig(baseUrl) {
  const real = (await import('../emjay-qa.config.mjs')).default;
  const cfg = structuredClone({ ...real, content: { ...real.content } });
  // structuredClone drops RegExp inside plain objects in some shapes; re-attach.
  cfg.crawl.ignore = real.crawl.ignore;
  cfg.content.legacyReferences = real.content.legacyReferences;
  cfg.content.booking = real.content.booking;
  cfg.site.baseUrl = baseUrl;
  cfg.site.canonicalOrigin = baseUrl;
  cfg.site.internalHosts = [new URL(baseUrl).hostname];
  cfg.crawl.delayMs = 0;
  cfg.crawl.maxPages = 60;
  cfg.crawl.retries = 0;
  cfg.crawl.timeoutMs = 8000;
  cfg.report.outDir = './report-test';
  return cfg;
}
