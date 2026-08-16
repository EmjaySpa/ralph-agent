/**
 * Discovery: robots.txt -> sitemaps -> breadth-first crawl of internal HTML.
 * Produces the shared `site` object every check consumes.
 */
import { parsePage } from './parse.mjs';

export async function crawlSite(http, cfg, { onProgress = () => {} } = {}) {
  const robots = await http.loadRobots();
  const sitemap = await loadSitemaps(http, cfg, robots);

  const seeds = [];
  const push = (u) => {
    const n = http.normalise(u);
    if (n && http.isInternal(n) && !http.isIgnored(n)) seeds.push(n);
  };
  push(cfg.site.baseUrl + '/');
  for (const s of cfg.site.extraSeeds) push(s);
  for (const entry of sitemap.urls) push(entry.loc);

  const pages = new Map();      // normalised url -> page model
  const inbound = new Map();    // normalised url -> Set(source urls)
  const externalLinks = new Map(); // url -> Set(source urls)
  const queue = [];
  const queued = new Set();

  for (const s of seeds) {
    if (!queued.has(s)) {
      queued.add(s);
      queue.push({ url: s, depth: seedDepth(s, cfg) });
    }
  }

  const { concurrency, maxPages } = cfg.crawl;
  let processed = 0;
  let stoppedAtLimit = false;

  async function worker() {
    while (queue.length) {
      if (pages.size >= maxPages) {
        stoppedAtLimit = true;
        return;
      }
      const item = queue.shift();
      if (!item) return;
      const { url, depth } = item;

      if (!http.allowedByRobots(url)) {
        pages.set(url, blockedPage(url, 'robots.txt disallows this path'));
        continue;
      }

      const res = await http.fetchWithChain(url);
      processed++;
      onProgress({ processed, total: pages.size + queue.length, url, status: res.status });

      const isHtml = /text\/html|application\/xhtml/i.test(res.contentType || '');
      const page = {
        requestedUrl: url,
        finalUrl: res.finalUrl,
        status: res.status,
        ok: res.ok,
        error: res.error,
        redirectChain: res.chain,
        headers: res.headers,
        contentType: res.contentType,
        timingMs: res.timingMs,
        depth,
        isHtml,
        html: isHtml ? res.body : '',
        inSitemap: sitemap.urlSet.has(url) || sitemap.urlSet.has(http.normalise(res.finalUrl)),
        dom: null,
      };

      if (isHtml && res.body) {
        try {
          page.dom = parsePage(res.body, res.finalUrl);
        } catch (err) {
          page.parseError = err.message;
        }
      }
      pages.set(url, page);

      if (!page.dom) continue;

      for (const link of page.dom.links) {
        if (!link.abs || link.isMailto || link.isTel || link.isFragmentOnly) continue;
        const target = http.normalise(link.abs);
        if (!target) continue;

        if (http.isInternal(target)) {
          if (!inbound.has(target)) inbound.set(target, new Set());
          if (target !== url) inbound.get(target).add(url);
          if (!queued.has(target) && !http.isIgnored(target) && pages.size + queue.length < maxPages) {
            queued.add(target);
            queue.push({ url: target, depth: depth + 1 });
          }
        } else {
          if (!externalLinks.has(target)) externalLinks.set(target, new Set());
          externalLinks.get(target).add(url);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Click depth has to be derived from the link graph after the fact. Doing it
  // during the crawl gives the wrong answer, because sitemap seeds are queued
  // before the homepage's own links are discovered.
  assignClickDepth(pages, http, cfg);

  return {
    robots,
    sitemap,
    pages,
    inbound,
    externalLinks,
    stoppedAtLimit,
    htmlPages: () => [...pages.values()].filter((p) => p.dom && p.ok),
  };
}

function blockedPage(url, reason) {
  return {
    requestedUrl: url, finalUrl: url, status: 0, ok: false, error: reason,
    redirectChain: [], headers: {}, contentType: '', timingMs: 0,
    depth: 0, isHtml: false, html: '', inSitemap: false, dom: null, robotsBlocked: true,
  };
}

function seedDepth(url, cfg) {
  const home = cfg.site.baseUrl.replace(/\/$/, '') + '/';
  return url === home ? 0 : 1;
}

/**
 * Breadth-first over the internal link graph from the homepage.
 * Pages with no link path keep depth Infinity — the orphan check owns those.
 */
export function assignClickDepth(pages, http, cfg) {
  const home = http.normalise(cfg.site.baseUrl + '/');
  const byUrl = new Map();
  for (const page of pages.values()) {
    byUrl.set(page.requestedUrl, page);
    const final = http.normalise(page.finalUrl);
    if (final && !byUrl.has(final)) byUrl.set(final, page);
    page.depth = Infinity;
  }

  const start = byUrl.get(home);
  if (!start) return;
  start.depth = 0;

  let frontier = [start];
  let depth = 0;
  while (frontier.length) {
    depth++;
    const next = [];
    for (const page of frontier) {
      if (!page.dom) continue;
      for (const link of page.dom.links) {
        if (!link.abs || link.isFragmentOnly || link.isMailto || link.isTel) continue;
        const target = http.normalise(link.abs);
        if (!target || !http.isInternal(target)) continue;
        const targetPage = byUrl.get(target);
        if (!targetPage || targetPage.depth <= depth) continue;
        targetPage.depth = depth;
        next.push(targetPage);
      }
    }
    frontier = next;
  }
}

/** Follow sitemap indexes to their leaves. */
export async function loadSitemaps(http, cfg, robots) {
  const found = [];
  const errors = [];
  const urls = [];
  const seen = new Set();
  const urlSet = new Set();

  const candidates = [
    ...(robots?.sitemaps || []),
    ...cfg.site.sitemapCandidates.map((p) => new URL(p, cfg.site.baseUrl).toString()),
  ];

  const queue = [...new Set(candidates)];
  let reachableCount = 0;

  while (queue.length) {
    const smUrl = queue.shift();
    if (seen.has(smUrl)) continue;
    seen.add(smUrl);

    const res = await http.fetchWithChain(smUrl);
    const record = {
      url: smUrl,
      status: res.status,
      ok: res.ok,
      error: res.error,
      redirectChain: res.chain,
      contentType: res.contentType,
      fromRobots: (robots?.sitemaps || []).includes(smUrl),
      entryCount: 0,
      isIndex: false,
    };

    if (!res.ok) {
      // A missing candidate we guessed is not an error; a missing sitemap
      // advertised by robots.txt is.
      if (record.fromRobots) errors.push({ url: smUrl, error: `HTTP ${res.status || res.error}` });
      found.push(record);
      continue;
    }
    reachableCount++;

    const body = res.body || '';
    if (!/<(?:urlset|sitemapindex)\b/i.test(body)) {
      errors.push({ url: smUrl, error: 'response is not a valid sitemap (no <urlset>/<sitemapindex>)' });
      found.push(record);
      continue;
    }

    record.isIndex = /<sitemapindex\b/i.test(body);
    const entries = parseSitemapXml(body);
    record.entryCount = entries.length;

    if (record.isIndex) {
      for (const e of entries) {
        const child = http.normalise(e.loc, smUrl);
        if (child && !seen.has(child)) queue.push(child);
      }
    } else {
      for (const e of entries) {
        const loc = http.normalise(e.loc, smUrl);
        if (!loc) {
          errors.push({ url: smUrl, error: `unparseable <loc>: ${e.loc}` });
          continue;
        }
        urls.push({ ...e, loc, sitemap: smUrl });
        urlSet.add(loc);
      }
    }
    found.push(record);
  }

  return { found, errors, urls, urlSet, reachable: reachableCount > 0 };
}

/** Tiny, tolerant sitemap XML reader — sitemaps are a fixed, flat shape. */
export function parseSitemapXml(xml) {
  const entries = [];
  const blockRe = /<(?:url|sitemap)\b[^>]*>([\s\S]*?)<\/(?:url|sitemap)>/gi;
  let m;
  while ((m = blockRe.exec(xml))) {
    const block = m[1];
    const loc = tag(block, 'loc');
    if (!loc) continue;
    entries.push({
      loc: decodeXml(loc),
      lastmod: tag(block, 'lastmod'),
      changefreq: tag(block, 'changefreq'),
      priority: tag(block, 'priority'),
    });
  }
  return entries;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : null;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
