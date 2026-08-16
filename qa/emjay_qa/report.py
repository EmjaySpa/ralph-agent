"""Report rendering: console summary, Markdown, JSON and a standalone HTML
page.

The report states what was measured and where. It contains no rewritten copy,
no SEO suggestions and no design direction.
"""
from __future__ import annotations

import html as _html
import json
from collections import defaultdict
from typing import Dict, List

from .models import Severity
from .runner import CheckResult, RunResult

MAX_FINDINGS_PER_CHECK = 25

BADGE = {
    Severity.PASS: "PASS",
    Severity.INFO: "INFO",
    Severity.WARNING: "WARNING",
    Severity.FAIL: "FAIL",
}


def _by_category(run: RunResult) -> Dict[str, List[CheckResult]]:
    grouped: Dict[str, List[CheckResult]] = defaultdict(list)
    for result in run.results:
        grouped[result.meta.category].append(result)
    return dict(sorted(grouped.items()))


def console_summary(run: RunResult) -> str:
    summary = run.summary
    lines = [
        "",
        f"VERDICT: {run.verdict.value}",
        f"  checks   {summary['checks_passed']} pass / {summary['checks_warning']} warning / "
        f"{summary['checks_failed']} fail / {summary['checks_info']} info",
        f"  findings {summary['findings_fail']} fail / {summary['findings_warning']} warning / "
        f"{summary['findings_info']} info",
        f"  coverage {summary['pages_crawled']} pages crawled, {summary['pages_rendered']} rendered in a browser",
    ]
    if summary["checks_skipped"]:
        lines.append(f"  skipped  {summary['checks_skipped']} check(s) did not run")
    failures = [r for r in run.results if r.status is Severity.FAIL]
    if failures:
        lines.append("")
        lines.append("  failing checks:")
        for result in failures:
            lines.append(f"    - {result.meta.id}: {len(result.findings)} finding(s)")
    return "\n".join(lines) + "\n"


def to_json(run: RunResult) -> str:
    payload = {
        "site": run.site.config.base_url,
        "verdict": run.verdict.value,
        "crawl_started_at": run.site.started_at,
        "crawl_finished_at": run.site.finished_at,
        "analysis_started_at": run.started_at,
        "analysis_finished_at": run.finished_at,
        "browser_used": run.site.browser_used,
        "summary": run.summary,
        "notes": run.site.notes,
        "checks": [
            {
                "id": result.meta.id,
                "name": result.meta.name,
                "category": result.meta.category,
                "status": result.status.value,
                "skipped_reason": result.skipped_reason,
                "error": result.error,
                "counts": result.counts,
                "findings": [f.to_dict() for f in result.findings],
            }
            for result in run.results
        ],
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)


def _finding_lines(result: CheckResult, severity: Severity) -> List[str]:
    lines = []
    items = [f for f in result.findings if f.severity is severity]
    for item in items[:MAX_FINDINGS_PER_CHECK]:
        location = f" `{item.url}`" if item.url else ""
        lines.append(f"- **{item.title}**{location}")
        if item.detail:
            lines.append(f"  - {item.detail}")
    if len(items) > MAX_FINDINGS_PER_CHECK:
        lines.append(f"- _...and {len(items) - MAX_FINDINGS_PER_CHECK} more (see the JSON report)_")
    return lines


