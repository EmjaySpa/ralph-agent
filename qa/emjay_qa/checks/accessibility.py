"""Accessibility: alt text, link text, language, landmarks, duplicate ids and
measured colour contrast."""
from __future__ import annotations

import re
from collections import Counter
from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


@check("a11y.image_alt_missing", "Images have alt attributes", "Accessibility")
def image_alt_missing(site: Site) -> Iterable[Finding]:
    """A missing alt attribute is different from alt="": the first is a defect,
    the second is a valid decorative marker."""
    for page in site.html_pages():
        missing = [img for img in page.images if img.alt is None and not img.aria_hidden and img.role != "presentation"]
        if missing:
            yield finding(
                "a11y.image_alt_missing",
                Severity.FAIL,
                f"{len(missing)} image(s) with no alt attribute",
                url=page.url,
                detail="; ".join(img.src[:90] for img in missing[:5]),
                images=[img.src for img in missing[:10]],
            )


@check("a11y.image_alt_quality", "Alt text is meaningful", "Accessibility")
def image_alt_quality(site: Site) -> Iterable[Finding]:
    """Alt text that is a file name, a placeholder word or the whole caption."""
    meaningless = [m.lower() for m in (site.config.get("accessibility.meaningless_alt_values", []) or [])]
    filename_re = re.compile(r"^[\w\-]+\.(jpe?g|png|gif|webp|svg|avif)$", re.IGNORECASE)
    for page in site.html_pages():
        offenders = []
        for img in page.images:
            alt = (img.alt or "").strip()
            if not alt:
                continue
            lowered = alt.lower()
            if filename_re.match(alt) or lowered in meaningless or re.match(r"^(img|dsc|image)[-_ ]?\d+$", lowered):
                offenders.append(f"{alt[:40]!r} on {img.src[:60]}")
            elif len(alt) > 250:
                offenders.append(f"{len(alt)}-character alt on {img.src[:60]}")
        if offenders:
            yield finding(
                "a11y.image_alt_quality",
                Severity.WARNING,
                f"{len(offenders)} image(s) with unhelpful alt text",
                url=page.url,
                detail="; ".join(offenders[:5]),
            )


@check("a11y.link_text", "Links have descriptive text", "Accessibility")
def link_text(site: Site) -> Iterable[Finding]:
    vague = {v.lower() for v in (site.config.get("accessibility.vague_link_text", []) or [])}
    for page in site.html_pages():
        empty, unclear = [], []
        for link in page.links:
            if link.element != "a":
                continue
            # anchor_text is the accessible name: visible text, else
            # aria-label/title, else the alt text of a contained image.
            text = link.anchor_text.strip()
            if not text:
                empty.append(link.raw_href[:80])
            elif text.lower() in vague:
                unclear.append(f"{text!r} -> {link.resolved_url[:60]}")
        if empty:
            yield finding(
                "a11y.link_text",
                Severity.FAIL,
                f"{len(empty)} link(s) with no accessible text",
                url=page.url,
                detail="; ".join(empty[:5]),
            )
        if unclear:
            yield finding(
                "a11y.link_text",
                Severity.WARNING,
                f"{len(unclear)} link(s) with non-descriptive text",
                url=page.url,
                detail="; ".join(unclear[:5]),
            )


@check("a11y.html_lang", "Pages declare a language", "Accessibility")
def html_lang(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        if not page.lang:
            yield finding(
                "a11y.html_lang",
                Severity.FAIL,
                "<html> has no lang attribute",
                url=page.url,
            )
        elif not page.lang.lower().startswith("en"):
            yield finding(
                "a11y.html_lang",
                Severity.WARNING,
                f"Page language is {page.lang!r} on an Australian English site",
                url=page.url,
            )


@check("a11y.duplicate_ids", "Element ids are unique", "Accessibility")
def duplicate_ids(site: Site) -> Iterable[Finding]:
    """Duplicate ids break label/for, aria-labelledby and in-page anchors."""
    for page in site.html_pages():
        counts = Counter(page.element_ids)
        duplicates = [f"{value} x{count}" for value, count in counts.items() if count > 1]
        if duplicates:
            yield finding(
                "a11y.duplicate_ids",
                Severity.WARNING,
                f"{len(duplicates)} duplicated element id(s)",
                url=page.url,
                detail="; ".join(sorted(duplicates)[:8]),
            )


@check("a11y.viewport", "Viewport allows zooming", "Accessibility")
def viewport(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        content = page.viewport.lower().replace(" ", "")
        if not content:
            yield finding(
                "a11y.viewport",
                Severity.FAIL,
                "No responsive viewport meta tag",
                url=page.url,
            )
            continue
        if "user-scalable=no" in content or "maximum-scale=1" in content:
            yield finding(
                "a11y.viewport",
                Severity.FAIL,
                "Viewport disables pinch zoom",
                url=page.url,
                detail=page.viewport,
            )


@check("a11y.contrast", "Text meets WCAG AA contrast", "Accessibility", requires_browser=True)
def contrast(site: Site) -> Iterable[Finding]:
    """Measured in the browser against the computed background. Text over
    images or gradients is skipped because it is not reliably measurable."""
    if not site.runtime:
        return
    for url, runtime in sorted(site.runtime.items()):
        # One colour pair usually explains dozens of elements, so failures are
        # grouped by pair: fixing the pair fixes every element under it.
        groups = {}
        for issue in runtime.contrast_issues:
            key = (issue.get("color"), issue.get("background"), issue.get("required"))
            groups.setdefault(key, []).append(issue)
        for (fg, bg, required), issues in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            worst = min(issues, key=lambda i: i.get("ratio", 0))
            selectors = sorted({i.get("selector", "?") for i in issues})
            yield finding(
                "a11y.contrast",
                Severity.FAIL,
                f"Text {fg} on {bg} is {worst.get('ratio')}:1, below the required {required}:1",
                url=url,
                detail=(
                    f"{len(issues)} element(s), e.g. {'; '.join(selectors[:3])} "
                    f"| sample text: {worst.get('sample', '')[:60]!r}"
                ),
                ratio=worst.get("ratio"),
                required=required,
                color=fg,
                background=bg,
                elements=len(issues),
                selectors=selectors[:10],
            )


@check("a11y.skip_link", "A skip-to-content link exists", "Accessibility")
def skip_link(site: Site) -> Iterable[Finding]:
    for page in site.html_pages():
        has_skip = any(
            link.element == "a"
            and link.fragment
            and re.search(r"skip", link.anchor_text, re.IGNORECASE)
            for link in page.links
        )
        if not has_skip:
            yield finding(
                "a11y.skip_link",
                Severity.INFO,
                "No skip-to-content link found",
                url=page.url,
            )
