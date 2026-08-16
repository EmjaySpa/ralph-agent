import { finding } from '../severity.mjs';
import { jaccard } from '../parse.mjs';

/** Titles, meta descriptions, canonicals, indexability, heading structure. */

export const titles = {
  id: 'titles',
  title: 'Page titles (missing, duplicate, length)',
  async run({ site, cfg }) {
    const findings = [];
    const byTitle = new Map();

    for (const page of site.htmlPages()) {
      const { title, titles: allTitles } = page.dom;

      if (allTitles.length === 0) {
        findings.push(finding({
          severity: 'FAIL', title: 'Missing <title>', url: page.finalUrl,
          fix: 'Every indexable page needs a unique title.', defectId: 'EMJ-019',
        }));
        continue;
      }
      if (allTitles.length > 1) {
        findings.push(finding({
          severity: 'FAIL', title: `${allTitles.length} <title> tags on one page`,
          url: page.finalUrl, detail: allTitles.join(' | '), defectId: 'EMJ-019',
        }));
      }
      if (!title.trim()) {
        findings.push(finding({
          severity: 'FAIL', title: 'Empty <title>', url: page.finalUrl, defectId: 'EMJ-019',
        }));
        continue;
      }

      if (title.length < cfg.thresholds.titleMinLength) {
        findings.push(finding({
          severity: 'WARN', title: `Title too short (${title.length} chars)`,
          url: page.finalUrl, detail: title,
        }));
      } else if (title.length > cfg.thresholds.titleMaxLength) {
        findings.push(finding({
          severity: 'WARN', title: `Title too long (${title.length} chars, truncates in search)`,
          url: page.finalUrl, detail: title,
        }));
      }

      const key = title.trim().toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(page.finalUrl);
    }

    for (const [key, urls] of byTitle) {
      if (urls.length > 1) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Duplicate title across ${urls.length} pages`,
          url: urls[0],
          detail: `"${key}"\n    ${urls.join('\n    ')}`,
          fix: 'Give each page a distinct title reflecting its own intent.',
          defectId: 'EMJ-019',
        }));
      }
    }
    return findings;
  },
};

export const metaDescriptions = {
  id: 'meta-descriptions',
  title: 'Meta descriptions (missing, duplicate, length)',
  async run({ site, cfg }) {
    const findings = [];
    const byDesc = new Map();
    const { metaDescriptionMinLength: min, metaDescriptionMaxLength: max } = cfg.thresholds;

    for (const page of site.htmlPages()) {
      const { metaDescription, metaDescriptions: all, noindex } = page.dom;
      if (noindex) continue; // a noindex page needs no description

      if (all.length === 0 || !metaDescription) {
        findings.push(finding({
          severity: 'WARN', title: 'Missing meta description', url: page.finalUrl,
          fix: 'Write a unique description under 160 characters.', defectId: 'EMJ-020',
        }));
        continue;
      }
      if (all.length > 1) {
        findings.push(finding({
          severity: 'WARN', title: `${all.length} meta descriptions on one page`,
          url: page.finalUrl, detail: all.join(' | '), defectId: 'EMJ-020',
        }));
      }
      if (metaDescription.length < min) {
        findings.push(finding({
          severity: 'INFO', title: `Meta description short (${metaDescription.length} chars)`,
          url: page.finalUrl, detail: metaDescription,
        }));
      } else if (metaDescription.length > max) {
        findings.push(finding({
          severity: 'WARN', title: `Meta description too long (${metaDescription.length} chars)`,
          url: page.finalUrl, detail: metaDescription,
        }));
      }

      const key = metaDescription.trim().toLowerCase();
      if (!byDesc.has(key)) byDesc.set(key, []);
      byDesc.get(key).push(page.finalUrl);
    }

    for (const [key, urls] of byDesc) {
      if (urls.length > 1) {
        findings.push(finding({
          severity: 'WARN',
          title: `Duplicate meta description across ${urls.length} pages`,
          url: urls[0],
          detail: `"${key.slice(0, 120)}"\n    ${urls.join('\n    ')}`,
          defectId: 'EMJ-020',
        }));
      }
    }
    return findings;
  },
};

export const canonicals = {
  id: 'canonicals',
  title: 'Canonical tags',
  async run({ site, http, cfg }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      const { canonical, canonicals: all } = page.dom;

      if (all.length === 0) {
        findings.push(finding({
          severity: 'FAIL', title: 'Missing canonical link', url: page.finalUrl,
          fix: 'Add a self-referencing <link rel="canonical">.', defectId: 'EMJ-015',
        }));
        continue;
      }
      if (all.length > 1) {
        const distinct = new Set(all.map((c) => http.normalise(c, page.finalUrl)));
        findings.push(finding({
          severity: distinct.size > 1 ? 'FAIL' : 'WARN',
          title: `${all.length} canonical tags on one page`,
          url: page.finalUrl,
          detail: all.join(' | '),
          fix: 'Exactly one canonical per page.',
          defectId: 'EMJ-015',
        }));
      }

      const canonicalAbs = http.normalise(canonical, page.finalUrl);
      if (!canonicalAbs) {
        findings.push(finding({
          severity: 'FAIL', title: 'Canonical is not a resolvable URL',
          url: page.finalUrl, detail: canonical, defectId: 'EMJ-015',
        }));
        continue;
      }

      const self = http.normalise(page.finalUrl);
      if (canonicalAbs !== self) {
        // Canonicalising elsewhere is legitimate for paginated/filtered URLs,
        // but the target must exist and must itself be indexable.
        const target = site.pages.get(canonicalAbs);
        const severity = target && target.ok ? 'WARN' : 'FAIL';
        findings.push(finding({
          severity,
          title: 'Canonical points at a different URL',
          url: page.finalUrl,
          detail: `canonical -> ${canonicalAbs}${target ? ` (HTTP ${target.status})` : ' (not crawled / unreachable)'}`,
          fix: 'Use a self-referencing canonical unless this page is a deliberate duplicate.',
          defectId: 'EMJ-015',
        }));
        if (target?.dom?.noindex) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Canonical points at a noindex page',
            url: page.finalUrl,
            detail: `-> ${canonicalAbs}`,
            fix: 'Never canonicalise to a page excluded from the index.',
          }));
        }
      }

      if (!canonicalAbs.startsWith(cfg.site.canonicalOrigin)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Canonical uses a non-canonical origin',
          url: page.finalUrl,
          detail: `${canonicalAbs} (expected origin ${cfg.site.canonicalOrigin})`,
        }));
      }
    }
    return findings;
  },
};

export const indexability = {
  id: 'indexability',
  title: 'Index/noindex conflicts',
  async run({ site, http }) {
    const findings = [];

    for (const page of site.htmlPages()) {
      const headerRobots = (page.headers['x-robots-tag'] || '').toLowerCase();
      const metaNoindex = page.dom.noindex;
      const headerNoindex = /\bnoindex\b/.test(headerRobots);
      const metaIndexExplicit = page.dom.robotsMeta.some((m) => /\bindex\b/.test(m.content) && !/\bnoindex\b/.test(m.content));

      // 1. header and meta disagree
      if (headerNoindex !== metaNoindex && (headerNoindex || metaNoindex)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'X-Robots-Tag and meta robots disagree',
          url: page.finalUrl,
          detail: `header: "${headerRobots || '(none)'}" | meta: ${page.dom.robotsMeta.map((m) => m.content).join(', ') || '(none)'}`,
          fix: 'Declare indexability in one place only.',
        }));
      }

      // 2. contradictory directives in the same meta tag
      for (const m of page.dom.robotsMeta) {
        if (/\bnoindex\b/.test(m.content) && /(^|,\s*)index\b/.test(m.content)) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Contradictory robots directives in one tag',
            url: page.finalUrl,
            detail: `<meta name="${m.name}" content="${m.content}">`,
          }));
        }
      }

      // 3. noindex but present in the sitemap
      if ((metaNoindex || headerNoindex) && page.inSitemap) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Page is noindex but listed in the sitemap',
          url: page.finalUrl,
          detail: 'A sitemap is a request to index. This tells Google two opposite things.',
          fix: 'Remove from the sitemap, or drop the noindex.',
          defectId: 'EMJ-009',
        }));
      }

      // 4. noindex on a page that is linked from navigation
      if (metaNoindex || headerNoindex) {
        const inboundFromNav = [...(site.inbound.get(http.normalise(page.finalUrl)) || [])];
        const navLinked = inboundFromNav.some((src) => {
          const p = site.pages.get(src);
          return p?.dom?.links.some((l) => l.inNav && http.normalise(l.abs || '') === http.normalise(page.finalUrl));
        });
        if (navLinked) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Noindex page is linked from site navigation',
            url: page.finalUrl,
            detail: 'Users can reach it but search engines are told to ignore it.',
          }));
        }
      }

      // 5. robots.txt disallows a page that is also canonical/indexable
      if (!http.allowedByRobots(page.finalUrl) && !metaNoindex) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Page is blocked by robots.txt but not marked noindex',
          url: page.finalUrl,
          detail: 'Blocked pages can still be indexed URL-only, with no snippet.',
        }));
      }

      if (metaIndexExplicit && page.dom.robotsMeta.length > 1) {
        findings.push(finding({
          severity: 'INFO',
          title: 'Multiple robots meta tags',
          url: page.finalUrl,
          detail: page.dom.robotsMeta.map((m) => `${m.name}="${m.content}"`).join(' | '),
        }));
      }
    }

    if (site.robots?.blocksEverything()) {
      findings.push(finding({
        severity: 'FAIL',
        title: 'robots.txt disallows the entire site',
        url: new URL('/robots.txt', site.pages.keys().next().value || '/').toString(),
        detail: 'Disallow: / with no offsetting Allow.',
        fix: 'Remove the site-wide Disallow before going live.',
        defectId: 'EMJ-008',
      }));
    }

    return findings;
  },
};

export const headingStructure = {
  id: 'headings',
  title: 'H1/H2 structure and empty headings',
  async run({ site }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      const { headings, h1s, h2s } = page.dom;

      if (h1s.length === 0) {
        findings.push(finding({
          severity: 'FAIL', title: 'No H1 on page', url: page.finalUrl,
          fix: 'Exactly one H1 describing the page.', defectId: 'EMJ-011',
        }));
      } else if (h1s.length > 1) {
        findings.push(finding({
          severity: 'FAIL',
          title: `${h1s.length} H1 tags on one page`,
          url: page.finalUrl,
          detail: h1s.map((h) => `"${h.text || '(empty)'}"`).join(' | '),
          defectId: 'EMJ-011',
        }));
      }

      const empties = headings.filter((h) => h.empty && !h.hidden);
      for (const h of empties) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Empty H${h.level}`,
          url: page.finalUrl,
          detail: 'Heading element renders with no accessible text.',
          fix: 'Add text, or use a non-heading element for the spacing/divider.',
          defectId: 'EMJ-012',
        }));
      }

      // Skipped levels break screen-reader navigation.
      const visible = headings.filter((h) => !h.hidden && !h.empty);
      let previous = 0;
      for (const h of visible) {
        if (previous && h.level > previous + 1) {
          findings.push(finding({
            severity: 'WARN',
            title: `Heading level skips H${previous} -> H${h.level}`,
            url: page.finalUrl,
            detail: `"${h.text.slice(0, 80)}"`,
            fix: 'Headings should descend one level at a time.',
          }));
        }
        previous = h.level;
      }

      if (h1s.length === 1 && h2s.length === 0 && page.dom.mainWordCount > 300) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Long page with no H2 subheadings',
          url: page.finalUrl,
          detail: `${page.dom.mainWordCount} words, H1 only.`,
          fix: 'Break the page into scannable sections.',
        }));
      }

      // A heading that duplicates the title verbatim on every page is a theme
      // default rather than real structure.
      if (h1s.length === 1 && page.dom.title && h1s[0].text && h1s[0].text.length < 4) {
        findings.push(finding({
          severity: 'WARN',
          title: 'H1 is suspiciously short',
          url: page.finalUrl,
          detail: `"${h1s[0].text}"`,
        }));
      }
    }
    return findings;
  },
};

