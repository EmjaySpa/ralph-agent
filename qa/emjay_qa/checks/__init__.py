"""Check registry.

A check is a function ``fn(site) -> Iterable[Finding]``. It performs no I/O:
everything it needs is already on the Site model. That is what makes a run
reproducible and lets the whole suite be exercised against fixtures.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, List

from ..models import Finding, Severity, Site

CheckFn = Callable[[Site], Iterable[Finding]]


@dataclass
class CheckMeta:
    id: str
    name: str
    category: str
    fn: CheckFn = None  # type: ignore[assignment]
    description: str = ""
    requires_browser: bool = False
    tags: List[str] = field(default_factory=list)


REGISTRY: Dict[str, CheckMeta] = {}


def check(
    check_id: str,
    name: str,
    category: str,
    description: str = "",
    requires_browser: bool = False,
    tags: Iterable[str] = (),
) -> Callable[[CheckFn], CheckFn]:
    def decorator(fn: CheckFn) -> CheckFn:
        if check_id in REGISTRY:
            raise ValueError(f"duplicate check id: {check_id}")
        REGISTRY[check_id] = CheckMeta(
            id=check_id,
            name=name,
            category=category,
            fn=fn,
            description=description or (fn.__doc__ or "").strip(),
            requires_browser=requires_browser,
            tags=list(tags),
        )
        return fn

    return decorator


def finding(
    check_id: str,
    severity: Severity,
    title: str,
    url: str = None,
    detail: str = "",
    **evidence,
) -> Finding:
    return Finding(check_id=check_id, severity=severity, title=title, url=url, detail=detail, evidence=evidence)


def load_all() -> Dict[str, CheckMeta]:
    """Import every check module so the registry is populated."""
    from . import (  # noqa: F401
        accessibility,
        brand,
        canonical,
        content_refs,
        crawl_health,
        duplication,
        forms,
        headings,
        indexability,
        known_defects,
        links,
        meta,
        performance,
        redirects,
        runtime,
        sitemap,
        structure,
        structured_data,
    )

    return REGISTRY
