"""Brand conformance: rogue colours and unapproved fonts.

Two layers:
  static   - colours/fonts declared in served CSS, <style> blocks and style=""
  rendered - colours/fonts actually computed by the browser on the page

A colour can pass the static layer and still fail the rendered layer (theme
defaults injected at runtime), which is exactly how #2EA3F2 survives a visual
review, so both are checked.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

from ..colour import colour_distance, extract_colours, extract_font_families, google_font_families, hex_to_rgb, normalise_font_name
from ..models import Finding, Severity, Site
from . import check, finding

MAX_LOCATIONS = 8


def _static_sources(site: Site) -> Iterable[Tuple[str, str]]:
    """(label, css_or_html_text) for every static style source."""
    for url, css in sorted(site.stylesheets.items()):
        if css:
            yield f"stylesheet {url}", css
    for page in site.html_pages():
        blob = "\n".join(page.inline_styles)
        if blob.strip():
            yield f"inline styles on {page.url}", blob
        # Presentational attributes and SVG fills live in the markup itself.
        markup_colours = re.findall(r'(?:bgcolor|color|fill|stroke)\s*=\s*"(#[0-9a-fA-F]{3,8})"', page.html)
        if markup_colours:
            yield f"markup attributes on {page.url}", " ".join(markup_colours)


def _banned_colours(site: Site) -> List[Dict[str, str]]:
    return site.config.get("brand.banned_colours", []) or []


@check("brand.banned_colour_static", "No banned colours in served CSS", "Brand")
def banned_colour_static(site: Site) -> Iterable[Finding]:
    banned = {str(entry["hex"]).upper(): entry.get("label", "") for entry in _banned_colours(site)}
    if not banned:
        return
    hits: Dict[str, List[str]] = defaultdict(list)
    for label, text in _static_sources(site):
        for hex_value, literal in extract_colours(text):
            if hex_value.upper() in banned:
                hits[hex_value.upper()].append(f"{label} (as {literal})")
    for hex_value, locations in sorted(hits.items()):
        yield finding(
            "brand.banned_colour_static",
            Severity.FAIL,
            f"Unapproved colour {hex_value} ({banned[hex_value]}) declared in CSS",
            detail="; ".join(sorted(set(locations))[:MAX_LOCATIONS]),
            occurrences=len(locations),
            locations=sorted(set(locations))[:MAX_LOCATIONS],
        )


@check("brand.banned_colour_rendered", "No banned colours rendered in the browser", "Brand", requires_browser=True)
def banned_colour_rendered(site: Site) -> Iterable[Finding]:
    banned = {str(entry["hex"]).upper(): entry.get("label", "") for entry in _banned_colours(site)}
    if not banned or not site.runtime:
        return
    hits: Dict[str, List[str]] = defaultdict(list)
    for url, runtime in sorted(site.runtime.items()):
        for hex_value, selectors in runtime.computed_colours.items():
            if hex_value.upper() in banned:
                hits[hex_value.upper()].extend(f"{url} -> {sel}" for sel in selectors[:3])
    for hex_value, locations in sorted(hits.items()):
        yield finding(
            "brand.banned_colour_rendered",
            Severity.FAIL,
            f"Unapproved colour {hex_value} ({banned[hex_value]}) is rendered on the page",
            detail="; ".join(locations[:MAX_LOCATIONS]),
            occurrences=len(locations),
            locations=locations[:MAX_LOCATIONS],
        )


@check("brand.colour_near_miss", "No near-miss variants of banned colours", "Brand")
def colour_near_miss(site: Site) -> Iterable[Finding]:
    """Catches drift such as #2EA3F3 or rgb(46,163,241), which read as the
    banned colour on screen but slip past an exact string search."""
    entries = _banned_colours(site)
    if not entries:
        return
    max_distance = float(site.config.get("brand.colour_near_miss_distance", 12))
    targets = []
    for entry in entries:
        rgb = hex_to_rgb(str(entry["hex"]))
        if rgb:
            targets.append((str(entry["hex"]).upper(), rgb, entry.get("label", "")))

    seen: Dict[str, List[str]] = defaultdict(list)
    for label, text in _static_sources(site):
        for hex_value, literal in extract_colours(text):
            rgb = hex_to_rgb(hex_value)
            if not rgb:
                continue
            for banned_hex, banned_rgb, banned_label in targets:
                if hex_value.upper() == banned_hex:
                    continue
                if colour_distance(rgb, banned_rgb) <= max_distance:
                    seen[f"{hex_value} ~ {banned_hex} ({banned_label})"].append(f"{label} (as {literal})")
    for description, locations in sorted(seen.items()):
        yield finding(
            "brand.colour_near_miss",
            Severity.WARNING,
            f"Colour close to a banned brand colour: {description}",
            detail="; ".join(sorted(set(locations))[:MAX_LOCATIONS]),
        )


@check("brand.palette_conformance", "Only approved colours in use", "Brand")
def palette_conformance(site: Site) -> Iterable[Finding]:
    """Enforces the approved palette when one is configured. Until then it
    reports the palette actually in use so it can be approved or corrected."""
    approved = {str(c).upper() for c in (site.config.get("brand.approved_colours", []) or [])}
    enforce = bool(site.config.get("brand.enforce_palette", False))
    banned = {str(entry["hex"]).upper() for entry in _banned_colours(site)}

    counts: Dict[str, int] = defaultdict(int)
    for _label, text in _static_sources(site):
        for hex_value, _literal in extract_colours(text):
            counts[hex_value.upper()] += 1
    for runtime in site.runtime.values():
        for hex_value, selectors in runtime.computed_colours.items():
            counts[hex_value.upper()] += len(selectors)

    if not counts:
        return
    if not approved or not enforce:
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:25]
        yield finding(
            "brand.palette_conformance",
            Severity.INFO,
            "Palette discovery: approved palette not configured, so unapproved colours cannot be enforced",
            detail=", ".join(f"{hex_value} x{count}" for hex_value, count in top),
            palette={hex_value: count for hex_value, count in top},
            action_required="Populate brand.approved_colours and set brand.enforce_palette: true",
        )
        return
    unapproved = {h: c for h, c in counts.items() if h not in approved and h not in banned}
    for hex_value, count in sorted(unapproved.items(), key=lambda kv: -kv[1])[:40]:
        yield finding(
            "brand.palette_conformance",
            Severity.FAIL,
            f"Colour {hex_value} is not in the approved palette",
            detail=f"{count} occurrence(s)",
        )


def _declared_fonts(site: Site) -> Dict[str, List[str]]:
    fonts: Dict[str, List[str]] = defaultdict(list)
    for label, text in _static_sources(site):
        for family in extract_font_families(text):
            fonts[family].append(label)
    for page in site.html_pages():
        for link in page.links:
            for family in google_font_families(link.resolved_url):
                fonts[family].append(f"Google Fonts request on {page.url}")
    return fonts


def _allowed_generic(site: Site) -> set:
    return {normalise_font_name(f) for f in (site.config.get("brand.allowed_generic_fonts", []) or [])}


@check("brand.banned_font", "No banned fonts declared or rendered", "Brand")
def banned_font(site: Site) -> Iterable[Finding]:
    banned = {normalise_font_name(f): f for f in (site.config.get("brand.banned_fonts", []) or [])}
    if not banned:
        return
    declared = _declared_fonts(site)
    for family, locations in sorted(declared.items()):
        key = normalise_font_name(family)
        if key in banned:
            yield finding(
                "brand.banned_font",
                Severity.FAIL,
                f"Banned font {banned[key]!r} is declared in CSS",
                detail="; ".join(sorted(set(locations))[:MAX_LOCATIONS]),
            )
    for url, runtime in sorted(site.runtime.items()):
        for family, selectors in runtime.computed_fonts.items():
            key = normalise_font_name(family)
            if key in banned:
                yield finding(
                    "brand.banned_font",
                    Severity.FAIL,
                    f"Banned font {banned[key]!r} is rendered on the page",
                    url=url,
                    detail="; ".join(selectors[:5]),
                )


@check("brand.font_conformance", "Only approved fonts in use", "Brand")
def font_conformance(site: Site) -> Iterable[Finding]:
    approved = {normalise_font_name(f) for f in (site.config.get("brand.approved_fonts", []) or [])}
    enforce = bool(site.config.get("brand.enforce_fonts", False))
    banned = {normalise_font_name(f) for f in (site.config.get("brand.banned_fonts", []) or [])}
    generic = _allowed_generic(site)

    declared = _declared_fonts(site)
    rendered: Dict[str, List[str]] = defaultdict(list)
    for url, runtime in site.runtime.items():
        for family, selectors in runtime.computed_fonts.items():
            rendered[family].extend(f"{url} -> {s}" for s in selectors[:2])

    families = sorted(set(declared) | set(rendered))
    interesting = [f for f in families if normalise_font_name(f) not in generic]
    if not interesting:
        return

    if not approved or not enforce:
        yield finding(
            "brand.font_conformance",
            Severity.INFO,
            "Font discovery: approved font list not configured, so unapproved fonts cannot be enforced",
            detail=", ".join(interesting[:30]),
            fonts=interesting[:30],
            action_required="Populate brand.approved_fonts and set brand.enforce_fonts: true",
        )
        return

    for family in interesting:
        key = normalise_font_name(family)
        if key in approved or key in banned:
            continue  # banned fonts are reported by brand.banned_font
        locations = sorted(set(declared.get(family, []) + rendered.get(family, [])))[:MAX_LOCATIONS]
        yield finding(
            "brand.font_conformance",
            Severity.FAIL,
            f"Font {family!r} is not in the approved font list",
            detail="; ".join(locations),
        )
