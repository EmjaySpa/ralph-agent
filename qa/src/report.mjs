import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { rank, LABEL } from './severity.mjs';
import { summariseRegressions } from './checks/regressions.mjs';

const ORDER = ['FAIL', 'WARN', 'INFO', 'PASS'];

/**
 * A site-wide defect in a theme template produces one identical finding per
 * page. Reported raw, a single misconfigured viewport tag becomes 206 failures
 * and buries everything else. Collapse identical findings into one, carrying
 * the page count and a sample of URLs.
 *
 * Grouping is by check + severity + title + a URL-stripped detail signature, so
 * only genuinely repeated findings merge; anything with page-specific substance
 * in its detail stays separate.
 */
export function collapseFindings(findings, { threshold = 3, sampleUrls = 5 } = {}) {
  const groups = new Map();
  const order = [];

  for (const f of findings) {
    const key = `${f.severity}|${f.title}|${signature(f.detail)}`;
    if (!groups.has(key)) {
      groups.set(key, { first: f, items: [] });
      order.push(key);
    }
    groups.get(key).items.push(f);
  }

  const out = [];
  for (const key of order) {
    const { first, items } = groups.get(key);
    if (items.length < threshold) {
      out.push(...items);
      continue;
    }
    const urls = [...new Set(items.map((i) => i.url).filter(Boolean))];
    out.push({
      ...first,
      title: `${first.title} — on ${urls.length || items.length} page(s)`,
      detail: [
        first.detail,
        `Affects ${urls.length || items.length} page(s), e.g.:`,
        ...urls.slice(0, sampleUrls).map((u) => `  ${u}`),
        urls.length > sampleUrls ? `  ...and ${urls.length - sampleUrls} more` : null,
      ].filter(Boolean).join('\n'),
      occurrences: items.length,
      urls,
    });
  }
  return out;
}

/** Detail text with site URLs and digits removed, so per-page noise groups. */
function signature(detail) {
  return String(detail ?? '')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\d+/g, '<n>')
    .slice(0, 400);
}

export function buildReport({ results, site, cfg, rendered, regressionOutcomes, meta }) {
  const collapse = cfg.report?.collapseRepeatedFindings !== false;
  if (collapse) {
    results = results.map((r) => ({
      ...r,
      rawFindingCount: r.findings.length,
      findings: collapseFindings(r.findings, { threshold: cfg.report?.collapseThreshold ?? 3 }),
    }));
  }

  const counts = { FAIL: 0, WARN: 0, INFO: 0, PASS: 0 };
  for (const r of results) {
    for (const f of r.findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  }

  const overall = counts.FAIL > 0 ? 'FAIL' : counts.WARN > 0 ? 'WARNING' : 'PASS';
  const regressions = regressionOutcomes ? summariseRegressions(regressionOutcomes) : [];

  return {
    meta: {
      ...meta,
      site: cfg.site.baseUrl,
      overall,
      counts,
      pagesCrawled: site.pages.size,
      htmlPages: site.htmlPages().length,
      pagesRendered: rendered.available ? rendered.pages.size : 0,
      renderAvailable: rendered.available,
      renderSkipReason: rendered.reason,
      sitemapUrls: site.sitemap.urls.length,
      crawlTruncated: site.stoppedAtLimit,
    },
    checks: results.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      durationMs: r.durationMs,
      error: r.error || null,
      counts: countBy(r.findings),
      // Distinct defects vs raw occurrences before collapsing.
      rawFindingCount: r.rawFindingCount ?? r.findings.length,
      findings: r.findings,
    })),
    regressions,
  };
}

function countBy(findings) {
  const out = { FAIL: 0, WARN: 0, INFO: 0 };
  for (const f of findings) out[f.severity] = (out[f.severity] || 0) + 1;
  return out;
}

