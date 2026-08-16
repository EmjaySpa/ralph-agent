/**
 * Rendered pass: loads each page in headless Chromium and collects everything
 * that only exists after CSS and JavaScript have run — console errors, computed
 * colours and fonts, contrast pairs, mobile overflow and performance timings.
 *
 * SAFETY: navigation only. No clicking, no typing, no form submission.
 */

const COLLECTOR = String.raw`
(() => {
  const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE']);
  const colourProps = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'];

  const colours = new Map();   // "hex|prop" -> {hex, prop, count, sample}
  const fonts = new Map();     // family -> {family, count, sample}
  const contrast = [];
  const overflowOffenders = [];

  const viewportWidth = window.innerWidth;
  const docWidth = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);

  function selectorFor(el) {
    if (!el || el === document.documentElement) return 'html';
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(part + '#' + node.id); break; }
      const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) part += '.' + cls.join('.');
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  function isVisible(el, style) {
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function parseRgb(v) {
    if (!v) return null;
    const m = String(v).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?\s*\)/i);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : (String(m[4]).endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a: isFinite(a) ? a : 1 };
  }

  function hexOf(c) {
    const h = (n) => Math.round(n).toString(16).padStart(2, '0');
    return ('#' + h(c.r) + h(c.g) + h(c.b)).toUpperCase();
  }

  /** Walk ancestors for the first opaque background. Returns null when a
   *  background image or gradient makes the value unmeasurable. */
  function effectiveBackground(el) {
    let node = el;
    let acc = null;
    while (node && node.nodeType === 1) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { unmeasurable: 'background-image' };
      const bg = parseRgb(s.backgroundColor);
      if (bg && bg.a > 0) {
        if (!acc) acc = bg;
        else acc = {
          r: acc.r * acc.a + bg.r * (1 - acc.a),
          g: acc.g * acc.a + bg.g * (1 - acc.a),
          b: acc.b * acc.a + bg.b * (1 - acc.a),
          a: acc.a + bg.a * (1 - acc.a),
        };
        if (acc.a >= 0.99) return { colour: { r: acc.r, g: acc.g, b: acc.b, a: 1 } };
      }
      node = node.parentElement;
    }
    // Nothing opaque found: the canvas is white by default.
    return { colour: { r: 255, g: 255, b: 255, a: 1 } };
  }

  function directText(el) {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) out += node.nodeValue;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  const all = document.querySelectorAll('*');
  const limit = Math.min(all.length, 6000);

  for (let i = 0; i < limit; i++) {
    const el = all[i];
    if (IGNORED_TAGS.has(el.tagName)) continue;
    let style;
    try { style = getComputedStyle(el); } catch (e) { continue; }
    const visible = isVisible(el, style);

    // --- colours ---
    for (const prop of colourProps) {
      const raw = style[prop];
      const c = parseRgb(raw);
      if (!c || c.a === 0) continue;
      // Skip default border colours on zero-width borders.
      if (prop.startsWith('border')) {
        const side = prop.replace('border', '').replace('Color', '');
        const width = parseFloat(style['border' + side + 'Width'] || '0');
        if (!width) continue;
      }
      const hex = hexOf(c);
      const key = hex + '|' + prop;
      const existing = colours.get(key);
      if (existing) { existing.count++; }
      else colours.set(key, { hex, prop, count: 1, sample: selectorFor(el), visible });
    }

    // --- fonts ---
    if (visible && directText(el)) {
      const family = (style.fontFamily || '').split(',')[0].replace(/["']/g, '').trim().toLowerCase();
      if (family) {
        const existing = fonts.get(family);
        if (existing) existing.count++;
        else fonts.set(family, { family, count: 1, sample: selectorFor(el), sampleText: directText(el).slice(0, 40) });
      }
    }

    // --- contrast (only elements owning their own text) ---
    if (visible && contrast.length < __MAX_CONTRAST__) {
      const text = directText(el);
      if (text && text.length > 1) {
        const fg = parseRgb(style.color);
        const bgResult = effectiveBackground(el);
        if (fg) {
          if (bgResult.unmeasurable) {
            contrast.push({
              unmeasurable: bgResult.unmeasurable,
              selector: selectorFor(el),
              text: text.slice(0, 60),
              fontSize: parseFloat(style.fontSize),
              fontWeight: style.fontWeight,
            });
          } else {
            const bg = bgResult.colour;
            const flat = fg.a < 1
              ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 }
              : fg;
            contrast.push({
              fg: hexOf(flat),
              bg: hexOf(bg),
              selector: selectorFor(el),
              text: text.slice(0, 60),
              fontSize: parseFloat(style.fontSize),
              fontWeight: style.fontWeight,
            });
          }
        }
      }
    }

    // --- horizontal overflow ---
    if (visible && overflowOffenders.length < 25) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > viewportWidth + __OVERFLOW_TOL__ || r.left < -__OVERFLOW_TOL__)) {
        overflowOffenders.push({
          selector: selectorFor(el),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
        });
      }
    }
  }

  // --- stylesheet source (same-origin rules only) ---
  let cssText = '';
  const inaccessibleSheets = [];
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      for (let i = 0; i < rules.length && cssText.length < 900000; i++) cssText += rules[i].cssText + '\n';
    } catch (e) {
      if (sheet.href) inaccessibleSheets.push(sheet.href);
    }
  }

  return {
    colours: [...colours.values()],
    fonts: [...fonts.values()],
    contrast,
    overflow: {
      viewportWidth,
      docWidth,
      overflows: docWidth > viewportWidth + __OVERFLOW_TOL__,
      offenders: overflowOffenders,
    },
    cssText,
    inaccessibleSheets,
    elementCount: all.length,
    truncated: all.length > limit,
  };
})()
`;

