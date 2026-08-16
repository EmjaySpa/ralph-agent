"""Session fixtures: build both fixture sites, serve them, crawl them once and
share the analysed results with every test."""
from __future__ import annotations

import os
import sys
import tempfile

import pytest

QA_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, QA_ROOT)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from emjay_qa.browser import probe_site  # noqa: E402
from emjay_qa.config import Config  # noqa: E402
from emjay_qa.crawl import Crawler  # noqa: E402
from emjay_qa.runner import run_checks  # noqa: E402
from fixtures import build_site  # noqa: E402
from fixture_server import free_port, serve  # noqa: E402

CONFIG_PATH = os.path.join(QA_ROOT, "config", "site.yaml")
DEFECTS_PATH = os.path.join(QA_ROOT, "config", "known_defects.yaml")


def _fixture_config(base_url: str, browser: bool) -> Config:
    """The production config, retargeted at a fixture. Nothing about the checks
    changes: only the base URL, politeness settings and the host-variant probe,
    which is meaningless against a single-port test server."""
    config = Config.load(
        CONFIG_PATH,
        DEFECTS_PATH,
        {
            "site.base_url": base_url,
            "site.internal_hosts": ["127.0.0.1", base_url.split("//")[-1]],
            "site.owned_external_hosts": [],
            "crawl.delay_seconds": 0.0,
            "crawl.check_host_variants": False,
            "crawl.max_pages": 40,
            "runtime.enabled": browser,
            "runtime.max_pages": 4,
            "sitemaps.candidates": ["/sitemap.xml"],
        },
    )
    return config


def _analyse(directory: str, base_url: str, browser: bool):
    config = _fixture_config(base_url, browser)
    site = Crawler(config).run()
    if browser:
        probe_site(site)
    return run_checks(site)


@pytest.fixture(scope="session")
def fixture_root():
    with tempfile.TemporaryDirectory(prefix="emjay-qa-fixtures-") as tmp:
        clean_port, dirty_port = free_port(), free_port()
        clean_base = f"http://127.0.0.1:{clean_port}"
        dirty_base = f"http://127.0.0.1:{dirty_port}"
        build_site.build(tmp, clean_base, dirty_base)

        clean_server, _ = serve(os.path.join(tmp, "clean"), clean_port)
        dirty_server, _ = serve(os.path.join(tmp, "dirty"), dirty_port)
        try:
            yield {"root": tmp, "clean": clean_base, "dirty": dirty_base}
        finally:
            clean_server.shutdown()
            dirty_server.shutdown()


@pytest.fixture(scope="session")
def browser_enabled() -> bool:
    if os.environ.get("EMJAY_QA_NO_BROWSER"):
        return False
    try:
        import playwright  # noqa: F401
    except ImportError:
        return False
    return True


@pytest.fixture(scope="session")
def dirty_run(fixture_root, browser_enabled):
    return _analyse(os.path.join(fixture_root["root"], "dirty"), fixture_root["dirty"], browser_enabled)


@pytest.fixture(scope="session")
def clean_run(fixture_root, browser_enabled):
    return _analyse(os.path.join(fixture_root["root"], "clean"), fixture_root["clean"], browser_enabled)


@pytest.fixture(scope="session")
def dirty_static_run(fixture_root):
    """Static-only pass, used to prove the suite still works with no browser."""
    return _analyse(os.path.join(fixture_root["root"], "dirty"), fixture_root["dirty"], False)
