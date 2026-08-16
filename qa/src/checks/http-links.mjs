import { finding } from '../severity.mjs';

/**
 * Broken links, HTTP errors, redirect chains and mixed content.
 * Every internal page is already fetched by the crawler; external targets and
 * non-HTML internal assets are probed here (HEAD, falling back to GET).
 */

export const brokenLinks = {
  id: 'broken-links',
  title: 'Broken links and HTTP errors',
  async run({ site, http, cfg }) {
    const findings = [];

    // --- internal pages the crawler already fetched ---
    for (const page of site.pages.values()) {
      if (page.robotsBlocked) continue;
      if (page.error) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Request failed: ${page.error}`,
          url: page.requestedUrl,
          detail: `Linked from: ${sources(site, page.requestedUrl)}`,
          fix: 'Fix the target URL or remove the link.',
        }));
        continue;
      }
      if (page.status >= 500) {
        findings.push(finding({
          severity: 'FAIL',
          title: `HTTP ${page.status} server error`,
          url: page.requestedUrl,
          detail: `Linked from: ${sources(site, page.requestedUrl)}`,
        }));
      } else if (page.status === 404 || page.status === 410) {
        findings.push(finding({
          severity: 'FAIL',
          title: `HTTP ${page.status} not found`,
          url: page.requestedUrl,
          detail: `Linked from: ${sources(site, page.requestedUrl)}`,
          fix: 'Repoint or remove the internal links to this URL, or restore the page.',
        }));
      } else if (page.status >= 400) {
        findings.push(finding({
          severity: 'FAIL',
          title: `HTTP ${page.status} client error`,
          url: page.requestedUrl,
          detail: `Linked from: ${sources(site, page.requestedUrl)}`,
        }));
      }
    }

    // --- external targets ---
    const externals = [...site.externalLinks.entries()];
    const results = await mapWithConcurrency(externals, cfg.crawl.concurrency, async ([url, from]) => {
      let res = await http.fetchWithChain(url, { method: 'HEAD', wantBody: false });
      // Plenty of hosts reject HEAD; confirm with a GET before calling it broken.
      if (!res.ok && (res.status === 405 || res.status === 403 || res.status === 0)) {
        res = await http.fetchWithChain(url, { method: 'GET', wantBody: false });
      }
      return { url, from: [...from], res };
    });

    for (const { url, from, res } of results) {
      const where = from.slice(0, 3).join(', ') + (from.length > 3 ? ` (+${from.length - 3} more)` : '');
      if (res.error) {
        findings.push(finding({
          severity: 'WARN',
          title: `External link unreachable (${res.error})`,
          url,
          detail: `Linked from: ${where}`,
          fix: 'Confirm the destination is alive. Unreachable can also mean the host blocks automated requests.',
        }));
      } else if (res.status >= 400) {
        // A dead link on a revenue path is worse than a dead link in a blog body.
        const severity = isRevenuePath(url, cfg) ? 'FAIL' : 'WARN';
        findings.push(finding({
          severity,
          title: `External link returns HTTP ${res.status}`,
          url,
          detail: `Linked from: ${where}`,
        }));
      }
    }

    return findings;
  },
};

export const redirectChains = {
  id: 'redirect-chains',
  title: 'Redirect chains and hops',
  async run({ site, http, cfg }) {
    const findings = [];
    const { maxRedirectHops, maxRedirectHopsFail } = cfg.thresholds;

    for (const page of site.pages.values()) {
      const hops = page.redirectChain?.length || 0;
      if (!hops) continue;
      const path = [page.requestedUrl, ...page.redirectChain.map((h) => `${h.status} -> ${h.to}`)].join('\n    ');

      if (hops >= maxRedirectHopsFail) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Redirect chain of ${hops} hops`,
          url: page.requestedUrl,
          detail: path,
          fix: 'Collapse to a single 301 straight to the final URL.',
        }));
      } else if (hops > maxRedirectHops) {
        findings.push(finding({
          severity: 'WARN',
          title: `Redirect chain of ${hops} hops`,
          url: page.requestedUrl,
          detail: path,
          fix: 'Collapse to a single 301 straight to the final URL.',
        }));
      }

      // A temporary redirect on a permanently-moved URL bleeds ranking signals.
      for (const hop of page.redirectChain) {
        if (hop.status === 302 || hop.status === 307) {
          findings.push(finding({
            severity: 'WARN',
            title: `Temporary ${hop.status} redirect`,
            url: hop.from,
            detail: `-> ${hop.to}`,
            fix: 'Use 301 for a permanent move so link equity passes.',
          }));
        }
      }
    }

    // Protocol/host canonicalisation: http and www should land on the canonical
    // origin in exactly one hop. Only meaningful for a real domain — an IP or
    // loopback host has no www variant to test.
    const origin = new URL(cfg.site.canonicalOrigin);
    const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(origin.hostname) || origin.hostname.includes(':');
    const isLoopback = origin.hostname === 'localhost' || isIpLiteral;
    const bare = origin.hostname.replace(/^www\./, '');
    const variants = isLoopback
      ? []
      : [`http://${origin.hostname}/`, `https://www.${bare}/`, `http://www.${bare}/`]
          .filter((v) => {
            try {
              return new URL(v).origin !== origin.origin;
            } catch {
              return false;
            }
          });

    for (const variant of variants) {
      const res = await http.fetchWithChain(variant, { wantBody: false });
      if (res.error) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Host variant unreachable',
          url: variant,
          detail: res.error,
        }));
        continue;
      }
      const hops = res.chain.length;
      const landsCanonical = res.finalUrl.startsWith(cfg.site.canonicalOrigin);
      if (!landsCanonical) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Host variant does not resolve to the canonical origin',
          url: variant,
          detail: `Ends at ${res.finalUrl} (HTTP ${res.status})`,
          fix: `Redirect all variants to ${cfg.site.canonicalOrigin} with a single 301.`,
        }));
      } else if (hops > 1) {
        findings.push(finding({
          severity: 'WARN',
          title: `Host variant takes ${hops} hops to reach canonical origin`,
          url: variant,
          detail: res.chain.map((h) => `${h.status} ${h.from} -> ${h.to}`).join('\n    '),
        }));
      }
    }

    return findings;
  },
};