/** Newest chrome binary under PLAYWRIGHT_BROWSERS_PATH, if there is one. */
async function findInstalledChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) return null;
  try {
    const { readdir, access } = await import('node:fs/promises');
    const path = await import('node:path');
    const dirs = (await readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && /^chromium-\d+$/.test(d.name))
      .sort((a, b) => Number(b.name.split('-')[1]) - Number(a.name.split('-')[1]));
    for (const dir of dirs) {
      const candidate = path.join(root, dir.name, 'chrome-linux', 'chrome');
      try {
        await access(candidate);
        return candidate;
      } catch { /* try the next revision */ }
    }
  } catch { /* no browsers directory */ }
  return null;
}

export async function renderPages(urls, cfg, { onProgress = () => {} } = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    return { available: false, reason: `Playwright not installed: ${err.message}`, pages: new Map() };
  }

  let browser;
  const launchArgs = { args: ['--disable-dev-shm-usage'] };
  try {
    browser = await chromium.launch(launchArgs);
  } catch (err) {
    // A Playwright version newer than the installed browser build looks for a
    // revision directory that does not exist. Fall back to whatever Chromium
    // is actually on disk before giving up.
    const fallback = await findInstalledChromium();
    if (!fallback) {
      return {
        available: false,
        reason: `Could not launch Chromium: ${err.message.split('\n')[0]}. Run "npx playwright install chromium".`,
        pages: new Map(),
      };
    }
    try {
      browser = await chromium.launch({ ...launchArgs, executablePath: fallback });
    } catch (err2) {
      return { available: false, reason: `Could not launch Chromium (fallback ${fallback}): ${err2.message.split('\n')[0]}`, pages: new Map() };
    }
  }

  const results = new Map();
  const { mobileViewport, mobileOverflowTolerancePx, maxContrastSamplesPerPage } = cfg.thresholds;
  const collectorFor = (tol) =>
    COLLECTOR.replace(/__OVERFLOW_TOL__/g, String(tol)).replace(/__MAX_CONTRAST__/g, String(maxContrastSamplesPerPage));

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      onProgress({ index: i + 1, total: urls.length, url });
      const record = { url, desktop: null, mobile: null, console: [], pageErrors: [], failedRequests: [], perf: null, error: null };

      const context = await browser.newContext({
        userAgent: cfg.crawl.userAgent,
        viewport: { width: 1440, height: 900 },
        locale: 'en-AU',
        // Never persist anything from the live site.
        storageState: undefined,
      });

      // Install the performance observers before any page script runs.
      await context.addInitScript(() => {
        window.__qaPerf = { lcp: 0, cls: 0, longTasks: 0 };
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__qaPerf.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { /* unsupported */ }
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__qaPerf.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) { /* unsupported */ }
      });

      const page = await context.newPage();
      const requests = [];

      page.on('console', (msg) => {
        const type = msg.type();
        if (type !== 'error' && type !== 'warning') return;
        record.console.push({
          type,
          text: msg.text().slice(0, 400),
          location: msg.location()?.url || null,
        });
      });
      page.on('pageerror', (err) => {
        record.pageErrors.push({ message: String(err.message || err).slice(0, 400), stack: (err.stack || '').split('\n')[1]?.trim() || null });
      });
      page.on('requestfailed', (req) => {
        record.failedRequests.push({
          url: req.url().slice(0, 300),
          resourceType: req.resourceType(),
          failure: req.failure()?.errorText || 'unknown',
        });
      });
      page.on('response', (res) => {
        const req = res.request();
        requests.push({
          url: res.url(),
          status: res.status(),
          resourceType: req.resourceType(),
          // headers() is cheap; body size comes from content-length where present.
          size: Number(res.headers()['content-length'] || 0),
        });
      });

      try {
        const started = Date.now();
        const response = await page.goto(url, { waitUntil: 'load', timeout: cfg.crawl.timeoutMs });
        // Give lazy-loaded widgets a beat to settle, then stop waiting.
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        const loadMs = Date.now() - started;

        record.status = response?.status() ?? 0;
        record.desktop = await page.evaluate(collectorFor(mobileOverflowTolerancePx));

        const timings = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const paints = {};
          for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;
          return {
            domContentLoaded: nav.domContentLoadedEventEnd || 0,
            loadEvent: nav.loadEventEnd || 0,
            ttfb: nav.responseStart || 0,
            transferSize: nav.transferSize || 0,
            fcp: paints['first-contentful-paint'] || 0,
            lcp: (window.__qaPerf && window.__qaPerf.lcp) || 0,
            cls: (window.__qaPerf && window.__qaPerf.cls) || 0,
          };
        });

        const totalBytes = requests.reduce((sum, r) => sum + (r.size || 0), 0);
        const images = requests
          .filter((r) => r.resourceType === 'image' && r.size)
          .sort((a, b) => b.size - a.size)
          .slice(0, 5)
          .map((r) => ({ url: r.url.slice(0, 200), kb: Math.round(r.size / 1024) }));

        record.perf = {
          ...timings,
          wallMs: loadMs,
          requestCount: requests.length,
          totalKb: Math.round(totalBytes / 1024),
          largestImages: images,
          httpErrorSubresources: requests.filter((r) => r.status >= 400).map((r) => ({ url: r.url.slice(0, 200), status: r.status })),
        };

        // --- mobile pass ---
        await page.setViewportSize(mobileViewport);
        await page.waitForTimeout(400);
        record.mobile = await page.evaluate(collectorFor(mobileOverflowTolerancePx));
      } catch (err) {
        record.error = String(err.message || err).slice(0, 300);
      } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }

      results.set(url, record);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return { available: true, reason: null, pages: results };
}
