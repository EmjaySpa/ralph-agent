"""Regression assertions for defects that were already found once.

Every entry in config/known_defects.yaml is asserted on every run. A defect
marked `fixed` that starts failing again is reported as a REGRESSION and is
never downgraded by severity_overrides: that is the whole point of the file.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional

from ..colour import extract_colours, extract_font_families, normalise_font_name
from ..models import Finding, PageSnapshot, Severity, Site
from ..parse import _soup
from . import check, finding

CHECK_ID = "regression.known_defect"


def _pages_for(site: Site, url_pattern: Optional[str]) -> List[PageSnapshot]:
    pages = list(site.html_pages())
    if not url_pattern:
        return pages
    regex = re.compile(url_pattern)
    return [p for p in pages if regex.search(p.path)]


def _scope_text(site: Site, page: PageSnapshot, scope: str) -> str:
    if scope == "visible":
        return page.text
    if scope == "meta":
        return " ".join(filter(None, [page.title, page.meta_description]))
    if scope == "schema":
        return " ".join(page.jsonld_raw)
    return page.html


def _assert_colour_absent(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    target = str(spec.get("value", "")).upper()
    scope = spec.get("scope", "both")
    if scope in ("static", "both"):
        for url, css in site.stylesheets.items():
            if any(hex_value.upper() == target for hex_value, _ in extract_colours(css)):
                yield f"declared in stylesheet {url}"
        for page in site.html_pages():
            blob = "\n".join(page.inline_styles)
            if any(hex_value.upper() == target for hex_value, _ in extract_colours(blob)):
                yield f"declared inline on {page.url}"
    if scope in ("rendered", "both"):
        for url, runtime in site.runtime.items():
            for hex_value, selectors in runtime.computed_colours.items():
                if hex_value.upper() == target:
                    yield f"rendered on {url} ({selectors[0] if selectors else 'unknown element'})"


def _assert_font_absent(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    target = normalise_font_name(str(spec.get("value", "")))
    scope = spec.get("scope", "both")
    if scope in ("static", "both"):
        for url, css in site.stylesheets.items():
            if any(normalise_font_name(f) == target for f in extract_font_families(css)):
                yield f"declared in stylesheet {url}"
        for page in site.html_pages():
            blob = "\n".join(page.inline_styles)
            if any(normalise_font_name(f) == target for f in extract_font_families(blob)):
                yield f"declared inline on {page.url}"
    if scope in ("rendered", "both"):
        for url, runtime in site.runtime.items():
            for family, selectors in runtime.computed_fonts.items():
                if normalise_font_name(family) == target:
                    yield f"rendered on {url} ({selectors[0] if selectors else 'unknown element'})"


def _assert_text_absent(site: Site, spec: Dict[str, Any], regex: bool) -> Iterable[str]:
    raw = str(spec.get("value", ""))
    if not raw:
        return
    pattern = re.compile(raw if regex else re.escape(raw), re.IGNORECASE)
    scope = spec.get("scope", "visible")
    for page in _pages_for(site, spec.get("url_pattern")):
        blob = _scope_text(site, page, scope)
        match = pattern.search(blob or "")
        if match:
            yield f"{page.url}: ...{blob[max(0, match.start() - 40):match.end() + 40].strip()}..."


def _assert_url_status(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    path = spec.get("path", "")
    fetch = site.legacy.get(path) or site.fetches.get(site.config.normalise(site.config.base_url + path))
    if fetch is None:
        yield f"{path} was not probed in this run"
        return
    expected = [int(s) for s in (spec.get("expect_status") or [])]
    first_hop = fetch.chain[0][1] if fetch.chain else fetch.status
    if expected and first_hop not in expected:
        yield f"{path} responded {first_hop}, expected one of {expected}"
    location = spec.get("expect_location")
    if location:
        want = site.config.identity(site.config.base_url + location) if location.startswith("/") else site.config.identity(location)
        if site.config.identity(fetch.final_url) != want:
            yield f"{path} landed on {fetch.final_url}, expected {location}"


def _assert_url_not_linked(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    pattern = re.compile(str(spec.get("path_pattern", "")), re.IGNORECASE)
    for page in site.html_pages():
        for link in page.links:
            if link.element == "a" and pattern.search(link.resolved_url):
                yield f"{page.url} links to {link.resolved_url}"


def _assert_selector(site: Site, spec: Dict[str, Any], must_exist: bool) -> Iterable[str]:
    selector = str(spec.get("selector", ""))
    if not selector:
        return
    for page in _pages_for(site, spec.get("url_pattern")):
        try:
            found = _soup(page.html).select(selector)
        except Exception as exc:
            yield f"{page.url}: selector error {exc}"
            continue
        if must_exist and not found:
            yield f"{page.url}: no element matches {selector!r}"
        elif not must_exist and found:
            yield f"{page.url}: {len(found)} element(s) match {selector!r}"


def _assert_no_console_errors(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    pattern = re.compile(spec.get("url_pattern", ".")) if spec.get("url_pattern") else None
    checked = False
    for url, runtime in site.runtime.items():
        if pattern and not pattern.search(site.config.path_of(url)):
            continue
        checked = True
        errors = [e for e in runtime.console_errors if e["type"] == "error" and not e["ignorable"]]
        for error in errors[:3]:
            yield f"{url}: {error['text'][:160]}"
    if not checked:
        yield "not verifiable: the browser layer did not cover a matching page"


def _assert_no_overflow(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    pattern = re.compile(spec.get("url_pattern", ".")) if spec.get("url_pattern") else None
    tolerance = float(site.config.threshold("mobile_overflow_tolerance_px", 2))
    checked = False
    for url, runtime in site.runtime.items():
        if pattern and not pattern.search(site.config.path_of(url)):
            continue
        if not runtime.ok:
            continue
        checked = True
        if runtime.overflow_px > tolerance:
            offender = runtime.overflow_elements[0]["selector"] if runtime.overflow_elements else "unknown element"
            yield f"{url}: {runtime.overflow_px:.0f}px overflow ({offender})"
    if not checked:
        yield "not verifiable: the browser layer did not cover a matching page"


def _assert_canonical_equals(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    expected = str(spec.get("value", ""))
    for page in _pages_for(site, spec.get("url_pattern")):
        if not page.canonical:
            yield f"{page.url}: no canonical"
        elif site.config.identity(page.canonical) != site.config.identity(expected):
            yield f"{page.url}: canonical is {page.canonical}, expected {expected}"


def _assert_meta_robots_absent(site: Site, spec: Dict[str, Any]) -> Iterable[str]:
    directive = str(spec.get("value", "noindex")).lower()
    for page in _pages_for(site, spec.get("url_pattern")):
        combined = f"{page.meta_robots} {page.x_robots_tag}".lower()
        if directive in combined:
            yield f"{page.url}: robots directives are {combined.strip()!r}"


ASSERTIONS = {
    "colour_absent": _assert_colour_absent,
    "font_absent": _assert_font_absent,
    "text_absent": lambda site, spec: _assert_text_absent(site, spec, regex=False),
    "regex_absent": lambda site, spec: _assert_text_absent(site, spec, regex=True),
    "url_status": _assert_url_status,
    "url_not_linked": _assert_url_not_linked,
    "selector_present": lambda site, spec: _assert_selector(site, spec, must_exist=True),
    "selector_absent": lambda site, spec: _assert_selector(site, spec, must_exist=False),
    "no_console_errors": _assert_no_console_errors,
    "no_horizontal_overflow": _assert_no_overflow,
    "canonical_equals": _assert_canonical_equals,
    "meta_robots_absent": _assert_meta_robots_absent,
}


def evaluate_defect(site: Site, defect: Dict[str, Any]) -> List[str]:
    """Violations for one defect entry. Empty list means the assertion holds."""
    spec = defect.get("assert") or {}
    kind = spec.get("type")
    handler = ASSERTIONS.get(kind)
    if handler is None:
        return [f"unknown assertion type {kind!r}"]
    return list(handler(site, spec))


@check(CHECK_ID, "Known defects have not returned", "Known Defects")
def known_defects(site: Site) -> Iterable[Finding]:
    defects = getattr(site.config, "defects", []) or []
    if not defects:
        yield finding(
            CHECK_ID,
            Severity.INFO,
            "No known-defect registry entries configured",
            detail="add entries to config/known_defects.yaml as defects are found",
        )
        return

    for defect in defects:
        defect_id = defect.get("id", "?")
        title = defect.get("title", "")
        status = str(defect.get("status", "open")).lower()
        violations = evaluate_defect(site, defect)
        unverifiable = [v for v in violations if v.startswith("not verifiable")]
        real = [v for v in violations if not v.startswith("not verifiable")]

        if unverifiable and not real:
            yield finding(
                CHECK_ID,
                Severity.WARNING,
                f"{defect_id}: could not be verified this run",
                detail=f"{title} | {unverifiable[0]}",
                defect_id=defect_id,
                status=status,
            )
            continue

        if real:
            if status == "fixed":
                yield finding(
                    CHECK_ID,
                    Severity.FAIL,
                    f"REGRESSION {defect_id}: {title}",
                    detail="; ".join(real[:5]),
                    defect_id=defect_id,
                    status=status,
                    occurrences=len(real),
                    _no_override=True,
                )
            elif status == "wontfix":
                yield finding(
                    CHECK_ID,
                    Severity.INFO,
                    f"{defect_id}: still present (accepted as wontfix)",
                    detail="; ".join(real[:3]),
                    defect_id=defect_id,
                    status=status,
                )
            else:
                yield finding(
                    CHECK_ID,
                    Severity.FAIL,
                    f"{defect_id}: {title}",
                    detail="; ".join(real[:5]),
                    defect_id=defect_id,
                    status=status,
                    occurrences=len(real),
                )
        elif status == "open":
            yield finding(
                CHECK_ID,
                Severity.INFO,
                f"{defect_id}: no longer detected",
                detail=f"{title} | confirm the fix and set status: fixed so a return is treated as a regression",
                defect_id=defect_id,
                status=status,
            )