export function renderConsole(report, cfg) {
  const lines = [];
  const bar = '='.repeat(72);
  lines.push(bar);
  lines.push(`  EMJAY WELLNESS QA REPORT — ${report.meta.overall}`);
  lines.push(`  ${report.meta.site}`);
  lines.push(`  ${report.meta.startedAt}`);
  lines.push(bar);
  lines.push('');
  lines.push(`  Pages crawled : ${report.meta.pagesCrawled} (${report.meta.htmlPages} HTML)`);
  lines.push(`  Pages rendered: ${report.meta.pagesRendered}${report.meta.renderAvailable ? '' : ` (skipped: ${report.meta.renderSkipReason})`}`);
  lines.push(`  Sitemap URLs  : ${report.meta.sitemapUrls}`);
  if (report.meta.crawlTruncated) lines.push(`  ! crawl hit the maxPages limit (${cfg.crawl.maxPages}) — coverage is partial`);
  lines.push('');
  lines.push(`  FAIL ${report.meta.counts.FAIL}   WARNING ${report.meta.counts.WARN}   INFO ${report.meta.counts.INFO}`);
  lines.push('');
  lines.push('-'.repeat(72));
  lines.push('  CHECK RESULTS');
  lines.push('-'.repeat(72));

  for (const check of report.checks) {
    const badge = LABEL[check.status].padEnd(7);
    const tally = check.counts.FAIL || check.counts.WARN || check.counts.INFO
      ? ` (${check.counts.FAIL} fail, ${check.counts.WARN} warn, ${check.counts.INFO} info)`
      : '';
    lines.push(`  ${badge} ${check.title}${tally}`);
    if (check.error) lines.push(`          ! check errored: ${check.error}`);

    const shown = check.findings
      .filter((f) => rank(f.severity) >= rank('WARN'))
      .sort((a, b) => rank(b.severity) - rank(a.severity))
      .slice(0, cfg.report.consoleFindingsPerCheck);
    for (const f of shown) {
      lines.push(`          [${LABEL[f.severity]}] ${f.title}`);
      if (f.url) lines.push(`                  ${f.url}`);
      if (f.detail) lines.push(`                  ${String(f.detail).split('\n').join('\n                  ')}`);
    }
    const hidden = check.findings.filter((f) => rank(f.severity) >= rank('WARN')).length - shown.length;
    if (hidden > 0) lines.push(`          ... and ${hidden} more (see the full report)`);
  }

  if (report.regressions.length) {
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('  KNOWN-DEFECT REGRESSIONS');
    lines.push('-'.repeat(72));
    for (const r of report.regressions) {
      lines.push(`  ${r.result.padEnd(12)} ${r.id}  ${r.title}`);
      if (r.result !== 'PASS' && r.detail) lines.push(`               ${r.detail}`);
    }
  }

  lines.push('');
  lines.push(bar);
  lines.push(`  OVERALL: ${report.meta.overall}`);
  lines.push(bar);
  return lines.join('\n');
}

export function renderMarkdown(report, cfg) {
  const md = [];
  md.push(`# Emjay Wellness — QA Report`);
  md.push('');
  md.push(`**Overall: ${report.meta.overall}**`);
  md.push('');
  md.push(`| | |`);
  md.push(`|---|---|`);
  md.push(`| Site | ${report.meta.site} |`);
  md.push(`| Run started | ${report.meta.startedAt} |`);
  md.push(`| Duration | ${(report.meta.durationMs / 1000).toFixed(1)}s |`);
  md.push(`| Pages crawled | ${report.meta.pagesCrawled} (${report.meta.htmlPages} HTML) |`);
  md.push(`| Pages rendered | ${report.meta.pagesRendered}${report.meta.renderAvailable ? '' : ' (browser pass skipped)'} |`);
  md.push(`| Sitemap URLs | ${report.meta.sitemapUrls} |`);
  md.push(`| FAIL / WARNING / INFO | ${report.meta.counts.FAIL} / ${report.meta.counts.WARN} / ${report.meta.counts.INFO} |`);
  md.push('');
  if (!report.meta.renderAvailable) {
    md.push(`> **Browser pass did not run.** ${report.meta.renderSkipReason}`);
    md.push(`> Colour, font, contrast, console, overflow and performance results are incomplete.`);
    md.push('');
  }
  if (report.meta.crawlTruncated) {
    md.push(`> **Crawl truncated** at the ${cfg.crawl.maxPages}-page limit. Coverage is partial.`);
    md.push('');
  }

  md.push('## Summary');
  md.push('');
  md.push('| Check | Status | Fail | Warning | Info |');
  md.push('|---|---|---:|---:|---:|');
  for (const c of report.checks) {
    md.push(`| ${c.title} | **${LABEL[c.status]}** | ${c.counts.FAIL} | ${c.counts.WARN} | ${c.counts.INFO} |`);
  }
  md.push('');

  if (report.regressions.length) {
    md.push('## Known-defect regressions');
    md.push('');
    md.push('| ID | Defect | Result | Detail |');
    md.push('|---|---|---|---|');
    for (const r of report.regressions) {
      md.push(`| ${r.id} | ${escapePipes(r.title)} | **${r.result}** | ${escapePipes(r.detail).slice(0, 200)} |`);
    }
    md.push('');
  }

  md.push('## Findings');
  md.push('');
  for (const severity of ORDER) {
    if (severity === 'PASS') continue;
    const group = report.checks.flatMap((c) => c.findings.filter((f) => f.severity === severity).map((f) => ({ ...f, check: c.title })));
    if (!group.length) continue;
    md.push(`### ${LABEL[severity]} (${group.length})`);
    md.push('');
    for (const f of group) {
      md.push(`- **${escapeMd(f.title)}** — _${f.check}_`);
      if (f.url) md.push(`  - \`${f.url}\``);
      if (f.detail) md.push(`  - ${escapeMd(String(f.detail)).replace(/\n\s*/g, '  \n    ')}`);
      if (f.fix) md.push(`  - Fix: ${escapeMd(f.fix)}`);
      if (f.defectId) md.push(`  - Regression id: \`${f.defectId}\``);
    }
    md.push('');
  }

  md.push('---');
  md.push('');
  md.push('_Generated by the Emjay QA suite. Read-only: no live-site content was modified._');
  return md.join('\n');
}

