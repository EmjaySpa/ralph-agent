/**
 * Pins the decisions from the 16 August 2026 reconciliation against the live
 * site, so none of them can be quietly undone by a later edit.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import cfg from '../emjay-qa.config.mjs';
import { parseColour, contrastRatio, isLargeText } from '../src/colour.mjs';
import { allChecks } from '../src/index.mjs';
import { makeRegressionCheck } from '../src/checks/regressions.mjs';
import { parsePage } from '../src/parse.mjs';

const check = (id) => allChecks().find((c) => c.id === id);
const registry = JSON.parse(await readFile(new URL('../known-defects.json', import.meta.url), 'utf8'));
const entry = (id) => registry.defects.find((d) => d.id === id);

describe('WCAG large-text thresholds', () => {
  test('3:1 is applied wherever WCAG allows it', () => {
    // 18pt (24px) at any weight, and 14pt (18.66px) at bold, are large text.
    assert.equal(isLargeText(24, 400), true);
    assert.equal(isLargeText(30, 300), true);
    assert.equal(isLargeText(18.66, 700), true);
    assert.equal(isLargeText(21, 700), true);
    assert.equal(isLargeText(19, 900), true);
  });

  test('4.5:1 is applied to text WCAG does not classify as large', () => {
    assert.equal(isLargeText(16, 700), false, 'below 18.66px, bold does not help');
    assert.equal(isLargeText(19, 400), false, 'regular weight below 24px is normal text');
  });

  /**
   * The case the reconciliation queried. The production log recorded
   * "21px/600" — weight 600, not 700. WCAG defines bold as 700+, so 21px/600
   * is NOT large text and correctly takes the 4.5:1 threshold. Downgrading it
   * to 3:1 would let a genuine AA failure pass, and this pairing is one of the
   * two defects the reconciliation itself wants fixed.
   */
  test('21px at weight 600 is normal text, not large text', () => {
    assert.equal(isLargeText(21, 600), false);
    const ratio = contrastRatio(parseColour('#FFFFFF'), parseColour('#5F9DA0'));
    assert.ok(ratio < 4.5, `white on #5F9DA0 is ${ratio.toFixed(2)}:1 and fails at normal-text threshold`);
  });

  test('the same size at weight 700 IS large text and would pass', () => {
    assert.equal(isLargeText(21, 700), true);
    const ratio = contrastRatio(parseColour('#FFFFFF'), parseColour('#5F9DA0'));
    assert.ok(ratio >= 3.0, `${ratio.toFixed(2)}:1 clears the large-text threshold`);
  });

  test('the bold threshold is configurable but defaults to the WCAG value', () => {
    assert.equal(cfg.thresholds.boldWeightThreshold, 700);
    assert.equal(isLargeText(21, 600, 600), true, 'a team may opt into treating semibold as bold');
  });
});

describe('approved button spec', () => {
  test('#1c2224 on #5F9DA0 passes AA, white does not', () => {
    assert.ok(contrastRatio(parseColour('#1c2224'), parseColour('#5F9DA0')) >= 4.5);
    assert.ok(contrastRatio(parseColour('#FFFFFF'), parseColour('#5F9DA0')) < 4.5);
  });

  test('the palette and its scoped accessibility variants are unchanged', () => {
    const hexes = cfg.brand.colours.approved.map((c) => (typeof c === 'string' ? c : c.hex).toUpperCase());
    for (const h of ['#609E9F', '#5F9DA0', '#87B5B6', '#DBE8E9', '#B1CFCF', '#426E70', '#457F81']) {
      assert.ok(hexes.includes(h), `${h} still approved`);
    }
  });

  test('#426E70 stays scoped to text on pale backgrounds, never a button fill', () => {
    const variant = cfg.brand.colours.approved.find((c) => c.hex?.toUpperCase() === '#426E70');
    assert.match(variant.role, /pale/i);
  });
});

describe('Divi blue is an open defect, not a regression', () => {
  test('EMJ-001 and EMJ-002 record when they were opened and carry no fix date', () => {
    for (const id of ['EMJ-001', 'EMJ-002']) {
      assert.equal(entry(id).openSince, '2026-08-15');
      assert.equal(entry(id).fixedOn, undefined, 'never fixed, so it cannot have regressed');
    }
  });

  test('an entry with no fixedOn is reported as STILL PRESENT', async () => {
    const ctx = ctxFor([{
      id: 'X', title: 'never fixed', status: 'confirmed', severity: 'FAIL', scope: 'site',
      openSince: '2026-08-15',
      assert: { type: 'text-absent', pattern: 'boom', flags: 'i' },
    }], 'a boom here');
    const out = await makeRegressionCheck({ defects: ctx.registry }).run(ctx);
    assert.match(out[0].title, /STILL PRESENT/);
    assert.doesNotMatch(out[0].title, /REGRESSED/);
    assert.match(out[0].detail, /Open on the register since 2026-08-15/);
  });

  test('an entry with a fixedOn date IS reported as a regression', async () => {
    const ctx = ctxFor([{
      id: 'Y', title: 'came back', status: 'confirmed', severity: 'FAIL', scope: 'site',
      fixedOn: '2026-08-20',
      assert: { type: 'text-absent', pattern: 'boom', flags: 'i' },
    }], 'a boom here');
    const out = await makeRegressionCheck({ defects: ctx.registry }).run(ctx);
    assert.match(out[0].title, /REGRESSED \(fixed 2026-08-20\)/);
  });
});

