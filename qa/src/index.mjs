#!/usr/bin/env node
/**
 * Emjay Wellness QA suite — entry point.
 *
 * Usage:
 *   node src/index.mjs [options]
 *
 * Options:
 *   --config <path>      Config module (default ./emjay-qa.config.mjs)
 *   --defects <path>     Known-defect registry (default ./known-defects.json)
 *   --base-url <url>     Override the site under test
 *   --max-pages <n>      Override the crawl limit
 *   --render-limit <n>   Cap how many pages get the browser pass (default 40)
 *   --no-render          Skip the browser pass entirely (HTTP/HTML checks only)
 *   --only <ids>         Comma-separated check ids to run
 *   --skip <ids>         Comma-separated check ids to skip
 *   --fail-on <level>    fail | warn | never  (default from config)
 *   --out <dir>          Report output directory
 *   --quiet              Suppress progress output
 *
 * This suite is read-only. It performs GET/HEAD requests and renders pages in
 * a browser. It never submits a form and never writes to the site.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { Http } from './http.mjs';
import { crawlSite } from './crawl.mjs';
import { renderPages } from './render.mjs';
import { statusOf, rank } from './severity.mjs';
import { buildReport, renderConsole, writeReports } from './report.mjs';
import { makeRegressionCheck } from './checks/regressions.mjs';

import httpChecks from './checks/http-links.mjs';
import seoChecks from './checks/seo.mjs';
import sitemapChecks from './checks/sitemap.mjs';
import schemaChecks from './checks/structured-data.mjs';
import a11yChecks from './checks/accessibility.mjs';
import contentChecks from './checks/content.mjs';
import structureChecks from './checks/structure.mjs';
import renderedChecks from './checks/rendered-checks.mjs';

const RENDERED_CHECK_IDS = new Set(renderedChecks.map((c) => c.id));

export function parseArgs(argv) {
  const args = { only: null, skip: null, render: true, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--config': args.config = next(); break;
      case '--defects': args.defects = next(); break;
      case '--base-url': args.baseUrl = next(); break;
      case '--max-pages': args.maxPages = Number(next()); break;
      case '--render-limit': args.renderLimit = Number(next()); break;
      case '--no-render': args.render = false; break;
      case '--only': args.only = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--skip': args.skip = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--fail-on': args.failOn = next(); break;
      case '--out': args.out = next(); break;
      case '--quiet': args.quiet = true; break;
      case '--help': case '-h': args.help = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown option: ${a}`);
    }
  }
  return args;
}

export function allChecks() {
  return [
    ...httpChecks,
    ...seoChecks,
    ...sitemapChecks,
    ...schemaChecks,
    ...a11yChecks,
    ...contentChecks,
    ...structureChecks,
    ...renderedChecks,
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(await readFile(new URL(import.meta.url), 'utf8').then((s) => s.split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '')));
    return 0;
  }

  const configPath = path.resolve(args.config || './emjay-qa.config.mjs');
  const cfg = (await import(pathToFileURL(configPath).href)).default;

  if (args.baseUrl) {
    cfg.site.baseUrl = args.baseUrl.replace(/\/$/, '');
    cfg.site.canonicalOrigin = new URL(cfg.site.baseUrl).origin;
    const host = new URL(cfg.site.baseUrl).hostname;
    cfg.site.internalHosts = [...new Set([host, host.replace(/^www\./, ''), 'www.' + host.replace(/^www\./, '')])];
  }
  if (Number.isFinite(args.maxPages)) cfg.crawl.maxPages = args.maxPages;
  if (args.out) cfg.report.outDir = args.out;
  if (args.failOn) cfg.report.failOn = args.failOn;

  const log = args.quiet ? () => {} : (...m) => console.error(...m);
  const startedAt = new Date();
  const t0 = Date.now();

  log(`\nEmjay QA — ${cfg.site.baseUrl}`);
  log('Read-only run. No form is submitted and no site content is modified.\n');

  // --- 1. crawl ---
  const http = new Http(cfg);
  log('Crawling...');
  let site;
  try {
    site = await crawlSite(http, cfg, {
      onProgress: ({ processed, url, status }) => {
        if (processed % 10 === 0 || status >= 400) log(`  [${processed}] ${status || 'ERR'} ${url}`);
      },
    });
  } catch (err) {
    console.error(`\nCrawl failed: ${err.message}`);
    console.error('If the host is unreachable, confirm network egress to the site is permitted from this machine.');
    return 2;
  }
  log(`  ${site.pages.size} URLs fetched, ${site.htmlPages().length} HTML pages, ${site.sitemap.urls.length} sitemap entries.`);

  if (site.pages.size === 0 || site.htmlPages().length === 0) {
    console.error('\nNo HTML pages were retrieved. Nothing can be asserted — refusing to report a result.');
    console.error(`First error: ${[...site.pages.values()][0]?.error || 'unknown'}`);
    return 2;
  }

  // --- 2. render ---
  let rendered = { available: false, reason: 'Browser pass disabled with --no-render.', pages: new Map() };
  if (args.render) {
    const limit = Number.isFinite(args.renderLimit) ? args.renderLimit : 40;
    const targets = pickRenderTargets(site, limit);
    log(`\nRendering ${targets.length} page(s) in Chromium...`);
    rendered = await renderPages(targets, cfg, {
      onProgress: ({ index, total, url }) => log(`  [${index}/${total}] ${url}`),
    });
    if (!rendered.available) log(`  Browser pass unavailable: ${rendered.reason}`);
  }

  // --- 3. checks ---
  let registry = { defects: [] };
  try {
    const defectsPath = path.resolve(args.defects || './known-defects.json');
    registry = JSON.parse(await readFile(defectsPath, 'utf8'));
  } catch (err) {
    log(`  ! Could not load known-defect registry: ${err.message}`);
  }

  const ctx = { site, http, cfg, rendered, priorResults: [] };
  let checks = allChecks();
  if (args.only) checks = checks.filter((c) => args.only.includes(c.id));
  if (args.skip) checks = checks.filter((c) => !args.skip.includes(c.id));
  if (!args.render) checks = checks.filter((c) => !RENDERED_CHECK_IDS.has(c.id) || c.id === 'brand-colours');

  checks.push(makeRegressionCheck(registry));

  log(`\nRunning ${checks.length} checks...`);
  const results = [];
  for (const check of checks) {
    const started = Date.now();
    let findings = [];
    let error = null;
    try {
      findings = (await check.run(ctx)) || [];
    } catch (err) {
      error = err.stack || err.message;
      findings = [{
        severity: 'FAIL',
        title: `Check "${check.id}" threw an exception`,
        url: null,
        detail: err.message,
        evidence: null,
        fix: 'This is a bug in the QA suite, not necessarily in the site. Treat the checked area as unverified.',
        defectId: null,
      }];
    }
    const result = {
      id: check.id,
      title: check.title,
      findings,
      status: statusOf(findings),
      durationMs: Date.now() - started,
      error,
    };
    results.push(result);
    ctx.priorResults = results;
    log(`  ${result.status.padEnd(4)} ${check.title} (${findings.length} finding${findings.length === 1 ? '' : 's'})`);
  }

  // --- 4. report ---
  const report = buildReport({
    results,
    site,
    cfg,
    rendered,
    regressionOutcomes: ctx.regressionOutcomes,
    meta: {
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - t0,
      suiteVersion: '1.0.0',
      readOnly: true,
    },
  });

  console.log(renderConsole(report, cfg));
  const written = await writeReports(report, cfg);
  log(`\nReports written:\n  ${written.join('\n  ')}\n`);

  const { failOn } = cfg.report;
  if (failOn === 'never') return 0;
  const threshold = failOn === 'warn' ? 'WARN' : 'FAIL';
  const worstSeverity = report.meta.counts.FAIL ? 'FAIL' : report.meta.counts.WARN ? 'WARN' : 'PASS';
  return rank(worstSeverity) >= rank(threshold) ? 1 : 0;
}

/**
 * The browser pass is the expensive one. Prioritise: homepage, then shallow
 * pages, then one representative of each URL-path family, so a big blog
 * archive cannot crowd out the service pages.
 */
