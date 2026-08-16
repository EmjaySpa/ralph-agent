"""Broken links, HTTP errors, mixed content, in-page anchors."""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Set
from urllib.parse import urlparse

from ..models import Finding, Severity, Site
from ..parse import anchor_targets
from . import check, finding

BOT_BLOCK_STATUSES = {401, 403, 405, 406, 429, 503}


def _link_sources(site: Site, target: str) -> List[str]:
    sources = []
    for page in site.pages.values():
        for link in page.links:
            if link.resolved_url == target and link.element == "a":
                sources.append(page.url)
                break
    return sorted(set(sources))


@check("links.internal_broken", "Internal links resolve", "Links & HTTP")
def internal_broken(site: Site) -> Iterable[Finding]:
    """Every internal <a> target must return 2xx (after redirects)."""
    seen: Set[str] = set()
    for page in site.pages.values():
        for link in page.links:
            if not link.is_internal or link.element != "a":
                continue
            target = link.resolved_url
            if target in seen:
                continue
            result = site.fetches.get(target) or site.pages.get(target, None)
            fetch = result.fetch if hasattr(result, "fetch") else result
            if fetch is None:
                continue
            if fetch.error and fetch.status is None:
                seen.add(target)
                yield finding(
                    "links.internal_broken",
                    Severity.FAIL,
                    "Internal link could not be fetched",
                    url=target,
                    detail=fetch.error,
                    linked_from=_link_sources(site, target)[:10],
                )
            elif fetch.status is not None and fetch.status >= 400:
                seen.add(target)
                yield finding(
                    "links.internal_broken",
                    Severity.FAIL,
                    f"Internal link returns HTTP {fetch.status}",
                    url=target,
                    detail=f"anchor text: {link.anchor_text[:80]!r}",
                    status=fetch.status,
                    linked_from=_link_sources(site, target)[:10],
                )


@check("links.external_broken", "External links resolve", "Links & HTTP")
def external_broken(site: Site) -> Iterable[Finding]:
    """Off-site links must not 404. Bot-blocking statuses are downgraded."""
    for url, fetch in sorted(site.external.items()):
        if fetch.status is None:
            yield finding(
                "links.external_broken",
                Severity.WARNING,
                "External link unreachable from the test runner",
                url=url,
                detail=fetch.error or "no response",
                linked_from=_link_sources(site, url)[:5],
            )
            continue
        if fetch.status < 400:
            continue
        owned = site.config.is_owned_external(url)
        if fetch.status in BOT_BLOCK_STATUSES and not owned:
            yield finding(
                "links.external_broken",
                Severity.WARNING,
                f"External link returns HTTP {fetch.status} (often bot protection, verify by hand)",
                url=url,
                status=fetch.status,
                linked_from=_link_sources(site, url)[:5],
            )
        else:
            yield finding(
                "links.external_broken",
                Severity.FAIL,
                f"External link returns HTTP {fetch.status}",
                url=url,
                detail="owned destination (booking/shop)" if owned else "",
                status=fetch.status,
                linked_from=_link_sources(site, url)[:5],
            )


@check("links.mixed_content", "No insecure http:// references", "Links & HTTP")
def mixed_content(site: Site) -> Iterable[Finding]:
    """An https page must not reference http:// assets or link targets."""
    for page in site.html_pages():
        if not page.url.startswith("https://"):
            continue
        offenders = [
            link for link in page.links if link.resolved_url.startswith("http://") and link.element != "a"
        ]
        insecure_anchors = [link for link in page.links if link.resolved_url.startswith("http://") and link.element == "a"]
        if offenders:
            yield finding(
                "links.mixed_content",
                Severity.FAIL,
                f"{len(offenders)} insecure asset reference(s) on an HTTPS page",
                url=page.url,
                detail="; ".join(f"{o.element}: {o.resolved_url}" for o in offenders[:5]),
            )
        if insecure_anchors:
            yield finding(
                "links.mixed_content",
                Severity.WARNING,
                f"{len(insecure_anchors)} link(s) point at http:// URLs",
                url=page.url,
                detail="; ".join(o.resolved_url for o in insecure_anchors[:5]),
            )


