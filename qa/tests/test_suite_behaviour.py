"""Meta-tests: does the QA suite itself work?

Two questions, asked of every check:
  1. Does it FAIL when the defect it exists to catch is present? (dirty site)
  2. Does it stay quiet when the site is clean? (clean site)

A QA suite nobody has tested is just an opinion, so these run in CI alongside
the live run.
"""
from __future__ import annotations

import pytest

from emjay_qa.checks import load_all
from emjay_qa.models import Severity
from fixtures.build_site import BROWSER_DEFECT_MAP, DEFECT_MAP
from tests_helpers import registry_ids


def _status(run, check_id: str) -> Severity:
    for result in run.results:
        if result.meta.id == check_id:
            return result.status
    raise AssertionError(f"check {check_id} did not run")


def _findings(run, check_id: str):
    return [f for f in run.findings if f.check_id == check_id]


# --------------------------------------------------------------- registry
def test_every_registered_check_runs(dirty_run):
    registry = load_all()
    ran = {result.meta.id for result in dirty_run.results}
    assert ran == set(registry), f"checks missing from the run: {set(registry) - ran}"


def test_defect_map_covers_registered_checks():
    """Every check in the registry is either exercised by the dirty fixture or
    explicitly listed as environment-dependent."""
    registry = set(load_all())
    covered = set(DEFECT_MAP) | set(BROWSER_DEFECT_MAP)
    environment_dependent = {
        # Nothing in a local fixture can trip these; they need the real site.
        "crawl.reachability",
        "crawl.coverage",
        "links.external_broken",
        "links.mixed_content",  # https-only; covered by test_check_units.py
        "links.anchor_target_missing",
        "redirect.host_canonicalisation",
        "redirect.self_redirect",
        "redirect.trailing_slash",
        "seo.title_multiple",
        "seo.title_length",
        "seo.meta_description_multiple",
        "seo.meta_description_length",
        "seo.social_preview",
        "seo.canonical_multiple",
        "seo.canonical_cluster",
        "seo.noindex_present",
        "seo.noindex_canonical_conflict",
        "seo.robots_header_meta_conflict",
        "seo.robots_blocked_but_linked",
        "sitemap.available",
        "sitemap.parse_errors",
        "sitemap.offsite_entries",
        "sitemap.coverage",
        "sitemap.declared_in_robots",
        "headings.h2_missing",
        "headings.h1_matches_topic",
        "schema.expected_types",
        "schema.url_consistency",
        "schema.nap_consistency",
        "brand.palette_conformance",
        "brand.font_conformance",
        "a11y.duplicate_ids",
        "a11y.skip_link",
        "forms.present",
        "forms.secure_action",
        "forms.no_side_effects",
        "content.retired_locations",
        "content.location_map",
        "content.empty_page",
        "content.near_duplicate_page",
        "structure.click_depth",
        "structure.few_internal_links",
        "structure.few_inbound_links",
        "structure.link_to_non_canonical",
        "perf.slow_response",
        "perf.page_weight",
        "perf.request_count",
        "perf.large_image",
        "perf.image_dimensions",
        "perf.caching_headers",
        "perf.compression",
        "perf.runtime_timings",
        "runtime.page_errors",
        "runtime.failed_requests",
        "runtime.coverage",
    }
    uncovered = registry - covered - environment_dependent
    assert not uncovered, f"checks with no fixture coverage and no exemption: {sorted(uncovered)}"


# ------------------------------------------------- detection on the dirty site
@pytest.mark.parametrize("check_id", sorted(DEFECT_MAP))
def test_static_defect_is_detected(dirty_run, check_id):
    expected, note = DEFECT_MAP[check_id]
    assert _status(dirty_run, check_id) is Severity.parse(expected), (
        f"{check_id} did not report {expected} on the dirty fixture ({note}); "
        f"findings: {[(f.severity.value, f.title) for f in _findings(dirty_run, check_id)]}"
    )


@pytest.mark.parametrize("check_id", sorted(BROWSER_DEFECT_MAP))
def test_browser_defect_is_detected(dirty_run, browser_enabled, check_id):
    if not browser_enabled:
        pytest.skip("browser layer unavailable")
    expected, note = BROWSER_DEFECT_MAP[check_id]
    assert _status(dirty_run, check_id) is Severity.parse(expected), (
        f"{check_id} did not report {expected} on the dirty fixture ({note}); "
        f"findings: {[(f.severity.value, f.title) for f in _findings(dirty_run, check_id)]}"
    )


def test_dirty_verdict_is_fail(dirty_run):
    assert dirty_run.verdict is Severity.FAIL


# ------------------------------------------------ no false alarms when clean
def test_clean_site_has_no_failures(clean_run):
    failures = {
        result.meta.id: [f"{f.title} :: {f.url or ''} :: {f.detail[:120]}" for f in result.findings]
        for result in clean_run.results
        if result.status is Severity.FAIL
    }
    assert not failures, f"false positives on the clean fixture: {failures}"


def test_clean_site_reports_no_known_defects(clean_run):
    regressions = [
        f for f in _findings(clean_run, "regression.known_defect") if f.severity is Severity.FAIL
    ]
    assert not regressions, [f.title for f in regressions]


# ------------------------------------------------------------- specific proof
def test_rogue_divi_blue_is_named_precisely(dirty_run):
    findings = _findings(dirty_run, "brand.banned_colour_static")
    assert any("#2EA3F2" in f.title for f in findings), [f.title for f in findings]


def test_retired_terms_are_each_reported(dirty_run):
    reported = {f.evidence.get("term", "").lower() for f in _findings(dirty_run, "content.retired_terms")}
    for term in ("emjay spa & wellness", "gift certificate", "midweek reset"):
        assert any(term in r for r in reported), f"{term} not reported; got {sorted(reported)}"


def test_known_defect_registry_entries_all_evaluated(dirty_run):
    findings = _findings(dirty_run, "regression.known_defect")
    evaluated = {f.evidence.get("defect_id") for f in findings}
    expected = registry_ids()
    assert evaluated >= expected, f"not every registry entry produced a result: {expected - evaluated}"


def test_orphan_and_duplicate_are_separate_findings(dirty_run):
    assert _findings(dirty_run, "structure.orphan_page")
    assert _findings(dirty_run, "content.duplicate_page")


def test_static_only_run_still_works(dirty_static_run):
    """The suite must degrade cleanly when no browser is available."""
    assert dirty_static_run.verdict is Severity.FAIL
    browser_checks = [r for r in dirty_static_run.results if r.meta.requires_browser]
    assert browser_checks, "no browser-dependent checks registered"
    assert all(r.skipped_reason for r in browser_checks), "browser checks should be marked skipped, not passed"


def test_no_unsafe_http_methods_were_used(dirty_run):
    assert dirty_run.site.methods_used <= {"GET", "HEAD"}, dirty_run.site.methods_used
