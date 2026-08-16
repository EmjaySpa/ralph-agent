import { finding } from '../severity.mjs';
import { parseColour, deltaE, chroma, contrastRatio, isLargeText, extractColourLiterals, toHex } from '../colour.mjs';

/** Checks that consume the Playwright render pass. */

function guard(rendered, id) {
  if (rendered.available) return null;
  return [finding({
    severity: 'WARN',
    title: 'Rendered checks did not run',
    url: null,
    detail: rendered.reason || 'Browser pass unavailable.',
    fix: 'Install Playwright browsers, or run without --no-render on a machine that has them.',
  })];
}

export const consoleErrors = {
  id: 'console-errors',
  title: 'JavaScript console errors',
  async run({ rendered }) {
    const skipped = guard(rendered, 'console-errors');
    if (skipped) return skipped;

    const findings = [];
    for (const [url, rec] of rendered.pages) {
      if (rec.error) {
        findings.push(finding({
          severity: 'FAIL', title: 'Page failed to render', url, detail: rec.error, defectId: 'EMJ-013',
        }));
        continue;
      }
      for (const err of rec.pageErrors) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Uncaught JavaScript error',
          url,
          detail: `${err.message}${err.stack ? `\n    at ${err.stack}` : ''}`,
          defectId: 'EMJ-013',
        }));
      }
      const errors = rec.console.filter((c) => c.type === 'error');
      const warnings = rec.console.filter((c) => c.type === 'warning');
      for (const c of dedupe(errors)) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Console error',
          url,
          detail: `${c.text}${c.location ? `\n    from ${c.location}` : ''}`,
          defectId: 'EMJ-013',
        }));
      }
      for (const c of dedupe(warnings).slice(0, 5)) {
        findings.push(finding({ severity: 'INFO', title: 'Console warning', url, detail: c.text }));
      }
      for (const req of dedupe(rec.failedRequests, (r) => r.url)) {
        findings.push(finding({
          severity: req.resourceType === 'image' || req.resourceType === 'script' || req.resourceType === 'stylesheet' ? 'FAIL' : 'WARN',
          title: `Failed ${req.resourceType} request (${req.failure})`,
          url,
          detail: req.url,
        }));
      }
      for (const sub of rec.perf?.httpErrorSubresources || []) {
        findings.push(finding({
          severity: 'FAIL',
          title: `Subresource returned HTTP ${sub.status}`,
          url,
          detail: sub.url,
        }));
      }
    }
    return findings;
  },
};

