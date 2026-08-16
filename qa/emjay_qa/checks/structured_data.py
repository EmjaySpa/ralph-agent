"""JSON-LD structured data: parse errors, required properties, stale values."""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Iterable, List

from ..models import Finding, Severity, Site
from . import check, finding


def _iter_nodes(payload: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(payload, list):
        for item in payload:
            yield from _iter_nodes(item)
    elif isinstance(payload, dict):
        yield payload
        for key in ("@graph", "itemListElement", "mainEntity", "provider", "publisher", "author"):
            if key in payload:
                yield from _iter_nodes(payload[key])


def _types_of(node: Dict[str, Any]) -> List[str]:
    raw = node.get("@type") or node.get("type")
    if isinstance(raw, list):
        return [str(t) for t in raw]
    return [str(raw)] if raw else []


def parsed_blocks(site: Site):
    """(page, index, payload_or_None, error) for every JSON-LD block."""
    for page in site.html_pages():
        for index, raw in enumerate(page.jsonld_raw):
            text = (raw or "").strip()
            if not text:
                yield page, index, None, "empty <script type=application/ld+json> block"
                continue
            try:
                yield page, index, json.loads(text), ""
            except json.JSONDecodeError as exc:
                yield page, index, None, f"invalid JSON at line {exc.lineno} col {exc.colno}: {exc.msg}"


@check("schema.parse_error", "Structured data is valid JSON", "Structured Data")
def schema_parse_error(site: Site) -> Iterable[Finding]:
    for page, index, payload, error in parsed_blocks(site):
        if error:
            yield finding(
                "schema.parse_error",
                Severity.FAIL,
                "Structured data block is not valid JSON-LD",
                url=page.url,
                detail=f"block #{index + 1}: {error}",
            )


@check("schema.required_properties", "Structured data has required properties", "Structured Data")
def schema_required_properties(site: Site) -> Iterable[Finding]:
    required = site.config.get("structured_data.required_properties", {}) or {}
    for page, index, payload, error in parsed_blocks(site):
        if error or payload is None:
            continue
        for node in _iter_nodes(payload):
            for type_name in _types_of(node):
                expected = required.get(type_name)
                if not expected:
                    continue
                missing = [prop for prop in expected if not node.get(prop)]
                if missing:
                    yield finding(
                        "schema.required_properties",
                        Severity.FAIL,
                        f"{type_name} schema is missing {', '.join(missing)}",
                        url=page.url,
                        detail=f"block #{index + 1}",
                        schema_type=type_name,
                        missing=missing,
                    )


@check("schema.expected_types", "Expected schema types are present", "Structured Data")
def schema_expected_types(site: Site) -> Iterable[Finding]:
    expected = site.config.get("structured_data.expected_types_sitewide", []) or []
    if not expected:
        return
    present = set()
    for _page, _index, payload, error in parsed_blocks(site):
        if error or payload is None:
            continue
        for node in _iter_nodes(payload):
            present.update(_types_of(node))
    for type_name in expected:
        if type_name not in present:
            yield finding(
                "schema.expected_types",
                Severity.WARNING,
                f"No {type_name} structured data anywhere on the site",
                detail=f"types found: {', '.join(sorted(present)) or 'none'}",
            )


@check("schema.stale_values", "Structured data has no retired values", "Structured Data")
def schema_stale_values(site: Site) -> Iterable[Finding]:
    """Retired business names and terms hiding inside JSON-LD, where a visual
    review of the page will never catch them."""
    terms = site.config.get("business.retired_terms", []) or []
    for page, index, payload, error in parsed_blocks(site):
        if error or payload is None:
            continue
        blob = json.dumps(payload, ensure_ascii=False)
        for entry in terms:
            term = entry.get("term", "")
            if not term:
                continue
            if re.search(re.escape(term), blob, re.IGNORECASE):
                yield finding(
                    "schema.stale_values",
                    Severity.FAIL,
                    f"Structured data contains retired term {term!r}",
                    url=page.url,
                    detail=f"block #{index + 1}: {entry.get('reason', '')}",
                )


@check("schema.url_consistency", "Schema URLs match the live site", "Structured Data")
def schema_url_consistency(site: Site) -> Iterable[Finding]:
    for page, index, payload, error in parsed_blocks(site):
        if error or payload is None:
            continue
        for node in _iter_nodes(payload):
            for key in ("url", "@id"):
                value = node.get(key)
                if not isinstance(value, str) or not value.startswith("http"):
                    continue
                if site.config.is_internal(value):
                    continue
                if site.config.is_owned_external(value):
                    continue
                types = ",".join(_types_of(node)) or "node"
                yield finding(
                    "schema.url_consistency",
                    Severity.WARNING,
                    f"{types} schema {key} points off-domain",
                    url=page.url,
                    detail=f"block #{index + 1}: {value}",
                )


@check("schema.nap_consistency", "Schema contact details match the source of truth", "Structured Data")
def schema_nap_consistency(site: Site) -> Iterable[Finding]:
    """Name/address/phone consistency. Only runs when the canonical values are
    configured; otherwise it reports what it found for a human to confirm."""
    phone = str(site.config.get("business.canonical_phone", "") or "").strip()
    address = str(site.config.get("business.canonical_street_address", "") or "").strip()
    email = str(site.config.get("business.canonical_email", "") or "").strip()

    observed_phones, observed_addresses = set(), set()
    for page, _index, payload, error in parsed_blocks(site):
        if error or payload is None:
            continue
        for node in _iter_nodes(payload):
            if node.get("telephone"):
                observed_phones.add(str(node["telephone"]).strip())
            addr = node.get("address")
            if isinstance(addr, dict):
                observed_addresses.add(
                    " ".join(
                        str(addr.get(k, "")).strip()
                        for k in ("streetAddress", "addressLocality", "addressRegion", "postalCode")
                    ).strip()
                )
            elif isinstance(addr, str):
                observed_addresses.add(addr.strip())

    def digits(value: str) -> str:
        return re.sub(r"\D", "", value)

    if phone:
        for observed in sorted(observed_phones):
            if digits(observed) != digits(phone):
                yield finding(
                    "schema.nap_consistency",
                    Severity.FAIL,
                    "Schema telephone does not match the configured number",
                    detail=f"schema: {observed} | expected: {phone}",
                )
    if address:
        for observed in sorted(observed_addresses):
            if address.lower() not in observed.lower():
                yield finding(
                    "schema.nap_consistency",
                    Severity.FAIL,
                    "Schema address does not match the configured address",
                    detail=f"schema: {observed} | expected: {address}",
                )
    if email:
        for page in site.html_pages():
            for link in page.links:
                if link.raw_href.lower().startswith("mailto:"):
                    found = link.raw_href.split(":", 1)[1].split("?")[0].strip()
                    if found.lower() != email.lower():
                        yield finding(
                            "schema.nap_consistency",
                            Severity.WARNING,
                            "Contact email differs from the configured address",
                            url=page.url,
                            detail=f"found: {found} | expected: {email}",
                        )
    if not phone and not address and not email and (observed_phones or observed_addresses):
        yield finding(
            "schema.nap_consistency",
            Severity.INFO,
            "Contact details found in schema but no source of truth configured to compare against",
            detail=f"phones: {', '.join(sorted(observed_phones)) or '-'} | addresses: {', '.join(sorted(observed_addresses)) or '-'}",
        )
