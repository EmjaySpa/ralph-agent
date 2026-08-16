"""Canonical tags: presence, uniqueness, target health, self-reference."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List

from ..models import Finding, Severity, Site
from . import check, finding


@check("seo.canonical_missing", "Every page declares a canonical", "Canonicals")
def canonical_missing(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if not page.canonical:
            yield finding(
                "seo.canonical_missing",
                Severity.FAIL,
                "No rel=canonical link",
                url=page.url,
            )


@check("seo.canonical_multiple", "One canonical per page", "Canonicals")
def canonical_multiple(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.canonical_count > 1:
            yield finding(
                "seo.canonical_multiple",
                Severity.FAIL,
                f"Page declares {page.canonical_count} canonical links",
                url=page.url,
                detail="Search engines will ignore all of them",
            )


@check("seo.canonical_target_health", "Canonical targets are live and final", "Canonicals")
def canonical_target_health(site: Site) -> Iterable[Finding]:
    """A canonical pointing at a redirect, a 404 or another host is broken."""
    for page in site.html_pages():
        if not page.canonical:
            continue
        canonical = page.canonical
        if canonical.startswith("http://") and page.url.startswith("https://"):
            yield finding(
                "seo.canonical_target_health",
                Severity.FAIL,
                "Canonical uses http:// on an https:// page",
                url=page.url,
                detail=canonical,
            )
        if not site.config.is_internal(canonical):
            yield finding(
                "seo.canonical_target_health",
                Severity.FAIL,
                "Canonical points at another domain",
                url=page.url,
                detail=canonical,
            )
            continue
        fetch = site.fetches.get(canonical)
        if fetch is None:
            continue
        if fetch.status is not None and fetch.status >= 400:
            yield finding(
                "seo.canonical_target_health",
                Severity.FAIL,
                f"Canonical target returns HTTP {fetch.status}",
                url=page.url,
                detail=canonical,
            )
        elif fetch.hops > 0:
            yield finding(
                "seo.canonical_target_health",
                Severity.WARNING,
                "Canonical target redirects",
                url=page.url,
                detail=f"{canonical} -> {fetch.final_url}",
            )


@check("seo.canonical_self_reference", "Canonical matches the page URL", "Canonicals")
def canonical_self_reference(site: Site) -> Iterable[Finding]:
    """A canonical pointing elsewhere de-indexes this page. That is sometimes
    deliberate, so it is reported as a WARNING with the target for review."""
    for page in site.html_pages():
        if not page.canonical:
            continue
        if site.config.identity(page.canonical) != site.config.identity(page.url):
            yield finding(
                "seo.canonical_self_reference",
                Severity.WARNING,
                "Canonical points at a different URL",
                url=page.url,
                detail=f"canonical: {page.canonical}",
            )


@check("seo.canonical_cluster", "No unintended canonical clusters", "Canonicals")
def canonical_cluster(site: Site) -> Iterable[Finding]:
    """Several live pages canonicalising to one URL means the others will not
    be indexed."""
    groups: Dict[str, List[str]] = defaultdict(list)
    for page in site.html_pages():
        if page.canonical:
            groups[site.config.identity(page.canonical)].append(page.url)
    for target, urls in sorted(groups.items()):
        others = [u for u in urls if site.config.identity(u) != target]
        if len(urls) > 1 and others:
            yield finding(
                "seo.canonical_cluster",
                Severity.WARNING,
                f"{len(others)} page(s) canonicalise to {target}",
                url=target,
                detail="; ".join(sorted(others)[:10]),
                pages=sorted(others),
            )
