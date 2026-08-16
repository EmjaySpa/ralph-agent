"""Headless-browser probe.

Answers the questions static HTML cannot: what actually renders, what the
console says, what colours and fonts the browser computes, whether anything
overflows a phone viewport, and what the real contrast ratios are.

Navigation only. The probe never clicks, types or submits.
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional

from .config import Config
from .models import RuntimeResult

# Collected in the page: computed styles, overflow offenders and contrast.
# Kept as one script so a page is measured in a single evaluation.
PROBE_JS = r"""
(() => {
  const cssPath = (el) => {
    if (!el || !el.tagName) return '?';
    const parts = [];
    let node = el;
    let hops = 0;
    while (node && node.nodeType === 1 && hops < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) { part += '#' + node.id; parts.unshift(part); break; }
      const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) part += '.' + cls.join('.');
      parts.unshift(part);
      node = node.parentElement;
      hops += 1;
    }
    return parts.join(' > ');
  };

  const toHex = (value) => {
    const m = String(value).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a === 0) return null;
    const hex = '#' + [1, 2, 3].map(i => parseInt(m[i], 10).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex, alpha: a, rgb: [1, 2, 3].map(i => parseInt(m[i], 10)) };
  };

  const luminance = (rgb) => {
    const c = rgb.map(v => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };

  const ratio = (a, b) => {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const blend = (fg, bg, alpha) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

  const effectiveBackground = (el) => {
    // Walk up until an opaque background colour is found. Bail out when an
    // image or gradient is involved: contrast is then not measurable.
    let node = el;
    let acc = null;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return { unmeasurable: 'background-image' };
      const parsed = toHex(style.backgroundColor);
      if (parsed) {
        if (parsed.alpha >= 0.999) {
          return { rgb: acc ? blend(acc.rgb, parsed.rgb, acc.alpha) : parsed.rgb, hex: parsed.hex };
        }
        acc = acc || parsed;
      }
      node = node.parentElement;
    }
    return { rgb: [255, 255, 255], hex: '#FFFFFF' };
  };

  const colours = {};
  const fonts = {};
  const contrastIssues = [];
  let contrastSamples = 0;

  const NORMAL = %CONTRAST_NORMAL%;
  const LARGE = %CONTRAST_LARGE%;

  const elements = Array.from(document.querySelectorAll('body *')).slice(0, 4000);
  for (const el of elements) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) continue;

    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'fill']) {
      const parsed = toHex(style[prop]);
      if (!parsed) continue;
      if (prop !== 'color' && parsed.alpha < 0.05) continue;
      (colours[parsed.hex] = colours[parsed.hex] || []);
      if (colours[parsed.hex].length < 5) colours[parsed.hex].push(cssPath(el) + ' {' + prop + '}');
    }

    const family = (style.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    if (family) {
      (fonts[family] = fonts[family] || []);
      if (fonts[family].length < 5) fonts[family].push(cssPath(el));
    }

    // Contrast is only meaningful for elements that hold their own text.
    const ownText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .join(' ')
      .trim();
    if (!ownText || ownText.length < 2) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const fg = toHex(style.color);
    if (!fg) continue;
    const bg = effectiveBackground(el);
    if (bg.unmeasurable) continue;
    contrastSamples += 1;

    const fgRgb = fg.alpha >= 0.999 ? fg.rgb : blend(fg.rgb, bg.rgb, fg.alpha);
    const size = parseFloat(style.fontSize) || 16;
    const weight = parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? LARGE : NORMAL;
    const value = ratio(fgRgb, bg.rgb);
    if (value + 0.005 < required) {
      contrastIssues.push({
        selector: cssPath(el),
        ratio: Math.round(value * 100) / 100,
        required,
        color: fg.hex,
        background: bg.hex,
        fontSize: size,
        fontWeight: weight,
        sample: ownText.slice(0, 80)
      });
    }
  }

  const doc = document.documentElement;
  // With mobile emulation Chromium widens window.innerWidth to fit overflowing
  // content, so clientWidth is the honest device width to compare against.
  const viewportWidth = doc.clientWidth || window.innerWidth;
  const overflowElements = [];
  const scrollWidth = Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0);
  if (scrollWidth > viewportWidth + 1) {
    for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 4000)) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.position === 'fixed') continue;
      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        overflowElements.push({
          selector: cssPath(el),
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          overflow: Math.round(Math.max(rect.right - viewportWidth, -rect.left))
        });
      }
    }
  }

  const nav = performance.getEntriesByType('navigation')[0] || {};
  const resources = performance.getEntriesByType('resource') || [];
  return {
    colours,
    fonts,
    contrastIssues: contrastIssues.slice(0, 60),
    contrastSamples,
    overflowPx: Math.max(0, scrollWidth - viewportWidth),
    overflowElements: overflowElements.slice(0, 25),
    timings: {
      domContentLoaded: nav.domContentLoadedEventEnd || 0,
      loadEventEnd: nav.loadEventEnd || 0,
      responseEnd: nav.responseEnd || 0
    },
    resourceCount: resources.length,
    transferBytes: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
  };
})()
"""


class BrowserProbe:
    """Thin wrapper around Playwright. Import errors are surfaced as a note
    rather than an exception so a static-only run still completes."""

    def __init__(self, config: Config):
        self.config = config
        self.available = False
        self.error = ""
        self._playwright = None
        self._browser = None

    def __enter__(self) -> "BrowserProbe":
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            self.error = f"playwright not installed: {exc}"
            return self
        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(args=["--no-sandbox"])
            self.available = True
        except Exception as exc:
            self.error = f"could not launch chromium: {type(exc).__name__}: {exc}"
        return self

    def __exit__(self, *exc_info) -> None:
        try:
            if self._browser:
                self._browser.close()
            if self._playwright:
                self._playwright.stop()
        except Exception:  # pragma: no cover - teardown best effort
            pass

    def probe(self, url: str) -> RuntimeResult:
        result = RuntimeResult(url=url)
        if not self.available:
            result.error = self.error or "browser unavailable"
            return result

        width, height = self.config.threshold("mobile_viewport", [390, 844])
        ignorable = [re.compile(p, re.IGNORECASE) for p in (self.config.get("runtime.ignorable_console_patterns", []) or [])]

        context = self._browser.new_context(
            viewport={"width": int(width), "height": int(height)},
            user_agent=self.config.get("crawl.user_agent"),
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page = context.new_page()

        def on_console(message) -> None:
            if message.type not in ("error", "warning"):
                return
            text = message.text
            entry = {
                "type": message.type,
                "text": text[:400],
                "ignorable": any(pattern.search(text) for pattern in ignorable),
                "location": str(getattr(message, "location", "") or ""),
            }
            result.console_errors.append(entry)

        def on_page_error(error) -> None:
            result.page_errors.append(str(error)[:400])

        def on_response(response) -> None:
            if response.status >= 400:
                result.failed_requests.append(
                    {"url": response.url, "status": response.status, "type": response.request.resource_type}
                )

        def on_request_failed(request) -> None:
            result.failed_requests.append(
                {"url": request.url, "status": None, "type": request.resource_type,
                 "error": (request.failure or "")}
            )

        page.on("console", on_console)
        page.on("pageerror", on_page_error)
        page.on("response", on_response)
        page.on("requestfailed", on_request_failed)

        try:
            page.goto(url, wait_until="load", timeout=int(self.config.get("crawl.timeout_seconds", 25)) * 1000)
            page.wait_for_timeout(1200)  # let lazy-loaded modules settle
            script = (
                PROBE_JS.replace("%CONTRAST_NORMAL%", str(self.config.threshold("contrast_normal_text", 4.5)))
                .replace("%CONTRAST_LARGE%", str(self.config.threshold("contrast_large_text", 3.0)))
            )
            data = page.evaluate(script)
            result.computed_colours = data.get("colours", {}) or {}
            result.computed_fonts = data.get("fonts", {}) or {}
            result.contrast_issues = data.get("contrastIssues", []) or []
            result.contrast_samples = int(data.get("contrastSamples", 0) or 0)
            result.overflow_px = float(data.get("overflowPx", 0) or 0)
            result.overflow_elements = data.get("overflowElements", []) or []
            result.timings = data.get("timings", {}) or {}
            result.resource_count = int(data.get("resourceCount", 0) or 0)
            result.transfer_bytes = int(data.get("transferBytes", 0) or 0)
            result.ok = True
        except Exception as exc:
            result.error = f"{type(exc).__name__}: {exc}"
        finally:
            context.close()
        return result


def probe_site(site, log=lambda _msg: None) -> None:
    """Fill site.runtime for a sample of crawled pages."""
    config = site.config
    if not config.get("runtime.enabled", True):
        site.notes.append("browser layer disabled by configuration")
        return

    limit = int(config.get("runtime.max_pages", 40) or 0)
    candidates: List[str] = [p.url for p in site.html_pages()]
    # Home page first, then shortest paths: the pages readers actually land on.
    candidates.sort(key=lambda u: (len(config.path_of(u)), u))
    if limit:
        candidates = candidates[:limit]

    with BrowserProbe(config) as probe:
        if not probe.available:
            site.notes.append(f"browser layer unavailable: {probe.error}")
            return
        site.browser_used = True
        for url in candidates:
            log(f"  browser: {url}")
            site.runtime[url] = probe.probe(url)
