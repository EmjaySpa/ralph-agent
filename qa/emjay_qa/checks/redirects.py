"""Redirect chains, temporary redirects, host/scheme canonicalisation."""
from __future__ import annotations

from typing import Iterable
from urllib.parse import urlparse

from ..models import Finding, Severity, Site
from . import check, finding

PERMANENT = {301, 308}
TEMPORARY = {302, 303, 307}


@check("redirect.chain", "No redirect chains", "Redirects")
def redirect_chain(site: Site) -> Iterable[Finding]:
    """More than one hop between the requested URL and the final page."""
    max_hops = int(site.config.threshold("max_redirect_hops", 1))
    for url, fetch in sorted(site.fetches.items()):
        if fetch.hops <= max_hops:
            continue
        path = " -> ".join(f"{u} [{code}]" for u, code in fetch.chain)
        yield finding(
            "redirect.chain",
            Severity.FAIL if fetch.hops > max_hops + 1 else Severity.WARNING,
            f"Redirect chain of {fetch.hops} hops",
            url=url,
            detail=path,
            hops=fetch.hops,
        )


@check("redirect.temporary", "Permanent moves use 301/308", "Redirects")
def temporary_redirect(site: Site) -> Iterable[Finding]:
    """A 302 for a permanently moved URL leaks ranking signals."""
    for url, fetch in sorted(site.fetches.items()):
        codes = [code for _, code in fetch.chain[:-1]] if len(fetch.chain) > 1 else []
        temporary = [code for code in codes if code in TEMPORARY]
        if temporary:
            yield finding(
                "redirect.temporary",
                Severity.WARNING,
                f"Temporary redirect ({', '.join(str(c) for c in temporary)}) in the chain",
                url=url,
                detail=" -> ".join(f"{u} [{code}]" for u, code in fetch.chain),
            )


@check("redirect.internal_link_to_redirect", "Internal links point at final URLs", "Redirects")
def internal_link_to_redirect(site: Site) -> Iterable[Finding]:
    """Internal links should target the destination, not a redirect."""
    reported = set()
    for page in site.pages.values():
        for link in page.links:
            if not link.is_internal or link.element != "a":
                continue
            fetch = site.fetches.get(link.resolved_url)
            if fetch is None or fetch.hops == 0:
                continue
            key = (page.url, link.resolved_url)
            if key in reported:
                continue
            reported.add(key)
            yield finding(
                "redirect.internal_link_to_redirect",
                Severity.WARNING,
                "Internal link goes through a redirect",
                url=page.url,
                detail=f"{link.resolved_url} -> {fetch.final_url} ({fetch.hops} hop(s))",
                anchor_text=link.anchor_text[:80],
            )


@check("redirect.host_canonicalisation", "One canonical host and scheme", "Redirects")
def host_canonicalisation(site: Site) -> Iterable[Finding]:
    """http/https and www/non-www must all end on the same home page."""
    if not site.host_variants:
        yield finding(
            "redirect.host_canonicalisation",
            Severity.INFO,
            "Host variants were not probed in this run",
        )
        return

    finals = {}
    for url, fetch in sorted(site.host_variants.items()):
        if fetch.status is None:
            yield finding(
                "redirect.host_canonicalisation",
                Severity.WARNING,
                "Host variant did not respond",
                url=url,
                detail=fetch.error or "no response",
            )
            continue
        if fetch.status >= 400:
            yield finding(
                "redirect.host_canonicalisation",
                Severity.FAIL,
                f"Host variant returns HTTP {fetch.status}",
                url=url,
            )
            continue
        finals[url] = site.config.identity(fetch.final_url)
        if url.startswith("http://") and fetch.final_url.startswith("http://"):
            yield finding(
                "redirect.host_canonicalisation",
                Severity.FAIL,
                "Insecure http:// URL does not redirect to https://",
                url=url,
                detail=f"final URL: {fetch.final_url}",
            )

    distinct = sorted(set(finals.values()))
    if len(distinct) > 1:
        yield finding(
            "redirect.host_canonicalisation",
            Severity.FAIL,
            "Host variants resolve to different URLs (duplicate home pages)",
            detail="; ".join(f"{k} -> {v}" for k, v in sorted(finals.items())),
        )


@check("redirect.self_redirect", "No page redirects to itself", "Redirects")
def self_redirect(site: Site) -> Iterable[Finding]:
    """A URL that redirects to itself is an infinite loop for crawlers."""
    for url, fetch in sorted(site.fetches.items()):
        seen = [hop for hop, _ in fetch.chain]
        if len(seen) != len(set(seen)):
            yield finding(
                "redirect.self_redirect",
                Severity.FAIL,
                "Redirect loop detected",
                url=url,
                detail=" -> ".join(f"{u} [{c}]" for u, c in fetch.chain),
            )
        elif "redirect loop" in (fetch.error or ""):
            yield finding(
                "redirect.self_redirect",
                Severity.FAIL,
                "Redirect exceeded the hop limit",
                url=url,
                detail=fetch.error,
            )


@check("redirect.trailing_slash", "Consistent trailing-slash form", "Redirects")
def trailing_slash(site: Site) -> Iterable[Finding]:
    """Both /page and /page/ serving 200 creates duplicate URLs."""
    for page in site.html_pages():
        path = urlparse(page.url).path
        if path in ("", "/"):
            continue
        variant = page.url[:-1] if path.endswith("/") else page.url + "/"
        fetch = site.fetches.get(variant)
        if fetch is None:
            continue
        if fetch.ok and fetch.hops == 0 and site.config.identity(fetch.final_url) == site.config.identity(page.url):
            continue
        if fetch.ok and fetch.hops == 0:
            yield finding(
                "redirect.trailing_slash",
                Severity.WARNING,
                "Both trailing-slash and non-slash forms return 200",
                url=page.url,
                detail=f"variant also 200: {variant}",
            )
