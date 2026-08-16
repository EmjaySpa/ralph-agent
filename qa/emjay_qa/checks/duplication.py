"""Duplicate and thin pages."""
from __future__ import annotations

from typing import Iterable, List

from ..models import Finding, PageSnapshot, Severity, Site
from . import check, finding


def _jaccard(a, b) -> float:
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union else 0.0


def _content_pages(site: Site) -> List[PageSnapshot]:
    """Live pages with content, excluding URLs that are deliberately
    consolidated onto a canonical elsewhere."""
    return [p for p in site.html_pages() if p.word_count > 0 and not site.consolidated_to(p.url)]


@check("content.thin_page", "Pages carry enough content", "Duplicate & Thin")
def thin_page(site: Site) -> Iterable[Finding]:
    threshold = int(site.config.threshold("thin_content_words", 250))
    for page in _content_pages(site):
        if page.word_count < threshold:
            severity = Severity.FAIL if page.word_count < 50 else Severity.WARNING
            yield finding(
                "content.thin_page",
                severity,
                f"Only {page.word_count} words of visible content",
                url=page.url,
                detail=f"threshold {threshold} words",
                word_count=page.word_count,
            )


@check("content.empty_page", "No blank pages", "Duplicate & Thin")
def empty_page(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.word_count == 0:
            yield finding(
                "content.empty_page",
                Severity.FAIL,
                "Page renders no visible text",
                url=page.url,
                detail=f"{len(page.html)} bytes of HTML",
            )


@check("content.duplicate_page", "No duplicate page content", "Duplicate & Thin")
def duplicate_page(site: Site) -> Iterable[Finding]:
    """Near-duplicate bodies split ranking signals and confuse readers."""
    threshold = float(site.config.threshold("duplicate_similarity", 0.9))
    pages = [p for p in _content_pages(site) if p.word_count >= 50]
    reported = set()
    for i, first in enumerate(pages):
        for second in pages[i + 1 :]:
            pair = tuple(sorted((first.url, second.url)))
            if pair in reported:
                continue
            similarity = _jaccard(first.shingles, second.shingles)
            if similarity >= threshold:
                reported.add(pair)
                yield finding(
                    "content.duplicate_page",
                    Severity.FAIL,
                    f"Pages are {similarity * 100:.0f}% identical",
                    url=first.url,
                    detail=f"duplicate of {second.url}",
                    similarity=round(similarity, 3),
                    pages=list(pair),
                )


@check("content.near_duplicate_page", "No near-duplicate page content", "Duplicate & Thin")
def near_duplicate_page(site: Site) -> Iterable[Finding]:
    """Between 70% and the duplicate threshold: usually a template page that
    was copied and only half rewritten."""
    upper = float(site.config.threshold("duplicate_similarity", 0.9))
    lower = 0.70
    pages = [p for p in _content_pages(site) if p.word_count >= 50]
    reported = set()
    for i, first in enumerate(pages):
        for second in pages[i + 1 :]:
            pair = tuple(sorted((first.url, second.url)))
            if pair in reported:
                continue
            similarity = _jaccard(first.shingles, second.shingles)
            if lower <= similarity < upper:
                reported.add(pair)
                yield finding(
                    "content.near_duplicate_page",
                    Severity.WARNING,
                    f"Pages are {similarity * 100:.0f}% similar",
                    url=first.url,
                    detail=f"near-duplicate of {second.url}",
                    similarity=round(similarity, 3),
                    pages=list(pair),
                )
