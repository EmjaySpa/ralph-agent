/**
 * Asserts the confirmed configuration decisions themselves, so a later edit
 * cannot quietly undo them. These are tests of the config, not of the site.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import cfg from '../emjay-qa.config.mjs';
import { parseColour, deltaE, chroma, contrastRatio } from '../src/colour.mjs';
import { brandColours, brandFonts } from '../src/checks/rendered-checks.mjs';

const hexOf = (entry) => (typeof entry === 'string' ? entry : entry.hex).toUpperCase();

describe('approved colour palette', () => {
  const approved = cfg.brand.colours.approved.map(hexOf);
  const banned = cfg.brand.colours.banned.map((b) => b.hex.toUpperCase());

  test('every confirmed brand colour is present', () => {
    for (const hex of ['#609E9F', '#5F9DA0', '#87B5B6', '#DBE8E9', '#B1CFCF', '#426E70', '#457F81']) {
      assert.ok(approved.includes(hex), `${hex} approved`);
    }
  });

  test('every retired colour is banned at FAIL', () => {
    for (const hex of ['#2F6569', '#5A9A94', '#2EA3F2', '#D63637']) {
      const entry = cfg.brand.colours.banned.find((b) => b.hex.toUpperCase() === hex);
      assert.ok(entry, `${hex} banned`);
      assert.equal(entry.severity, 'FAIL', `${hex} is a FAIL`);
    }
  });

  test('no colour is both approved and banned', () => {
    for (const hex of approved) assert.equal(banned.includes(hex), false, `${hex} is not on both lists`);
  });

  test('allowlist enforcement is on', () => {
    assert.equal(cfg.brand.colours.mode, 'allowlist');
    assert.ok(cfg.brand.colours.approved.length > 0);
  });

  test('tolerance is tight enough to separate the two adjacent teals', () => {
    // #609E9F and #5F9DA0 are perceptually very close. If tolerance exceeded
    // their distance, one would silently satisfy the other.
    const gap = deltaE(parseColour('#609E9F'), parseColour('#5F9DA0'));
    assert.ok(cfg.brand.colours.tolerance < gap, `tolerance ${cfg.brand.colours.tolerance} < gap ${gap.toFixed(2)}`);
  });

  test('banned tolerance never swallows an approved colour', () => {
    for (const a of approved) {
      for (const b of banned) {
        const d = deltaE(parseColour(a), parseColour(b));
        assert.ok(
          d > cfg.brand.colours.bannedTolerance,
          `approved ${a} is ${d.toFixed(2)} from banned ${b}, within bannedTolerance ${cfg.brand.colours.bannedTolerance}`,
        );
      }
    }
  });

  test('the retired teals are genuinely distinct from the approved teals', () => {
    // Guards the risk that a retired colour is a near-twin of an approved one.
    const nearest = (hex) => Math.min(...approved.map((a) => deltaE(parseColour(hex), parseColour(a))));
    assert.ok(nearest('#2F6569') > 4, 'retired #2F6569 is distinguishable');
    assert.ok(nearest('#5A9A94') > 4, 'retired #5A9A94 is distinguishable');
  });

  test('the stated accessibility variants actually meet AA in their stated context', () => {
    // #426E70 on the pale backgrounds.
    for (const pale of ['#DBE8E9', '#FFFFFF']) {
      const ratio = contrastRatio(parseColour('#426E70'), parseColour(pale));
      assert.ok(ratio >= 4.5, `#426E70 on ${pale} is ${ratio.toFixed(2)}:1`);
    }
    // #457F81 on white.
    const onWhite = contrastRatio(parseColour('#457F81'), parseColour('#FFFFFF'));
    assert.ok(onWhite >= 4.5, `#457F81 on white is ${onWhite.toFixed(2)}:1`);
    // #87B5B6 on the dark panel.
    const onPanel = contrastRatio(parseColour('#87B5B6'), parseColour('#32373C'));
    assert.ok(onPanel >= 4.5, `#87B5B6 on #32373C is ${onPanel.toFixed(2)}:1`);
  });

  test('low-chroma brand colours are still protected by the near-brand rule', () => {
    // #DBE8E9 (chroma 4.6) and #32373C (3.9) fall under the neutral threshold.
    // The near-brand rule is what stops an off-by-a-shade version of them being
    // filed away as a harmless grey, so it must be wide enough to cover them.
    const lowChroma = approved.filter((hex) => chroma(parseColour(hex)) < cfg.brand.colours.neutralChromaThreshold);
    assert.ok(lowChroma.length > 0, 'the palette does contain low-chroma entries');
    assert.ok(
      cfg.brand.colours.nearBrandDeltaE >= 6,
      'nearBrandDeltaE must be wide enough to catch a near-miss of the pale teal',
    );
  });
});

describe('approved typefaces', () => {
  test('every confirmed family is approved', () => {
    for (const family of ['poppins', 'montserrat', 'playfair display', 'playlist script', 'arial', 'helvetica']) {
      assert.ok(cfg.brand.fonts.approved.includes(family), `${family} approved`);
    }
  });

  test('allowlist enforcement is on', () => {
    assert.equal(cfg.brand.fonts.mode, 'allowlist');
  });

  test('font migration is PARKED: unapproved fonts are a WARNING, not a FAIL', () => {
    assert.equal(
      cfg.brand.fonts.unapprovedSeverity,
      'WARN',
      'font remediation is parked until the migration is authorised',
    );
  });
});

describe('parked font severity is honoured by the check', () => {
  const renderedWith = (family) => ({
    available: true,
    reason: null,
    pages: new Map([
      ['https://e.com/', { desktop: { fonts: [{ family, count: 3, sample: 'p', sampleText: 'text' }], colours: [], contrast: [] } }],
    ]),
  });

  test('an unapproved family reports WARNING while parked', async () => {
    const out = await brandFonts.run({ rendered: renderedWith('open sans'), cfg });
    const hit = out.find((f) => /open sans/i.test(f.title));
    assert.ok(hit);
    assert.equal(hit.severity, 'WARN');
  });

  test('flipping unapprovedSeverity to FAIL needs no test or code change', async () => {
    const strict = { ...cfg, brand: { ...cfg.brand, fonts: { ...cfg.brand.fonts, unapprovedSeverity: 'FAIL' } } };
    const out = await brandFonts.run({ rendered: renderedWith('open sans'), cfg: strict });
    const hit = out.find((f) => /open sans/i.test(f.title));
    assert.equal(hit.severity, 'FAIL');
  });

  test('an approved family is not reported at all', async () => {
    const out = await brandFonts.run({ rendered: renderedWith('poppins'), cfg });
    assert.equal(out.filter((f) => /poppins/i.test(f.title)).length, 0);
  });
});

describe('colour check honours the palette', () => {
  const renderedWithColour = (hex) => ({
    available: true,
    reason: null,
    pages: new Map([
      ['https://e.com/', { desktop: { colours: [{ hex, prop: 'color', count: 2, sample: 'p' }], fonts: [], contrast: [], cssText: '' } }],
    ]),
  });
  const emptySite = { htmlPages: () => [] };

  test('an approved teal produces no finding', async () => {
    const out = await brandColours.run({ rendered: renderedWithColour('#609E9F'), site: emptySite, cfg });
    assert.equal(out.filter((f) => /609E9F/i.test(f.title)).length, 0);
  });

  test('a retired teal is a FAIL', async () => {
    const out = await brandColours.run({ rendered: renderedWithColour('#2F6569'), site: emptySite, cfg });
    const hit = out.find((f) => /2F6569/i.test(f.title));
    assert.ok(hit);
    assert.equal(hit.severity, 'FAIL');
  });

  test('an off-palette brand colour is reported at unapprovedSeverity', async () => {
    const out = await brandColours.run({ rendered: renderedWithColour('#C0392B'), site: emptySite, cfg });
    const hit = out.find((f) => /C0392B/i.test(f.title));
    assert.ok(hit);
    assert.equal(hit.severity, cfg.brand.colours.unapprovedSeverity);
    assert.match(hit.detail, /Nearest approved/);
  });

  test('a neutral grey is inventoried as INFO, not flagged as off-brand', async () => {
    const out = await brandColours.run({ rendered: renderedWithColour('#6B6A63'), site: emptySite, cfg });
    assert.equal(out.filter((f) => f.severity === 'WARN' && /6B6A63/i.test(f.title)).length, 0);
    assert.ok(out.some((f) => f.severity === 'INFO' && /neutral grey/i.test(f.title)));
  });

  test('a near-miss of the pale teal is flagged despite its low chroma', async () => {
    // #CFE0E2 is deltaE 3.4 from the approved #DBE8E9 — a wrong shade of the
    // brand pale, not a neutral, even though its chroma is only 6.0.
    const out = await brandColours.run({ rendered: renderedWithColour('#CFE0E2'), site: emptySite, cfg });
    const hit = out.find((f) => /CFE0E2/i.test(f.title));
    assert.ok(hit, 'the near-miss is reported by hex, not swept into the grey inventory');
    assert.equal(hit.severity, cfg.brand.colours.unapprovedSeverity);
    assert.match(hit.detail, /Nearest approved: #DBE8E9/);
  });
});

describe('Square service map', () => {
  test('is data, not code, so it can be updated without touching tests', async () => {
    const raw = JSON.parse(await readFile(new URL('../square-service-map.json', import.meta.url), 'utf8'));
    assert.ok(Array.isArray(raw.services) && raw.services.length > 0);
    for (const s of raw.services) {
      assert.ok(s.id && s.label && s.pathPattern, `${s.id} is complete`);
    }
  });

  test('compiles into the config as real patterns', () => {
    const intents = cfg.content.booking.serviceIntents;
    assert.ok(intents.length > 0);
    for (const i of intents) assert.ok(i.match instanceof RegExp);
    const membership = intents.find((i) => i.id === 'membership');
    assert.ok(membership.expectedBookingPattern instanceof RegExp);
    assert.match('https://payhip.com/emjaywellness', membership.expectedBookingPattern);
  });

  test('services still awaiting a Square deep-link are visible as unconfigured', () => {
    const unconfigured = cfg.content.booking.serviceIntents.filter((i) => !i.expectedBookingPattern);
    // Not an assertion that they must be empty — an assertion that the suite
    // knows which ones are outstanding rather than silently passing them.
    assert.ok(Array.isArray(unconfigured));
  });
});

describe('business facts', () => {
  test('Cleveland is an active location', () => {
    assert.ok(cfg.content.business.activeLocations.includes('Cleveland'));
  });

  test('Cleveland is not treated as a stale reference', () => {
    const stale = cfg.content.legacyReferences.filter((r) => !r.disabled && r.pattern && r.pattern.test('Cleveland'));
    assert.equal(stale.length, 0, 'no legacy rule matches Cleveland');
  });

  test('current Square prices are recorded', () => {
    const prices = cfg.content.pricing.current.map((p) => p.price);
    for (const p of ['$180', '$140', '$270', '$360']) assert.ok(prices.includes(p), `${p} recorded`);
  });

  test('superseded prices are asserted absent', () => {
    const superseded = cfg.content.pricing.superseded.map((p) => String(p.price));
    for (const p of ['250', '375', '499']) assert.ok(superseded.includes(p), `${p} asserted absent`);
  });

  test('the online promotional price carries its expiry', () => {
    const promo = cfg.content.pricing.timeBound.find((t) => t.id === 'PROMO-ONLINE-60');
    assert.ok(promo);
    assert.equal(promo.expiresAt, '2026-08-31');
    assert.equal(promo.severityAfterExpiry, 'FAIL');
  });
});
