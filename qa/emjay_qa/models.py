"""Core data model shared by the crawler, the checks and the reporter."""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


class Severity(enum.Enum):
    PASS = "PASS"
    INFO = "INFO"
    WARNING = "WARNING"
    FAIL = "FAIL"

    @property
    def rank(self) -> int:
        return {"PASS": 0, "INFO": 1, "WARNING": 2, "FAIL": 3}[self.value]

    @classmethod
    def parse(cls, value: str) -> "Severity":
        return cls(str(value).strip().upper())


@dataclass
class Finding:
    """A single observation. Findings are evidence, not instructions.

    The suite reports what it measured and where. It never proposes replacement
    copy, design or SEO text: remediation is somebody else's job.
    """

    check_id: str
    severity: Severity
    title: str
    url: Optional[str] = None
    detail: str = ""
    evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_id": self.check_id,
            "severity": self.severity.value,
            "title": self.title,
            "url": self.url,
            "detail": self.detail,
            "evidence": self.evidence,
        }


@dataclass
class LinkRef:
    """One outbound reference from a page."""

    source_url: str
    raw_href: str
    resolved_url: str          # absolute, query-normalised, fragment stripped
    fragment: str = ""
    anchor_text: str = ""
    rel: str = ""
    element: str = "a"         # a | img | link | script | iframe | form | source
    is_internal: bool = False
    in_nav: bool = False       # inside header/nav/footer, i.e. boilerplate


@dataclass
class FetchResult:
    url: str
    final_url: str = ""
    status: Optional[int] = None
    chain: List[Tuple[str, int]] = field(default_factory=list)  # (url, status) per hop
    headers: Dict[str, str] = field(default_factory=dict)
    elapsed_ms: float = 0.0
    bytes: int = 0
    content_type: str = ""
    text: Optional[str] = None
    error: str = ""

    @property
    def ok(self) -> bool:
        return self.status is not None and 200 <= self.status < 300

    @property
    def hops(self) -> int:
        return max(0, len(self.chain) - 1)

    @property
    def is_html(self) -> bool:
        return "html" in (self.content_type or "").lower()


@dataclass
class FormField:
    tag: str
    name: str = ""
    field_type: str = ""
    required: bool = False
    has_label: bool = False
    label_source: str = ""     # label-for | aria-label | aria-labelledby | wrapped | placeholder-only | none
    field_id: str = ""


@dataclass
class FormInfo:
    action: str = ""
    resolved_action: str = ""
    method: str = "get"
    fields: List[FormField] = field(default_factory=list)
    has_submit: bool = False
    is_search: bool = False
    provider: str = ""         # detected third-party form provider, if any


@dataclass
class ImageRef:
    src: str
    resolved_src: str = ""
    alt: Optional[str] = None      # None means the attribute is absent entirely
    role: str = ""
    aria_hidden: bool = False
    width_attr: str = ""
    height_attr: str = ""
    loading: str = ""
    in_nav: bool = False


@dataclass
class HeadingRef:
    level: int
    text: str
    empty: bool = False


@dataclass
class PageSnapshot:
    """Everything the static layer knows about one HTML page."""

    url: str                       # normalised URL used as the identity key
    fetch: FetchResult = None      # type: ignore[assignment]
    depth: int = 0
    discovered_from: Optional[str] = None

    html: str = ""
    text: str = ""                 # visible text, script/style stripped
    lang: str = ""
    title: Optional[str] = None
    title_count: int = 0
    meta_description: Optional[str] = None
    meta_description_count: int = 0
    meta_robots: str = ""
    x_robots_tag: str = ""
    canonical: Optional[str] = None
    canonical_count: int = 0
    viewport: str = ""
    og: Dict[str, str] = field(default_factory=dict)

    headings: List[HeadingRef] = field(default_factory=list)
    images: List[ImageRef] = field(default_factory=list)
    links: List[LinkRef] = field(default_factory=list)
    forms: List[FormInfo] = field(default_factory=list)
    jsonld_raw: List[str] = field(default_factory=list)
    inline_styles: List[str] = field(default_factory=list)   # <style> blocks + style="" values
    stylesheet_urls: List[str] = field(default_factory=list)
    script_urls: List[str] = field(default_factory=list)
    element_ids: List[str] = field(default_factory=list)
    word_count: int = 0
    shingles: Set[int] = field(default_factory=set)

    @property
    def path(self) -> str:
        from urllib.parse import urlparse

        return urlparse(self.url).path or "/"

    @property
    def status(self) -> Optional[int]:
        return self.fetch.status if self.fetch else None

    def headings_at(self, level: int) -> List[HeadingRef]:
        return [h for h in self.headings if h.level == level]


