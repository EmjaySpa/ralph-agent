"""Runs every registered check against a Site and produces a run result."""
from __future__ import annotations

import datetime as _dt
import traceback
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .checks import CheckMeta, load_all
from .models import Finding, Severity, Site


@dataclass
class CheckResult:
    meta: CheckMeta
    status: Severity            # PASS / INFO / WARNING / FAIL
    findings: List[Finding] = field(default_factory=list)
    skipped_reason: str = ""
    error: str = ""

    @property
    def counts(self) -> Dict[str, int]:
        counts = {level.value: 0 for level in Severity}
        for item in self.findings:
            counts[item.severity.value] += 1
        return counts


@dataclass
class RunResult:
    site: Site
    results: List[CheckResult] = field(default_factory=list)
    started_at: str = ""
    finished_at: str = ""

    @property
    def findings(self) -> List[Finding]:
        return [f for result in self.results for f in result.findings]

    def by_severity(self, severity: Severity) -> List[Finding]:
        return [f for f in self.findings if f.severity is severity]

    @property
    def verdict(self) -> Severity:
        if any(r.status is Severity.FAIL for r in self.results):
            return Severity.FAIL
        if any(r.status is Severity.WARNING for r in self.results):
            return Severity.WARNING
        return Severity.PASS

    @property
    def summary(self) -> Dict[str, int]:
        return {
            "checks_total": len(self.results),
            "checks_passed": sum(1 for r in self.results if r.status is Severity.PASS),
            "checks_warning": sum(1 for r in self.results if r.status is Severity.WARNING),
            "checks_failed": sum(1 for r in self.results if r.status is Severity.FAIL),
            "checks_info": sum(1 for r in self.results if r.status is Severity.INFO),
            "checks_skipped": sum(1 for r in self.results if r.skipped_reason),
            "findings_fail": len(self.by_severity(Severity.FAIL)),
            "findings_warning": len(self.by_severity(Severity.WARNING)),
            "findings_info": len(self.by_severity(Severity.INFO)),
            "pages_crawled": len(self.site.pages),
            "pages_rendered": sum(1 for r in self.site.runtime.values() if r.ok),
        }


def _apply_override(site: Site, item: Finding) -> Optional[Finding]:
    """severity_overrides tune the gate without touching check code. INFO
    findings and explicit regressions are never re-graded."""
    if item.severity in (Severity.INFO, Severity.PASS):
        return item
    if item.evidence.get("_no_override"):
        return item
    override = site.config.severity_for(item.check_id, item.severity)
    if override is None:
        return None
    item.severity = override
    return item


def run_checks(site: Site, only: Optional[List[str]] = None, log=lambda _m: None) -> RunResult:
    registry = load_all()
    run = RunResult(site=site, started_at=_dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"))

    # A run that never reached the site must not report 80-odd vacuous passes.
    # Only the crawl-health checks are meaningful in that state.
    reachable = any(page.fetch and page.fetch.ok and page.html for page in site.pages.values())
    if not reachable:
        site.notes.append("site unreachable: only crawl-health checks were run")

    for check_id, meta in sorted(registry.items()):
        if only and not any(check_id.startswith(prefix) for prefix in only):
            continue
        if not reachable and not check_id.startswith("crawl."):
            run.results.append(
                CheckResult(
                    meta=meta,
                    status=Severity.INFO,
                    skipped_reason="not run: the site could not be reached",
                )
            )
            continue
        if meta.requires_browser and not site.browser_used:
            run.results.append(
                CheckResult(
                    meta=meta,
                    status=Severity.INFO,
                    skipped_reason="browser layer did not run",
                    findings=[
                        Finding(
                            check_id=check_id,
                            severity=Severity.INFO,
                            title=f"Skipped: {meta.name} needs the browser layer",
                            detail="; ".join(site.notes) or "run without --no-browser to enable",
                        )
                    ],
                )
            )
            continue

        try:
            raw = list(meta.fn(site) or [])
        except Exception as exc:  # a broken check must not hide the rest
            log(f"  check {check_id} raised: {exc}")
            run.results.append(
                CheckResult(
                    meta=meta,
                    status=Severity.FAIL,
                    error=f"{type(exc).__name__}: {exc}",
                    findings=[
                        Finding(
                            check_id=check_id,
                            severity=Severity.FAIL,
                            title=f"Check {check_id} crashed",
                            detail=traceback.format_exc(limit=3),
                        )
                    ],
                )
            )
            continue

        findings = [f for f in (_apply_override(site, item) for item in raw) if f is not None]
        if any(f.severity is Severity.FAIL for f in findings):
            status = Severity.FAIL
        elif any(f.severity is Severity.WARNING for f in findings):
            status = Severity.WARNING
        elif findings:
            status = Severity.INFO
        else:
            status = Severity.PASS
        run.results.append(CheckResult(meta=meta, status=status, findings=findings))

    run.finished_at = _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
    return run
