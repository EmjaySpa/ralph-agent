/**
 * End-to-end: crawl the deliberately defective fixture site and assert that
 * each check actually finds its seeded defect. This is what makes the suite
 * trustworthy — a check that silently returns nothing would fail here.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startFixtureSite, fixtureConfig } from './fixture-site.mjs';
import { Http } from '../src/http.mjs';
import { crawlSite } from '../src/crawl.mjs';
import { allChecks, pickRenderTargets } from '../src/index.mjs';
import { makeRegressionCheck } from '../src/checks/regressions.mjs';
import { buildReport, renderMarkdown, renderHtml } from '../src/report.mjs';
import { readFile } from 'node:fs/promises';

let fixture, cfg, site, http, results, byId, report;

const RENDERED_IDS = new Set(['console-errors', 'brand-fonts', 'contrast', 'mobile-overflow', 'performance']);

before(async () => {
  fixture = await startFixtureSite();
  cfg = await fixtureConfig(fixture.baseUrl);
  http = new Http(cfg);
  site = await crawlSite(http, cfg);

  const rendered = { available: false, reason: 'not exercised in the static e2e test', pages: new Map() };
  const ctx = { site, http, cfg, rendered, priorResults: [] };

  const registry = JSON.parse(await readFile(new URL('../known-defects.json', import.meta.url), 'utf8'));
  const checks = [...allChecks().filter((c) => !RENDERED_IDS.has(c.id)), makeRegressionCheck(registry)];

  results = [];
  for (const check of checks) {
    const findings = await check.run(ctx);
    const result = { id: check.id, title: check.title, findings, status: 'PASS', durationMs: 0 };
    results.push(result);
    ctx.priorResults = results;
  }
  byId = new Map(results.map((r) => [r.id, r.findings]));
  report = buildReport({
    results: results.map((r) => ({ ...r, status: r.findings.some((f) => f.severity === 'FAIL') ? 'FAIL' : r.findings.some((f) => f.severity === 'WARN') ? 'WARN' : 'PASS' })),
    site, cfg, rendered, regressionOutcomes: ctx.regressionOutcomes,
    meta: { startedAt: new Date(0).toISOString(), durationMs: 1, suiteVersion: 'test', readOnly: true },
  });
}, { timeout: 60000 });

after(async () => { await fixture?.close(); });

const has = (id, re) => (byId.get(id) || []).some((f) => re.test(f.title) || re.test(String(f.detail || '')));
const count = (id, re) => (byId.get(id) || []).filter((f) => re.test(f.title)).length;

describe('crawl', () => {
  test('discovers the sitemap and every linked page', () => {
    assert.ok(site.sitemap.reachable, 'sitemap found');
    assert.ok(site.sitemap.urls.length >= 11, `sitemap urls: ${site.sitemap.urls.length}`);
    assert.ok(site.htmlPages().length >= 9, `html pages: ${site.htmlPages().length}`);
  });

  test('records the full redirect chain rather than just the destination', () => {
    const old = [...site.pages.values()].find((p) => p.requestedUrl.endsWith('/old-service/'));
    assert.ok(old, 'old-service crawled');
    assert.equal(old.redirectChain.length, 3, 'three hops recorded');
    assert.ok(old.finalUrl.endsWith('/services/skin-therapy/'));
  });

  test('never issues a non-read-only request', async () => {
    await assert.rejects(() => http.fetchWithChain(fixture.baseUrl, { method: 'POST' }), /read-only/);
  });
});

describe('broken links and HTTP errors', () => {
  test('finds the internal 404', () => assert.ok(has('broken-links', /404/)));
  test('finds the unreachable external link', () => assert.ok(has('broken-links', /External link/i)));
});

describe('redirects', () => {
  test('flags the three-hop chain', () => assert.ok(has('redirect-chains', /chain of 3 hops/)));
  test('flags the temporary 302', () => assert.ok(has('redirect-chains', /Temporary 302/)));
  test('flags internal links pointing at redirects', () => assert.ok(has('internal-redirect-links', /redirecting URL/)));
});

describe('titles and meta descriptions', () => {
  test('detects the duplicate title', () => assert.ok(has('titles', /Duplicate title/)));
  test('detects the missing meta description', () => assert.ok(has('meta-descriptions', /Missing meta description/)));
  test('detects the duplicate meta description', () => assert.ok(has('meta-descriptions', /Duplicate meta description/)));
});

describe('canonicals and indexability', () => {
  test('detects the missing canonical', () => assert.ok(has('canonicals', /Missing canonical/)));
  test('detects the cross-page canonical', () => assert.ok(has('canonicals', /different URL/)));
  test('detects noindex present in the sitemap', () => {
    assert.ok(has('indexability', /noindex but listed in the sitemap/i) || has('sitemap', /noindex/i));
  });
});

describe('headings', () => {
  test('detects two H1s', () => assert.ok(has('headings', /2 H1 tags/)));
  test('detects the empty H2', () => assert.ok(has('headings', /Empty H2/)));
  test('detects the skipped heading level', () => assert.ok(has('headings', /Heading level skips H\d -> H4/)));
});

describe('images and accessibility', () => {
  test('detects the image with no alt attribute', () => assert.ok(has('alt-text', /no alt attribute/)));
  test('detects the linked image with empty alt', () => assert.ok(has('alt-text', /Linked image has empty alt/)));
  test('detects the missing lang attribute', () => assert.ok(has('document-semantics', /Missing lang/)));
  test('detects the anchor with no target', () => assert.ok(has('broken-anchors', /no matching element/)));
});

describe('forms', () => {
  test('detects the unlabelled field', () => assert.ok(has('forms', /no label/)));
  test('detects the missing submit control', () => assert.ok(has('forms', /no submit control/)));
  test('detects personal details sent over GET', () => assert.ok(has('forms', /uses GET/)));
});

describe('structured data', () => {
  test('detects invalid JSON-LD', () => assert.ok(has('structured-data', /Invalid JSON-LD/)));
  test('detects LocalBusiness missing address', () => assert.ok(has('structured-data', /missing required property "address"/)));
});

describe('content hygiene', () => {
  test('detects the Cleveland reference', () => assert.ok(has('legacy-references', /Cleveland/)));
  test('detects the retired Midweek Reset offer', () => assert.ok(has('legacy-references', /Midweek Reset/)));
  test('detects the gift certificates reference', () => assert.ok(has('legacy-references', /gift certificate/i)));
  test('detects lorem ipsum placeholder copy', () => assert.ok(has('placeholder-content', /Lorem ipsum/i)));
  test('detects the generic-only booking link on a service page', () => assert.ok(has('booking-intent', /generic booking/i)));
});

describe('colours in source', () => {
  test('detects the rogue #2EA3F2 in the page source', () => {
    assert.ok(has('brand-colours', /2EA3F2/i), 'rogue Divi blue found without a browser');
  });
});

describe('page quality', () => {
  test('detects the thin page', () => assert.ok(has('duplicate-thin', /[Tt]hin page/)));
  test('detects the near-duplicate pair', () => assert.ok(has('duplicate-thin', /Near-duplicate/)));
  test('detects the orphan page', () => assert.ok(has('orphan-pages', /Orphan page/)));
});

describe('mixed content', () => {
  // The fixture is served over plain http, where mixed content cannot exist.
  // The rule is exercised directly against a synthetic https page instead.
  const fakeSite = (html) => ({
    htmlPages: () => [{ finalUrl: 'https://emjaywellness.com.au/page/', html }],
  });

  test('flags insecure subresources on an https page', async () => {
    const check = allChecks().find((c) => c.id === 'mixed-content');
    const out = await check.run({ site: fakeSite('<img src="http://cdn.example.com/a.jpg"><link href="http://cdn.example.com/a.css">') });
    assert.equal(out.length, 2);
    assert.ok(out.every((f) => f.severity === 'FAIL'));
  });

  test('does not flag an ordinary outbound http link as mixed content', async () => {
    const check = allChecks().find((c) => c.id === 'mixed-content');
    const out = await check.run({ site: fakeSite('<a href="http://example.com/">An old site</a>') });
    assert.equal(out.length, 0);
  });

  test('ignores pages that are themselves served over http', async () => {
    const check = allChecks().find((c) => c.id === 'mixed-content');
    const httpSite = { htmlPages: () => [{ finalUrl: 'http://example.com/', html: '<img src="http://cdn.example.com/a.jpg">' }] };
    const out = await check.run({ site: httpSite });
    assert.equal(out.length, 0);
  });
});

describe('sitemap health', () => {
  test('flags the redirecting URL listed in the sitemap', () => assert.ok(has('sitemap', /Sitemap URL redirects/)));
});

describe('known-defect regressions', () => {
  test('every registry entry produces a verdict', () => {
    const registryIds = report.regressions.map((r) => r.id);
    assert.ok(registryIds.includes('EMJ-001'));
    assert.equal(new Set(registryIds).size, registryIds.length, 'no duplicate ids');
  });

  test('seeded regressions are reported as FAIL, not silently passed', () => {
    const byDefect = new Map(report.regressions.map((r) => [r.id, r]));
    // Present in the fixture, so these must regress.
    for (const id of ['EMJ-002', 'EMJ-003', 'EMJ-004', 'EMJ-011', 'EMJ-012', 'EMJ-018', 'EMJ-019', 'EMJ-021', 'EMJ-027']) {
      assert.equal(byDefect.get(id)?.result, 'FAIL', `${id} should regress on the fixture`);
    }
  });

  test('assertions that cannot run report NOT VERIFIED rather than PASS', () => {
    const byDefect = new Map(report.regressions.map((r) => [r.id, r]));
    // EMJ-001 needs the browser, which this test deliberately skips.
    assert.equal(byDefect.get('EMJ-001')?.result, 'NOT VERIFIED');
  });

  test('a clean assertion passes', () => {
    const byDefect = new Map(report.regressions.map((r) => [r.id, r]));
    assert.equal(byDefect.get('EMJ-008')?.result, 'PASS', 'robots.txt does not block the fixture site');
  });
});

describe('reporting', () => {
  test('overall verdict is FAIL on a defective site', () => {
    assert.equal(report.meta.overall, 'FAIL');
    assert.ok(report.meta.counts.FAIL > 0);
  });

  test('markdown and html render without throwing and contain the verdict', () => {
    const md = renderMarkdown(report, cfg);
    assert.match(md, /\*\*Overall: FAIL\*\*/);
    const html = renderHtml(report);
    assert.match(html, /OVERALL: FAIL/);
    assert.match(html, /<!doctype html>/i);
  });

  test('every check appears in the summary', () => {
    assert.equal(report.checks.length, results.length);
  });
});

describe('render target selection', () => {
  test('always includes the homepage and spreads across path families', () => {
    const targets = pickRenderTargets(site, 5);
    assert.equal(targets.length, 5);
    assert.ok(targets.some((t) => new URL(t).pathname === '/'), 'homepage included');
    const families = new Set(targets.map((t) => new URL(t).pathname.split('/').filter(Boolean)[0] || ''));
    assert.ok(families.size >= 3, `families covered: ${[...families].join(', ')}`);
  });
});