@dataclass
class RuntimeResult:
    """What the headless browser saw for one page."""

    url: str
    ok: bool = False
    error: str = ""
    console_errors: List[Dict[str, str]] = field(default_factory=list)
    page_errors: List[str] = field(default_factory=list)
    failed_requests: List[Dict[str, Any]] = field(default_factory=list)
    overflow_px: float = 0.0
    overflow_elements: List[Dict[str, Any]] = field(default_factory=list)
    computed_colours: Dict[str, List[str]] = field(default_factory=dict)   # hex -> sample selectors
    computed_fonts: Dict[str, List[str]] = field(default_factory=dict)     # family -> sample selectors
    contrast_issues: List[Dict[str, Any]] = field(default_factory=list)
    contrast_samples: int = 0
    timings: Dict[str, float] = field(default_factory=dict)
    resource_count: int = 0
    transfer_bytes: int = 0


@dataclass
class SitemapInfo:
    url: str
    status: Optional[int] = None
    error: str = ""
    urls: List[str] = field(default_factory=list)
    child_sitemaps: List[str] = field(default_factory=list)
    is_index: bool = False


@dataclass
class RobotsInfo:
    url: str = ""
    status: Optional[int] = None
    text: str = ""
    sitemaps: List[str] = field(default_factory=list)
    disallow_all: bool = False
    error: str = ""


@dataclass
class Site:
    """The crawl result. Checks read this and never perform I/O themselves,
    which is what makes runs reproducible from a saved crawl."""

    config: Any
    pages: Dict[str, PageSnapshot] = field(default_factory=dict)
    fetches: Dict[str, FetchResult] = field(default_factory=dict)     # every URL fetched
    external: Dict[str, FetchResult] = field(default_factory=dict)    # off-site targets
    assets: Dict[str, FetchResult] = field(default_factory=dict)      # css/js/img
    stylesheets: Dict[str, str] = field(default_factory=dict)         # url -> css text
    sitemaps: List[SitemapInfo] = field(default_factory=list)
    sitemap_urls: Set[str] = field(default_factory=set)
    robots: RobotsInfo = field(default_factory=RobotsInfo)
    runtime: Dict[str, RuntimeResult] = field(default_factory=dict)
    legacy: Dict[str, FetchResult] = field(default_factory=dict)      # legacy path -> result
    host_variants: Dict[str, FetchResult] = field(default_factory=dict)  # scheme/www variants of the home page
    skipped: Dict[str, str] = field(default_factory=dict)             # url -> reason
    started_at: str = ""
    finished_at: str = ""
    browser_used: bool = False
    methods_used: Set[str] = field(default_factory=set)
    notes: List[str] = field(default_factory=list)

    def html_pages(self) -> Iterable[PageSnapshot]:
        """Crawled pages that returned real HTML with a 2xx status."""
        for page in self.pages.values():
            if page.fetch and page.fetch.ok and page.html:
                yield page

    def _live_index(self) -> Dict[str, str]:
        return {self.config.identity(page.url): page.url for page in self.html_pages()}

    def consolidated_to(self, url: str) -> Optional[str]:
        """The live page this URL canonicalises to, when that is a different
        page that was actually crawled and returned HTML.

        A canonical pointing at a live page means the two URLs are deliberately
        one page (a booking link with a tracking-free query string, say), so
        duplicate and orphan checks treat them as one. A canonical pointing at
        a 404 is a defect, not a consolidation, and is left alone here so the
        duplicate checks still see the page."""
        page = self.pages.get(url)
        if not page or not page.canonical:
            return None
        target = self._live_index().get(self.config.identity(page.canonical))
        if target and self.config.identity(target) != self.config.identity(url):
            return target
        return None

    def inbound_links(self) -> Dict[str, Set[str]]:
        inbound: Dict[str, Set[str]] = {url: set() for url in self.pages}
        live = self._live_index()

        def fold(url: str) -> str:
            page = self.pages.get(url)
            if page and page.canonical:
                target = live.get(self.config.identity(page.canonical))
                if target:
                    return target
            return url

        for page in self.pages.values():
            source = fold(page.url)
            for link in page.links:
                if link.element != "a" or not link.is_internal:
                    continue
                target = fold(link.resolved_url)
                if target in inbound and target != source:
                    inbound[target].add(source)
        return inbound
