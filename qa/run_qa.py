#!/usr/bin/env python3
"""Emjay Wellness QA suite entry point.

    python3 qa/run_qa.py                          # full run against the configured site
    python3 qa/run_qa.py --base-url http://...    # run against staging or a fixture
    python3 qa/run_qa.py --no-browser             # static layer only
    python3 qa/run_qa.py --save-crawl out/crawl.pkl
    python3 qa/run_qa.py --from-crawl out/crawl.pkl   # re-analyse without re-crawling

Exit codes: 0 = PASS (warnings allowed), 1 = FAIL, 2 = WARNING with
--fail-on-warning, 3 = suite error.
"""
from __future__ import annotations

import argparse
import os
import pickle
import sys
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from emjay_qa.browser import probe_site  # noqa: E402
from emjay_qa.config import Config  # noqa: E402
from emjay_qa.crawl import Crawler  # noqa: E402
from emjay_qa.models import Severity  # noqa: E402
from emjay_qa.report import console_summary, to_html, to_json, to_markdown  # noqa: E402
from emjay_qa.runner import run_checks  # noqa: E402

EXIT_PASS, EXIT_FAIL, EXIT_WARNING, EXIT_ERROR = 0, 1, 2, 3


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only QA suite for emjaywellness.com.au")
    parser.add_argument("--config", default=None, help="path to site.yaml")
    parser.add_argument("--defects", default=None, help="path to known_defects.yaml")
    parser.add_argument("--base-url", default=None, help="override the site under test")
    parser.add_argument("--max-pages", type=int, default=None)
    parser.add_argument("--max-depth", type=int, default=None)
    parser.add_argument("--delay", type=float, default=None, help="seconds between requests")
    parser.add_argument("--no-browser", action="store_true", help="skip the headless browser layer")
    parser.add_argument("--browser-pages", type=int, default=None, help="how many pages to render (0 = all)")
    parser.add_argument("--only", nargs="*", default=None, help="run only checks whose id starts with these prefixes")
    parser.add_argument("--out-dir", default=None, help="directory for report files (default qa/reports)")
    parser.add_argument("--save-crawl", default=None, help="write the crawl to a pickle for later re-analysis")
    parser.add_argument("--from-crawl", default=None, help="analyse a saved crawl instead of hitting the network")
    parser.add_argument("--fail-on-warning", action="store_true", help="exit non-zero when only warnings are present")
    parser.add_argument("--quiet", action="store_true")
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    log = (lambda _m: None) if args.quiet else (lambda m: print(m, flush=True))

    overrides = {}
    if args.base_url:
        overrides["site.base_url"] = args.base_url.rstrip("/")
    if args.max_pages is not None:
        overrides["crawl.max_pages"] = args.max_pages
    if args.max_depth is not None:
        overrides["crawl.max_depth"] = args.max_depth
    if args.delay is not None:
        overrides["crawl.delay_seconds"] = args.delay
    if args.no_browser:
        overrides["runtime.enabled"] = False
    if args.browser_pages is not None:
        overrides["runtime.max_pages"] = args.browser_pages

    config = Config.load(args.config, args.defects, overrides)

    if args.base_url:
        from urllib.parse import urlparse

        host = urlparse(config.base_url).netloc
        hosts = config.get("site.internal_hosts", []) or []
        if host and host not in hosts:
            config.set("site.internal_hosts", hosts + [host])

    if args.from_crawl:
        log(f"loading saved crawl from {args.from_crawl}")
        with open(args.from_crawl, "rb") as handle:
            site = pickle.load(handle)
        site.config = config
    else:
        log(f"crawling {config.base_url}")
        site = Crawler(config, log=log).run()
        if config.get("runtime.enabled", True):
            log("rendering pages in a headless browser")
            probe_site(site, log=log)

    if args.save_crawl:
        os.makedirs(os.path.dirname(os.path.abspath(args.save_crawl)), exist_ok=True)
        saved_config, site.config = site.config, None
        with open(args.save_crawl, "wb") as handle:
            pickle.dump(site, handle)
        site.config = saved_config
        log(f"crawl saved to {args.save_crawl}")

    log("running checks")
    run = run_checks(site, only=args.only, log=log)

    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
    os.makedirs(out_dir, exist_ok=True)
    paths = {
        "report.md": to_markdown(run),
        "report.json": to_json(run),
        "report.html": to_html(run),
    }
    for name, content in paths.items():
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as handle:
            handle.write(content)

    print(console_summary(run))
    print(f"reports written to {out_dir}")

    if run.verdict is Severity.FAIL:
        return EXIT_FAIL
    if run.verdict is Severity.WARNING:
        return EXIT_WARNING if args.fail_on_warning else EXIT_PASS
    return EXIT_PASS


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        sys.exit(EXIT_ERROR)
