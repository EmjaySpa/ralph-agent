"""HTML -> PageSnapshot. Pure parsing, no network access."""
from __future__ import annotations

import hashlib
import re
from typing import List, Optional, Set
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from .config import Config
from .models import FetchResult, FormField, FormInfo, HeadingRef, ImageRef, LinkRef, PageSnapshot

BOILERPLATE_TAGS = {"header", "nav", "footer"}
BOILERPLATE_CLASS_RE = re.compile(r"(^|[\s_-])(nav|menu|header|footer|breadcrumb|sidebar)([\s_-]|$)", re.IGNORECASE)
NON_TEXT_TAGS = {"script", "style", "noscript", "template", "svg", "iframe"}


def _soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:  # lxml missing in a slim environment
        return BeautifulSoup(html, "html.parser")


def accessible_name(node: Tag) -> str:
    """Text a screen reader would announce for a link or button: visible text,
    else aria-label, else the alt text of any image inside it."""
    text = node.get_text(separator=" ", strip=True)
    if text:
        return text
    for attr in ("aria-label", "title"):
        value = (node.get(attr) or "").strip()
        if value:
            return value
    alts = [(img.get("alt") or "").strip() for img in node.find_all("img")]
    return " ".join(a for a in alts if a).strip()


def _in_boilerplate(node: Tag) -> bool:
    for parent in node.parents:
        if not isinstance(parent, Tag):
            continue
        if parent.name in BOILERPLATE_TAGS:
            return True
        classes = " ".join(parent.get("class") or [])
        node_id = parent.get("id") or ""
        if BOILERPLATE_CLASS_RE.search(classes) or BOILERPLATE_CLASS_RE.search(node_id):
            return True
        if parent.get("role") in {"navigation", "banner", "contentinfo"}:
            return True
    return False


def visible_text(soup: BeautifulSoup) -> str:
    clone = _soup(str(soup))
    for tag in clone.find_all(list(NON_TEXT_TAGS)):
        tag.decompose()
    text = clone.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


def shingles(text: str, size: int = 5) -> Set[int]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    if len(words) < size:
        return {hash(" ".join(words))} if words else set()
    return {
        int(hashlib.md5(" ".join(words[i : i + size]).encode("utf-8")).hexdigest()[:12], 16)
        for i in range(len(words) - size + 1)
    }


def _label_for_field(node: Tag, soup: BeautifulSoup) -> tuple[bool, str]:
    if node.get("aria-label", "").strip():
        return True, "aria-label"
    if node.get("aria-labelledby", "").strip():
        target = node.get("aria-labelledby").split()[0]
        return (bool(soup.find(id=target)), "aria-labelledby")
    field_id = node.get("id", "").strip()
    if field_id and soup.find("label", attrs={"for": field_id}):
        return True, "label-for"
    for parent in node.parents:
        if isinstance(parent, Tag) and parent.name == "label":
            return True, "wrapped"
    if node.get("title", "").strip():
        return True, "title-attr"
    if node.get("placeholder", "").strip():
        return False, "placeholder-only"
    return False, "none"


def _detect_form_provider(action: str, form: Tag) -> str:
    haystack = " ".join(
        [action or "", " ".join(form.get("class") or []), form.get("id") or "", str(form.get("data-provider") or "")]
    ).lower()
    for needle, provider in (
        ("gravityform", "Gravity Forms"),
        ("gform", "Gravity Forms"),
        ("wpcf7", "Contact Form 7"),
        ("wpforms", "WPForms"),
        ("ninja", "Ninja Forms"),
        ("fluentform", "Fluent Forms"),
        ("mailerlite", "MailerLite"),
        ("mailchimp", "Mailchimp"),
        ("hsforms", "HubSpot"),
        ("et_pb_contact", "Divi Contact Module"),
    ):
        if needle in haystack:
            return provider
    return ""


