"""Did the run actually see the site?

Without this, a run blocked by DNS, TLS, a firewall or an egress policy looks
almost identical to a clean site: nothing to report on pages that were never
fetched. A blocked run must never be mistaken for a pass.
"""
from __future__ import annotations

from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


@check("crawl.reachability", "The site was reachable", "Crawl Health")
def reachability(site: Site) -> Iterable[Finding]:
    live = list(site.html_pages())
    attempted = list(site.pages.values())
    errors = [p for p in attempted if p.fetch and p.fetch.status is None]

    if not attempted:
        yield finding(
            "crawl.reachability",
            Severity.FAIL,
            "Nothing was crawled",
            detail="No URL was even attempted. Check the base_url in qa/config/site.yaml.",
            _no_override=True,
        )
        return

    if not live:
        first_error = next((p.fetch.error for p in errors if p.fetch.error), "")
        yield finding(
            "crawl.reachability",
            Severity.FAIL,
            "The site could not be reached, so this run is NOT a verdict on the site",
            detail=(
                f"{len(attempted)} URL(s) attempted, none returned HTML. "
                f"First transport error: {first_error or 'none recorded'}. "
                "Re-run from a network that can reach the site before reading anything else in this report."
            ),
            _no_override=True,
        )
        return

    if errors:
        yield finding(
            "crawl.reachability",
            Severity.WARNING,
            f"{len(errors)} of {len(attempted)} URL(s) produced no response at all",
            detail="; ".join(f"{p.url}: {p.fetch.error[:80]}" for p in errors[:5]),
        )


@check("crawl.coverage", "Crawl coverage is complete", "Crawl Health")
def coverage(site: Site) -> Iterable[Finding]:
    """Limits that silently narrow a run are reported, so a partial crawl is
    never read as full coverage."""
    for note in site.notes:
        if "max_pages" in note:
            yield finding(
                "crawl.coverage",
                Severity.WARNING,
                "The crawl hit its page limit, so coverage is partial",
                detail=note,
            )
    skipped = {reason: [] for reason in set(site.skipped.values())}
    for url, reason in site.skipped.items():
        skipped[reason].append(url)
    for reason, urls in sorted(skipped.items()):
        yield finding(
            "crawl.coverage",
            Severity.INFO,
            f"{len(urls)} URL(s) skipped: {reason}",
            detail="; ".join(sorted(urls)[:8]),
        )
