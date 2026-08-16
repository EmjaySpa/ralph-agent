/**
 * HTML -> page model. Pure and dependency-light so the self-tests can exercise
 * every extractor against fixtures without touching the network.
 */
import * as cheerio from 'cheerio';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

// Elements whose text is not page copy.
const NON_CONTENT = 'script, style, noscript, template, svg, iframe';

export function parsePage(html, pageUrl) {
  const $ = cheerio.load(html || '');

  const titles = $('head title').toArray().map((el) => $(el).text().trim());
  const metaDescriptions = $('meta[name="description" i]')
    .toArray()
    .map((el) => ($(el).attr('content') || '').trim());
  const canonicals = $('link[rel="canonical" i]')
    .toArray()
    .map((el) => ($(el).attr('href') || '').trim())
    .filter(Boolean);

  const robotsMeta = $('meta[name="robots" i], meta[name="googlebot" i]')
    .toArray()
    .map((el) => ({
      name: ($(el).attr('name') || '').toLowerCase(),
      content: ($(el).attr('content') || '').toLowerCase(),
    }));

  const headings = $(HEADING_SELECTOR)
    .toArray()
    .map((el) => {
      const $el = $(el);
      const text = $el.text().replace(/\s+/g, ' ').trim();
      const hasImageWithAlt = $el.find('img[alt]').toArray().some((img) => ($(img).attr('alt') || '').trim());
      return {
        level: Number(el.tagName.slice(1)),
        text,
        // A heading holding only an image with alt text is not "empty".
        empty: text.length === 0 && !hasImageWithAlt,
        hidden: isProbablyHidden($, el),
      };
    });

  const images = $('img')
    .toArray()
    .map((el) => {
      const $el = $(el);
      const alt = $el.attr('alt');
      return {
        src: $el.attr('src') || $el.attr('data-src') || $el.attr('data-lazy-src') || '',
        srcset: $el.attr('srcset') || '',
        alt: alt === undefined ? null : alt,
        hasAltAttr: alt !== undefined,
        altText: (alt || '').trim(),
        width: $el.attr('width') || null,
        height: $el.attr('height') || null,
        loading: $el.attr('loading') || null,
        // Decorative images legitimately carry alt="".
        decorative: alt !== undefined && alt.trim() === '',
        // An image inside a link with no other text needs alt text to be usable.
        insideLink: $el.parents('a').length > 0,
        role: $el.attr('role') || null,
        ariaHidden: $el.attr('aria-hidden') === 'true',
      };
    });

  const links = $('a[href]')
    .toArray()
    .map((el) => {
      const $el = $(el);
      const href = ($el.attr('href') || '').trim();
      const rel = ($el.attr('rel') || '').toLowerCase();
      let abs = null;
      try {
        abs = new URL(href, pageUrl).toString();
      } catch {
        abs = null;
      }
      const text = $el.text().replace(/\s+/g, ' ').trim();
      return {
        href,
        abs,
        text,
        rel,
        nofollow: /\bnofollow\b/.test(rel),
        target: $el.attr('target') || null,
        ariaLabel: $el.attr('aria-label') || null,
        title: $el.attr('title') || null,
        // Accessible name may come from a nested image's alt.
        imgAlt: $el.find('img[alt]').first().attr('alt') || null,
        isFragmentOnly: href.startsWith('#'),
        isMailto: /^mailto:/i.test(href),
        isTel: /^tel:/i.test(href),
        inNav: $el.parents('nav, header').length > 0,
        inFooter: $el.parents('footer').length > 0,
      };
    });

  const { jsonLd, jsonLdErrors } = extractJsonLd($);

  const forms = $('form')
    .toArray()
    .map((el) => parseForm($, el, pageUrl));

  const $body = $('body').clone();
  $body.find(NON_CONTENT).remove();
  const text = $body.text().replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/) : [];

  // Main-content text is a better thin-page signal than whole-body text,
  // because chrome (nav/footer) is identical on every page.
  const $main = $('main, [role="main"], article, .entry-content, #content').first().clone();
  $main.find(NON_CONTENT).remove();
  const mainText = $main.length ? $main.text().replace(/\s+/g, ' ').trim() : '';
  const mainWords = mainText ? mainText.split(/\s+/) : [];

  return {
    url: pageUrl,
    lang: $('html').attr('lang') || null,
    titles,
    title: titles[0] ?? null,
    metaDescriptions,
    metaDescription: metaDescriptions[0] ?? null,
    canonicals,
    canonical: canonicals[0] ?? null,
    robotsMeta,
    noindex: robotsMeta.some((m) => /\bnoindex\b/.test(m.content)),
    nofollowPage: robotsMeta.some((m) => /\bnofollow\b/.test(m.content)),
    viewportMeta: $('meta[name="viewport" i]').attr('content') || null,
    hreflang: $('link[rel="alternate" i][hreflang]')
      .toArray()
      .map((el) => ({ hreflang: $(el).attr('hreflang'), href: $(el).attr('href') })),
    headings,
    h1s: headings.filter((h) => h.level === 1),
    h2s: headings.filter((h) => h.level === 2),
    images,
    links,
    jsonLd,
    jsonLdErrors,
    forms,
    ids: $('[id]').toArray().map((el) => $(el).attr('id')),
    text,
    wordCount: words.length,
    mainText,
    mainWordCount: $main.length ? mainWords.length : words.length,
    shingles: shingleSet(mainText || text),
    inlineStyleBlocks: $('style').toArray().map((el) => $(el).text()),
    stylesheetHrefs: $('link[rel="stylesheet" i][href]')
      .toArray()
      .map((el) => {
        try { return new URL($(el).attr('href'), pageUrl).toString(); } catch { return null; }
      })
      .filter(Boolean),
  };
}

