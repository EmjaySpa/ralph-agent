"""Performance indicators measurable from a crawl.

These are indicative signals, not a Lighthouse score: response time, page
weight, request count, image weight, caching and compression headers, and
layout-shift risk from images without dimensions.
"""
from __future__ import annotations

from typing import Iterable, Set

from ..models import Finding, Severity, Site
from . import check, finding

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg")


def _page_assets(site: Site, page) -> Set[str]:
    assets = set(page.stylesheet_urls) | set(page.script_urls)
    assets |= {img.resolved_src for img in page.images if img.resolved_src}
    return assets


@check("perf.slow_response", "Pages respond quickly", "Performance")
def slow_response(site: Site) -> Iterable[Finding]:
    slow = float(site.config.threshold("slow_response_ms", 1500))
    very_slow = float(site.config.threshold("very_slow_response_ms", 3000))
    for page in site.html_pages():
        elapsed = page.fetch.elapsed_ms
        if elapsed >= very_slow:
            yield finding(
                "perf.slow_response",
                Severity.FAIL,
                f"HTML took {elapsed / 1000:.1f}s to arrive",
                url=page.url,
                detail=f"threshold {very_slow / 1000:.1f}s",
                elapsed_ms=round(elapsed),
            )
        elif elapsed >= slow:
            yield finding(
                "perf.slow_response",
                Severity.WARNING,
                f"HTML took {elapsed / 1000:.1f}s to arrive",
                url=page.url,
                detail=f"threshold {slow / 1000:.1f}s",
                elapsed_ms=round(elapsed),
            )


@check("perf.page_weight", "Pages are not overweight", "Performance")
def page_weight(site: Site) -> Iterable[Finding]:
    limit_kb = float(site.config.threshold("max_page_weight_kb", 3000))
    for page in site.html_pages():
        total = page.fetch.bytes
        for url in _page_assets(site, page):
            asset = site.assets.get(url)
            if asset:
                total += asset.bytes or 0
        kb = total / 1024.0
        if kb > limit_kb:
            yield finding(
                "perf.page_weight",
                Severity.WARNING,
                f"Page weighs {kb / 1024:.1f}MB (limit {limit_kb / 1024:.1f}MB)",
                url=page.url,
                detail="HTML plus stylesheets, scripts and images referenced in the markup",
                kb=round(kb),
            )


@check("perf.request_count", "Pages do not request too much", "Performance")
def request_count(site: Site) -> Iterable[Finding]:
    limit = int(site.config.threshold("max_requests", 90))
    for page in site.html_pages():
        count = len(_page_assets(site, page)) + 1
        if count > limit:
            yield finding(
                "perf.request_count",
                Severity.WARNING,
                f"{count} static requests referenced in the markup (limit {limit})",
                url=page.url,
                detail=f"{len(page.stylesheet_urls)} CSS, {len(page.script_urls)} JS, {len(page.images)} images",
            )


@check("perf.large_image", "Images are not oversized", "Performance")
def large_image(site: Site) -> Iterable[Finding]:
    limit_kb = float(site.config.threshold("max_image_kb", 400))
    for url, asset in sorted(site.assets.items()):
        if not url.lower().split("?")[0].endswith(IMAGE_EXTENSIONS):
            continue
        kb = (asset.bytes or 0) / 1024.0
        if kb > limit_kb:
            pages = sorted({p.url for p in site.html_pages() if url in _page_assets(site, p)})
            yield finding(
                "perf.large_image",
                Severity.WARNING,
                f"Image is {kb:.0f}KB (limit {limit_kb:.0f}KB)",
                url=url,
                detail=f"used on: {', '.join(pages[:4]) or 'unknown'}",
                kb=round(kb),
            )


@check("perf.image_dimensions", "Images declare dimensions", "Performance")
def image_dimensions(site: Site) -> Iterable[Finding]:
    """Missing width/height causes layout shift while the page loads."""
    for page in site.html_pages():
        missing = [img for img in page.images if img.src and (not img.width_attr or not img.height_attr)]
        if missing:
            yield finding(
                "perf.image_dimensions",
                Severity.WARNING,
                f"{len(missing)} image(s) without width/height attributes",
                url=page.url,
                detail="; ".join(img.src[:70] for img in missing[:5]),
            )


@check("perf.caching_headers", "Static assets are cacheable", "Performance")
def caching_headers(site: Site) -> Iterable[Finding]:
    uncacheable = []
    for url, asset in sorted(site.assets.items()):
        if not asset.ok:
            continue
        cache_control = asset.headers.get("cache-control", "")
        if not cache_control or "no-store" in cache_control or "max-age=0" in cache_control:
            uncacheable.append(url)
    if uncacheable:
        yield finding(
            "perf.caching_headers",
            Severity.WARNING,
            f"{len(uncacheable)} static asset(s) served without caching headers",
            detail="; ".join(uncacheable[:6]),
        )


@check("perf.compression", "Text assets are compressed", "Performance")
def compression(site: Site) -> Iterable[Finding]:
    uncompressed = []
    for url, asset in sorted(list(site.assets.items()) + [(p.url, p.fetch) for p in site.html_pages()]):
        if not asset or not asset.ok:
            continue
        content_type = (asset.content_type or "").lower()
        if not any(kind in content_type for kind in ("html", "css", "javascript", "json", "xml", "svg")):
            continue
        encoding = asset.headers.get("content-encoding", "")
        if not encoding and (asset.bytes or 0) > 2048:
            uncompressed.append(f"{url} ({(asset.bytes or 0) // 1024}KB)")
    if uncompressed:
        yield finding(
            "perf.compression",
            Severity.WARNING,
            f"{len(uncompressed)} text asset(s) served without gzip/brotli",
            detail="; ".join(uncompressed[:6]),
        )


@check("perf.runtime_timings", "Browser load timings are reasonable", "Performance", requires_browser=True)
def runtime_timings(site: Site) -> Iterable[Finding]:
    if not site.runtime:
        return
    very_slow = float(site.config.threshold("very_slow_response_ms", 3000))
    for url, runtime in sorted(site.runtime.items()):
        if not runtime.ok:
            continue
        load = runtime.timings.get("loadEventEnd", 0)
        dcl = runtime.timings.get("domContentLoaded", 0)
        if load and load > very_slow * 2:
            yield finding(
                "perf.runtime_timings",
                Severity.WARNING,
                f"Full load took {load / 1000:.1f}s in the browser",
                url=url,
                detail=(
                    f"DOMContentLoaded {dcl / 1000:.1f}s, {runtime.resource_count} resources, "
                    f"{runtime.transfer_bytes / 1024 / 1024:.1f}MB transferred"
                ),
            )