export function pickRenderTargets(site, limit) {
  const pages = site.htmlPages();
  const scored = pages.map((p) => {
    const u = new URL(p.finalUrl);
    const segments = u.pathname.split('/').filter(Boolean);
    // Unreachable pages sort last rather than producing NaN comparisons.
    const depth = Number.isFinite(p.depth) ? p.depth : 9999;
    return { url: p.finalUrl, depth, family: segments[0] || '', segments: segments.length };
  });

  const chosen = [];
  const seenFamilies = new Set();

  const home = scored.find((s) => s.segments === 0);
  if (home) { chosen.push(home.url); seenFamilies.add(''); }

  const byPriority = scored
    .filter((s) => !chosen.includes(s.url))
    .sort((a, b) => a.depth - b.depth || a.segments - b.segments || a.url.localeCompare(b.url));

  // One per family first, so coverage is broad before it is deep.
  for (const s of byPriority) {
    if (chosen.length >= limit) break;
    if (seenFamilies.has(s.family)) continue;
    seenFamilies.add(s.family);
    chosen.push(s.url);
  }
  for (const s of byPriority) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(s.url)) chosen.push(s.url);
  }
  return chosen;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('\nQA suite crashed:', err.stack || err.message);
      process.exit(2);
    });
}

export { main };