function isProbablyHidden($, el) {
  const $el = $(el);
  if ($el.attr('aria-hidden') === 'true' || $el.attr('hidden') !== undefined) return true;
  const style = ($el.attr('style') || '').toLowerCase();
  if (/display\s*:\s*none|visibility\s*:\s*hidden/.test(style)) return true;
  return $el.parents('[hidden], [aria-hidden="true"]').length > 0;
}

function parseForm($, el, pageUrl) {
  const $form = $(el);
  const fields = $form
    .find('input, textarea, select')
    .toArray()
    .map((f) => {
      const $f = $(f);
      const type = ($f.attr('type') || (f.tagName === 'input' ? 'text' : f.tagName)).toLowerCase();
      const id = $f.attr('id') || null;
      const name = $f.attr('name') || null;
      const labelByFor = id ? $form.find(`label[for="${cssEscape(id)}"]`).length > 0 : false;
      const wrappedInLabel = $f.parents('label').length > 0;
      return {
        tag: f.tagName.toLowerCase(),
        type,
        name,
        id,
        required: $f.attr('required') !== undefined || $f.attr('aria-required') === 'true',
        placeholder: $f.attr('placeholder') || null,
        autocomplete: $f.attr('autocomplete') || null,
        hasLabel: labelByFor || wrappedInLabel || !!$f.attr('aria-label') || !!$f.attr('aria-labelledby'),
        hidden: type === 'hidden',
      };
    });

  const action = $form.attr('action') || '';
  let actionAbs = null;
  try {
    actionAbs = action ? new URL(action, pageUrl).toString() : pageUrl;
  } catch {
    actionAbs = null;
  }

  return {
    id: $form.attr('id') || null,
    name: $form.attr('name') || null,
    action,
    actionAbs,
    method: ($form.attr('method') || 'get').toLowerCase(),
    fields,
    visibleFields: fields.filter((f) => !f.hidden),
    hasSubmit:
      $form.find('button[type="submit"], input[type="submit"], button:not([type])').length > 0,
    isSearch: /search/i.test($form.attr('class') || '') || fields.some((f) => f.type === 'search' || f.name === 's'),
    hasEmailField: fields.some((f) => f.type === 'email' || /e-?mail/i.test(f.name || '')),
    emailFieldTyped: fields.some((f) => f.type === 'email'),
  };
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

export function extractJsonLd($) {
  const jsonLd = [];
  const jsonLdErrors = [];
  $('script[type="application/ld+json" i]').each((i, el) => {
    const raw = $(el).text().trim();
    if (!raw) {
      jsonLdErrors.push({ index: i, error: 'empty ld+json block' });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      for (const node of flattenGraph(parsed)) jsonLd.push(node);
    } catch (err) {
      jsonLdErrors.push({ index: i, error: `invalid JSON: ${err.message}`, snippet: raw.slice(0, 160) });
    }
  });
  return { jsonLd, jsonLdErrors };
}

/** Expand @graph / arrays into a flat list of typed nodes. */
export function flattenGraph(node, out = []) {
  if (Array.isArray(node)) {
    for (const n of node) flattenGraph(n, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node['@graph'])) {
    for (const n of node['@graph']) flattenGraph(n, out);
    // A wrapper carrying only @context/@graph is not itself a typed node.
    const otherKeys = Object.keys(node).filter((k) => k !== '@graph' && k !== '@context');
    if (otherKeys.length === 0) return out;
  }
  out.push(node);
  return out;
}

export function typesOf(node) {
  const t = node?.['@type'];
  if (!t) return [];
  return (Array.isArray(t) ? t : [t]).map((x) => String(x).replace(/^https?:\/\/schema\.org\//i, ''));
}

/** 5-word shingles, used for near-duplicate detection. */
export function shingleSet(text, size = 5) {
  const words = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + size <= words.length; i++) {
    set.add(words.slice(i, i + size).join(' '));
  }
  return set;
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const s of small) if (large.has(s)) intersection++;
  return intersection / (a.size + b.size - intersection);
}