def parse_page(
    url: str,
    fetch: FetchResult,
    config: Config,
    depth: int = 0,
    discovered_from: Optional[str] = None,
) -> PageSnapshot:
    html = fetch.text or ""
    page = PageSnapshot(url=url, fetch=fetch, depth=depth, discovered_from=discovered_from, html=html)
    if not html.strip():
        return page

    soup = _soup(html)
    base_url = fetch.final_url or url

    html_tag = soup.find("html")
    page.lang = (html_tag.get("lang") or "").strip() if html_tag else ""

    titles = [t.get_text(strip=True) for t in soup.find_all("title")]
    page.title_count = len(titles)
    page.title = titles[0] if titles else None

    descriptions = [
        (m.get("content") or "").strip()
        for m in soup.find_all("meta")
        if (m.get("name") or "").lower() == "description"
    ]
    page.meta_description_count = len(descriptions)
    page.meta_description = descriptions[0] if descriptions else None

    robots_values = [
        (m.get("content") or "").strip()
        for m in soup.find_all("meta")
        if (m.get("name") or "").lower() in {"robots", "googlebot"}
    ]
    page.meta_robots = ", ".join(v for v in robots_values if v)
    page.x_robots_tag = fetch.headers.get("x-robots-tag", "")

    canonicals = [
        (link.get("href") or "").strip()
        for link in soup.find_all("link")
        if "canonical" in [r.lower() for r in (link.get("rel") or [])]
    ]
    page.canonical_count = len(canonicals)
    page.canonical = config.normalise(canonicals[0], base_url) if canonicals and canonicals[0] else None

    viewport = soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)})
    page.viewport = (viewport.get("content") or "").strip() if viewport else ""

    page.og = {
        (m.get("property") or "").lower(): (m.get("content") or "").strip()
        for m in soup.find_all("meta")
        if (m.get("property") or "").lower().startswith("og:")
    }

    for level in range(1, 7):
        for node in soup.find_all(f"h{level}"):
            text = node.get_text(separator=" ", strip=True)
            has_img_alt = any((img.get("alt") or "").strip() for img in node.find_all("img"))
            page.headings.append(HeadingRef(level=level, text=text, empty=not text and not has_img_alt))

    for node in soup.find_all("img"):
        src = (node.get("src") or node.get("data-src") or node.get("data-lazy-src") or "").strip()
        page.images.append(
            ImageRef(
                src=src,
                resolved_src=config.normalise(src, base_url) if src else "",
                alt=node.get("alt") if node.has_attr("alt") else None,
                role=(node.get("role") or "").strip(),
                aria_hidden=(node.get("aria-hidden") or "").lower() == "true",
                width_attr=(node.get("width") or "").strip(),
                height_attr=(node.get("height") or "").strip(),
                loading=(node.get("loading") or "").strip(),
                in_nav=_in_boilerplate(node),
            )
        )

    def add_link(node: Tag, href: str, element: str) -> None:
        href = (href or "").strip()
        if not href or href.lower().startswith(("javascript:", "data:")):
            return
        scheme = urlparse(href).scheme.lower()
        if scheme and scheme not in {"http", "https"}:
            # mailto:, tel:, sms: and friends: recorded, never fetched.
            page.links.append(
                LinkRef(
                    source_url=url,
                    raw_href=href,
                    resolved_url=href,
                    anchor_text=accessible_name(node) if element == "a" else "",
                    element=element,
                    is_internal=False,
                    in_nav=_in_boilerplate(node),
                )
            )
            return
        if href.startswith("#"):
            resolved, fragment = config.normalise(base_url), href[1:]
        else:
            absolute = urljoin(base_url, href)
            fragment = urlparse(absolute).fragment
            resolved = config.normalise(absolute)
        rel = " ".join(node.get("rel") or []) if isinstance(node.get("rel"), list) else (node.get("rel") or "")
        page.links.append(
            LinkRef(
                source_url=url,
                raw_href=href,
                resolved_url=resolved,
                fragment=fragment,
                anchor_text=accessible_name(node) if element == "a" else "",
                rel=rel,
                element=element,
                is_internal=config.is_internal(resolved),
                in_nav=_in_boilerplate(node),
            )
        )

    for node in soup.find_all("a"):
        href = (node.get("href") or "").strip()
        if not href or href.lower().startswith(("javascript:", "data:")):
            continue
        add_link(node, href, "a")
    for node in soup.find_all("link", href=True):
        rels = [r.lower() for r in (node.get("rel") or [])]
        if "stylesheet" in rels:
            resolved = config.normalise(node["href"], base_url)
            page.stylesheet_urls.append(resolved)
            add_link(node, node["href"], "link")
    for node in soup.find_all("script", src=True):
        page.script_urls.append(config.normalise(node["src"], base_url))
        add_link(node, node["src"], "script")
    for node in soup.find_all("iframe", src=True):
        add_link(node, node["src"], "iframe")

    for form in soup.find_all("form"):
        action = (form.get("action") or "").strip()
        info = FormInfo(
            action=action,
            resolved_action=config.normalise(action, base_url) if action else config.normalise(base_url),
            method=(form.get("method") or "get").lower(),
            provider=_detect_form_provider(action, form),
        )
        for node in form.find_all(["input", "select", "textarea", "button"]):
            field_type = (node.get("type") or ("textarea" if node.name == "textarea" else "text")).lower()
            if node.name == "button" or field_type in {"submit", "image"}:
                info.has_submit = True
                if node.name == "button" and (node.get("type") or "submit").lower() != "submit":
                    info.has_submit = info.has_submit or False
                continue
            if field_type in {"hidden"}:
                continue
            if field_type == "search" or (node.get("name") or "") in {"s", "q", "search"}:
                info.is_search = True
            has_label, source = _label_for_field(node, soup)
            info.fields.append(
                FormField(
                    tag=node.name,
                    name=(node.get("name") or "").strip(),
                    field_type=field_type,
                    required=node.has_attr("required") or (node.get("aria-required") or "").lower() == "true",
                    has_label=has_label,
                    label_source=source,
                    field_id=(node.get("id") or "").strip(),
                )
            )
        page.forms.append(info)

    for node in soup.find_all("script"):
        script_type = (node.get("type") or "").lower()
        if script_type == "application/ld+json":
            page.jsonld_raw.append(node.string or node.get_text() or "")

    for node in soup.find_all("style"):
        page.inline_styles.append(node.get_text() or "")
    for node in soup.find_all(style=True):
        page.inline_styles.append(node["style"])

    page.element_ids = [node["id"] for node in soup.find_all(id=True)]

    page.text = visible_text(soup)
    page.word_count = len(re.findall(r"[A-Za-z0-9']+", page.text))
    page.shingles = shingles(page.text)
    return page


def anchor_targets(html: str) -> Set[str]:
    """ids and legacy <a name> targets available on a page."""
    soup = _soup(html)
    targets = {node["id"] for node in soup.find_all(id=True)}
    targets |= {node["name"] for node in soup.find_all("a", attrs={"name": True})}
    return targets


def internal_links_of(page: PageSnapshot) -> List[LinkRef]:
    return [link for link in page.links if link.element == "a" and link.is_internal]
