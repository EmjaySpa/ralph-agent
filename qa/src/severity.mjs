export const SEVERITIES = ['PASS', 'INFO', 'WARN', 'FAIL'];

const RANK = { PASS: 0, INFO: 1, WARN: 2, FAIL: 3 };

export function rank(severity) {
  return RANK[severity] ?? 0;
}

export function worst(...severities) {
  let out = 'PASS';
  for (const s of severities.flat()) {
    if (s && rank(s) > rank(out)) out = s;
  }
  return out;
}

/** Reduce a list of findings to a single check status. */
export function statusOf(findings) {
  return worst(findings.map((f) => f.severity));
}

export const LABEL = {
  PASS: 'PASS',
  INFO: 'INFO',
  WARN: 'WARNING',
  FAIL: 'FAIL',
};

/**
 * Build a finding. Keeping this in one place means every check emits the same
 * shape, which the reporters and the regression registry both rely on.
 */
export function finding({ severity, title, url = null, detail = '', evidence = null, fix = null, defectId = null }) {
  return { severity, title, url, detail, evidence, fix, defectId };
}
