"""H1/H2 structure, heading order and empty headings."""
from __future__ import annotations

from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


@check("headings.h1_missing", "Every page has an H1", "Headings")
def h1_missing(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        h1s = page.headings_at(1)
        if not h1s:
            yield finding(
                "headings.h1_missing",
                Severity.FAIL,
                "Page has no H1",
                url=page.url,
                detail=f"first heading found: {page.headings[0].text[:60]!r}" if page.headings else "no headings at all",
            )


@check("headings.h1_multiple", "One H1 per page", "Headings")
def h1_multiple(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        h1s = page.headings_at(1)
        if len(h1s) > 1:
            yield finding(
                "headings.h1_multiple",
                Severity.FAIL,
                f"Page has {len(h1s)} H1 elements",
                url=page.url,
                detail="; ".join(h.text[:50] or "(empty)" for h in h1s[:5]),
            )


@check("headings.empty", "No empty headings", "Headings")
def empty_headings(site: Site) -> Iterable[Finding]:
    """Empty heading tags are announced as blank landmarks by screen readers
    and are usually a leftover layout module."""
    for page in site.html_pages():
        empties = [h for h in page.headings if h.empty]
        if empties:
            levels = ", ".join(f"H{h.level}" for h in empties[:8])
            yield finding(
                "headings.empty",
                Severity.FAIL,
                f"{len(empties)} empty heading element(s)",
                url=page.url,
                detail=f"levels: {levels}",
            )


@check("headings.order", "Heading levels do not skip", "Headings")
def heading_order(site: Site) -> Iterable[Finding]:
    """H2 followed by H4 breaks the document outline."""
    for page in site.html_pages():
        previous = 0
        skips = []
        for heading in page.headings:
            if previous and heading.level > previous + 1:
                skips.append(f"H{previous} -> H{heading.level} ({heading.text[:40] or 'empty'})")
            previous = heading.level
        if skips:
            yield finding(
                "headings.order",
                Severity.WARNING,
                f"{len(skips)} skipped heading level(s)",
                url=page.url,
                detail="; ".join(skips[:5]),
            )


@check("headings.h2_missing", "Substantial pages use H2 subheadings", "Headings")
def h2_missing(site: Site) -> Iterable[Finding]:
    threshold = int(site.config.threshold("thin_content_words", 250))
    for page in site.html_pages():
        if page.word_count < threshold:
            continue
        if not page.headings_at(2):
            yield finding(
                "headings.h2_missing",
                Severity.WARNING,
                f"Page has {page.word_count} words but no H2 structure",
                url=page.url,
            )


@check("headings.h1_matches_topic", "H1 is not a boilerplate placeholder", "Headings")
def h1_placeholder(site: Site) -> Iterable[Finding]:
    """H1s left as the theme default or the bare site name."""
    generic = {"home", "welcome", "untitled", "page", "new page", "home page"}
    business = str(site.config.get("business.correct_name", "")).strip().lower()
    for page in site.html_pages():
        for heading in page.headings_at(1):
            text = heading.text.strip().lower()
            if not text:
                continue
            if text in generic or (business and text == business and page.path != "/"):
                yield finding(
                    "headings.h1_matches_topic",
                    Severity.WARNING,
                    f"H1 looks like a placeholder: {heading.text[:60]!r}",
                    url=page.url,
                )
