"""Breadth-first, read-only crawl that produces a Site model.

The crawl is the only part of the suite that touches the network. Checks run
against the resulting Site object, so a saved crawl can be re-analysed without
hitting the site again.
"""
from __future__ import annotations

import datetime as _dt
import re
import xml.etree.ElementTree as ET
from collections import deque
from typing import Callable, Dict, List, Optional, Set
from urllib.parse import urlparse

from .config import Config
from .http import Fetcher
from .models import FetchResult, Site, SitemapInfo
from .parse import parse_page

Reporter = Callable[[str], None]


def _noop(_: str) -> None:
    return None


def _strip_ns(tag: str) -> str:
    return tag.split("}")[-1]


class Crawler:
    def __init__(self, config: Config, fetcher: Optional[Fetcher] = None, log: Reporter = _noop):
        self.config = config
        self.fetcher = fetcher or Fetcher(config)
        self.log = log
        self.site = Site(config=config)

    # ------------------------------------------------------------------ run
    def run(self) -> Site:
        self.site.started_at = _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
        base = self.config.base_url

        self.log("fetching robots.txt")
        self.site.robots = self.fetcher.robots(base)

        self.log("reading sitemaps")
        self._collect_sitemaps()

        self.log("crawling pages")
        self._crawl_pages()

        self.log("checking off-site links")
        self._check_external_links()

        self.log("measuring assets")
        self._collect_assets()

        self.log("probing retired URLs")
        self._check_legacy_urls()

        if self.config.get("crawl.check_host_variants", True):
            self.log("probing host variants")
            self._check_host_variants()

        self.site.methods_used = set(self.fetcher.methods_used)
        self.site.finished_at = _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
        return self.site

    # ------------------------------------------------------------- sitemaps
    def _collect_sitemaps(self) -> None:
        candidates: List[str] = []
        for path in self.config.get("sitemaps.candidates", []) or []:
            candidates.append(self.config.base_url + path)
        candidates.extend(self.site.robots.sitemaps)

        seen: Set[str] = set()
        queue = deque(dict.fromkeys(candidates))
        while queue:
            url = queue.popleft()
            url = self.config.normalise(url)
            if url in seen:
                continue
            seen.add(url)
            result = self.fetcher.fetch(url)
            self.site.fetches[url] = result
            info = SitemapInfo(url=url, status=result.status, error=result.error)
            if result.ok and result.text:
                try:
                    root = ET.fromstring(result.text.strip())
                except ET.ParseError as exc:
                    info.error = f"XML parse error: {exc}"
                else:
                    info.is_index = _strip_ns(root.tag) == "sitemapindex"
                    locs = [
                        self.config.normalise(node.text.strip())
                        for node in root.iter()
                        if _strip_ns(node.tag) == "loc" and (node.text or "").strip()
                    ]
                    if info.is_index:
                        info.child_sitemaps = locs
                        queue.extend(locs)
                    else:
                        info.urls = locs
                        self.site.sitemap_urls.update(locs)
            if result.status is not None or result.error:
                self.site.sitemaps.append(info)

    # ---------------------------------------------------------------- pages
    def _crawl_pages(self) -> None:
        max_pages = int(self.config.get("crawl.max_pages", 300))
        max_depth = int(self.config.get("crawl.max_depth", 6))
        start = self.config.normalise(self.config.base_url + "/")

        queue: deque = deque([(start, 0, None)])
        seen_identity: Dict[str, str] = {}

        while queue:
            if len(self.site.pages) >= max_pages:
                self.site.notes.append(f"crawl stopped at max_pages={max_pages}")
                break
            url, depth, parent = queue.popleft()

            identity = self.config.identity(url)
            if identity in seen_identity:
                continue
            if depth > max_depth:
                self.site.skipped[url] = f"deeper than max_depth={max_depth}"
                continue
            excluded = self.config.should_exclude(url)
            if excluded:
                self.site.skipped[url] = f"excluded by pattern {excluded}"
                continue
            if not self.fetcher.allowed_by_robots(url):
                self.site.skipped[url] = "disallowed by robots.txt"
                continue

            seen_identity[identity] = url
            result = self.fetcher.fetch(url)
            self.site.fetches[url] = result
            page = parse_page(url, result, self.config, depth=depth, discovered_from=parent)
            self.site.pages[url] = page
            self.log(f"  [{len(self.site.pages)}] {result.status or 'ERR'} {url}")

            if not (result.ok and result.is_html):
                continue
            next_depth = (depth + 1) if depth >= 0 else 1
            for link in page.links:
                if link.element != "a" or not link.is_internal:
                    continue
                target = link.resolved_url
                if self.config.identity(target) in seen_identity:
                    continue
                if not urlparse(target).scheme.startswith("http"):
                    continue
                queue.append((target, next_depth, url))

        # Second pass: anything in a sitemap that the link graph never reached.
        # depth -1 marks "not reachable by following links from the home page",
        # which is exactly what the orphan check looks for.
        for url in sorted(self.site.sitemap_urls):
            if len(self.site.pages) >= max_pages:
                self.site.notes.append(f"sitemap pass stopped at max_pages={max_pages}")
                break
            if not self.config.is_internal(url):
                continue
            identity = self.config.identity(url)
            if identity in seen_identity:
                continue
            if self.config.should_exclude(url) or not self.fetcher.allowed_by_robots(url):
                continue
            seen_identity[identity] = url
            result = self.fetcher.fetch(url)
            self.site.fetches[url] = result
            self.site.pages[url] = parse_page(url, result, self.config, depth=-1, discovered_from="sitemap")
            self.log(f"  [sitemap-only] {result.status or 'ERR'} {url}")

    # ------------------------------------------------------------- external
    def _check_external_links(self) -> None:
        targets: Set[str] = set()
        for page in self.site.pages.values():
            for link in page.links:
                if link.is_internal:
                    continue
                if not urlparse(link.resolved_url).scheme.startswith("http"):
                    continue
                targets.add(link.resolved_url)
        for url in sorted(targets):
            result = self.fetcher.fetch(url, method="HEAD", want_body=False)
            # Plenty of hosts reject HEAD; retry once with GET before believing it.
            if result.status in (403, 405, 501) or result.status is None:
                result = self.fetcher.fetch(url, method="GET", want_body=False)
            self.site.external[url] = result
            self.site.fetches.setdefault(url, result)

    # --------------------------------------------------------------- assets
    def _collect_assets(self) -> None:
        css_urls: Set[str] = set()
        other_assets: Set[str] = set()
        for page in self.site.pages.values():
            css_urls.update(page.stylesheet_urls)
            other_assets.update(page.script_urls)
            other_assets.update(img.resolved_src for img in page.images if img.resolved_src)

        for url in sorted(css_urls):
            if not urlparse(url).scheme.startswith("http"):
                continue
            result = self.fetcher.fetch(url)
            self.site.assets[url] = result
            if result.ok:
                text = result.text
                if text is None and result.bytes:
                    # Content-Type was not text/css; refetch is pointless, note it.
                    text = ""
                self.site.stylesheets[url] = text or ""

        for url in sorted(other_assets):
            if not urlparse(url).scheme.startswith("http"):
                continue
            if url in self.site.assets:
                continue
            result = self.fetcher.fetch(url, method="HEAD", want_body=False)
            if result.status in (403, 405, 501) or result.status is None:
                result = self.fetcher.fetch(url, method="GET", want_body=False)
            self.site.assets[url] = result

    # --------------------------------------------------------------- legacy
    def _check_legacy_urls(self) -> None:
        for entry in self.config.get("legacy_urls", []) or []:
            path = entry.get("path")
            if not path:
                continue
            url = self.config.base_url + path
            self.site.legacy[path] = self.fetcher.fetch(url, want_body=False)


    # -------------------------------------------------------- host variants
    def _check_host_variants(self) -> None:
        """Every scheme/www combination must land on one canonical home page."""
        parsed = urlparse(self.config.base_url)
        host = parsed.netloc
        bare = host[4:] if host.startswith("www.") else host
        variants = [
            f"http://{bare}/",
            f"https://{bare}/",
            f"http://www.{bare}/",
            f"https://www.{bare}/",
        ]
        for url in variants:
            self.site.host_variants[url] = self.fetcher.fetch(url, want_body=False)


def load_stylesheet_text(site: Site) -> str:
    """All CSS the site serves, concatenated. Used by the static brand checks."""
    return "\n".join(site.stylesheets.values())


CSS_IMPORT_RE = re.compile(r"@import\s+(?:url\()?['\"]?([^'\")]+)", re.IGNORECASE)