def to_markdown(run: RunResult) -> str:
    site = run.site
    summary = run.summary
    out: List[str] = []
    out.append("# Emjay Wellness: automated QA report")
    out.append("")
    out.append(f"**Verdict: {run.verdict.value}**")
    out.append("")
    out.append(f"- Site: {site.config.base_url}")
    out.append(f"- Crawl: {site.started_at} to {site.finished_at} (UTC)")
    out.append(f"- Pages crawled: {summary['pages_crawled']}, rendered in a browser: {summary['pages_rendered']}")
    out.append(f"- Checks: {summary['checks_passed']} PASS, {summary['checks_warning']} WARNING, "
               f"{summary['checks_failed']} FAIL, {summary['checks_info']} INFO"
               + (f", {summary['checks_skipped']} not run" if summary["checks_skipped"] else ""))
    out.append(f"- Findings: {summary['findings_fail']} FAIL, {summary['findings_warning']} WARNING, "
               f"{summary['findings_info']} INFO")
    out.append("- Method: read-only GET/HEAD requests plus headless rendering. No form was submitted and nothing "
               "on the live site was changed.")
    if not summary["pages_crawled"] or not any(p.fetch and p.fetch.ok for p in site.pages.values()):
        out.append("")
        out.append("> **The site could not be reached during this run, so the result below is a verdict on the "
                   "run, not on the site.** Re-run from a network that can reach it.")
    if site.notes:
        out.append("")
        out.append("**Run notes**")
        for note in site.notes:
            out.append(f"- {note}")

    out.append("")
    out.append("## Check status by area")
    out.append("")
    out.append("| Area | Check | Status | Findings |")
    out.append("| --- | --- | --- | --- |")
    for category, results in _by_category(run).items():
        for result in sorted(results, key=lambda r: (-r.status.rank, r.meta.id)):
            counts = result.counts
            detail = ", ".join(
                f"{counts[level]} {level.lower()}"
                for level in ("FAIL", "WARNING", "INFO")
                if counts[level]
            ) or "none"
            out.append(f"| {category} | `{result.meta.id}` | {BADGE[result.status]} | {detail} |")

    for severity, heading in (
        (Severity.FAIL, "## FAIL: must be fixed before Emjay is declared GREEN"),
        (Severity.WARNING, "## WARNING: review and decide"),
        (Severity.INFO, "## INFO: discovery and coverage notes"),
    ):
        relevant = [r for r in run.results if any(f.severity is severity for f in r.findings)]
        if not relevant:
            continue
        out.append("")
        out.append(heading)
        for result in sorted(relevant, key=lambda r: r.meta.id):
            out.append("")
            out.append(f"### `{result.meta.id}` {result.meta.name}")
            if result.meta.description:
                out.append(f"_{result.meta.description.splitlines()[0]}_")
            out.extend(_finding_lines(result, severity))

    out.append("")
    out.append("## Known-defect regression status")
    out.append("")
    defect_findings = [f for f in run.findings if f.check_id == "regression.known_defect"]
    if not defect_findings:
        out.append("All registry entries passed.")
    else:
        out.append("| Defect | Status in registry | Result |")
        out.append("| --- | --- | --- |")
        for item in defect_findings:
            defect_id = item.evidence.get("defect_id", "-")
            status = item.evidence.get("status", "-")
            out.append(f"| {defect_id} | {status} | {BADGE[item.severity]}: {item.title} |")

    out.append("")
    out.append("## Scope and limits")
    out.append("")
    out.append("- Contrast is measured only where the effective background is a solid computed colour. Text over "
               "images, video or gradients is skipped rather than guessed.")
    out.append("- Performance figures are indicative signals from the crawl and browser navigation timings, not a "
               "Lighthouse audit.")
    out.append("- Brand palette and font enforcement stay in discovery mode until `brand.approved_colours` and "
               "`brand.approved_fonts` are populated in `qa/config/site.yaml`.")
    out.append("- Forms are inspected structurally. Nothing is ever submitted.")
    out.append("")
    return "\n".join(out)


