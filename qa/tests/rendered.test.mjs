/**
 * Exercises the Playwright pass against the fixture site: rogue colours in
 * computed styles, unapproved fonts, contrast failures, mobile overflow and
 * console errors.
 *
 * Skips itself (rather than failing) when no browser is installed, so the
 * static suite still runs on a bare CI box.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { startFixtureSite, fixtureConfig } from './fixture-site.mjs';
import { Http } from '../src/http.mjs';
import { crawlSite } from '../src/crawl.mjs';
import { renderPages } from '../src/render.mjs';
import { allChecks } from '../src/index.mjs';
import { makeRegressionCheck } from '../src/checks/regressions.mjs';

let fixture, cfg, rendered, byId, regressions;
let browserAvailable = false;

before(async () => {
  fixture = await startFixtureSite();
  cfg = await fixtureConfig(fixture.baseUrl);
  const http = new Http(cfg);
  const site = await crawlSite(http, cfg);

  const targets = [
    `${fixture.baseUrl}/`,
    `${fixture.baseUrl}/services/skin-therapy/`,
    `${fixture.baseUrl}/about/`,
  ];
  rendered = await renderPages(targets, cfg);
  browserAvailable = rendered.available;
  if (!browserAvailable) return;

  const ctx = { site, http, cfg, rendered, priorResults: [] };
  const registry = JSON.parse(await readFile(new URL('../known-defects.json', import.meta.url), 'utf8'));
  const results = [];
  for (const check of [...allChecks(), makeRegressionCheck(registry)]) {
    const findings = await check.run(ctx);
    results.push({ id: check.id, title: check.title, findings });
    ctx.priorResults = results;
  }
  byId = new Map(results.map((r) => [r.id, r.findings]));
  regressions = ctx.regressionOutcomes;
}, { timeout: 180000 });

after(async () => { await fixture?.close(); });

const has = (id, re) => (byId.get(id) || []).some((f) => re.test(f.title) || re.test(String(f.detail || '')));
/** node:test evaluates describe() bodies before hooks run, so the skip
 *  decision has to be made inside each test rather than in its options. */
function requireBrowser(t) {
  if (browserAvailable) return true;
  t.skip('no browser available in this environment');
  return false;
}

describe('rendered pass', () => {
  test('the browser pass runs at all', () => {
    if (!browserAvailable) {
      assert.ok(rendered.reason, 'an explicit reason is recorded when the browser is unavailable');
      return;
    }
    assert.equal(rendered.pages.size, 3);
  });

  test('detects the rogue #2EA3F2 in computed styles', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('brand-colours', /2EA3F2/i));
  });

  test('reports the rogue colour as a regression, not a pass', (t) => {
    if (!requireBrowser(t)) return;
    const emj001 = regressions.find((r) => r.defect.id === 'EMJ-001');
    assert.equal(emj001.status, 'regressed', 'EMJ-001 must fail on a site that still ships the Divi blue');
  });

  test('detects the secondary banned colour #7EBEC5', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('brand-colours', /7EBEC5/i));
  });

  test('detects Comic Sans as an unapproved font', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('brand-fonts', /comic sans/i));
  });

  test('inventories the fonts actually in use', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('brand-fonts', /georgia/i), 'Georgia is reported in the inventory');
  });

  test('detects the low-contrast paragraph', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('contrast', /below AA minimum/));
  });

  test('detects mobile horizontal overflow', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('mobile-overflow', /scrolls sideways/));
  });

  test('detects the console error and the uncaught page error', (t) => {
    if (!requireBrowser(t)) return;
    assert.ok(has('console-errors', /theme widget failed to initialise/));
    assert.ok(has('console-errors', /Uncaught JavaScript error/));
  });

  test('collects performance timings', (t) => {
    if (!requireBrowser(t)) return;
    const home = rendered.pages.get(`${fixture.baseUrl}/`);
    assert.ok(home.perf, 'perf recorded');
    assert.ok(home.perf.requestCount > 0);
    assert.ok(Number.isFinite(home.perf.cls));
  });

  test('does not submit any form', (t) => {
    if (!requireBrowser(t)) return;
    // The fixture's form posts to /submit. If the suite ever submitted it, the
    // request would appear in the render record.
    for (const [, rec] of rendered.pages) {
      const submitted = (rec.perf?.httpErrorSubresources || []).some((r) => r.url.includes('/submit'));
      assert.equal(submitted, false, 'no request to the form action endpoint');
    }
  });
});