describe('meta description counting excludes archives', () => {
  const page = (url, hasDesc) => ({
    finalUrl: url,
    dom: parsePage(
      `<html lang="en-AU"><head><title>Page title here for testing</title>${hasDesc ? '<meta name="description" content="A description long enough to clear the minimum length threshold for this check to be happy.">' : ''}</head><body><h1>x</h1></body></html>`,
      url,
    ),
  });

  test('archives are counted separately as INFO, not as missing descriptions', async () => {
    const site = {
      htmlPages: () => [
        page('https://emjaywellness.com.au/tag/body-based-healing/', false),
        page('https://emjaywellness.com.au/category/holistic-health/', false),
        page('https://emjaywellness.com.au/author/admin/page/15/', false),
        page('https://emjaywellness.com.au/the-reset/', false),
      ],
    };
    const out = await check('meta-descriptions').run({ site, cfg });
    const missing = out.filter((f) => f.title === 'Missing meta description');
    assert.equal(missing.length, 1, 'only the authored page counts');
    assert.equal(missing[0].url, 'https://emjaywellness.com.au/the-reset/');

    const rollup = out.find((f) => /archive\/pagination page\(s\) have no meta description/.test(f.title));
    assert.ok(rollup, 'archives are still reported, as a single INFO roll-up');
    assert.equal(rollup.severity, 'INFO');
    assert.match(rollup.title, /^3 archive/);
  });

  test('a duplicate title across pagination only is INFO, not FAIL', async () => {
    const site = {
      htmlPages: () => [
        page('https://emjaywellness.com.au/blogs/', true),
        page('https://emjaywellness.com.au/blogs/page/2/', true),
        page('https://emjaywellness.com.au/blogs/page/3/', true),
      ],
    };
    const out = await check('titles').run({ site, cfg });
    const dup = out.find((f) => /Duplicate title/.test(f.title));
    assert.equal(dup.severity, 'INFO');
    assert.match(dup.title, /archive\/pagination/);
  });

  test('a duplicate title across two real pages is still FAIL', async () => {
    const site = {
      htmlPages: () => [
        page('https://emjaywellness.com.au/cart/', true),
        page('https://emjaywellness.com.au/checkout/', true),
      ],
    };
    const out = await check('titles').run({ site, cfg });
    const dup = out.find((f) => /Duplicate title/.test(f.title));
    assert.equal(dup.severity, 'FAIL');
  });
});