@check("links.anchor_target_missing", "In-page anchors exist", "Links & HTTP")
def anchor_target_missing(site: Site) -> Iterable[Finding]:
    """A link to #section must find that id on the destination page."""
    cache: Dict[str, Set[str]] = {}
    for page in site.html_pages():
        for link in page.links:
            if link.element != "a" or not link.fragment or not link.is_internal:
                continue
            if link.fragment.lower() in {"top", "content", "main"} and link.fragment not in page.element_ids:
                pass  # still checked below, these are just common skip-link targets
            target_page = site.pages.get(link.resolved_url)
            if target_page is None or not target_page.html:
                continue
            if link.resolved_url not in cache:
                cache[link.resolved_url] = anchor_targets(target_page.html)
            if link.fragment not in cache[link.resolved_url]:
                yield finding(
                    "links.anchor_target_missing",
                    Severity.WARNING,
                    f"Link to #{link.fragment} has no matching element",
                    url=page.url,
                    detail=f"target page: {link.resolved_url}",
                    anchor_text=link.anchor_text[:80],
                )


@check("links.empty_or_placeholder", "No placeholder links", "Links & HTTP")
def empty_or_placeholder(site: Site) -> Iterable[Finding]:
    """href="#", href="" and localhost/staging URLs are unfinished links."""
    staging = re.compile(r"(localhost|127\.0\.0\.1|\.local\b|staging|\.test\b|example\.com|wp-content/uploads/sites)", re.I)
    for page in site.html_pages():
        placeholders = [link for link in page.links if link.element == "a" and link.raw_href.strip() in {"#", ""}]
        if placeholders:
            yield finding(
                "links.empty_or_placeholder",
                Severity.WARNING,
                f"{len(placeholders)} placeholder link(s) (href='#' or empty)",
                url=page.url,
                detail="; ".join(f"{p.anchor_text[:40]!r}" for p in placeholders[:5]),
            )
        # A local/staging host is only a leak when it is not the host under
        # test: a staging run legitimately lives on one of these addresses.
        leaks = [
            link
            for link in page.links
            if staging.search(link.resolved_url) and not site.config.is_internal(link.resolved_url)
        ]
        if leaks:
            yield finding(
                "links.empty_or_placeholder",
                Severity.FAIL,
                f"{len(leaks)} link(s) point at a local, staging or example host",
                url=page.url,
                detail="; ".join(sorted({link.resolved_url for link in leaks})[:5]),
            )


@check("links.contact_scheme", "mailto: and tel: links are well formed", "Links & HTTP")
def contact_scheme(site: Site) -> Iterable[Finding]:
    """A malformed mailto:/tel: link silently loses enquiries."""
    email_re = re.compile(r"^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}", re.I)
    tel_re = re.compile(r"^tel:\+?[0-9 ()\-]{6,}$", re.I)
    for page in site.html_pages():
        for link in page.links:
            href = link.raw_href.strip()
            lowered = href.lower()
            if lowered.startswith("mailto:") and not email_re.match(href):
                yield finding(
                    "links.contact_scheme",
                    Severity.FAIL,
                    "Malformed mailto: link",
                    url=page.url,
                    detail=href[:120],
                )
            elif lowered.startswith("tel:") and not tel_re.match(href):
                yield finding(
                    "links.contact_scheme",
                    Severity.WARNING,
                    "Malformed tel: link",
                    url=page.url,
                    detail=href[:120],
                )


@check("links.page_http_error", "Crawled pages return 2xx", "Links & HTTP")
def page_http_error(site: Site) -> Iterable[Finding]:
    """Any crawled URL that answered with an error status or no response."""
    for url, page in sorted(site.pages.items()):
        fetch = page.fetch
        if fetch is None:
            continue
        if fetch.status is None:
            yield finding(
                "links.page_http_error",
                Severity.FAIL,
                "Page did not respond",
                url=url,
                detail=fetch.error,
                discovered_from=page.discovered_from,
            )
        elif fetch.status >= 400:
            yield finding(
                "links.page_http_error",
                Severity.FAIL,
                f"Page returns HTTP {fetch.status}",
                url=url,
                status=fetch.status,
                discovered_from=page.discovered_from,
            )
        elif fetch.ok and not fetch.is_html and urlparse(url).path not in ("/robots.txt",):
            yield finding(
                "links.page_http_error",
                Severity.INFO,
                f"Crawled URL is not HTML ({fetch.content_type or 'unknown type'})",
                url=url,
            )
