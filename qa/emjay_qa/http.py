"""Read-only HTTP layer.

Two guarantees this module enforces so the suite can never alter the live site:

1. Only GET and HEAD are ever sent. Any other method raises.
2. Redirects are followed manually so every hop is recorded, and the hop limit
   is hard-capped.
"""
from __future__ import annotations

import time
import urllib.robotparser
from typing import Dict, Optional
from urllib.parse import urlparse

import requests

from .config import Config
from .models import FetchResult, RobotsInfo

SAFE_METHODS = {"GET", "HEAD"}
MAX_HOPS = 10
MAX_BODY_BYTES = 8 * 1024 * 1024


class UnsafeMethodError(RuntimeError):
    pass


class Fetcher:
    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": config.get("crawl.user_agent", "EmjayQA/1.0"),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-AU,en;q=0.9",
                "Accept-Encoding": "gzip, deflate",
            }
        )
        self.timeout = float(config.get("crawl.timeout_seconds", 25))
        self.delay = float(config.get("crawl.delay_seconds", 0.7))
        self.verify = bool(config.get("crawl.verify_tls", True))
        self._cache: Dict[str, FetchResult] = {}
        self._last_hit: Dict[str, float] = {}
        self._robots: Dict[str, urllib.robotparser.RobotFileParser] = {}
        self.request_count = 0
        self.methods_used: set = set()

    # ------------------------------------------------------------------ core
    def _throttle(self, url: str) -> None:
        host = urlparse(url).netloc
        last = self._last_hit.get(host)
        if last is not None:
            wait = self.delay - (time.time() - last)
            if wait > 0:
                time.sleep(wait)
        self._last_hit[host] = time.time()

    def fetch(
        self,
        url: str,
        method: str = "GET",
        want_body: bool = True,
        use_cache: bool = True,
    ) -> FetchResult:
        method = method.upper()
        if method not in SAFE_METHODS:
            raise UnsafeMethodError(f"{method} is not permitted: this suite is read-only")
        self.methods_used.add(method)

        cache_key = f"{method}:{url}:{int(want_body)}"
        if use_cache and cache_key in self._cache:
            return self._cache[cache_key]

        result = FetchResult(url=url)
        current = url
        started = time.time()
        try:
            for _ in range(MAX_HOPS):
                self._throttle(current)
                self.request_count += 1
                response = self.session.request(
                    method,
                    current,
                    allow_redirects=False,
                    timeout=self.timeout,
                    verify=self.verify,
                    stream=True,
                )
                result.chain.append((current, response.status_code))
                if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    response.close()
                    if not location:
                        result.error = f"{response.status_code} with no Location header"
                        break
                    current = requests.compat.urljoin(current, location)
                    continue

                result.status = response.status_code
                result.final_url = current
                result.headers = {k.lower(): v for k, v in response.headers.items()}
                result.content_type = result.headers.get("content-type", "")
                body = b""
                if want_body and method == "GET":
                    for chunk in response.iter_content(65536):
                        body += chunk
                        if len(body) > MAX_BODY_BYTES:
                            result.error = "body truncated at 8MB"
                            break
                    result.bytes = len(body)
                    lowered = (result.content_type or "").lower()
                    textual = result.is_html or any(
                        kind in lowered for kind in ("xml", "json", "css", "javascript", "text/")
                    )
                    if textual:
                        encoding = response.encoding or "utf-8"
                        try:
                            result.text = body.decode(encoding, errors="replace")
                        except LookupError:
                            result.text = body.decode("utf-8", errors="replace")
                else:
                    result.bytes = int(result.headers.get("content-length") or 0)
                response.close()
                break
            else:
                result.error = f"redirect loop: more than {MAX_HOPS} hops"
        except requests.RequestException as exc:
            result.error = f"{type(exc).__name__}: {exc}"
        except Exception as exc:  # pragma: no cover - defensive
            result.error = f"{type(exc).__name__}: {exc}"

        if result.status is None and result.chain and not result.error:
            result.status = result.chain[-1][1]
            result.final_url = result.chain[-1][0]
        result.final_url = result.final_url or current
        result.elapsed_ms = (time.time() - started) * 1000.0
        if use_cache:
            self._cache[cache_key] = result
        return result

    # --------------------------------------------------------------- robots
    def robots(self, base_url: str) -> RobotsInfo:
        robots_url = requests.compat.urljoin(base_url + "/", "/robots.txt")
        result = self.fetch(robots_url)
        info = RobotsInfo(url=robots_url, status=result.status, error=result.error)
        text = result.text or ""
        info.text = text
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.lower().startswith("sitemap:"):
                info.sitemaps.append(stripped.split(":", 1)[1].strip())
        parser = urllib.robotparser.RobotFileParser()
        parser.parse(text.splitlines())
        self._robots[urlparse(base_url).netloc] = parser
        agent = self.config.get("crawl.user_agent", "EmjayQA/1.0")
        info.disallow_all = bool(text.strip()) and not parser.can_fetch(agent, base_url + "/")
        return info

    def allowed_by_robots(self, url: str) -> bool:
        if not self.config.get("crawl.obey_robots", True):
            return True
        parser = self._robots.get(urlparse(url).netloc)
        if parser is None:
            return True
        return parser.can_fetch(self.config.get("crawl.user_agent", "EmjayQA/1.0"), url)

    def cached(self, url: str) -> Optional[FetchResult]:
        for key, value in self._cache.items():
            if key.split(":", 1)[1].rsplit(":", 1)[0] == url:
                return value
        return None