export const internalLinksToRedirects = {
  id: 'internal-redirect-links',
  title: 'Internal links pointing at redirects',
  async run({ site, http }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      for (const link of page.dom.links) {
        if (!link.abs || link.isFragmentOnly || link.isMailto || link.isTel) continue;
        const target = http.normalise(link.abs);
        if (!target || !http.isInternal(target)) continue;
        const targetPage = site.pages.get(target);
        if (!targetPage || !targetPage.redirectChain?.length) continue;
        findings.push(finding({
          severity: 'WARN',
          title: 'Internal link points at a redirecting URL',
          url: page.finalUrl,
          detail: `"${link.text || link.imgAlt || '(no text)'}" -> ${target} -> ${targetPage.finalUrl}`,
          fix: 'Point the link straight at the final URL.',
          defectId: 'EMJ-016',
        }));
      }
    }
    return findings;
  },
};

export const mixedContent = {
  id: 'mixed-content',
  title: 'Mixed content and insecure subresources',
  async run({ site }) {
    const findings = [];
    // Only subresources count as mixed content. A plain <a href="http://..."> is
    // an outbound link, not an insecure asset the browser loads.
    const patterns = [
      /\bsrc\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)([^"']+)["']/gi,
      /\bsrcset\s*=\s*["'][^"']*http:\/\/(?!localhost|127\.0\.0\.1)([^"'\s,]+)/gi,
      /<link\b[^>]*\bhref\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)([^"']+)["']/gi,
      /url\(\s*["']?http:\/\/(?!localhost|127\.0\.0\.1)([^"')]+)/gi,
    ];
    for (const page of site.htmlPages()) {
      // A page served over plain http cannot have mixed content.
      if (!/^https:/i.test(page.finalUrl)) continue;
      const hits = new Set();
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(page.html))) hits.add(`http://${m[1]}`);
      }
      for (const hit of [...hits].slice(0, 10)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Insecure http:// resource on an https page',
          url: page.finalUrl,
          detail: hit,
          fix: 'Serve the resource over https, or drop it.',
          defectId: 'EMJ-026',
        }));
      }
    }
    return findings;
  },
};

export const brokenAnchors = {
  id: 'broken-anchors',
  title: 'In-page anchors with no target',
  async run({ site, http }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      const ids = new Set(page.dom.ids);
      const names = new Set(); // legacy <a name="">
      for (const link of page.dom.links) {
        if (!link.isFragmentOnly) continue;
        const frag = decodeURIComponent(link.href.slice(1));
        if (!frag || frag === 'top') continue;
        if (!ids.has(frag) && !names.has(frag)) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Anchor link has no matching element',
            url: page.finalUrl,
            detail: `#${frag} ("${link.text || '(no text)'}")`,
            fix: 'Add the target id, or remove the link.',
          }));
        }
      }
      // Cross-page fragments.
      for (const link of page.dom.links) {
        if (link.isFragmentOnly || !link.href.includes('#')) continue;
        const [, frag] = link.href.split('#');
        if (!frag) continue;
        const target = http.normalise(link.abs);
        const targetPage = target && site.pages.get(target);
        if (targetPage?.dom && !targetPage.dom.ids.includes(decodeURIComponent(frag))) {
          findings.push(finding({
            severity: 'INFO',
            title: 'Cross-page anchor has no matching element on the target page',
            url: page.finalUrl,
            detail: `${link.href}`,
          }));
        }
      }
    }
    return findings;
  },
};

function isRevenuePath(url, cfg) {
  const hosts = cfg.content.booking.allowedBookingHosts;
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return hosts.some((allowed) => h === allowed || h.endsWith('.' + allowed));
  } catch {
    return false;
  }
}

function sources(site, url) {
  const from = site.inbound.get(url);
  if (!from || !from.size) return '(not linked internally — from sitemap or seed)';
  const list = [...from];
  return list.slice(0, 3).join(', ') + (list.length > 3 ? ` (+${list.length - 3} more)` : '');
}

export async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
  return out;
}

export default [brokenLinks, redirectChains, internalLinksToRedirects, mixedContent, brokenAnchors];
