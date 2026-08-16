import { finding } from '../severity.mjs';

/** Orphan pages, internal linking depth and link-graph problems. */

export const orphanPages = {
  id: 'orphan-pages',
  title: 'Orphan pages',
  async run({ site, http, cfg }) {
    const findings = [];
    const home = http.normalise(cfg.site.baseUrl + '/');

    for (const page of site.htmlPages()) {
      const key = http.normalise(page.finalUrl);
      if (key === home) continue;
      if (page.dom.noindex) continue;

      const inbound = site.inbound.get(key) || site.inbound.get(page.requestedUrl) || new Set();
      const count = inbound.size;

      if (count === 0) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Orphan page: zero internal inbound links',
          url: page.finalUrl,
          detail: page.inSitemap
            ? 'Present in the sitemap but reachable only by direct URL.'
            : 'Not linked and not in the sitemap.',
          fix: 'Link it from a relevant parent page, or retire it.',
          defectId: 'EMJ-022',
        }));
      } else if (count < cfg.thresholds.lowInboundInternalLinks) {
        findings.push(finding({
          severity: 'INFO',
          title: `Weakly linked page (${count} inbound internal link)`,
          url: page.finalUrl,
          detail: `From: ${[...inbound].join(', ')}`,
        }));
      }
    }
    return findings;
  },
};

export const internalLinking = {
  id: 'internal-linking',
  title: 'Internal linking quality',
  async run({ site, http, cfg }) {
    const findings = [];

    for (const page of site.htmlPages()) {
      // Click depth from the homepage.
      // Unreachable pages have depth Infinity; the orphan check reports those.
      if (Number.isFinite(page.depth) && page.depth > cfg.thresholds.maxClickDepth) {
        findings.push(finding({
          severity: 'WARN',
          title: `Page is ${page.depth} clicks from the homepage`,
          url: page.finalUrl,
          fix: `Surface it within ${cfg.thresholds.maxClickDepth} clicks.`,
        }));
      }

      const bodyLinks = page.dom.links.filter((l) => !l.inNav && !l.inFooter && l.abs && http.isInternal(l.abs));
      if (page.dom.mainWordCount > 400 && bodyLinks.length === 0) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Long page with no internal links in the body',
          url: page.finalUrl,
          detail: `${page.dom.mainWordCount} words, links only in nav/footer.`,
          fix: 'Link to a relevant service or offer page from the body copy.',
        }));
      }

      for (const link of page.dom.links) {
        if (!link.abs || !http.isInternal(link.abs)) continue;

        if (link.nofollow) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Internal link marked nofollow',
            url: page.finalUrl,
            detail: `"${link.text || '(no text)'}" -> ${link.abs}`,
            fix: 'Do not nofollow your own pages.',
          }));
        }

        // Links that bypass the canonical origin.
        if (!link.abs.startsWith(cfg.site.canonicalOrigin) && !link.isMailto && !link.isTel) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Internal link uses a non-canonical origin',
            url: page.finalUrl,
            detail: `${link.href} (canonical origin is ${cfg.site.canonicalOrigin})`,
          }));
        }

        // Self-links add nothing and often signal a template bug.
        if (http.normalise(link.abs) === http.normalise(page.finalUrl) && !link.isFragmentOnly) {
          findings.push(finding({
            severity: 'INFO',
            title: 'Page links to itself',
            url: page.finalUrl,
            detail: `"${link.text || '(no text)'}"`,
          }));
        }
      }
    }

    // The same anchor text pointing at different destinations confuses both
    // users and crawlers.
    const anchorTargets = new Map();
    for (const page of site.htmlPages()) {
      for (const link of page.dom.links) {
        if (!link.abs || !http.isInternal(link.abs)) continue;
        const text = (link.text || '').trim().toLowerCase();
        if (!text || text.length < 4) continue;
        if (!anchorTargets.has(text)) anchorTargets.set(text, new Set());
        anchorTargets.get(text).add(http.normalise(link.abs));
      }
    }
    for (const [text, targets] of anchorTargets) {
      if (targets.size > 2) {
        findings.push(finding({
          severity: 'INFO',
          title: `Anchor text "${text}" points to ${targets.size} different pages`,
          url: cfg.site.baseUrl,
          detail: [...targets].slice(0, 5).join(', '),
        }));
      }
    }

    return findings;
  },
};

export default [orphanPages, internalLinking];