describe('legal clauses are protected, not tidied', () => {
  const legalPage = (url) => ({
    finalUrl: url,
    dom: parsePage(
      `<html lang="en-AU"><head><title>Refunds and Returns</title></head><body><h1>Refunds</h1>
       <p>Non-Returnable Items: Gift certificates and vouchers.</p>
       <p>Retreat &amp; Workshop Cancellations: 60+ days sliding scale applies.</p>
       </body></html>`,
      url,
    ),
  });

  test('gift certificate wording on a legal page is NOT flagged', async () => {
    const site = { htmlPages: () => [legalPage('https://emjaywellness.com.au/refund_returns/')] };
    const out = await check('legacy-references').run({ site, cfg });
    assert.equal(out.filter((f) => /gift/i.test(f.title)).length, 0);
  });

  test('gift certificates marketed on a normal page ARE still flagged', async () => {
    const site = {
      htmlPages: () => [{
        finalUrl: 'https://emjaywellness.com.au/shop/',
        dom: parsePage('<html lang="en-AU"><head><title>Shop</title></head><body><p>Buy gift certificates today.</p></body></html>', 'https://emjaywellness.com.au/shop/'),
      }],
    };
    const out = await check('legacy-references').run({ site, cfg });
    assert.equal(out.filter((f) => /gift/i.test(f.title)).length, 1);
  });

  test('the EMJ-004 registry assertion also excludes legal pages', async () => {
    assert.equal(entry('EMJ-004').assert.excludePaths, 'legal');
    const ctx = ctxFor([entry('EMJ-004')], 'Non-Returnable Items: Gift certificates and vouchers');
    ctx.site.htmlPages = () => [legalPage('https://emjaywellness.com.au/refund_returns/')];
    await makeRegressionCheck({ defects: [entry('EMJ-004')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'clear', 'legal clauses do not trip the defect');
  });

  test('removing the retreat clauses is itself a FAIL', async () => {
    const stripped = {
      finalUrl: 'https://emjaywellness.com.au/refund_returns/',
      dom: parsePage('<html lang="en-AU"><head><title>Refunds</title></head><body><p>Nothing about cancellations.</p></body></html>', 'https://emjaywellness.com.au/refund_returns/'),
    };
    const ctx = ctxFor([entry('RETREAT-CLAUSES-PRESENT')], '');
    ctx.site.htmlPages = () => [stripped];
    await makeRegressionCheck({ defects: [entry('RETREAT-CLAUSES-PRESENT')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'regressed');
    assert.equal(entry('RETREAT-CLAUSES-PRESENT').severity, 'FAIL');
  });

  test('retreat clauses present means PASS', async () => {
    const ctx = ctxFor([entry('RETREAT-CLAUSES-PRESENT')], '');
    ctx.site.htmlPages = () => [legalPage('https://emjaywellness.com.au/refund_returns/')];
    await makeRegressionCheck({ defects: [entry('RETREAT-CLAUSES-PRESENT')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'clear');
  });
});

describe('newly confirmed defects', () => {
  test('EMJ-034 catches a viewport that blocks pinch-zoom', async () => {
    const blocked = '<html lang="en-AU"><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"><title>t</title></head><body></body></html>';
    const ctx = ctxFor([entry('EMJ-034')], '');
    ctx.site.htmlPages = () => [{ finalUrl: 'https://e.com/', html: blocked, dom: parsePage(blocked, 'https://e.com/') }];
    await makeRegressionCheck({ defects: [entry('EMJ-034')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'regressed');
  });

  test('EMJ-034 passes on the corrected viewport value', async () => {
    const ok = '<html lang="en-AU"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>t</title></head><body></body></html>';
    const ctx = ctxFor([entry('EMJ-034')], '');
    ctx.site.htmlPages = () => [{ finalUrl: 'https://e.com/', html: ok, dom: parsePage(ok, 'https://e.com/') }];
    await makeRegressionCheck({ defects: [entry('EMJ-034')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'clear');
  });

  test('EMJ-035 catches white text rendered on #5F9DA0', async () => {
    const ctx = ctxFor([entry('EMJ-035')], '');
    ctx.rendered = {
      available: true,
      reason: null,
      pages: new Map([['https://e.com/', {
        desktop: { contrast: [{ fg: '#FFFFFF', bg: '#5F9DA0', fontSize: 17, fontWeight: '700', selector: '.dtb-mobile-menu>li:last-of-type>a', text: 'Book Now' }], colours: [], fonts: [] },
      }]]),
    };
    await makeRegressionCheck({ defects: [entry('EMJ-035')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'regressed');
    assert.match(ctx.regressionOutcomes[0].detail, /Book Now/);
  });

  test('EMJ-035 passes once the approved label colour is applied', async () => {
    const ctx = ctxFor([entry('EMJ-035')], '');
    ctx.rendered = {
      available: true,
      reason: null,
      pages: new Map([['https://e.com/', {
        desktop: { contrast: [{ fg: '#1C2224', bg: '#5F9DA0', fontSize: 17, fontWeight: '700', selector: 'a', text: 'Book Now' }], colours: [], fonts: [] },
      }]]),
    };
    await makeRegressionCheck({ defects: [entry('EMJ-035')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'clear');
  });

  test('EMJ-035 reports NOT VERIFIED without a browser rather than passing', async () => {
    const ctx = ctxFor([entry('EMJ-035')], '');
    await makeRegressionCheck({ defects: [entry('EMJ-035')] }).run(ctx);
    assert.equal(ctx.regressionOutcomes[0].status, 'unknown');
  });
});

/** Minimal context with a single-page site whose visible text is `text`. */
function ctxFor(defects, text) {
  const html = `<html lang="en-AU"><head><title>t</title></head><body><p>${text}</p></body></html>`;
  return {
    registry: defects,
    site: {
      htmlPages: () => [{ finalUrl: 'https://e.com/', html, dom: parsePage(html, 'https://e.com/') }],
      pages: new Map(),
      robots: null,
    },
    http: null,
    cfg,
    rendered: { available: false, reason: 'no browser in this test', pages: new Map() },
    priorResults: [],
  };
}
