#!/usr/bin/env node
/**
 * Runs the full suite against the built-in defective fixture site instead of
 * production. Use it to see the report format, to sanity-check the suite after
 * changing a check, or to demo the output without touching the live site.
 *
 *   node scripts/demo.mjs [--no-render]
 */
import { startFixtureSite } from '../tests/fixture-site.mjs';
import { main } from '../src/index.mjs';

const fixture = await startFixtureSite();
console.error(`Fixture site running at ${fixture.baseUrl}\n`);

const passthrough = process.argv.slice(2);
process.argv = [
  process.argv[0],
  process.argv[1],
  '--base-url', fixture.baseUrl,
  '--out', './report-demo',
  '--fail-on', 'never',
  '--render-limit', '6',
  ...passthrough,
];

try {
  const code = await main();
  console.error(`\nDemo run finished (exit code would be ${code} under the configured failOn).`);
} finally {
  await fixture.close();
}
