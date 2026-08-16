import { finding } from '../severity.mjs';

/**
 * Business-content correctness: retired URLs, stale business/location
 * references, and booking links that do not match the page's intent.
 */

export const retiredUrls = {
  id: 'retired-urls',
  title: 'Old / retired URLs',
  async run({ site, http, cfg }) {
    const findings = [];

    if (!cfg.content.retiredUrls.length) {
      return [finding({
        severity: 'WARN',
        title: 'No retired URLs configured',
        url: cfg.site.baseUrl,
        detail: 'content.retiredUrls is empty, so nothing was asserted.',
        fix: 'Populate it from the pre-remediation crawl and Search Console.',
      })];
    }

    for (const entry of cfg.content.retiredUrls) {
      const url = new URL(entry.path, cfg.site.baseUrl).toString();
      const res = await http.fetchWithChain(url, { wantBody: false });
      const linkers = linkersTo(site, http, url);

      if (linkers.length) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Retired URL is still linked from the live site',
          url,
          detail: `${entry.note || ''}\n    Linked from: ${linkers.slice(0, 5).join(', ')}`,
          fix: 'Remove or repoint those links.',
        }));
      }

      if (entry.expect === 'redirect') {
        const landed = http.normalise(res.finalUrl);
        const want = http.normalise(entry.to, cfg.site.baseUrl);
        if (!res.chain.length) {
          findings.push(finding({
            severity: 'FAIL', title: 'Retired URL does not redirect', url,
            detail: `HTTP ${res.status}, expected 301 -> ${entry.to}`,
          }));
        } else if (landed !== want) {
          findings.push(finding({
            severity: 'FAIL', title: 'Retired URL redirects to the wrong place', url,
            detail: `-> ${landed}, expected ${want}`,
          }));
        } else if (res.chain.length > 1 || res.chain[0].status !== 301) {
          findings.push(finding({
            severity: 'WARN', title: 'Retired URL redirect is not a single 301', url,
            detail: res.chain.map((h) => `${h.status} -> ${h.to}`).join(', '),
          }));
        }
      } else if (entry.expect === 'gone') {
        if (res.status !== 404 && res.status !== 410) {
          findings.push(finding({
            severity: 'FAIL',
            title: `Retired URL should be gone but returns HTTP ${res.status}`,
            url,
            detail: entry.note || '',
          }));
        }
      } else if (entry.expect === 'absent-from-site') {
        // Live-and-reachable is only a problem if the page actually exists.
        if (res.ok) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Retired URL still resolves',
            url,
            detail: `HTTP ${res.status}. ${entry.note || ''}`,
            fix: 'Confirm whether this page should still be published.',
          }));
        }
      }
    }
    return findings;
  },
};

export const legacyReferences = {
  id: 'legacy-references',
  title: 'Old business, location and offer references',
  async run({ site, cfg }) {
    const findings = [];
    const rules = cfg.content.legacyReferences.filter((r) => !r.disabled && r.pattern);

    if (!rules.length) {
      return [finding({
        severity: 'WARN',
        title: 'No legacy-reference rules configured',
        url: cfg.site.baseUrl,
      })];
    }

    for (const page of site.htmlPages()) {
      const text = page.dom.text;
      for (const rule of rules) {
        const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
        const hits = [...text.matchAll(re)];
        if (!hits.length) continue;
        findings.push(finding({
          severity: rule.severity,
          title: `Stale reference: ${rule.label}`,
          url: page.finalUrl,
          detail: `${hits.length} occurrence(s). First context: "${context(text, hits[0].index)}"${rule.note ? `\n    Note: ${rule.note}` : ''}`,
          fix: 'Remove or update the reference.',
          defectId: rule.id,
        }));
      }
    }

    // Active locations should actually appear somewhere.
    const allText = site.htmlPages().map((p) => p.dom.text).join(' ');
    for (const loc of cfg.content.business.activeLocations) {
      if (!new RegExp(`\\b${escapeRe(loc)}\\b`, 'i').test(allText)) {
        findings.push(finding({
          severity: 'WARN',
          title: `Active location "${loc}" appears nowhere on the site`,
          url: cfg.site.baseUrl,
          fix: 'Local search intent depends on the location being on the page.',
        }));
      }
    }

    return findings;
  },
};

