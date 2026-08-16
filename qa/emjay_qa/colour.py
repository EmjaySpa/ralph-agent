"""Colour parsing, WCAG contrast and font-family extraction.

Australian English in prose, but the CSS property names stay as CSS spells
them ("color") because that is what we are parsing.
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional, Tuple

HEX_RE = re.compile(r"#([0-9a-fA-F]{3,8})\b")
RGB_RE = re.compile(r"rgba?\(\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*(?:[,/]\s*([0-9.%]+)\s*)?\)")
HSL_RE = re.compile(r"hsla?\(\s*([0-9.]+)(?:deg)?\s*[, ]\s*([0-9.]+)%\s*[, ]\s*([0-9.]+)%\s*(?:[,/]\s*([0-9.%]+)\s*)?\)")
FONT_FAMILY_RE = re.compile(r"font-family\s*:\s*([^;}{]+)", re.IGNORECASE)
FONT_SHORTHAND_RE = re.compile(r"(?<![-\w])font\s*:\s*([^;}{]+)", re.IGNORECASE)
FONT_FACE_RE = re.compile(r"@font-face\s*{[^}]*?font-family\s*:\s*([^;}]+)", re.IGNORECASE | re.DOTALL)

RGB = Tuple[int, int, int]


def _clamp(value: float, low: float = 0.0, high: float = 255.0) -> float:
    return max(low, min(high, value))


def _channel(raw: str) -> int:
    raw = raw.strip()
    if raw.endswith("%"):
        return int(round(_clamp(float(raw[:-1]) * 255.0 / 100.0)))
    return int(round(_clamp(float(raw))))


def hex_to_rgb(value: str) -> Optional[RGB]:
    digits = value.lstrip("#").strip()
    if len(digits) in (3, 4):
        digits = "".join(ch * 2 for ch in digits[:3])
    elif len(digits) in (6, 8):
        digits = digits[:6]
    else:
        return None
    try:
        return (int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16))
    except ValueError:
        return None


def rgb_to_hex(rgb: RGB) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(int(round(_clamp(c))) for c in rgb))


def hsl_to_rgb(h: float, s: float, lightness: float) -> RGB:
    h = (h % 360) / 360.0
    s /= 100.0
    lightness /= 100.0
    if s == 0:
        value = int(round(lightness * 255))
        return (value, value, value)

    def hue_to_rgb(p: float, q: float, t: float) -> float:
        if t < 0:
            t += 1
        if t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    q = lightness * (1 + s) if lightness < 0.5 else lightness + s - lightness * s
    p = 2 * lightness - q
    return (
        int(round(hue_to_rgb(p, q, h + 1 / 3) * 255)),
        int(round(hue_to_rgb(p, q, h) * 255)),
        int(round(hue_to_rgb(p, q, h - 1 / 3) * 255)),
    )


def parse_colour(value: str) -> Optional[RGB]:
    """Parse a single CSS colour value. Returns None for keywords other than
    black/white and for anything unparseable."""
    if not value:
        return None
    value = value.strip().lower()
    named = {"black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0)}
    if value in named:
        return named[value]
    if value.startswith("#"):
        return hex_to_rgb(value)
    match = RGB_RE.match(value)
    if match:
        return (_channel(match.group(1)), _channel(match.group(2)), _channel(match.group(3)))
    match = HSL_RE.match(value)
    if match:
        return hsl_to_rgb(float(match.group(1)), float(match.group(2)), float(match.group(3)))
    return None


def alpha_of(value: str) -> float:
    """Alpha channel of an rgba()/hsla()/8-digit-hex colour. 1.0 if opaque."""
    value = (value or "").strip().lower()
    for regex in (RGB_RE, HSL_RE):
        match = regex.match(value)
        if match and match.group(4):
            raw = match.group(4)
            return float(raw[:-1]) / 100.0 if raw.endswith("%") else float(raw)
    if value.startswith("#"):
        digits = value.lstrip("#")
        if len(digits) == 8:
            return int(digits[6:8], 16) / 255.0
        if len(digits) == 4:
            return int(digits[3] * 2, 16) / 255.0
    return 1.0


def extract_colours(css_or_html: str) -> List[Tuple[str, str]]:
    """Every colour literal in a blob of CSS/HTML as (hex, original_literal)."""
    found: List[Tuple[str, str]] = []
    for match in HEX_RE.finditer(css_or_html):
        literal = match.group(0)
        # Skip things that only look like colours, e.g. #12345678901 ids.
        if len(match.group(1)) not in (3, 4, 6, 8):
            continue
        rgb = hex_to_rgb(literal)
        if rgb:
            found.append((rgb_to_hex(rgb), literal))
    for regex in (RGB_RE, HSL_RE):
        for match in regex.finditer(css_or_html):
            rgb = parse_colour(match.group(0))
            if rgb:
                found.append((rgb_to_hex(rgb), match.group(0)))
    return found


def relative_luminance(rgb: RGB) -> float:
    channels = []
    for raw in rgb:
        value = raw / 255.0
        channels.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg: RGB, bg: RGB) -> float:
    l1, l2 = relative_luminance(fg), relative_luminance(bg)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def blend(fg: RGB, bg: RGB, alpha: float) -> RGB:
    return tuple(int(round(f * alpha + b * (1 - alpha))) for f, b in zip(fg, bg))  # type: ignore[return-value]


def colour_distance(a: RGB, b: RGB) -> float:
    """Weighted RGB distance ('redmean'). Close enough for near-miss detection
    of a specific brand colour without pulling in a colour-science dependency."""
    rmean = (a[0] + b[0]) / 2.0
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return ((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db) ** 0.5


def is_large_text(font_size_px: float, font_weight: str) -> bool:
    """WCAG 'large text': >=24px, or >=18.66px when bold."""
    try:
        weight = int(font_weight)
    except (TypeError, ValueError):
        weight = 700 if str(font_weight).lower() in {"bold", "bolder"} else 400
    if font_size_px >= 24:
        return True
    return font_size_px >= 18.66 and weight >= 700


def _split_families(declaration: str) -> List[str]:
    families = []
    for raw in declaration.split(","):
        name = raw.strip().strip("'\"").strip()
        # Strip shorthand leftovers such as "italic bold 12px/1.4".
        if not name or name.startswith("var(") or "(" in name:
            continue
        families.append(name)
    return families


def extract_font_families(css_or_html: str) -> List[str]:
    """Declared font families, in declaration order, de-duplicated."""
    families: List[str] = []
    for regex in (FONT_FAMILY_RE, FONT_FACE_RE):
        for match in regex.finditer(css_or_html):
            families.extend(_split_families(match.group(1)))
    for match in FONT_SHORTHAND_RE.finditer(css_or_html):
        declaration = match.group(1)
        # In the `font:` shorthand the family list comes after the size/line-height.
        tail = declaration.split("/")[-1] if "/" in declaration else declaration
        parts = tail.split()
        if len(parts) > 1:
            families.extend(_split_families(" ".join(parts[1:])))
    return iter_unique(families)


def normalise_font_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().strip("'\"")).lower()


def google_font_families(href: str) -> List[str]:
    """Families requested by a fonts.googleapis.com stylesheet URL."""
    if "fonts.googleapis.com" not in href:
        return []
    families: List[str] = []
    for match in re.finditer(r"family=([^&]+)", href):
        for chunk in match.group(1).split("|"):
            name = chunk.split(":")[0].replace("+", " ").strip()
            if name:
                families.append(name)
    return families


def iter_unique(values: Iterable[str]) -> List[str]:
    seen = set()
    ordered = []
    for value in values:
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(value)
    return ordered
