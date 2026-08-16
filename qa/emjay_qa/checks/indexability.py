"""index/noindex conflicts across meta robots, X-Robots-Tag, robots.txt and
the sitemap."""
from __future__ import annotations

from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


def _robots_directives(page) -> str:
    return f"{page.meta_robots} {page.x_robots_tag}".lower()


@check("seo.noindex_present", "Live pages are indexable", "Indexability")
def noindex_present(site: Site) -> Iterable[Finding]:
    """Any noindex on a crawlable page. Legitimate on thank-you pages, so it is
    reported for review rather than assumed wrong."""
    for page in site.html_pages():
        directives = _robots_directives(page)
        if "noindex" in directives:
            yield finding(
                "seo.noindex_present",
                Severity.WARNING,
                "Page is set to noindex",
                url=page.url,
                detail=f"meta robots: {page.meta_robots or '-'} | X-Robots-Tag: {page.x_robots_tag or '-'}",
            )


@check("seo.noindex_sitemap_conflict", "No noindex page in the sitemap", "Indexability")
def noindex_sitemap_conflict(site: Site) -> Iterable[Finding]:
    """A URL cannot be both submitted for indexing and marked noindex."""
    sitemap_ids = {site.config.identity(u) for u in site.sitemap_urls}
    for page in site.html_pages():
        if "noindex" not in _robots_directives(page):
            continue
        if site.config.identity(page.url) in sitemap_ids:
            yield finding(
                "seo.noindex_sitemap_conflict",
                Severity.FAIL,
                "Page is noindex but listed in the sitemap",
                url=page.url,
                detail=f"meta robots: {page.meta_robots or '-'} | X-Robots-Tag: {page.x_robots_tag or '-'}",
            )


@check("seo.noindex_canonical_conflict", "noindex and canonical do not conflict", "Indexability")
def noindex_canonical_conflict(site: Site) -> Iterable[Finding]:
    """A page marked noindex that other pages canonicalise to destroys those
    pages' indexing too."""
    noindex_ids = {
        site.config.identity(page.url)
        for page in site.html_pages()
        if "noindex" in _robots_directives(page)
    }
    for page in site.html_pages():
        if not page.canonical or "noindex" in _robots_directives(page):
            continue
        if site.config.identity(page.canonical) in noindex_ids:
            yield finding(
                "seo.noindex_canonical_conflict",
                Severity.FAIL,
                "Page canonicalises to a noindex URL",
                url=page.url,
                detail=f"canonical: {page.canonical}",
            )


@check("seo.robots_header_meta_conflict", "Header and meta robots agree", "Indexability")
def robots_header_meta_conflict(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        meta = (page.meta_robots or "").lower()
        header = (page.x_robots_tag or "").lower()
        if not meta or not header:
            continue
        meta_noindex = "noindex" in meta
        header_noindex = "noindex" in header
        if meta_noindex != header_noindex:
            yield finding(
                "seo.robots_header_meta_conflict",
                Severity.FAIL,
                "meta robots and X-Robots-Tag disagree about indexing",
                url=page.url,
                detail=f"meta: {page.meta_robots} | header: {page.x_robots_tag}",
            )


@check("seo.robots_txt", "robots.txt is present and sane", "Indexability")
def robots_txt(site: Site) -> Iterable[Finding]:
    robots = site.robots
    if robots.status is None:
        yield finding(
            "seo.robots_txt",
            Severity.WARNING,
            "robots.txt could not be fetched",
            url=robots.url,
            detail=robots.error or "no response",
        )
        return
    if robots.status == 404:
        yield finding(
            "seo.robots_txt",
            Severity.WARNING,
            "No robots.txt (404)",
            url=robots.url,
        )
        return
    if robots.status >= 400:
        yield finding(
            "seo.robots_txt",
            Severity.FAIL,
            f"robots.txt returns HTTP {robots.status}",
            url=robots.url,
        )
        return
    if robots.disallow_all:
        yield finding(
            "seo.robots_txt",
            Severity.FAIL,
            "robots.txt blocks crawling of the home page",
            url=robots.url,
            detail=robots.text[:300],
        )
    if not robots.sitemaps:
        yield finding(
            "seo.robots_txt",
            Severity.WARNING,
            "robots.txt does not declare a Sitemap:",
            url=robots.url,
        )


@check("seo.robots_blocked_but_linked", "Linked pages are crawlable", "Indexability")
def robots_blocked_but_linked(site: Site) -> Iterable[Finding]:
    """Internally linked URLs that robots.txt disallows."""
    for url, reason in sorted(site.skipped.items()):
        if reason != "disallowed by robots.txt":
            continue
        sources = [
            page.url
            for page in site.pages.values()
            for link in page.links
            if link.element == "a" and link.resolved_url == url
        ]
        if sources:
            yield finding(
                "seo.robots_blocked_but_linked",
                Severity.WARNING,
                "Internally linked page is disallowed in robots.txt",
                url=url,
                detail="; ".join(sorted(set(sources))[:5]),
            )