def to_html(run: RunResult) -> str:
    summary = run.summary
    verdict_colour = {"PASS": "#1B7F4B", "WARNING": "#9A6400", "FAIL": "#B3261E", "INFO": "#3B5566"}[run.verdict.value]

    def esc(value: str) -> str:
        return _html.escape(str(value or ""))

    rows = []
    for category, results in _by_category(run).items():
        for result in sorted(results, key=lambda r: (-r.status.rank, r.meta.id)):
            counts = result.counts
            detail = ", ".join(
                f"{counts[level]} {level.lower()}" for level in ("FAIL", "WARNING", "INFO") if counts[level]
            ) or "none"
            rows.append(
                f"<tr><td>{esc(category)}</td><td><code>{esc(result.meta.id)}</code></td>"
                f"<td class='s-{result.status.value.lower()}'>{result.status.value}</td><td>{esc(detail)}</td></tr>"
            )

    sections = []
    for severity, heading in (
        (Severity.FAIL, "FAIL"),
        (Severity.WARNING, "WARNING"),
        (Severity.INFO, "INFO"),
    ):
        blocks = []
        for result in sorted(run.results, key=lambda r: r.meta.id):
            items = [f for f in result.findings if f.severity is severity]
            if not items:
                continue
            entries = "".join(
                f"<li><strong>{esc(item.title)}</strong>"
                + (f" <code>{esc(item.url)}</code>" if item.url else "")
                + (f"<div class='detail'>{esc(item.detail)}</div>" if item.detail else "")
                + "</li>"
                for item in items[:MAX_FINDINGS_PER_CHECK]
            )
            more = (
                f"<li class='more'>...and {len(items) - MAX_FINDINGS_PER_CHECK} more in the JSON report</li>"
                if len(items) > MAX_FINDINGS_PER_CHECK
                else ""
            )
            blocks.append(
                f"<section><h3><code>{esc(result.meta.id)}</code> {esc(result.meta.name)}</h3>"
                f"<ul>{entries}{more}</ul></section>"
            )
        if blocks:
            sections.append(f"<h2 class='s-{severity.value.lower()}'>{heading}</h2>" + "".join(blocks))

    unreachable = not any(p.fetch and p.fetch.ok for p in run.site.pages.values())
    unreachable_banner = (
        '<p class="s-fail">The site could not be reached during this run, so this is a verdict on the run, '
        "not on the site.</p>"
        if unreachable
        else ""
    )
    return f"""<title>Emjay QA Report</title>
<style>
  :root {{ --bg:#FAF9F5; --fg:#1F2421; --muted:#5C6660; --line:#DFDCD2; --card:#FFFFFF; }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{ --bg:#15181A; --fg:#ECEAE3; --muted:#9AA5A0; --line:#2C3134; --card:#1D2124; }}
  }}
  :root[data-theme="dark"] {{ --bg:#15181A; --fg:#ECEAE3; --muted:#9AA5A0; --line:#2C3134; --card:#1D2124; }}
  body {{ background:var(--bg); color:var(--fg); font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         margin:0; padding:2rem 1.25rem 4rem; }}
  main {{ max-width:1080px; margin:0 auto; }}
  h1 {{ font-size:1.7rem; margin:0 0 .25rem; }}
  h2 {{ margin-top:2.5rem; border-bottom:1px solid var(--line); padding-bottom:.35rem; }}
  h3 {{ font-size:1rem; margin:1.4rem 0 .4rem; }}
  .verdict {{ display:inline-block; padding:.35rem .9rem; border-radius:999px; color:#fff;
              background:{verdict_colour}; font-weight:600; letter-spacing:.02em; }}
  .meta {{ color:var(--muted); font-size:.92rem; }}
  table {{ width:100%; border-collapse:collapse; margin-top:1rem; font-size:.9rem; }}
  th,td {{ text-align:left; padding:.45rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }}
  th {{ color:var(--muted); font-weight:600; }}
  .table-wrap {{ overflow-x:auto; }}
  code {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.85em; }}
  ul {{ padding-left:1.1rem; }}
  li {{ margin:.35rem 0; }}
  .detail {{ color:var(--muted); font-size:.88rem; word-break:break-word; }}
  .s-fail {{ color:#B3261E; font-weight:600; }}
  .s-warning {{ color:#9A6400; font-weight:600; }}
  .s-pass {{ color:#1B7F4B; font-weight:600; }}
  .s-info {{ color:#3B5566; font-weight:600; }}
  section {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:.6rem 1rem; margin:.8rem 0; }}
</style>
<main>
  <h1>Emjay Wellness: automated QA report</h1>
  <p><span class="verdict">{run.verdict.value}</span></p>
  <p class="meta">
    {esc(run.site.config.base_url)} &middot; crawl {esc(run.site.started_at)} to {esc(run.site.finished_at)} UTC<br>
    {summary['pages_crawled']} pages crawled, {summary['pages_rendered']} rendered in a browser &middot;
    {summary['checks_passed']} PASS / {summary['checks_warning']} WARNING / {summary['checks_failed']} FAIL /
    {summary['checks_info']} INFO<br>
    Read-only GET and HEAD requests plus headless rendering. No form submitted, nothing on the live site changed.
  </p>
  {unreachable_banner}
  <h2>Check status by area</h2>
  <div class="table-wrap">
  <table><thead><tr><th>Area</th><th>Check</th><th>Status</th><th>Findings</th></tr></thead>
  <tbody>{''.join(rows)}</tbody></table>
  </div>
  {''.join(sections)}
</main>
"""