export const brandColours = {
  id: 'brand-colours',
  title: 'Rogue and unapproved colours',
  async run({ rendered, site, cfg }) {
    const findings = [];
    const { mode, approved, banned, tolerance, ignore } = cfg.brand.colours;
    const bannedTolerance = cfg.brand.colours.bannedTolerance ?? tolerance;
    const unapprovedSeverity = cfg.brand.colours.unapprovedSeverity || 'WARN';
    const neutralChromaThreshold = cfg.brand.colours.neutralChromaThreshold ?? 0;
    const nearBrandDeltaE = cfg.brand.colours.nearBrandDeltaE ?? 0;
    const ignoreHexes = new Set(ignore.map((c) => (toHex(parseColour(c)) || String(c).toUpperCase())));
    // Approved entries may be a bare hex string or {hex, role}.
    const approvedColours = approved
      .map((c) => (typeof c === 'string' ? { hex: c, role: null } : c))
      .map((c) => ({ raw: c.hex, role: c.role || null, parsed: parseColour(c.hex) }))
      .filter((c) => c.parsed);

    if (mode === 'allowlist' && !approvedColours.length) {
      findings.push(finding({
        severity: 'WARN',
        title: 'Colour allowlist mode is on but no approved palette is configured',
        url: cfg.site.baseUrl,
        fix: 'Populate brand.colours.approved, or switch mode back to "blocklist".',
      }));
    }

    // --- 1. banned colours in raw HTML/CSS source (runs with or without a browser) ---
    for (const page of site.htmlPages()) {
      const sources = [{ label: 'HTML source', text: page.html }];
      for (const block of page.dom.inlineStyleBlocks) sources.push({ label: 'inline <style>', text: block });
      for (const src of sources) {
        for (const literal of extractColourLiterals(src.text)) {
          const hit = matchBanned(literal.colour, banned, bannedTolerance);
          if (hit) {
            findings.push(finding({
              severity: hit.severity,
              title: `Unapproved colour ${hit.hex} (${hit.label}) in ${src.label}`,
              url: page.finalUrl,
              detail: `Found as "${literal.raw}"`,
              fix: 'Replace with the approved brand palette value.',
              defectId: hit.hex.toUpperCase() === '#2EA3F2' ? 'EMJ-002' : null,
            }));
            break; // one finding per source blob is enough to fail the build
          }
        }
      }
    }

    if (!rendered.available) {
      findings.push(finding({
        severity: 'WARN',
        title: 'Computed-style colour audit did not run',
        url: null,
        detail: rendered.reason || 'Browser pass unavailable; only raw source was scanned.',
      }));
      return findings;
    }

    // --- 2. computed styles ---
    const siteWideUnapproved = new Map();

    for (const [url, rec] of rendered.pages) {
      const collected = rec.desktop || rec.mobile;
      if (!collected) continue;

      for (const entry of collected.colours) {
        const parsed = parseColour(entry.hex);
        if (!parsed || ignoreHexes.has(entry.hex.toUpperCase())) continue;

        const hit = matchBanned(parsed, banned, bannedTolerance);
        if (hit) {
          findings.push(finding({
            severity: hit.severity,
            title: `Rogue colour ${entry.hex} (${hit.label}) rendered on page`,
            url,
            detail: `${entry.prop} on ${entry.sample} (${entry.count} element${entry.count === 1 ? '' : 's'})`,
            fix: 'Replace with the approved brand palette value.',
            defectId: entry.hex.toUpperCase() === '#2EA3F2' ? 'EMJ-001' : null,
          }));
          continue;
        }

        const nearest = approvedColours.length
          ? approvedColours.reduce(
              (best, c) => {
                const d = deltaE(parsed, c.parsed);
                return d < best.distance ? { distance: d, raw: c.raw, role: c.role } : best;
              },
              { distance: Infinity, raw: null, role: null },
            )
          : null;

        if (nearest && nearest.distance <= tolerance) continue; // on palette

        const key = entry.hex.toUpperCase();
        const acc = siteWideUnapproved.get(key) || {
          hex: key,
          count: 0,
          pages: new Set(),
          sample: entry.sample,
          prop: entry.prop,
          nearest,
          // Greyscale is not a brand decision, so greys are inventoried rather
          // than flagged — unless the colour sits close to an approved brand
          // colour, in which case it is a near-miss of the palette and matters
          // however low its chroma is.
          neutral:
            chroma(parsed) < neutralChromaThreshold &&
            !(nearest && nearest.distance <= nearBrandDeltaE),
        };
        acc.count += entry.count;
        acc.pages.add(url);
        siteWideUnapproved.set(key, acc);
      }

      // Banned colours hiding in stylesheet text that no element currently uses.
      if (collected.cssText) {
        const seen = new Set();
        for (const literal of extractColourLiterals(collected.cssText)) {
          const hit = matchBanned(literal.colour, banned, bannedTolerance);
          if (hit && !seen.has(hit.hex)) {
            seen.add(hit.hex);
            findings.push(finding({
              severity: hit.severity === 'FAIL' ? 'WARN' : 'INFO',
              title: `Unapproved colour ${hit.hex} (${hit.label}) present in loaded CSS`,
              url,
              detail: `Declared as "${literal.raw}". Not necessarily rendered, but it is one theme change away from appearing.`,
              fix: 'Remove the declaration from the stylesheet or child theme.',
            }));
          }
        }
      }
    }

    const enforcing = mode === 'allowlist' && approvedColours.length > 0;
    const ranked = [...siteWideUnapproved.values()].sort((a, b) => b.count - a.count);
    const brandColoursOff = ranked.filter((e) => !e.neutral);
    const neutrals = ranked.filter((e) => e.neutral);

    for (const entry of brandColoursOff.slice(0, enforcing ? 40 : 25)) {
      const nearest = entry.nearest?.raw
        ? `\n    Nearest approved: ${entry.nearest.raw}${entry.nearest.role ? ` (${entry.nearest.role})` : ''}, deltaE ${entry.nearest.distance.toFixed(1)}`
        : '';
      findings.push(finding({
        severity: enforcing ? unapprovedSeverity : 'INFO',
        title: enforcing
          ? `Colour ${entry.hex} is not in the approved palette`
          : `Colour in use: ${entry.hex}`,
        url: [...entry.pages][0],
        detail: `${entry.count} usage(s) across ${entry.pages.size} page(s), e.g. ${entry.prop} on ${entry.sample}${nearest}`,
        fix: enforcing
          ? 'Map to the nearest approved brand colour.'
          : 'Review this inventory, then fill brand.colours.approved and switch mode to "allowlist".',
      }));
    }

    // Greys are reported as an inventory, not as brand defects.
    if (enforcing && neutrals.length) {
      const total = neutrals.reduce((sum, e) => sum + e.count, 0);
      findings.push(finding({
        severity: 'INFO',
        title: `${neutrals.length} neutral grey/near-black colours in use (${total} usages)`,
        url: [...neutrals[0].pages][0],
        detail: neutrals.slice(0, 15).map((e) => `${e.hex} (${e.count})`).join(', '),
        fix: 'Greyscale is outside the brand palette by design. Set brand.colours.neutralChromaThreshold to 0 to enforce the allowlist across greys too.',
      }));
    }

    return findings;
  },
};

