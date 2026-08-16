"""Site structure: orphan pages, click depth, internal linking."""
from __future__ import annotations

from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


@check("structure.orphan_page", "No orphan pages", "Structure & Linking")
def orphan_page(site: Site) -> Iterable[Finding]:
    """A live page with no inbound internal link cannot be found by a reader
    or crawled properly. Sitemap-only pages are the classic case."""
    inbound = site.inbound_links()
    home = site.config.identity(site.config.base_url + "/")
    for page in site.html_pages():
        if site.config.identity(page.url) == home:
            continue
        if site.consolidated_to(page.url):
            continue  # its inbound links belong to the canonical URL
        sources = inbound.get(page.url, set())
        if sources:
            continue
        in_sitemap = site.config.identity(page.url) in {site.config.identity(u) for u in site.sitemap_urls}
        yield finding(
            "structure.orphan_page",
            Severity.FAIL if in_sitemap else Severity.WARNING,
            "Page has no inbound internal links",
            url=page.url,
            detail=("listed in the sitemap but not linked from anywhere" if in_sitemap else "discovered but unlinked"),
            in_sitemap=in_sitemap,
        )


@check("structure.click_depth", "Pages are reachable within a few clicks", "Structure & Linking")
def click_depth(site: Site) -> Iterable[Finding]:
    limit = int(site.config.threshold("max_click_depth", 4))
    for page in site.html_pages():
        if page.depth > limit:
            yield finding(
                "structure.click_depth",
                Severity.WARNING,
                f"Page is {page.depth} clicks from the home page (limit {limit})",
                url=page.url,
                detail=f"first found via {page.discovered_from}",
            )


@check("structure.few_internal_links", "Pages link onward", "Structure & Linking")
def few_internal_links(site: Site) -> Iterable[Finding]:
    """Content pages whose only internal links are the shared menu."""
    minimum = int(site.config.threshold("min_internal_links_out", 3))
    for page in site.html_pages():
        body_links = {
            link.resolved_url
            for link in page.links
            if link.element == "a" and link.is_internal and not link.in_nav
        }
        body_links.discard(page.url)
        if len(body_links) < minimum:
            yield finding(
                "structure.few_internal_links",
                Severity.WARNING,
                f"Only {len(body_links)} in-content internal link(s) (target {minimum})",
                url=page.url,
                detail="navigation and footer links are excluded from this count",
            )


@check("structure.few_inbound_links", "Pages are linked to", "Structure & Linking")
def few_inbound_links(site: Site) -> Iterable[Finding]:
    minimum = int(site.config.threshold("min_internal_links_in", 1))
    inbound = site.inbound_links()
    home = site.config.identity(site.config.base_url + "/")
    for page in site.html_pages():
        if site.config.identity(page.url) == home:
            continue
        count = len(inbound.get(page.url, set()))
        if 0 < count < minimum:
            yield finding(
                "structure.few_inbound_links",
                Severity.WARNING,
                f"Only {count} inbound internal link(s) (target {minimum})",
                url=page.url,
            )


@check("structure.link_to_non_canonical", "Internal links use canonical URLs", "Structure & Linking")
def link_to_non_canonical(site: Site) -> Iterable[Finding]:
    """Links to a URL whose canonical is a different address."""
    for page in site.html_pages():
        for link in page.links:
            if link.element != "a" or not link.is_internal:
                continue
            target = site.pages.get(link.resolved_url)
            if target is None or not target.canonical:
                continue
            if site.config.identity(target.canonical) != site.config.identity(target.url):
                yield finding(
                    "structure.link_to_non_canonical",
                    Severity.WARNING,
                    "Internal link targets a non-canonical URL",
                    url=page.url,
                    detail=f"{link.resolved_url} canonicalises to {target.canonical}",
                )


@check("structure.dead_end", "Pages are not dead ends", "Structure & Linking")
def dead_end(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        internal = [link for link in page.links if link.element == "a" and link.is_internal]
        if not internal:
            yield finding(
                "structure.dead_end",
                Severity.FAIL,
                "Page has no internal links at all",
                url=page.url,
                detail="a reader who lands here cannot go anywhere else on the site",
            )
