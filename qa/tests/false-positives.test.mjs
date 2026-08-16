/**
 * Regressions for false positives found by the first production run against
 * emjaywellness.com.au (workflow run 31917800658, 2026-08-16).
 *
 * A QA gate that cries wolf cannot be used to declare GREEN, so each of these
 * is pinned by a test in its own right.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import cfg from '../emjay-qa.config.mjs';
import { Http } from '../src/http.mjs';
import { allChecks } from '../src/index.mjs';
import { collapseFindings } from '../src/report.mjs';
import { parsePage } from '../src/parse.mjs';

const check = (id) => allChecks().find((c) => c.id === id);

describe('Cloudflare email obfuscation is not a broken link', () => {
  test('/cdn-cgi/ URLs are excluded from the crawl', () => {
    const http = new Http(cfg);
    const url = 'https://emjaywellness.com.au/cdn-cgi/l/email-protection';
    assert.equal(http.isIgnored(http.normalise(url)), true);
  });

  test('ordinary URLs are still crawled', () => {
    const http = new Http(cfg);
    assert.equal(http.isIgnored(http.normalise('https://emjaywellness.com.au/about/')), false);
  });
});

describe('third-party bot protection is not a dead link', () => {
  const siteWith = (href) => ({
    pages: new Map(),
    inbound: new Map(),
    externalLinks: new Map([[href, new Set(['https://emjaywellness.com.au/'])]]),
    htmlPages: () => [],
  });

  function stubHttp(status) {
    return {
      fetchWithChain: async (url) => ({
        url, finalUrl: url, status, ok: status >= 200 && status < 300,
        chain: [], headers: {}, body: '', error: null,
      }),
    };
  }

  test('a 403 from an external host is a WARNING, never a FAIL', async () => {
    // Payhip returns 403 to datacenter traffic. Treating that as a broken
    // revenue link would put a permanent false failure in the report.
    const out = await check('broken-links').run({
      site: siteWith('https://payhip.com/b/jJuSZ'),
      http: stubHttp(403),
      cfg,
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].severity, 'WARN');
    assert.match(out[0].title, /automated requests/);
  });

  test('a genuine 404 on a revenue path is still a FAIL', async () => {
    const out = await check('broken-links').run({
      site: siteWith('https://payhip.com/b/gone'),
      http: stubHttp(404),
      cfg,
    });
    assert.equal(out[0].severity, 'FAIL');
  });

  test('an external-url-ok assertion reports NOT VERIFIED on a 403', async () => {
    const { makeRegressionCheck } = await import('../src/checks/regressions.mjs');
    const registry = {
      defects: [{
        id: 'TEST-1', title: 'shop link', status: 'confirmed', severity: 'FAIL', scope: 'external',
        assert: { type: 'external-url-ok', url: 'https://payhip.com/emjaywellness' },
      }],
    };
    const ctx = {
      site: { htmlPages: () => [], pages: new Map(), robots: null },
      http: stubHttp(403),
      cfg,
      rendered: { available: false, reason: 'n/a', pages: new Map() },
      priorResults: [],
    };
    await makeRegressionCheck(registry).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'unknown', 'unverifiable, not regressed');
  });
});

describe('search forms are not required to have a submit button', () => {
  const pageWith = (html) => ({
    htmlPages: () => [{ finalUrl: 'https://emjaywellness.com.au/', dom: parsePage(html, 'https://emjaywellness.com.au/') }],
  });

  test('a themed search form with no button produces no submit finding', async () => {
    const out = await check('forms').run({
      site: pageWith('<form role="search"><input type="search" name="s" aria-label="Search" placeholder="Search …"></form>'),
      cfg,
    });
    assert.equal(out.filter((f) => /no submit control/i.test(f.title)).length, 0);
  });

  test('an enquiry form with no button is still a FAIL', async () => {
    const out = await check('forms').run({
      site: pageWith('<form><label for="e">Email</label><input id="e" type="email" name="email"></form>'),
      cfg,
    });
    assert.equal(out.filter((f) => /no submit control/i.test(f.title)).length, 1);
  });

  test('an unlabelled search input is still reported', async () => {
    const out = await check('forms').run({
      site: pageWith('<form role="search"><input type="search" name="s" placeholder="Search …"></form>'),
      cfg,
    });
    assert.ok(out.some((f) => /no label/i.test(f.title)), 'a placeholder is not a label');
  });
});

describe('H1-count regression does not absorb heading-skip findings', () => {
  test('"Heading level skips H1 -> H3" does not count as an H1-count defect', async () => {
    const { makeRegressionCheck } = await import('../src/checks/regressions.mjs');
    const registry = {
      defects: [{
        id: 'TEST-H1', title: 'one h1', status: 'confirmed', severity: 'FAIL', scope: 'site',
        assert: { type: 'h1-count', min: 1, max: 1 },
      }],
    };
    const ctx = {
      site: { htmlPages: () => [], pages: new Map(), robots: null },
      http: null,
      cfg,
      rendered: { available: false, reason: 'n/a', pages: new Map() },
      priorResults: [{
        id: 'headings',
        findings: [
          { severity: 'WARN', title: 'Heading level skips H1 -> H3', url: 'https://e.com/', detail: '' },
          { severity: 'WARN', title: 'Long page with no H2 subheadings', url: 'https://e.com/', detail: '' },
        ],
      }],
    };
    await makeRegressionCheck(registry).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'clear', 'no H1-count defect is present');
  });

  test('a genuine H1-count defect still regresses', async () => {
    const { makeRegressionCheck } = await import('../src/checks/regressions.mjs');
    const registry = {
      defects: [{
        id: 'TEST-H1', title: 'one h1', status: 'confirmed', severity: 'FAIL', scope: 'site',
        assert: { type: 'h1-count', min: 1, max: 1 },
      }],
    };
    const ctx = {
      site: { htmlPages: () => [], pages: new Map(), robots: null },
      http: null,
      cfg,
      rendered: { available: false, reason: 'n/a', pages: new Map() },
      priorResults: [{
        id: 'headings',
        findings: [{ severity: 'FAIL', title: '2 H1 tags on one page', url: 'https://e.com/', detail: '' }],
      }],
    };
    await makeRegressionCheck(registry).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'regressed');
  });
});

describe('template-wide defects collapse into one finding', () => {
  const repeated = (n) =>
    Array.from({ length: n }, (_, i) => ({
      severity: 'WARN',
      title: 'Viewport blocks pinch-zoom',
      url: `https://emjaywellness.com.au/page-${i}/`,
      detail: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0',
      fix: null,
      defectId: null,
    }));

  test('206 copies of one theme defect become a single finding', () => {
    const out = collapseFindings(repeated(206));
    assert.equal(out.length, 1);
    assert.match(out[0].title, /on 206 page\(s\)/);
    assert.equal(out[0].occurrences, 206);
    assert.equal(out[0].urls.length, 206);
  });

  test('the collapsed finding still shows sample URLs', () => {
    const out = collapseFindings(repeated(206));
    assert.match(out[0].detail, /emjaywellness\.com\.au\/page-0\//);
    assert.match(out[0].detail, /and 201 more/);
  });

  test('findings below the threshold are left alone', () => {
    const out = collapseFindings(repeated(2));
    assert.equal(out.length, 2);
  });

  test('genuinely different findings never merge', () => {
    const mixed = [
      ...repeated(4),
      { severity: 'FAIL', title: 'Missing canonical link', url: 'https://e.com/a/', detail: '', fix: null, defectId: null },
    ];
    const out = collapseFindings(mixed);
    assert.equal(out.length, 2);
    assert.ok(out.some((f) => /Missing canonical/.test(f.title)));
  });

  test('severity is preserved through collapsing', () => {
    const out = collapseFindings(repeated(10));
    assert.equal(out[0].severity, 'WARN');
  });
});

describe('archive surfaces are not content defects', () => {
  test('pagination and archive URLs match the configured patterns', () => {
    const paths = ['/blogs/page/8/', '/author/admin/page/15/', '/category/holistic-health/', '/tag/body-based-healing/'];
    for (const p of paths) {
      assert.ok(cfg.content.archivePatterns.some((re) => re.test(p)), `${p} recognised as an archive`);
    }
  });

  test('a real content page is not treated as an archive', () => {
    for (const p of ['/about/', '/skin-therapy/', '/work-with-belinda/']) {
      assert.equal(cfg.content.archivePatterns.some((re) => re.test(p)), false, `${p} is real content`);
    }
  });

  test('a thin archive is INFO while a thin content page is FAIL', async () => {
    const mk = (url, words) => ({
      finalUrl: url,
      depth: 1,
      dom: {
        noindex: false,
        mainWordCount: words,
        shingles: new Set(),
      },
    });
    const site = {
      htmlPages: () => [
        mk('https://emjaywellness.com.au/blogs/page/8/', 49),
        mk('https://emjaywellness.com.au/skin-therapy/', 49),
      ],
    };
    const out = await check('duplicate-thin').run({ site, cfg });
    const archive = out.find((f) => f.url.includes('/page/8/'));
    const real = out.find((f) => f.url.includes('/skin-therapy/'));
    assert.equal(archive.severity, 'INFO');
    assert.equal(real.severity, 'FAIL');
  });
});
