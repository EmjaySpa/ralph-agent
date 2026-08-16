"""The live regression gate.

Skipped unless EMJAY_QA_LIVE=1, because it makes real requests to the
production site. This is the test that decides whether Emjay can be declared
GREEN: it crawls the real site, runs every check, and fails on any FAIL.

    EMJAY_QA_LIVE=1 pytest qa/tests/test_live_site.py -v

Everything it does is read-only: GET and HEAD requests plus headless page
loads. No form is submitted and no content is modified.
"""
from __future__ import annotations

import os

import pytest

from emjay_qa.browser import probe_site
from emjay_qa.config import Config
from emjay_qa.crawl import Crawler
from emjay_qa.models import Severity
from emjay_qa.report import to_json, to_markdown
from emjay_qa.runner import run_checks

QA_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        os.environ.get("EMJAY_QA_LIVE") != "1",
        reason="set EMJAY_QA_LIVE=1 to run against the live site",
    ),
]


@pytest.fixture(scope="module")
def live_run():
    overrides = {}
    if os.environ.get("EMJAY_QA_BASE_URL"):
        overrides["site.base_url"] = os.environ["EMJAY_QA_BASE_URL"].rstrip("/")
    if os.environ.get("EMJAY_QA_NO_BROWSER"):
        overrides["runtime.enabled"] = False
    config = Config.load(
        os.path.join(QA_ROOT, "config", "site.yaml"),
        os.path.join(QA_ROOT, "config", "known_defects.yaml"),
        overrides,
    )
    site = Crawler(config).run()
    if config.get("runtime.enabled", True):
        probe_site(site)
    run = run_checks(site)

    out_dir = os.environ.get("EMJAY_QA_OUT_DIR", os.path.join(QA_ROOT, "reports"))
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "report.md"), "w", encoding="utf-8") as handle:
        handle.write(to_markdown(run))
    with open(os.path.join(out_dir, "report.json"), "w", encoding="utf-8") as handle:
        handle.write(to_json(run))
    return run


def test_the_crawl_reached_the_site(live_run):
    assert live_run.site.pages, "no pages were crawled: check DNS, TLS and egress policy"
    assert any(page.fetch.ok for page in live_run.site.pages.values())


def test_no_known_defect_has_returned(live_run):
    regressions = [
        f
        for f in live_run.findings
        if f.check_id == "regression.known_defect" and f.severity is Severity.FAIL
    ]
    assert not regressions, "\n".join(f"{f.title}: {f.detail}" for f in regressions)


def test_site_has_no_failures(live_run):
    """The GREEN gate."""
    failures = [
        f"{result.meta.id}: {len(result.findings)} finding(s) - "
        + "; ".join(f"{f.title} {f.url or ''}".strip() for f in result.findings[:3])
        for result in live_run.results
        if result.status is Severity.FAIL
    ]
    assert not failures, "\n".join(failures)


def test_suite_made_no_changes(live_run):
    assert live_run.site.methods_used <= {"GET", "HEAD"}
