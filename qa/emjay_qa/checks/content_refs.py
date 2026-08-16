"""Stale references: retired terms and offers, watched locations, retired URLs,
placeholder copy and generic booking links.

These checks report *where* a stale reference lives. They never propose the
replacement wording: rewriting copy is out of scope for QA.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, Iterable, List
from urllib.parse import urlparse

from ..booking import is_generic_booking as _is_generic, is_specific_booking as _is_specific
from ..models import Finding, Severity, Site
from . import check, finding


def _context(text: str, match: re.Match, width: int = 60) -> str:
    start = max(0, match.start() - width)
    end = min(len(text), match.end() + width)
    return ("..." if start else "") + text[start:end].strip() + ("..." if end < len(text) else "")


def _searchable(page) -> Dict[str, str]:
    """Where a term can hide. Visible text is what a human review catches; the
    rest is what it misses."""
    return {
        "visible text": page.text,
        "title": page.title or "",
        "meta description": page.meta_description or "",
        "alt text": " ".join((img.alt or "") for img in page.images),
        "link text": " ".join(link.anchor_text for link in page.links),
        "URL": page.url,
    }


@check("content.retired_terms", "No retired names, offers or terms", "Stale Content")
def retired_terms(site: Site) -> Iterable[Finding]:
    entries = site.config.get("business.retired_terms", []) or []
    subsumed = {e.get("term", "").lower(): e.get("subsumed_by", "") for e in entries}
    for page in site.html_pages():
        for entry in entries:
            term = entry.get("term", "")
            if not term:
                continue
            pattern = re.compile(re.escape(term).replace(r"\ ", r"\s+"), re.IGNORECASE)
            for location, blob in _searchable(page).items():
                if not blob:
                    continue
                match = pattern.search(blob)
                if not match:
                    continue
                parent = subsumed.get(term.lower())
                if parent and re.search(re.escape(parent).replace(r"\ ", r"\s+"), blob, re.IGNORECASE):
                    continue  # already reported under the longer term
                yield finding(
                    "content.retired_terms",
                    Severity.FAIL,
                    f"Retired term {term!r} appears in {location}",
                    url=page.url,
                    detail=f"{entry.get('reason', '')} | context: {_context(blob, match)}",
                    term=term,
                    location=location,
                )


@check("content.retired_locations", "No retired location references", "Stale Content")
def retired_locations(site: Site) -> Iterable[Finding]:
    retired = [str(loc) for loc in (site.config.get("business.retired_locations", []) or [])]
    if not retired:
        return
    for page in site.html_pages():
        for location_name in retired:
            pattern = re.compile(rf"\b{re.escape(location_name)}\b", re.IGNORECASE)
            for where, blob in _searchable(page).items():
                match = pattern.search(blob or "")
                if match:
                    yield finding(
                        "content.retired_locations",
                        Severity.FAIL,
                        f"Retired location {location_name!r} appears in {where}",
                        url=page.url,
                        detail=_context(blob, match),
                    )


@check("content.location_map", "Location references are mapped for review", "Stale Content")
def location_map(site: Site) -> Iterable[Finding]:
    """Reports every page that mentions a watched location, with counts, so a
    human can confirm which locations are still current. Two internal sources
    of truth disagree about Cleveland vs Tinana, so this check deliberately
    does not judge."""
    watched = [str(loc) for loc in (site.config.get("business.watched_locations", []) or [])]
    if not watched:
        return
    tally: Dict[str, List[str]] = defaultdict(list)
    for page in site.html_pages():
        for location_name in watched:
            hits = len(re.findall(rf"\b{re.escape(location_name)}\b", page.text or "", re.IGNORECASE))
            if hits:
                tally[location_name].append(f"{page.path} x{hits}")
    for location_name, pages in sorted(tally.items()):
        yield finding(
            "content.location_map",
            Severity.INFO,
            f"{location_name} referenced on {len(pages)} page(s)",
            detail="; ".join(sorted(pages)[:15]),
            pages=sorted(pages),
            action_required="Confirm which locations are current, then move retired ones into business.retired_locations",
        )


@check("content.placeholder_copy", "No placeholder or unfinished copy", "Stale Content")
def placeholder_copy(site: Site) -> Iterable[Finding]:
    patterns = [
        (r"lorem ipsum", Severity.FAIL),
        (r"\byour text here\b", Severity.FAIL),
        (r"\binsert (text|content|image)\b", Severity.FAIL),
        (r"\bplaceholder\b", Severity.WARNING),
        (r"\bcoming soon\b", Severity.WARNING),
        (r"\bTBC\b", Severity.WARNING),
        (r"\bTBA\b", Severity.WARNING),
        (r"\bXXX+\b", Severity.WARNING),
        (r"\btest page\b", Severity.WARNING),
        (r"\bunder construction\b", Severity.FAIL),
    ]
    for page in site.html_pages():
        for pattern, severity in patterns:
            match = re.search(pattern, page.text or "", re.IGNORECASE)
            if match:
                yield finding(
                    "content.placeholder_copy",
                    severity,
                    f"Unfinished copy marker {match.group(0)!r}",
                    url=page.url,
                    detail=_context(page.text, match),
                )


@check("content.legacy_url_behaviour", "Retired URLs behave as expected", "Stale Content")
def legacy_url_behaviour(site: Site) -> Iterable[Finding]:
    """Old URLs must either redirect to their replacement or be properly gone.
    A retired URL that still serves 200 is stale content back from the dead."""
    expectations = {entry.get("path"): entry for entry in (site.config.get("legacy_urls", []) or [])}
    for path, fetch in sorted(site.legacy.items()):
        entry = expectations.get(path, {})
        expect = (entry.get("expect") or "redirect").lower()
        target = entry.get("target")
        status = fetch.status
        if status is None:
            yield finding(
                "content.legacy_url_behaviour",
                Severity.WARNING,
                "Retired URL did not respond",
                url=path,
                detail=fetch.error or "no response",
            )
            continue
        first_hop = fetch.chain[0][1] if fetch.chain else status
        if expect == "gone":
            if status < 400:
                yield finding(
                    "content.legacy_url_behaviour",
                    Severity.FAIL,
                    f"Retired URL still resolves (HTTP {status})",
                    url=path,
                    detail=f"final URL: {fetch.final_url}",
                )
        else:
            if first_hop not in (301, 308):
                yield finding(
                    "content.legacy_url_behaviour",
                    Severity.FAIL,
                    f"Retired URL does not permanently redirect (first response {first_hop})",
                    url=path,
                    detail=f"final URL: {fetch.final_url}",
                )
            elif target and site.config.identity(fetch.final_url) != site.config.identity(
                site.config.base_url + target
            ):
                yield finding(
                    "content.legacy_url_behaviour",
                    Severity.FAIL,
                    "Retired URL redirects to the wrong target",
                    url=path,
                    detail=f"expected {target}, got {fetch.final_url}",
                )


@check("content.legacy_url_linked", "Retired URLs are not linked", "Stale Content")
def legacy_url_linked(site: Site) -> Iterable[Finding]:
    paths = [entry.get("path") for entry in (site.config.get("legacy_urls", []) or []) if entry.get("path")]
    if not paths:
        return
    retired_paths = {str(p).rstrip("/").lower(): str(p) for p in paths}
    for page in site.html_pages():
        for link in page.links:
            if link.element != "a" or not link.is_internal:
                continue
            link_path = urlparse(link.resolved_url).path.rstrip("/").lower()
            if link_path in retired_paths:
                yield finding(
                    "content.legacy_url_linked",
                    Severity.FAIL,
                    f"Page links to retired URL {retired_paths[link_path]}",
                    url=page.url,
                    detail=f"anchor text: {link.anchor_text[:60]!r}",
                )


def _is_generic_booking(site: Site, url: str) -> bool:
    return _is_generic(site.config, url)


def _is_specific_booking(site: Site, url: str) -> bool:
    return _is_specific(site.config, url)


@check("content.booking_intent", "Service pages link to the right booking", "Booking Links")
def booking_intent(site: Site) -> Iterable[Finding]:
    """A page about one specific service should book that service, not drop the
    reader on a generic booking front door."""
    url_patterns = site.config.get("booking.specific_intent_url_patterns", []) or []
    offers = [str(o) for o in (site.config.get("offers.current", []) or [])]

    for page in site.html_pages():
        h1_text = " ".join(h.text for h in page.headings_at(1))
        matches_url = any(re.search(p, page.path, re.IGNORECASE) for p in url_patterns)
        named_offer = next((o for o in offers if re.search(re.escape(o).replace(r"\ ", r"\s+"), h1_text, re.IGNORECASE)), None)
        if not matches_url and not named_offer:
            continue

        booking_links = [
            link
            for link in page.links
            if link.element == "a"
            and (
                site.config.is_owned_external(link.resolved_url)
                or _is_generic_booking(site, link.resolved_url)
                or _is_specific_booking(site, link.resolved_url)
            )
        ]
        specific = [link for link in booking_links if _is_specific_booking(site, link.resolved_url)]
        generic = [link for link in booking_links if _is_generic_booking(site, link.resolved_url)]

        if not booking_links:
            yield finding(
                "content.booking_intent",
                Severity.WARNING,
                "Service page has no booking link at all",
                url=page.url,
                detail=f"identified as a service page by {'H1 ' + repr(named_offer) if named_offer else 'URL pattern'}",
            )
        elif generic and not specific:
            yield finding(
                "content.booking_intent",
                Severity.FAIL,
                "Service page only offers a generic booking link",
                url=page.url,
                detail=(
                    f"{'H1: ' + repr(named_offer) if named_offer else 'service URL'} | "
                    f"links: {', '.join(sorted({link.resolved_url for link in generic})[:3])}"
                ),
            )
