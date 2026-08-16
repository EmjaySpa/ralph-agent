import { finding } from '../severity.mjs';
import { typesOf } from '../parse.mjs';

/**
 * Structured-data validation, done locally: JSON parses, @context/@type are
 * present, required properties per type exist, and the business facts in the
 * markup agree with the configured facts.
 */
export const structuredData = {
  id: 'structured-data',
  title: 'Schema / structured data',
  async run({ site, cfg }) {
    const findings = [];
    const typesSeen = new Set();
    const localBusinessNodes = [];

    for (const page of site.htmlPages()) {
      const { jsonLd, jsonLdErrors } = page.dom;

      for (const err of jsonLdErrors) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Invalid JSON-LD block',
          url: page.finalUrl,
          detail: `${err.error}${err.snippet ? `\n    ${err.snippet}` : ''}`,
          fix: 'Fix the JSON syntax, or remove the empty block.',
          defectId: 'EMJ-023',
        }));
      }

      if (!jsonLd.length && !jsonLdErrors.length) {
        findings.push(finding({
          severity: 'WARN',
          title: 'No structured data on page',
          url: page.finalUrl,
          fix: 'At minimum, emit Organization/LocalBusiness sitewide and Article on posts.',
        }));
        continue;
      }

      for (const node of jsonLd) {
        const types = typesOf(node);
        if (!types.length) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'JSON-LD node has no @type',
            url: page.finalUrl,
            detail: JSON.stringify(node).slice(0, 160),
            defectId: 'EMJ-023',
          }));
          continue;
        }
        for (const t of types) typesSeen.add(t);

        if (!node['@context'] && !nodeIsNested(node)) {
          findings.push(finding({
            severity: 'WARN',
            title: `Missing @context on ${types.join('/')}`,
            url: page.finalUrl,
          }));
        }

        for (const t of types) {
          const required = cfg.structuredData.requiredProps[t];
          if (!required) continue;
          for (const prop of required) {
            if (isEmpty(node[prop])) {
              findings.push(finding({
                severity: 'FAIL',
                title: `${t} is missing required property "${prop}"`,
                url: page.finalUrl,
                detail: JSON.stringify(node).slice(0, 200),
                defectId: 'EMJ-023',
              }));
            }
          }
        }

        // Values that are placeholders rather than data.
        for (const [k, v] of Object.entries(node)) {
          if (typeof v === 'string' && /^(?:\{\{|%%|TODO|N\/A|undefined|null)\b/i.test(v.trim())) {
            findings.push(finding({
              severity: 'FAIL',
              title: `Placeholder value in structured data: ${k}`,
              url: page.finalUrl,
              detail: `"${v}"`,
              defectId: 'EMJ-023',
            }));
          }
        }

        // Dates must parse.
        for (const dateProp of ['datePublished', 'dateModified', 'startDate', 'endDate']) {
          const v = node[dateProp];
          if (typeof v === 'string' && Number.isNaN(Date.parse(v))) {
            findings.push(finding({
              severity: 'FAIL',
              title: `Unparseable ${dateProp} in ${types.join('/')}`,
              url: page.finalUrl,
              detail: v,
              defectId: 'EMJ-023',
            }));
          }
        }

        if (types.some((t) => /LocalBusiness|HealthAndBeautyBusiness|MedicalBusiness|DaySpa|BeautySalon/.test(t))) {
          localBusinessNodes.push({ node, url: page.finalUrl, types });
        }

        // Breadcrumb positions must be a 1-based sequence.
        if (types.includes('BreadcrumbList') && Array.isArray(node.itemListElement)) {
          const positions = node.itemListElement.map((it) => Number(it?.position)).filter((n) => Number.isFinite(n));
          const expected = positions.map((_, i) => i + 1);
          if (positions.join(',') !== expected.join(',')) {
            findings.push(finding({
              severity: 'WARN',
              title: 'BreadcrumbList positions are not a 1-based sequence',
              url: page.finalUrl,
              detail: `positions: ${positions.join(', ') || '(none)'}`,
            }));
          }
        }
      }
    }

    // --- sitewide expectations ---
    for (const t of cfg.structuredData.requiredSomewhere) {
      const present = [...typesSeen].some((seen) => seen === t || seen.includes(t));
      if (!present) {
        findings.push(finding({
          severity: 'WARN',
          title: `No ${t} schema found anywhere on the site`,
          url: cfg.site.baseUrl,
          fix: `Emit ${t} markup sitewide.`,
        }));
      }
    }

    // --- business facts agree with config ---
    const names = new Set(localBusinessNodes.map(({ node }) => String(node.name || '').trim()).filter(Boolean));
    if (names.size > 1) {
      findings.push(finding({
        severity: 'WARN',
        title: 'LocalBusiness name is inconsistent across pages',
        url: localBusinessNodes[0]?.url || cfg.site.baseUrl,
        detail: [...names].join(' | '),
      }));
    }
    for (const name of names) {
      if (name.toLowerCase() !== cfg.content.business.name.toLowerCase()) {
        findings.push(finding({
          severity: 'WARN',
          title: 'LocalBusiness name does not match the configured business name',
          url: localBusinessNodes[0]?.url || cfg.site.baseUrl,
          detail: `markup: "${name}" | expected: "${cfg.content.business.name}"`,
        }));
      }
    }

    for (const { node, url, types } of localBusinessNodes) {
      const address = node.address;
      const addressText = JSON.stringify(address || '');
      for (const legacy of cfg.content.legacyReferences) {
        if (legacy.disabled || !legacy.pattern) continue;
        if (legacy.pattern.test(addressText)) {
          findings.push(finding({
            severity: legacy.severity,
            title: `Legacy reference in structured data address: ${legacy.label}`,
            url,
            detail: addressText.slice(0, 200),
            defectId: legacy.id,
          }));
        }
      }
      if (address && typeof address === 'object' && !address.addressLocality) {
        findings.push(finding({
          severity: 'WARN',
          title: `${types.join('/')} address has no addressLocality`,
          url,
        }));
      }
    }

    return findings;
  },
};

function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function nodeIsNested(node) {
  // Nodes lifted out of an @graph inherit context from the wrapper.
  return Boolean(node['@id']);
}

export default [structuredData];
