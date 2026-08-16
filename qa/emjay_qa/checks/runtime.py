"""Browser-observed defects: console errors, failed subresources and mobile
overflow."""
from __future__ import annotations

from typing import Iterable

from ..models import Finding, Severity, Site
from . import check, finding


@check("runtime.console_errors", "No JavaScript console errors", "Runtime", requires_browser=True)
def console_errors(site: Site) -> Iterable[Finding]:
    if not site.runtime:
        return
    for url, result in sorted(site.runtime.items()):
        if not result.ok and result.error:
            yield finding(
                "runtime.console_errors",
                Severity.WARNING,
                "Page could not be rendered by the browser",
                url=url,
                detail=result.error,
            )
            continue
        errors = [e for e in result.console_errors if e["type"] == "error" and not e["ignorable"]]
        noisy = [e for e in result.console_errors if e["type"] == "error" and e["ignorable"]]
        warnings = [e for e in result.console_errors if e["type"] == "warning" and not e["ignorable"]]
        if errors:
            yield finding(
                "runtime.console_errors",
                Severity.FAIL,
                f"{len(errors)} console error(s)",
                url=url,
                detail=" | ".join(e["text"][:160] for e in errors[:4]),
                errors=[e["text"] for e in errors[:10]],
            )
        if noisy:
            yield finding(
                "runtime.console_errors",
                Severity.INFO,
                f"{len(noisy)} console error(s) matched the ignore list",
                url=url,
                detail=" | ".join(e["text"][:120] for e in noisy[:3]),
            )
        if warnings:
            yield finding(
                "runtime.console_errors",
                Severity.WARNING,
                f"{len(warnings)} console warning(s)",
                url=url,
                detail=" | ".join(e["text"][:120] for e in warnings[:3]),
            )


@check("runtime.page_errors", "No uncaught JavaScript exceptions", "Runtime", requires_browser=True)
def page_errors(site: Site) -> Iterable[Finding]:
    for url, result in sorted(site.runtime.items()):
        if result.page_errors:
            yield finding(
                "runtime.page_errors",
                Severity.FAIL,
                f"{len(result.page_errors)} uncaught JavaScript exception(s)",
                url=url,
                detail=" | ".join(result.page_errors[:3]),
            )


@check("runtime.failed_requests", "All subresources load", "Runtime", requires_browser=True)
def failed_requests(site: Site) -> Iterable[Finding]:
    for url, result in sorted(site.runtime.items()):
        broken = [r for r in result.failed_requests if (r.get("status") or 0) >= 400 or r.get("status") is None]
        if not broken:
            continue
        blocking = [r for r in broken if r.get("type") in ("script", "stylesheet", "document", "fetch", "xhr")]
        severity = Severity.FAIL if blocking else Severity.WARNING
        yield finding(
            "runtime.failed_requests",
            severity,
            f"{len(broken)} subresource request(s) failed",
            url=url,
            detail=" | ".join(f"{r.get('status') or r.get('error', 'failed')} {r['type']}: {r['url'][:90]}" for r in broken[:5]),
        )


@check("runtime.mobile_overflow", "No horizontal overflow on mobile", "Runtime", requires_browser=True)
def mobile_overflow(site: Site) -> Iterable[Finding]:
    """Anything wider than the phone viewport forces sideways scrolling."""
    tolerance = float(site.config.threshold("mobile_overflow_tolerance_px", 2))
    width, _height = site.config.threshold("mobile_viewport", [390, 844])
    for url, result in sorted(site.runtime.items()):
        if not result.ok:
            continue
        if result.overflow_px <= tolerance:
            continue
        offenders = sorted(result.overflow_elements, key=lambda e: -e.get("overflow", 0))[:5]
        yield finding(
            "runtime.mobile_overflow",
            Severity.FAIL,
            f"Page scrolls {result.overflow_px:.0f}px sideways at {int(width)}px wide",
            url=url,
            detail="; ".join(f"{o['selector']} (+{o.get('overflow', 0)}px)" for o in offenders) or "no single element isolated",
            overflow_px=result.overflow_px,
            offenders=offenders,
        )


@check("runtime.coverage", "Browser layer ran", "Runtime")
def runtime_coverage(site: Site) -> Iterable[Finding]:
    """Records whether the runtime checks actually executed, so a run without
    a browser cannot be mistaken for a clean one."""
    if site.browser_used and site.runtime:
        measured = sum(1 for r in site.runtime.values() if r.ok)
        total_pages = len(list(site.html_pages()))
        if measured < total_pages:
            yield finding(
                "runtime.coverage",
                Severity.INFO,
                f"Browser checks covered {measured} of {total_pages} page(s)",
                detail="raise runtime.max_pages in the config to widen coverage",
            )
        return
    yield finding(
        "runtime.coverage",
        Severity.WARNING,
        "Browser-based checks did not run",
        detail=(
            "; ".join(site.notes)
            or "console errors, mobile overflow, measured contrast and rendered brand checks were skipped"
        ),
    )
