"""Unit tests for checks that cannot be exercised by a plain-HTTP fixture, and
for the colour and parsing helpers they depend on."""
from __future__ import annotations

import os

import pytest

from emjay_qa import colour
from emjay_qa.checks import canonical as canonical_checks
from emjay_qa.checks import links as link_checks
from emjay_qa.config import Config
from emjay_qa.models import FetchResult, Severity, Site
from emjay_qa.parse import parse_page

QA_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _https_site(html: str, url: str = "https://emjaywellness.com.au/") -> Site:
    config = Config.load(os.path.join(QA_ROOT, "config", "site.yaml"))
    fetch = FetchResult(
        url=url, final_url=url, status=200, chain=[(url, 200)], content_type="text/html", text=html
    )
    site = Site(config=config)
    site.pages[url] = parse_page(url, fetch, config)
    site.fetches[url] = fetch
    return site


def _run(check_fn, site):
    return list(check_fn(site))


# --------------------------------------------------------------- https only
def test_mixed_content_flags_insecure_assets():
    site = _https_site(
        '<html lang="en-AU"><head><script src="http://cdn.example.com/a.js"></script></head>'
        "<body><p>hello</p></body></html>"
    )
    findings = _run(link_checks.mixed_content, site)
    assert any(f.severity is Severity.FAIL and "insecure asset" in f.title for f in findings), findings


def test_mixed_content_ignores_secure_assets():
    site = _https_site(
        '<html lang="en-AU"><head><script src="https://cdn.example.com/a.js"></script></head>'
        "<body><p>hello</p></body></html>"
    )
    assert not _run(link_checks.mixed_content, site)


def test_canonical_http_on_https_page_fails():
    site = _https_site(
        '<html lang="en-AU"><head><link rel="canonical" href="http://emjaywellness.com.au/">'
        "</head><body><p>hello</p></body></html>"
    )
    findings = _run(canonical_checks.canonical_target_health, site)
    assert any("http://" in f.title for f in findings), findings


# ------------------------------------------------------------------ colour
@pytest.mark.parametrize(
    "value,expected",
    [
        ("#2ea3f2", (46, 163, 242)),
        ("#2EA3F2", (46, 163, 242)),
        ("rgb(46, 163, 242)", (46, 163, 242)),
        ("rgba(46,163,242,0.5)", (46, 163, 242)),
        ("#fff", (255, 255, 255)),
    ],
)
def test_colour_parsing(value, expected):
    assert colour.parse_colour(value) == expected


def test_divi_blue_is_found_in_any_notation():
    css = "a{color:#2ea3f2}.b{background:rgb(46,163,242)}.c{border-color:#2EA3F2}"
    hexes = {hex_value for hex_value, _ in colour.extract_colours(css)}
    assert "#2EA3F2" in hexes
    assert sum(1 for h, _ in colour.extract_colours(css) if h == "#2EA3F2") == 3


def test_near_miss_distance_catches_one_channel_drift():
    a = colour.hex_to_rgb("#2EA3F2")
    b = colour.hex_to_rgb("#2EA3F3")
    far = colour.hex_to_rgb("#5A6E5A")
    assert colour.colour_distance(a, b) < 12
    assert colour.colour_distance(a, far) > 12


def test_contrast_ratio_matches_known_values():
    black, white = (0, 0, 0), (255, 255, 255)
    assert round(colour.contrast_ratio(black, white), 1) == 21.0
    assert round(colour.contrast_ratio((119, 119, 119), white), 1) == 4.5


def test_font_extraction_reads_declarations_and_face_blocks():
    css = "@font-face{font-family:'Open Sans';src:url(x)}body{font-family:Lora, Georgia, serif}"
    families = [f.lower() for f in colour.extract_font_families(css)]
    assert "open sans" in families
    assert "lora" in families


def test_google_font_families_from_href():
    href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400&family=Lora&display=swap"
    assert colour.google_font_families(href) == ["Open Sans", "Lora"]


# ------------------------------------------------------------------ config
def test_identity_folds_trailing_slash_but_normalise_does_not():
    config = Config.load(os.path.join(QA_ROOT, "config", "site.yaml"))
    a = "https://emjaywellness.com.au/services"
    b = "https://emjaywellness.com.au/services/"
    assert config.identity(a) == config.identity(b)
    assert config.normalise(a) != config.normalise(b)


def test_tracking_params_are_stripped():
    config = Config.load(os.path.join(QA_ROOT, "config", "site.yaml"))
    url = "https://emjaywellness.com.au/services/?utm_source=facebook&serviceVariationId=abc"
    assert "utm_source" not in config.normalise(url)
    assert "serviceVariationId=abc" in config.normalise(url)


def test_severity_override_can_switch_a_check_off():
    config = Config.load(os.path.join(QA_ROOT, "config", "site.yaml"))
    config.data["severity_overrides"]["perf.page_weight"] = "OFF"
    assert config.severity_for("perf.page_weight", Severity.WARNING) is None
