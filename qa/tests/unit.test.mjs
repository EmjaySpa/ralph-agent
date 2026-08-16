import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parsePage, shingleSet, jaccard, flattenGraph, typesOf } from '../src/parse.mjs';
import { parseRobots } from '../src/http.mjs';
import { parseSitemapXml } from '../src/crawl.mjs';
import { parseColour, toHex, deltaE, contrastRatio, isLargeText, extractColourLiterals } from '../src/colour.mjs';
import { worst, statusOf } from '../src/severity.mjs';

describe('colour maths', () => {
  test('parses hex, short hex, rgb, rgba and hsl', () => {
    assert.deepEqual(parseColour('#2EA3F2'), { r: 46, g: 163, b: 242, a: 1 });
    assert.deepEqual(parseColour('#fff'), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(parseColour('rgb(46, 163, 242)'), { r: 46, g: 163, b: 242, a: 1 });
    assert.equal(parseColour('rgba(0,0,0,0.5)').a, 0.5);
    assert.deepEqual(parseColour('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
    assert.equal(parseColour('transparent'), null);
    assert.equal(parseColour('nonsense'), null);
  });

  test('round-trips to hex', () => {
    assert.equal(toHex(parseColour('rgb(46,163,242)')), '#2EA3F2');
  });

  test('deltaE separates the Divi blue from the brand-safe neighbours', () => {
    assert.ok(deltaE(parseColour('#2EA3F2'), parseColour('#2EA3F2')) === 0);
    assert.ok(deltaE(parseColour('#2EA3F2'), parseColour('#2EA4F2')) < 3, 'near-identical shades match');
    assert.ok(deltaE(parseColour('#2EA3F2'), parseColour('#C6613F')) > 30, 'clearly different colours do not');
  });

  test('WCAG contrast ratios are correct at the known anchors', () => {
    const white = parseColour('#FFFFFF');
    const black = parseColour('#000000');
    assert.equal(Math.round(contrastRatio(black, white) * 100) / 100, 21);
    assert.equal(contrastRatio(white, white), 1);
    // #767676 on white is the canonical "just passes AA" grey.
    assert.ok(contrastRatio(parseColour('#767676'), white) >= 4.5);
    assert.ok(contrastRatio(parseColour('#777777'), white) < 4.6);
  });

  test('large-text rule follows WCAG 2.1', () => {
    assert.equal(isLargeText(24, 400), true);
    assert.equal(isLargeText(19, 700), true);
    assert.equal(isLargeText(19, 400), false);
    assert.equal(isLargeText(16, 700), false);
  });

  test('extracts every colour literal from a CSS blob', () => {
    const found = extractColourLiterals('a{color:#2EA3F2}b{background:rgba(0,0,0,.4)}c{fill:hsl(200,50%,50%)}');
    assert.equal(found.length, 3);
    assert.equal(found[0].hex, '#2EA3F2');
  });
});

describe('robots.txt', () => {
  test('detects a whole-site block', () => {
    assert.equal(parseRobots('User-agent: *\nDisallow: /').blocksEverything(), true);
    assert.equal(parseRobots('User-agent: *\nDisallow: /wp-admin/').blocksEverything(), false);
    assert.equal(parseRobots('User-agent: *\nDisallow: /\nAllow: /').blocksEverything(), false);
  });

  test('longest match wins and Allow breaks ties', () => {
    const r = parseRobots('User-agent: *\nDisallow: /private/\nAllow: /private/public/');
    assert.equal(r.isAllowed('/private/secret'), false);
    assert.equal(r.isAllowed('/private/public/page'), true);
    assert.equal(r.isAllowed('/'), true);
  });

  test('collects Sitemap directives', () => {
    const r = parseRobots('Sitemap: https://example.com/sitemap.xml\nUser-agent: *\nDisallow:');
    assert.deepEqual(r.sitemaps, ['https://example.com/sitemap.xml']);
  });

  test('wildcards and end-anchors are honoured', () => {
    const r = parseRobots('User-agent: *\nDisallow: /*.pdf$');
    assert.equal(r.isAllowed('/files/report.pdf'), false);
    assert.equal(r.isAllowed('/files/report.pdf?x=1'), true);
  });
});

describe('sitemap parsing', () => {
  test('reads urlset entries with metadata', () => {
    const entries = parseSitemapXml(`<urlset>
      <url><loc>https://e.com/a</loc><lastmod>2026-01-01</lastmod><priority>0.8</priority></url>
      <url><loc>https://e.com/b?x=1&amp;y=2</loc></url>
    </urlset>`);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].lastmod, '2026-01-01');
    assert.equal(entries[1].loc, 'https://e.com/b?x=1&y=2');
  });

  test('reads a sitemap index', () => {
    const entries = parseSitemapXml('<sitemapindex><sitemap><loc>https://e.com/s1.xml</loc></sitemap></sitemapindex>');
    assert.equal(entries[0].loc, 'https://e.com/s1.xml');
  });
});

describe('page parsing', () => {
  const html = `<!doctype html><html lang="en-AU"><head>
    <title>Test Page</title>
    <meta name="description" content="A description.">
    <link rel="canonical" href="https://e.com/page/">
    <meta name="robots" content="noindex,follow">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Emjay"},{"@type":"WebSite","name":"Emjay","url":"https://e.com"}]}</script>
    <script type="application/ld+json">{bad json}</script>
  </head><body>
    <h1>Heading one</h1>
    <h2></h2>
    <h2><img src="x.png" alt="Named by image"></h2>
    <h3 aria-hidden="true">Hidden heading</h3>
    <img src="/a.jpg">
    <img src="/b.jpg" alt="">
    <img src="/c.jpg" alt="A description">
    <a href="/internal/">Internal</a>
    <a href="#frag">Fragment</a>
    <a href="https://out.example/">Out</a>
    <a href="/x/"><img src="/d.jpg" alt="Icon"></a>
    <form action="/submit" method="post">
      <label for="n">Name</label><input id="n" name="n">
      <input name="email" type="text" placeholder="Email">
      <button type="submit">Send</button>
    </form>
    <div id="frag">target</div>
  </body></html>`;

  const dom = parsePage(html, 'https://e.com/page/');

  test('extracts head metadata', () => {
    assert.equal(dom.title, 'Test Page');
    assert.equal(dom.metaDescription, 'A description.');
    assert.equal(dom.canonical, 'https://e.com/page/');
    assert.equal(dom.noindex, true);
    assert.equal(dom.lang, 'en-AU');
  });

  test('classifies headings, including image-named and hidden ones', () => {
    assert.equal(dom.h1s.length, 1);
    const empties = dom.headings.filter((h) => h.empty && !h.hidden);
    assert.equal(empties.length, 1, 'only the genuinely empty h2 counts');
    assert.equal(dom.headings.find((h) => h.level === 3).hidden, true);
  });

  test('distinguishes missing alt from decorative alt', () => {
    const missing = dom.images.filter((i) => !i.hasAltAttr);
    const decorative = dom.images.filter((i) => i.decorative);
    assert.equal(missing.length, 1);
    assert.equal(decorative.length, 1);
    assert.equal(dom.images.find((i) => i.src === '/d.jpg').insideLink, true);
  });

  test('resolves and classifies links', () => {
    const internal = dom.links.find((l) => l.href === '/internal/');
    assert.equal(internal.abs, 'https://e.com/internal/');
    assert.equal(dom.links.find((l) => l.href === '#frag').isFragmentOnly, true);
    assert.ok(dom.ids.includes('frag'));
  });

  test('reads form structure and label association', () => {
    const form = dom.forms[0];
    assert.equal(form.method, 'post');
    assert.equal(form.hasSubmit, true);
    assert.equal(form.fields.find((f) => f.id === 'n').hasLabel, true);
    assert.equal(form.fields.find((f) => f.name === 'email').hasLabel, false);
    assert.equal(form.emailFieldTyped, false);
  });

  test('flattens @graph and records invalid JSON-LD', () => {
    assert.equal(dom.jsonLd.length, 2);
    assert.deepEqual(typesOf(dom.jsonLd[0]), ['Organization']);
    assert.equal(dom.jsonLdErrors.length, 1);
  });
});

describe('duplicate detection', () => {
  test('jaccard similarity separates copies from distinct pages', () => {
    const a = shingleSet('the quick brown fox jumps over the lazy dog again and again');
    const b = shingleSet('the quick brown fox jumps over the lazy dog again and again');
    const c = shingleSet('completely different words about nervous system regulation in midlife women');
    assert.equal(jaccard(a, b), 1);
    assert.ok(jaccard(a, c) < 0.1);
  });
});

describe('severity model', () => {
  test('worst() and statusOf() escalate correctly', () => {
    assert.equal(worst('PASS', 'INFO', 'WARN'), 'WARN');
    assert.equal(worst('WARN', 'FAIL'), 'FAIL');
    assert.equal(statusOf([]), 'PASS');
    assert.equal(statusOf([{ severity: 'INFO' }, { severity: 'FAIL' }]), 'FAIL');
  });
});

describe('json-ld graph handling', () => {
  test('a bare @graph wrapper is not itself a node', () => {
    const out = flattenGraph({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Thing' }] });
    assert.equal(out.length, 1);
  });
  test('types normalise away the schema.org prefix', () => {
    assert.deepEqual(typesOf({ '@type': 'https://schema.org/LocalBusiness' }), ['LocalBusiness']);
    assert.deepEqual(typesOf({ '@type': ['Organization', 'LocalBusiness'] }), ['Organization', 'LocalBusiness']);
  });
});
