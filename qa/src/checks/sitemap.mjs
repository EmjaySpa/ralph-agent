import { finding } from '../severity.mjs';

export const sitemapHealth = {
  id: 'sitemap',
  title: 'XML sitemap health',
  async run({ site, http, cfg }) {
    const findings = [];
    const { sitemap, robots } = site;

    if (!sitemap.reachable) {
      findings.push(finding({
        severity: 'FAIL',
        title: 'No reachable XML sitemap',
        url: new URL('/sitemap_index.xml', cfg.site.baseUrl).toString(),
        detail: `Tried: ${sitemap.found.map((f) => `${f.url} (${f.status || f.error})`).join(', ')}`,
        fix: 'Publish a sitemap and reference it from robots.txt.',
        defectId: 'EMJ-007',
      }));
      return findings;
    }

    if (!robots.sitemaps.length) {
      findings.push(finding({
        severity: 'WARN',
        title: 'robots.txt does not declare a Sitemap',
        url: new URL('/robots.txt', cfg.site.baseUrl).toString(),
        fix: 'Add "Sitemap: https://emjaywellness.com.au/sitemap_index.xml".',
      }));
    }

    for (const err of sitemap.errors) {
      findings.push(finding({
        severity: 'FAIL', title: 'Sitemap error', url: err.url, detail: err.error,
      }));
    }

    for (const sm of sitemap.found) {
      if (sm.ok && sm.redirectChain.length) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Sitemap URL redirects',
          url: sm.url,
          detail: sm.redirectChain.map((h) => `${h.status} -> ${h.to}`).join(', '),
        }));
      }
      if (sm.ok && !/xml/i.test(sm.contentType || '')) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Sitemap served with a non-XML content type',
          url: sm.url,
          detail: sm.contentType || '(none)',
        }));
      }
      if (sm.ok && !sm.isIndex && sm.entryCount === 0) {
        findings.push(finding({
          severity: 'WARN', title: 'Sitemap contains no URLs', url: sm.url,
        }));
      }
    }

    const seenLocs = new Set();
    for (const entry of sitemap.urls) {
      if (seenLocs.has(entry.loc)) {
        findings.push(finding({
          severity: 'WARN', title: 'URL listed more than once in the sitemap',
          url: entry.loc, detail: `in ${entry.sitemap}`,
        }));
      }
      seenLocs.add(entry.loc);

      if (!http.isInternal(entry.loc)) {
        findings.push(finding({
          severity: 'FAIL', title: 'Sitemap lists an off-site URL',
          url: entry.loc, detail: `in ${entry.sitemap}`,
        }));
        continue;
      }
      if (!entry.loc.startsWith(cfg.site.canonicalOrigin)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Sitemap URL uses a non-canonical origin',
          url: entry.loc,
          detail: `Expected ${cfg.site.canonicalOrigin}`,
        }));
      }
      if (entry.lastmod && Number.isNaN(Date.parse(entry.lastmod))) {
        findings.push(finding({
          severity: 'WARN', title: 'Invalid <lastmod> date',
          url: entry.loc, detail: entry.lastmod,
        }));
      }
      if (entry.priority !== null && entry.priority !== undefined) {
        const p = Number(entry.priority);
        if (Number.isNaN(p) || p < 0 || p > 1) {
          findings.push(finding({
            severity: 'INFO', title: 'Invalid <priority>', url: entry.loc, detail: entry.priority,
          }));
        }
      }

      const page = site.pages.get(entry.loc);
      if (!page) continue;
      if (page.error || page.status >= 400) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Sitemap URL returns ${page.status || page.error}`,
          url: entry.loc,
          fix: 'A sitemap must only list live, indexable, canonical URLs.',
        }));
      } else if (page.redirectChain.length) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Sitemap URL redirects',
          url: entry.loc,
          detail: `-> ${page.finalUrl}`,
          fix: 'List the destination URL in the sitemap instead.',
        }));
      }
      if (page.dom?.noindex) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Sitemap URL is noindex',
          url: entry.loc,
          defectId: 'EMJ-009',
        }));
      }
      if (page.dom?.canonical) {
        const canon = http.normalise(page.dom.canonical, page.finalUrl);
        if (canon && canon !== entry.loc && canon !== http.normalise(page.finalUrl)) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Sitemap URL canonicalises elsewhere',
            url: entry.loc,
            detail: `canonical -> ${canon}`,
          }));
        }
      }
      if (!http.allowedByRobots(entry.loc)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Sitemap URL is blocked by robots.txt',
          url: entry.loc,
        }));
      }
    }

    // Indexable, linked pages missing from the sitemap.
    for (const page of site.htmlPages()) {
      if (page.inSitemap || page.dom.noindex) continue;
      const normalised = http.normalise(page.finalUrl);
      const canon = page.dom.canonical ? http.normalise(page.dom.canonical, page.finalUrl) : normalised;
      if (canon !== normalised) continue; // duplicate, correctly excluded
      if (sitemap.urlSet.has(canon)) continue;
      findings.push(finding({
        severity: 'WARN',
        title: 'Indexable page missing from the sitemap',
        url: page.finalUrl,
        fix: 'Add it, or mark it noindex if it should not rank.',
      }));
    }

    return findings;
  },
};

export default [sitemapHealth];