export const bookingIntent = {
  id: 'booking-intent',
  title: 'Generic booking links where specific intent exists',
  async run({ site, cfg }) {
    const findings = [];
    const { genericBookingPatterns, serviceIntents, allowedBookingHosts } = cfg.content.booking;

    const unconfigured = serviceIntents.filter((s) => !s.expectedBookingPattern);
    if (unconfigured.length) {
      findings.push(finding({
        severity: 'WARN',
        title: `${unconfigured.length} service intents have no expected booking URL configured`,
        url: cfg.site.baseUrl,
        detail: unconfigured.map((s) => s.label).join(', '),
        fix: 'Add the Square deep-link per service to content.booking.serviceIntents so this can assert rather than guess.',
      }));
    }

    for (const page of site.htmlPages()) {
      const path = new URL(page.finalUrl).pathname;
      const intents = serviceIntents.filter((s) => s.match.test(path));
      if (!intents.length) continue;

      const bookingLinks = page.dom.links.filter((l) => l.abs && isBookingLink(l.abs, allowedBookingHosts, genericBookingPatterns));
      if (!bookingLinks.length) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Service page has no booking link at all',
          url: page.finalUrl,
          detail: `Matched intent: ${intents.map((i) => i.label).join(', ')}`,
          fix: 'Every service page needs a path to book that service.',
          defectId: 'EMJ-017',
        }));
        continue;
      }

      for (const intent of intents) {
        if (intent.expectedBookingPattern) {
          const specific = bookingLinks.filter((l) => intent.expectedBookingPattern.test(l.abs));
          if (!specific.length) {
            findings.push(finding({
              severity: 'WARN',
              title: `Service page links only to a generic booking target (${intent.label})`,
              url: page.finalUrl,
              detail: `Links found: ${bookingLinks.map((l) => l.abs).slice(0, 4).join(', ')}\n    Expected to match: ${intent.expectedBookingPattern}`,
              fix: 'Deep-link straight to the service so the visitor lands on the right booking screen.',
              defectId: 'EMJ-017',
            }));
          }
        } else {
          const allGeneric = bookingLinks.every((l) => genericBookingPatterns.some((re) => re.test(l.abs)));
          if (allGeneric) {
            findings.push(finding({
              severity: 'WARN',
              title: `Service page offers only generic booking links (${intent.label})`,
              url: page.finalUrl,
              detail: `Links: ${bookingLinks.map((l) => `"${l.text || '(no text)'}" -> ${l.abs}`).slice(0, 4).join('; ')}\n    Specific target not configured, so this is reported for human review.`,
              fix: 'Configure the expected deep-link, then repoint the CTA.',
              defectId: 'EMJ-017',
            }));
          }
        }
      }
    }
    return findings;
  },
};

export const placeholderContent = {
  id: 'placeholder-content',
  title: 'Placeholder, staging and error text in live copy',
  async run({ site }) {
    const findings = [];
    const patterns = [
      { re: /lorem ipsum/i, label: 'Lorem ipsum', severity: 'FAIL' },
      { re: /your content goes here|add your text here|enter your text/i, label: 'Theme placeholder copy', severity: 'FAIL' },
      { re: /\bhello world!/i, label: 'Default WordPress post', severity: 'FAIL' },
      { re: /this is an example page|sample page/i, label: 'Default WordPress page', severity: 'FAIL' },
      { re: /Notice: Undefined|Warning: [a-z_]+\(\)|Fatal error:/i, label: 'PHP error output', severity: 'FAIL' },
      { re: /There has been a critical error on this website/i, label: 'WordPress critical error', severity: 'FAIL' },
      { re: /\[[a-z_]+ [^\]]*\]/i, label: 'Unrendered shortcode', severity: 'WARN' },
      { re: /coming soon|under construction|tbc|tbd\b/i, label: 'Unfinished content marker', severity: 'WARN' },
    ];

    for (const page of site.htmlPages()) {
      for (const p of patterns) {
        const m = page.dom.text.match(p.re);
        if (!m) continue;
        findings.push(finding({
          severity: p.severity,
          title: `${p.label} in live copy`,
          url: page.finalUrl,
          detail: `"${context(page.dom.text, m.index)}"`,
          defectId: p.severity === 'FAIL' ? 'EMJ-027' : null,
        }));
      }
    }
    return findings;
  },
};

/** Pages that link to `url`, matching on the normalised form. */
function linkersTo(site, http, url) {
  const target = http.normalise(url);
  const out = new Set();
  for (const page of site.htmlPages()) {
    for (const link of page.dom.links) {
      if (!link.abs) continue;
      if (http.normalise(link.abs) === target) out.add(page.finalUrl);
    }
  }
  return [...out];
}

function isBookingLink(url, allowedHosts, genericPatterns) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (allowedHosts.some((h) => host === h || host.endsWith('.' + h))) {
      return /book|appoint|schedule|payhip|checkout|contact|enquir/i.test(url) || genericPatterns.some((re) => re.test(url));
    }
  } catch { /* ignore */ }
  return false;
}

function context(text, index, span = 60) {
  const start = Math.max(0, index - span);
  return text.slice(start, index + span).replace(/\s+/g, ' ').trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default [retiredUrls, legacyReferences, bookingIntent, placeholderContent];