export const duplicateAndThin = {
  id: 'duplicate-thin',
  title: 'Duplicate and thin pages',
  async run({ site, cfg }) {
    const findings = [];
    const { thinContentWords, thinContentWordsFail, nearDuplicateSimilarity } = cfg.thresholds;
    const pages = site.htmlPages().filter((p) => !p.dom.noindex);
    const archivePatterns = cfg.content?.archivePatterns || [];
    const isArchive = (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      return archivePatterns.some((re) => re.test(path));
    };

    for (const page of pages) {
      const words = page.dom.mainWordCount;
      const archive = isArchive(page.finalUrl);
      if (words < thinContentWordsFail) {
        findings.push(finding({
          severity: archive ? 'INFO' : 'FAIL',
          title: `Very thin page (${words} words of main content)${archive ? ' — archive/pagination surface' : ''}`,
          url: page.finalUrl,
          fix: archive
            ? 'Expected for an archive. Worth reviewing whether it should be indexed at all.'
            : 'Expand, merge into a stronger page, or noindex it.',
        }));
      } else if (words < thinContentWords) {
        findings.push(finding({
          severity: archive ? 'INFO' : 'WARN',
          title: `Thin page (${words} words of main content)${archive ? ' — archive/pagination surface' : ''}`,
          url: page.finalUrl,
        }));
      }
    }

    for (let i = 0; i < pages.length; i++) {
      for (let j = i + 1; j < pages.length; j++) {
        const a = pages[i], b = pages[j];
        if (!a.dom.shingles.size || !b.dom.shingles.size) continue;
        const sim = jaccard(a.dom.shingles, b.dom.shingles);
        if (sim >= nearDuplicateSimilarity) {
          // Two archive surfaces listing the same posts are duplicates by
          // construction, not a content defect.
          const bothArchives = isArchive(a.finalUrl) && isArchive(b.finalUrl);
          findings.push(finding({
            severity: bothArchives ? 'INFO' : sim >= 0.98 ? 'FAIL' : 'WARN',
            title: `Near-duplicate content (${(sim * 100).toFixed(0)}% similar)${bothArchives ? ' — both archive surfaces' : ''}`,
            url: a.finalUrl,
            detail: `Duplicate of ${b.finalUrl}`,
            fix: bothArchives
              ? 'Expected between archives. Review indexation rather than copy.'
              : 'Merge, differentiate, or canonicalise one to the other.',
          }));
        }
      }
    }
    return findings;
  },
};

export default [titles, metaDescriptions, canonicals, indexability, headingStructure, duplicateAndThin];