export const brandFonts = {
  id: 'brand-fonts',
  title: 'Unapproved fonts',
  async run({ rendered, cfg }) {
    const skipped = guard(rendered, 'brand-fonts');
    if (skipped) return skipped;

    const findings = [];
    const { mode, approved, banned, ignore } = cfg.brand.fonts;
    // Font remediation may be deliberately parked, in which case an unapproved
    // family is a WARNING rather than a blocker. Driven entirely by config.
    const unapprovedSeverity = cfg.brand.fonts.unapprovedSeverity || 'WARN';
    const maxDistinctFamilies = cfg.brand.fonts.maxDistinctFamilies ?? 4;
    const approvedSet = new Set(approved.map((f) => f.toLowerCase()));
    const ignoreSet = new Set(ignore.map((f) => f.toLowerCase()));
    const inventory = new Map();

    if (mode === 'allowlist' && !approvedSet.size) {
      findings.push(finding({
        severity: 'WARN',
        title: 'Font allowlist mode is on but no approved families are configured',
        url: cfg.site.baseUrl,
        fix: 'Populate brand.fonts.approved, or switch mode back to "blocklist".',
      }));
    }

    for (const [url, rec] of rendered.pages) {
      const collected = rec.desktop;
      if (!collected) continue;
      for (const f of collected.fonts) {
        const family = f.family.toLowerCase();
        if (ignoreSet.has(family)) continue;

        const bannedHit = banned.find((b) => b.family.toLowerCase() === family);
        if (bannedHit) {
          findings.push(finding({
            severity: bannedHit.severity,
            title: `Unapproved font "${f.family}" (${bannedHit.label})`,
            url,
            detail: `${f.count} element(s), e.g. ${f.sample} — "${f.sampleText}"`,
            fix: 'Apply the brand typeface to this element.',
          }));
          continue;
        }

        const acc = inventory.get(family) || { family, count: 0, pages: new Set(), sample: f.sample, sampleText: f.sampleText };
        acc.count += f.count;
        acc.pages.add(url);
        inventory.set(family, acc);
      }
    }

    const enforcing = mode === 'allowlist' && approvedSet.size > 0;
    for (const entry of [...inventory.values()].sort((a, b) => b.count - a.count)) {
      const isApproved = approvedSet.has(entry.family);
      if (enforcing && !isApproved) {
        findings.push(finding({
          severity: unapprovedSeverity,
          title: `Font "${entry.family}" is not in the approved set`,
          url: [...entry.pages][0],
          detail: `${entry.count} element(s) across ${entry.pages.size} page(s), e.g. ${entry.sample}`,
          fix: unapprovedSeverity === 'WARN'
            ? 'Font migration is parked in config (brand.fonts.unapprovedSeverity). Raise to FAIL once the migration is authorised.'
            : 'Apply an approved brand typeface.',
        }));
      } else if (!enforcing) {
        findings.push(finding({
          severity: 'INFO',
          title: `Font in use: ${entry.family}`,
          url: [...entry.pages][0],
          detail: `${entry.count} element(s) across ${entry.pages.size} page(s), e.g. "${entry.sampleText}"`,
          fix: 'Review, then fill brand.fonts.approved and switch mode to "allowlist".',
        }));
      }
    }

    // More than a handful of distinct families is itself a design signal.
    if (inventory.size > maxDistinctFamilies) {
      findings.push(finding({
        severity: unapprovedSeverity === 'FAIL' ? 'WARN' : 'INFO',
        title: `${inventory.size} distinct font families rendered across the site`,
        url: cfg.site.baseUrl,
        detail: [...inventory.keys()].join(', '),
        fix: `Ceiling is brand.fonts.maxDistinctFamilies (${maxDistinctFamilies}), raised while old and new typefaces coexist during migration.`,
      }));
    }

    return findings;
  },
};

