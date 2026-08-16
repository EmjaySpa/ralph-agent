"""XML sitemap health and coverage."""
from __future__ import annotations

from typing import Iterable
from urllib.parse import urlparse

from ..models import Finding, Severity, Site
from . import check, finding


@check("sitemap.available", "A parseable sitemap exists", "Sitemap")
def sitemap_available(site: Site) -> Iterable[Finding]:
    live = [s for s in site.sitemaps if s.status and 200 <= s.status < 300 and not s.error]
    if not live:
        tried = ", ".join(s.url for s in site.sitemaps) or "none"
        yield finding(
            "sitemap.available",
            Severity.FAIL,
            "No usable XML sitemap found",
            detail=f"tried: {tried}",
        )
        return
    if not site.sitemap_urls:
        yield finding(
            "sitemap.available",
            Severity.FAIL,
            "Sitemap exists but contains no URLs",
            url=live[0].url,
        )


@check("sitemap.parse_errors", "Sitemaps are valid XML", "Sitemap")
def sitemap_parse_errors(site: Site) -> Iterable[Finding]:
    for info in site.sitemaps:
        if info.error:
            yield finding(
                "sitemap.parse_errors",
                Severity.FAIL,
                "Sitemap could not be parsed",
                url=info.url,
                detail=info.error,
            )
        elif info.status is not None and info.status >= 400 and info.status != 404:
            yield finding(
                "sitemap.parse_errors",
                Severity.FAIL,
                f"Sitemap returns HTTP {info.status}",
                url=info.url,
            )


@check("sitemap.entry_health", "Sitemap entries return 200", "Sitemap")
def sitemap_entry_health(site: Site) -> Iterable[Finding]:
    """Every submitted URL must be live and final: no 404s, no redirects."""
    for url in sorted(site.sitemap_urls):
        page = site.pages.get(url)
        fetch = page.fetch if page else site.fetches.get(url)
        if fetch is None:
            continue
        if fetch.status is None:
            yield finding(
                "sitemap.entry_health",
                Severity.FAIL,
                "Sitemap URL did not respond",
                url=url,
                detail=fetch.error,
            )
        elif fetch.status >= 400:
            yield finding(
                "sitemap.entry_health",
                Severity.FAIL,
                f"Sitemap URL returns HTTP {fetch.status}",
                url=url,
            )
        elif fetch.hops > 0:
            yield finding(
                "sitemap.entry_health",
                Severity.WARNING,
                "Sitemap URL redirects",
                url=url,
                detail=f"-> {fetch.final_url}",
            )


@check("sitemap.offsite_entries", "Sitemap lists only this site", "Sitemap")
def sitemap_offsite_entries(site: Site) -> Iterable[Finding]:
    for url in sorted(site.sitemap_urls):
        if not site.config.is_internal(url):
            yield finding(
                "sitemap.offsite_entries",
                Severity.FAIL,
                "Sitemap lists a URL on another domain",
                url=url,
                detail=f"host: {urlparse(url).netloc}",
            )


@check("sitemap.coverage", "Indexable pages are in the sitemap", "Sitemap")
def sitemap_coverage(site: Site) -> Iterable[Finding]:
    """Indexable, canonical, linked pages that the sitemap omits."""
    if not site.sitemap_urls:
        return
    sitemap_ids = {site.config.identity(u) for u in site.sitemap_urls}
    for page in site.html_pages():
        directives = f"{page.meta_robots} {page.x_robots_tag}".lower()
        if "noindex" in directives:
            continue
        if page.canonical and site.config.identity(page.canonical) != site.config.identity(page.url):
            continue  # deliberately non-canonical, not expected in the sitemap
        if site.config.identity(page.url) in sitemap_ids:
            continue
        yield finding(
            "sitemap.coverage",
            Severity.WARNING,
            "Indexable page is missing from the sitemap",
            url=page.url,
            detail=f"discovered at depth {page.depth}",
        )


@check("sitemap.declared_in_robots", "robots.txt points at the sitemap", "Sitemap")
def sitemap_declared_in_robots(site: Site) -> Iterable[Finding]:
    if not site.sitemaps:
        return
    live = [s.url for s in site.sitemaps if s.status and 200 <= s.status < 300]
    if not live:
        return
    declared = {site.config.identity(u) for u in site.robots.sitemaps}
    if declared and not declared.intersection({site.config.identity(u) for u in live}):
        yield finding(
            "sitemap.declared_in_robots",
            Severity.WARNING,
            "robots.txt declares a sitemap that does not match the live one",
            detail=f"declared: {', '.join(site.robots.sitemaps)} | live: {', '.join(live)}",
        )