export function renderHtml(report) {
  const badge = (s) => `<span class="badge ${s.toLowerCase()}">${LABEL[s] || s}</span>`;
  const rows = report.checks
    .map(
      (c) => `<tr><td>${esc(c.title)}</td><td>${badge(c.status)}</td><td class="n">${c.counts.FAIL}</td><td class="n">${c.counts.WARN}</td><td class="n">${c.counts.INFO}</td></tr>`,
    )
    .join('\n');

  const regressionRows = report.regressions
    .map(
      (r) =>
        `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.title)}</td><td><span class="badge ${r.result === 'PASS' ? 'pass' : r.result === 'FAIL' ? 'fail' : 'warn'}">${r.result}</span></td><td>${esc(r.detail).slice(0, 240)}</td></tr>`,
    )
    .join('\n');

  const findingBlocks = ORDER.filter((s) => s !== 'PASS')
    .map((severity) => {
      const group = report.checks.flatMap((c) => c.findings.filter((f) => f.severity === severity).map((f) => ({ ...f, check: c.title })));
      if (!group.length) return '';
      return `<h3>${LABEL[severity]} (${group.length})</h3>` + group
        .map(
          (f) => `<div class="finding ${severity.toLowerCase()}">
  <div class="ft">${esc(f.title)} <span class="chk">${esc(f.check)}</span></div>
  ${f.url ? `<div class="fu"><a href="${esc(f.url)}" rel="noopener nofollow">${esc(f.url)}</a></div>` : ''}
  ${f.detail ? `<pre class="fd">${esc(String(f.detail))}</pre>` : ''}
  ${f.fix ? `<div class="fx">Fix: ${esc(f.fix)}</div>` : ''}
</div>`,
        )
        .join('\n');
    })
    .join('\n');

  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Emjay Wellness QA Report</title>
<style>
  :root { --bg:#fcfcfb; --ink:#2e2c27; --soft:#6b6a63; --line:#e4e3dc; --fail:#b3261e; --warn:#a8620a; --info:#4a6572; --pass:#2e6b3f; }
  * { box-sizing: border-box; }
  body { margin:0; padding:2rem 1.25rem 4rem; background:var(--bg); color:var(--ink);
         font:15px/1.55 -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 980px; margin: 0 auto; }
  h1 { font-size:1.7rem; margin:0 0 .25rem; }
  h2 { font-size:1.2rem; margin:2.5rem 0 .75rem; border-bottom:1px solid var(--line); padding-bottom:.35rem; }
  h3 { font-size:1rem; margin:1.75rem 0 .5rem; color:var(--soft); text-transform:uppercase; letter-spacing:.06em; }
  .sub { color:var(--soft); margin:0 0 1.5rem; }
  .overall { display:inline-block; padding:.4rem .9rem; border-radius:6px; font-weight:600; color:#fff; }
  .overall.fail { background:var(--fail); } .overall.warning { background:var(--warn); } .overall.pass { background:var(--pass); }
  table { width:100%; border-collapse:collapse; font-size:.92rem; }
  th, td { text-align:left; padding:.5rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--soft); font-weight:600; }
  td.n { text-align:right; font-variant-numeric:tabular-nums; }
  .badge { display:inline-block; padding:.1rem .5rem; border-radius:4px; font-size:.78rem; font-weight:600; color:#fff; }
  .badge.fail { background:var(--fail); } .badge.warn, .badge.warning { background:var(--warn); }
  .badge.info { background:var(--info); } .badge.pass { background:var(--pass); }
  .finding { border-left:3px solid var(--line); padding:.5rem 0 .5rem .8rem; margin:.6rem 0; }
  .finding.fail { border-left-color:var(--fail); } .finding.warn { border-left-color:var(--warn); }
  .finding.info { border-left-color:var(--info); }
  .ft { font-weight:600; }
  .chk { font-weight:400; color:var(--soft); font-size:.82rem; margin-left:.4rem; }
  .fu a { color:var(--info); font-size:.85rem; word-break:break-all; }
  .fd { background:#f4f3ef; padding:.5rem .6rem; border-radius:4px; font-size:.82rem; overflow-x:auto; white-space:pre-wrap; margin:.35rem 0; }
  .fx { font-size:.85rem; color:var(--soft); }
  .wrap { overflow-x:auto; }
  footer { margin-top:3rem; color:var(--soft); font-size:.85rem; border-top:1px solid var(--line); padding-top:1rem; }
</style></head><body><main>
<h1>Emjay Wellness — QA Report</h1>
<p class="sub">${esc(report.meta.site)} · ${esc(report.meta.startedAt)}</p>
<p><span class="overall ${report.meta.overall.toLowerCase()}">OVERALL: ${report.meta.overall}</span></p>
<p class="sub">${report.meta.pagesCrawled} pages crawled · ${report.meta.pagesRendered} rendered · ${report.meta.counts.FAIL} fail · ${report.meta.counts.WARN} warning · ${report.meta.counts.INFO} info</p>
${report.meta.renderAvailable ? '' : `<p class="finding warn"><strong>Browser pass did not run.</strong> ${esc(report.meta.renderSkipReason || '')}</p>`}
<h2>Check summary</h2>
<div class="wrap"><table><thead><tr><th>Check</th><th>Status</th><th class="n">Fail</th><th class="n">Warn</th><th class="n">Info</th></tr></thead><tbody>
${rows}
</tbody></table></div>
${report.regressions.length ? `<h2>Known-defect regressions</h2><div class="wrap"><table><thead><tr><th>ID</th><th>Defect</th><th>Result</th><th>Detail</th></tr></thead><tbody>${regressionRows}</tbody></table></div>` : ''}
<h2>Findings</h2>
${findingBlocks || '<p>No findings.</p>'}
<footer>Generated by the Emjay QA suite. Read-only: no live-site content was modified.</footer>
</main></body></html>`;
}

export async function writeReports(report, cfg) {
  const outDir = path.resolve(cfg.report.outDir);
  await mkdir(outDir, { recursive: true });
  const written = [];

  if (cfg.report.formats.includes('json')) {
    const p = path.join(outDir, 'qa-report.json');
    await writeFile(p, JSON.stringify(report, null, 2));
    written.push(p);
  }
  if (cfg.report.formats.includes('md')) {
    const p = path.join(outDir, 'qa-report.md');
    await writeFile(p, renderMarkdown(report, cfg));
    written.push(p);
  }
  if (cfg.report.formats.includes('html')) {
    const p = path.join(outDir, 'qa-report.html');
    await writeFile(p, renderHtml(report));
    written.push(p);
  }
  return written;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function escapeMd(s) {
  return String(s ?? '').replace(/([*_`])/g, '\\$1');
}
function escapePipes(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