export const colourContrast = {
  id: 'contrast',
  title: 'Colour contrast (WCAG 2.1 AA)',
  async run({ rendered, cfg }) {
    const skipped = guard(rendered, 'contrast');
    if (skipped) return skipped;

    const findings = [];
    const { contrastNormalText, contrastLargeText } = cfg.thresholds;
    const seen = new Set();
    let unmeasurable = 0;

    for (const [url, rec] of rendered.pages) {
      const collected = rec.desktop;
      if (!collected) continue;
      for (const sample of collected.contrast) {
        if (sample.unmeasurable) { unmeasurable++; continue; }
        const fg = parseColour(sample.fg);
        const bg = parseColour(sample.bg);
        const ratio = contrastRatio(fg, bg);
        if (ratio === null) continue;

        const large = isLargeText(sample.fontSize, sample.fontWeight);
        const required = large ? contrastLargeText : contrastNormalText;
        if (ratio >= required) continue;

        const key = `${url}|${sample.fg}|${sample.bg}|${large}`;
        if (seen.has(key)) continue;
        seen.add(key);

        findings.push(finding({
          severity: ratio < required * 0.75 ? 'FAIL' : 'WARN',
          title: `Contrast ${ratio.toFixed(2)}:1 below AA minimum ${required}:1`,
          url,
          detail: `${sample.fg} on ${sample.bg} at ${sample.fontSize}px/${sample.fontWeight} — ${sample.selector}\n    "${sample.text}"`,
          fix: 'Darken the text or lighten the background until the ratio clears the minimum.',
        }));
      }
    }

    if (unmeasurable) {
      findings.push(finding({
        severity: 'INFO',
        title: `${unmeasurable} text samples sit on background images or gradients`,
        url: null,
        detail: 'Contrast is not technically measurable for these. Check them by eye.',
      }));
    }

    return findings;
  },
};

export const mobileOverflow = {
  id: 'mobile-overflow',
  title: 'Mobile horizontal overflow',
  async run({ rendered, cfg }) {
    const skipped = guard(rendered, 'mobile-overflow');
    if (skipped) return skipped;

    const findings = [];
    const { width } = cfg.thresholds.mobileViewport;

    for (const [url, rec] of rendered.pages) {
      const m = rec.mobile;
      if (!m) continue;
      if (!m.overflow.overflows) continue;

      const offenders = m.overflow.offenders
        .sort((a, b) => b.right - a.right)
        .slice(0, 5)
        .map((o) => `${o.selector} (right edge ${o.right}px, width ${o.width}px)${o.text ? ` — "${o.text}"` : ''}`)
        .join('\n    ');

      findings.push(finding({
        severity: 'FAIL',
        title: `Page scrolls sideways at ${width}px (content ${m.overflow.docWidth}px)`,
        url,
        detail: offenders || '(no single offending element isolated — check for a fixed-width container)',
        fix: 'Constrain the offending element with max-width:100% or a responsive rule.',
        defectId: 'EMJ-014',
      }));
    }
    return findings;
  },
};

