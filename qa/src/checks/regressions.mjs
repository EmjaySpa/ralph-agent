import { finding, rank } from '../severity.mjs';
import { parseColour, deltaE, extractColourLiterals } from '../colour.mjs';

/**
 * Known-defect regression runner.
 *
 * Every defect ever confirmed on this site gets an entry in known-defects.json.
 * This runner turns each entry into an explicit PASS or FAIL line so a fixed
 * defect can never quietly come back.
 *
 * Assertions either compute directly from crawl/render data, or delegate to a
 * check that already covers the ground (so the logic lives in exactly one
 * place).
 */

const DELEGATES = {
  'no-console-errors': ['console-errors'],
  'no-mobile-overflow': ['mobile-overflow'],
  'no-broken-links': ['broken-links'],
  'unique-titles': ['titles'],
  'unique-meta-descriptions': ['meta-descriptions'],
  'no-missing-alt': ['alt-text'],
  'no-orphans': ['orphan-pages'],
  'structured-data-valid': ['structured-data'],
  'forms-valid': ['forms'],
  'no-empty-headings': ['headings'],
  'h1-count': ['headings'],
  'self-canonical': ['canonicals'],
  'no-internal-redirect-links': ['internal-redirect-links'],
  'no-generic-only-booking': ['booking-intent'],
  'no-sitemap-noindex-conflict': ['indexability', 'sitemap'],
  'sitemap-reachable': ['sitemap'],
  'no-mixed-content': ['mixed-content'],
};

// Which finding titles from a delegated check actually prove this defect.
const DELEGATE_FILTERS = {
  'no-empty-headings': (f) => /empty h\d/i.test(f.title),
  'h1-count': (f) => /h1/i.test(f.title),
  'self-canonical': (f) => /canonical/i.test(f.title),
  'no-sitemap-noindex-conflict': (f) => /noindex/i.test(f.title) && /sitemap/i.test(f.title + f.detail),
  'sitemap-reachable': (f) => /no reachable xml sitemap/i.test(f.title),
  'unique-titles': (f) => /duplicate title|missing <title>|empty <title>|<title> tags/i.test(f.title),
  'unique-meta-descriptions': (f) => /duplicate meta description|missing meta description/i.test(f.title),
  'no-missing-alt': (f) => /alt/i.test(f.title),
  'no-orphans': (f) => /orphan/i.test(f.title),
};

export function makeRegressionCheck(registry) {
  return {
    id: 'known-defects',
    title: 'Known-defect regressions',
    /** Runs last: `priorResults` carries every other check's findings. */
    async run(ctx) {
      const findings = [];
      const outcomes = [];

      for (const defect of registry.defects) {
        const outcome = await evaluate(defect, ctx);
        outcomes.push({ defect, ...outcome });

        if (outcome.status === 'regressed') {
          findings.push(finding({
            severity: defect.severity,
            title: `[${defect.id}] REGRESSED: ${defect.title}`,
            url: outcome.url || null,
            detail: outcome.detail,
            fix: defect.note || null,
            defectId: defect.id,
          }));
        } else if (outcome.status === 'unknown') {
          findings.push(finding({
            severity: 'WARN',
            title: `[${defect.id}] NOT VERIFIED: ${defect.title}`,
            url: null,
            detail: outcome.detail,
            fix: 'This assertion could not run. Treat the defect as unproven, not fixed.',
            defectId: defect.id,
          }));
        } else if (defect.status === 'unconfirmed') {
          findings.push(finding({
            severity: 'INFO',
            title: `[${defect.id}] holding (defect unconfirmed): ${defect.title}`,
            url: null,
            detail: defect.note || defect.source || '',
            defectId: defect.id,
          }));
        }
      }

      ctx.regressionOutcomes = outcomes;
      return findings;
    },
  };
}

