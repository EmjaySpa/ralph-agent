"""Titles and meta descriptions: missing, duplicated, malformed, out of range."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List

from ..models import Finding, Severity, Site
from . import check, finding


def _indexable(page) -> bool:
    robots = f"{page.meta_robots} {page.x_robots_tag}".lower()
    return "noindex" not in robots


@check("seo.title_missing", "Every page has a title", "Titles & Meta")
def title_missing(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.title is None or not page.title.strip():
            yield finding(
                "seo.title_missing",
                Severity.FAIL,
                "Page has no <title>" if page.title is None else "Page has an empty <title>",
                url=page.url,
            )


@check("seo.title_multiple", "Exactly one <title> per page", "Titles & Meta")
def title_multiple(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.title_count > 1:
            yield finding(
                "seo.title_multiple",
                Severity.FAIL,
                f"Page declares {page.title_count} <title> elements",
                url=page.url,
            )


@check("seo.title_duplicate", "Titles are unique across the site", "Titles & Meta")
def title_duplicate(site: Site) -> Iterable[Finding]:
    groups: Dict[str, List[str]] = defaultdict(list)
    for page in site.html_pages():
        if site.consolidated_to(page.url):
            continue  # deliberately consolidated onto its canonical
        if page.title and _indexable(page):
            groups[page.title.strip().lower()].append(page.url)
    for title, urls in sorted(groups.items()):
        if len(urls) > 1:
            yield finding(
                "seo.title_duplicate",
                Severity.FAIL,
                f"{len(urls)} indexable pages share the title {title[:70]!r}",
                url=urls[0],
                detail="; ".join(sorted(urls)),
                pages=sorted(urls),
            )


@check("seo.title_length", "Title length within range", "Titles & Meta")
def title_length(site: Site) -> Iterable[Finding]:
    low = int(site.config.threshold("title_min_length", 25))
    high = int(site.config.threshold("title_max_length", 62))
    for page in site.html_pages():
        if not page.title:
            continue
        length = len(page.title.strip())
        if length < low or length > high:
            yield finding(
                "seo.title_length",
                Severity.WARNING,
                f"Title is {length} characters (target {low}-{high})",
                url=page.url,
                detail=page.title.strip()[:120],
            )


@check("seo.meta_description_missing", "Every page has a meta description", "Titles & Meta")
def meta_description_missing(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.meta_description is None or not page.meta_description.strip():
            yield finding(
                "seo.meta_description_missing",
                Severity.FAIL,
                "Missing meta description" if page.meta_description is None else "Empty meta description",
                url=page.url,
            )


@check("seo.meta_description_multiple", "One meta description per page", "Titles & Meta")
def meta_description_multiple(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if page.meta_description_count > 1:
            yield finding(
                "seo.meta_description_multiple",
                Severity.FAIL,
                f"Page declares {page.meta_description_count} meta descriptions",
                url=page.url,
            )


@check("seo.meta_description_duplicate", "Meta descriptions are unique", "Titles & Meta")
def meta_description_duplicate(site: Site) -> Iterable[Finding]:
    groups: Dict[str, List[str]] = defaultdict(list)
    for page in site.html_pages():
        if site.consolidated_to(page.url):
            continue  # deliberately consolidated onto its canonical
        if page.meta_description and _indexable(page):
            groups[page.meta_description.strip().lower()].append(page.url)
    for description, urls in sorted(groups.items()):
        if len(urls) > 1:
            yield finding(
                "seo.meta_description_duplicate",
                Severity.FAIL,
                f"{len(urls)} indexable pages share a meta description",
                url=urls[0],
                detail=description[:120],
                pages=sorted(urls),
            )


@check("seo.meta_description_length", "Meta description length within range", "Titles & Meta")
def meta_description_length(site: Site) -> Iterable[Finding]:
    low = int(site.config.threshold("meta_description_min_length", 70))
    high = int(site.config.threshold("meta_description_max_length", 160))
    for page in site.html_pages():
        if not page.meta_description:
            continue
        length = len(page.meta_description.strip())
        if length < low or length > high:
            yield finding(
                "seo.meta_description_length",
                Severity.WARNING,
                f"Meta description is {length} characters (target {low}-{high})",
                url=page.url,
                detail=page.meta_description.strip()[:180],
            )


@check("seo.social_preview", "Open Graph preview tags present", "Titles & Meta")
def social_preview(site: Site) -> Iterable[Finding]:
    """Missing og: tags make shared links render as bare URLs."""
    for page in site.html_pages():
        missing = [tag for tag in ("og:title", "og:description", "og:image") if not page.og.get(tag)]
        if missing:
            yield finding(
                "seo.social_preview",
                Severity.WARNING,
                f"Missing social preview tags: {', '.join(missing)}",
                url=page.url,
            )