export const performance = {
  id: 'performance',
  title: 'Page performance',
  async run({ rendered, cfg }) {
    const skipped = guard(rendered, 'performance');
    if (skipped) return skipped;

    const findings = [];
    const t = cfg.thresholds;

    for (const [url, rec] of rendered.pages) {
      const p = rec.perf;
      if (!p) continue;

      if (p.lcp >= t.lcpFailMs) {
        findings.push(finding({
          severity: 'FAIL', title: `LCP ${Math.round(p.lcp)}ms (budget ${t.lcpWarnMs}ms)`, url,
          detail: `TTFB ${Math.round(p.ttfb)}ms, FCP ${Math.round(p.fcp)}ms, ${p.requestCount} requests, ${p.totalKb}KB`,
          fix: 'Compress the hero image, defer non-critical JS, enable caching.',
        }));
      } else if (p.lcp >= t.lcpWarnMs) {
        findings.push(finding({
          severity: 'WARN', title: `LCP ${Math.round(p.lcp)}ms over budget (${t.lcpWarnMs}ms)`, url,
          detail: `TTFB ${Math.round(p.ttfb)}ms, FCP ${Math.round(p.fcp)}ms`,
        }));
      }

      if (p.cls >= t.clsFail) {
        findings.push(finding({
          severity: 'FAIL', title: `Cumulative Layout Shift ${p.cls.toFixed(3)} (budget ${t.clsWarn})`, url,
          fix: 'Set explicit width/height on images and reserve space for late-loading embeds.',
        }));
      } else if (p.cls >= t.clsWarn) {
        findings.push(finding({
          severity: 'WARN', title: `Cumulative Layout Shift ${p.cls.toFixed(3)} over budget`, url,
        }));
      }

      if (p.totalKb >= t.totalTransferFailKb) {
        findings.push(finding({
          severity: 'FAIL', title: `Page weight ${p.totalKb}KB (budget ${t.totalTransferWarnKb}KB)`, url,
          detail: p.largestImages.map((i) => `${i.kb}KB ${i.url}`).join('\n    '),
        }));
      } else if (p.totalKb >= t.totalTransferWarnKb) {
        findings.push(finding({
          severity: 'WARN', title: `Page weight ${p.totalKb}KB over budget`, url,
          detail: p.largestImages.map((i) => `${i.kb}KB ${i.url}`).join('\n    '),
        }));
      }

      if (p.requestCount >= t.maxRequestsWarn) {
        findings.push(finding({
          severity: 'WARN', title: `${p.requestCount} HTTP requests on one page`, url,
          fix: 'Audit plugins. Each one adds requests to every page.',
        }));
      }

      for (const img of p.largestImages) {
        if (img.kb >= t.singleImageWarnKb) {
          findings.push(finding({
            severity: 'WARN', title: `Oversized image ${img.kb}KB`, url, detail: img.url,
            fix: 'Resize to display dimensions and serve WebP.',
          }));
        }
      }

      if (p.domContentLoaded >= t.domContentLoadedWarnMs) {
        findings.push(finding({
          severity: 'WARN', title: `DOMContentLoaded ${Math.round(p.domContentLoaded)}ms`, url,
        }));
      }
    }
    return findings;
  },
};

function matchBanned(colour, banned, tolerance) {
  for (const b of banned) {
    const parsed = parseColour(b.hex);
    if (!parsed) continue;
    if (deltaE(colour, parsed) <= tolerance) {
      return { hex: b.hex.toUpperCase(), label: b.label, severity: b.severity };
    }
  }
  return null;
}

function dedupe(items, keyFn = (i) => i.text || i.message || JSON.stringify(i)) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export default [consoleErrors, brandColours, brandFonts, colourContrast, mobileOverflow, performance];