async function evaluate(defect, ctx) {
  const { site, http, rendered, priorResults } = ctx;
  const a = defect.assert || {};

  try {
    switch (a.type) {
      case 'colour-absent': {
        const target = parseColour(a.value);
        const tolerance = a.tolerance ?? 0;
        if (!rendered.available) {
          return { status: 'unknown', detail: `Rendered pass unavailable (${rendered.reason}).` };
        }
        for (const [url, rec] of rendered.pages) {
          for (const entry of (rec.desktop?.colours || [])) {
            const parsed = parseColour(entry.hex);
            if (parsed && deltaE(parsed, target) <= tolerance) {
              return { status: 'regressed', url, detail: `${entry.hex} rendered as ${entry.prop} on ${entry.sample}` };
            }
          }
        }
        return { status: 'clear' };
      }

      case 'source-absent': {
        const re = new RegExp(a.pattern, a.flags || '');
        for (const page of site.htmlPages()) {
          const m = page.html.match(re);
          if (m) {
            return { status: 'regressed', url: page.finalUrl, detail: `Matched "${String(m[0]).slice(0, 120)}" in page source` };
          }
        }
        // Also scan stylesheets pulled in by the render pass.
        if (rendered.available) {
          for (const [url, rec] of rendered.pages) {
            const css = rec.desktop?.cssText || '';
            const m = css.match(re);
            if (m) return { status: 'regressed', url, detail: `Matched "${String(m[0]).slice(0, 120)}" in loaded CSS` };
          }
        }
        return { status: 'clear' };
      }

      case 'text-absent': {
        const re = new RegExp(a.pattern, a.flags || '');
        for (const page of site.htmlPages()) {
          const m = page.dom.text.match(re);
          if (m) {
            const start = Math.max(0, m.index - 50);
            return {
              status: 'regressed',
              url: page.finalUrl,
              detail: `"...${page.dom.text.slice(start, m.index + 70).trim()}..."`,
            };
          }
        }
        return { status: 'clear' };
      }

      case 'url-status': {
        const url = new URL(defect.url || '/', ctx.cfg.site.baseUrl).toString();
        const res = await http.fetchWithChain(url, { wantBody: false });
        if (res.status !== a.status) {
          return { status: 'regressed', url, detail: `Expected HTTP ${a.status}, got ${res.status || res.error}` };
        }
        if (a.maxHops !== undefined && res.chain.length > a.maxHops) {
          return { status: 'regressed', url, detail: `Expected at most ${a.maxHops} redirect hop(s), got ${res.chain.length}` };
        }
        return { status: 'clear' };
      }

      case 'external-url-ok': {
        let res = await http.fetchWithChain(a.url, { method: 'HEAD', wantBody: false });
        if (!res.ok) res = await http.fetchWithChain(a.url, { method: 'GET', wantBody: false });
        if (!res.ok) {
          return { status: 'regressed', url: a.url, detail: `HTTP ${res.status || res.error}` };
        }
        return { status: 'clear' };
      }

      case 'robots-not-blocking-all': {
        if (!site.robots) return { status: 'unknown', detail: 'robots.txt was not loaded.' };
        if (site.robots.blocksEverything()) {
          return { status: 'regressed', url: '/robots.txt', detail: 'Disallow: / is active for user-agent *' };
        }
        return { status: 'clear' };
      }

      case 'robots-source-absent': {
        const re = new RegExp(a.pattern, a.flags || '');
        if (site.robots?.raw && re.test(site.robots.raw)) {
          return { status: 'regressed', url: '/robots.txt', detail: 'Pattern found in robots.txt' };
        }
        return { status: 'clear' };
      }

      default: {
        const delegates = DELEGATES[a.type];
        if (!delegates) {
          return { status: 'unknown', detail: `Unsupported assertion type "${a.type}".` };
        }
        if (!priorResults) {
          return { status: 'unknown', detail: 'Delegated assertion ran before its source check.' };
        }
        const filter = DELEGATE_FILTERS[a.type] || (() => true);
        const hits = [];
        let anyRan = false;
        for (const id of delegates) {
          const result = priorResults.find((r) => r.id === id);
          if (!result) continue;
          if (result.skipped) continue;
          anyRan = true;
          for (const f of result.findings) {
            if (rank(f.severity) >= rank('WARN') && filter(f)) hits.push(f);
          }
        }
        if (!anyRan) {
          return { status: 'unknown', detail: `Source check(s) ${delegates.join(', ')} did not run.` };
        }
        if (hits.length) {
          return {
            status: 'regressed',
            url: hits[0].url,
            detail: `${hits.length} matching finding(s), e.g. ${hits[0].title}${hits[0].url ? ` (${hits[0].url})` : ''}`,
          };
        }
        return { status: 'clear' };
      }
    }
  } catch (err) {
    return { status: 'unknown', detail: `Assertion threw: ${err.message}` };
  }
}

/** Used by the reporter to render the regression table. */
export function summariseRegressions(outcomes) {
  return outcomes.map(({ defect, status, detail, url }) => ({
    id: defect.id,
    title: defect.title,
    severity: defect.severity,
    registryStatus: defect.status,
    result: status === 'clear' ? 'PASS' : status === 'regressed' ? 'FAIL' : 'NOT VERIFIED',
    detail: detail || '',
    url: url || '',
  }));
}

export { extractColourLiterals };
