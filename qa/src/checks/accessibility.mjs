import { finding } from '../severity.mjs';

/**
 * Static accessibility checks. Contrast lives in the rendered pass because it
 * needs computed styles; everything measurable from markup is here.
 */

export const altText = {
  id: 'alt-text',
  title: 'Image alt text',
  async run({ site }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      for (const img of page.dom.images) {
        const label = img.src ? shorten(img.src) : '(no src)';

        if (img.ariaHidden || img.role === 'presentation' || img.role === 'none') continue;

        if (!img.hasAltAttr) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Image has no alt attribute',
            url: page.finalUrl,
            detail: label,
            fix: 'Add descriptive alt text, or alt="" if the image is purely decorative.',
            defectId: 'EMJ-021',
          }));
          continue;
        }

        if (img.decorative && img.insideLink) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Linked image has empty alt text',
            url: page.finalUrl,
            detail: label,
            fix: 'A linked image needs alt text describing where the link goes.',
            defectId: 'EMJ-021',
          }));
          continue;
        }

        if (img.decorative) continue; // legitimate decorative image

        if (/^(?:image|img|photo|picture|untitled|dsc[_-]?\d+|img[_-]?\d+|screenshot)\b/i.test(img.altText)) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Alt text is a placeholder, not a description',
            url: page.finalUrl,
            detail: `alt="${img.altText}" on ${label}`,
            defectId: 'EMJ-021',
          }));
        }
        if (/\.(?:jpe?g|png|gif|webp|svg)$/i.test(img.altText)) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Alt text is a filename',
            url: page.finalUrl,
            detail: `alt="${img.altText}"`,
            defectId: 'EMJ-021',
          }));
        }
        if (img.altText.length > 150) {
          findings.push(finding({
            severity: 'INFO',
            title: `Alt text very long (${img.altText.length} chars)`,
            url: page.finalUrl,
            detail: label,
          }));
        }
      }
    }
    return findings;
  },
};

export const documentSemantics = {
  id: 'document-semantics',
  title: 'Document language, viewport and landmarks',
  async run({ site }) {
    const findings = [];
    for (const page of site.htmlPages()) {
      if (!page.dom.lang) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Missing lang attribute on <html>',
          url: page.finalUrl,
          fix: 'Set lang="en-AU".',
        }));
      } else if (!/^en(-|$)/i.test(page.dom.lang)) {
        findings.push(finding({
          severity: 'WARN',
          title: `Unexpected document language "${page.dom.lang}"`,
          url: page.finalUrl,
        }));
      }

      if (!page.dom.viewportMeta) {
        findings.push(finding({
          severity: 'FAIL',
          title: 'Missing viewport meta tag',
          url: page.finalUrl,
          fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        }));
      } else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/i.test(page.dom.viewportMeta)) {
        findings.push(finding({
          severity: 'WARN',
          title: 'Viewport blocks pinch-zoom',
          url: page.finalUrl,
          detail: page.dom.viewportMeta,
          fix: 'Remove user-scalable=no / maximum-scale so users can zoom.',
        }));
      }
    }
    return findings;
  },
};

export const linkText = {
  id: 'link-text',
  title: 'Link accessible names',
  async run({ site }) {
    const findings = [];
    const vague = /^(?:click here|here|read more|more|learn more|link|this|continue|>>?|…|\.\.\.)$/i;

    for (const page of site.htmlPages()) {
      const seen = new Set();
      for (const link of page.dom.links) {
        const name = link.text || link.ariaLabel || link.imgAlt || link.title || '';
        if (!name.trim()) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Link has no accessible name',
            url: page.finalUrl,
            detail: `href="${link.href}"`,
            fix: 'Add link text, an aria-label, or alt text on the contained image.',
          }));
          continue;
        }
        if (vague.test(name.trim()) && !seen.has(name.trim().toLowerCase())) {
          seen.add(name.trim().toLowerCase());
          findings.push(finding({
            severity: 'WARN',
            title: `Vague link text: "${name.trim()}"`,
            url: page.finalUrl,
            detail: `-> ${link.href}`,
            fix: 'Say where the link goes. Screen-reader users navigate by link list.',
          }));
        }
        if (link.target === '_blank' && !/\bnoopener\b/.test(link.rel) && !link.isMailto) {
          findings.push(finding({
            severity: 'INFO',
            title: 'target="_blank" without rel="noopener"',
            url: page.finalUrl,
            detail: link.href,
          }));
        }
      }
    }
    return findings;
  },
};

export const formStructure = {
  id: 'forms',
  title: 'Form structure and labelling',
  async run({ site, cfg }) {
    const findings = [];

    for (const page of site.htmlPages()) {
      for (const form of page.dom.forms) {
        const label = form.id || form.name || form.action || '(unnamed form)';

        // A search form legitimately submits on Enter with no visible button;
        // requiring one there produces a false failure on every page of a theme.
        if (cfg.forms.requireSubmitButton && !form.hasSubmit && !form.isSearch) {
          findings.push(finding({
            severity: 'FAIL',
            title: 'Form has no submit control',
            url: page.finalUrl,
            detail: label,
            fix: 'Add a <button type="submit">. A form the user cannot submit is a dead enquiry path.',
            defectId: 'EMJ-024',
          }));
        }

        if (!form.visibleFields.length) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Form has no visible fields',
            url: page.finalUrl,
            detail: label,
          }));
        }

        if (cfg.forms.requiredFieldsHaveLabels) {
          for (const field of form.visibleFields) {
            if (field.type === 'submit' || field.type === 'button' || field.type === 'image') continue;
            if (!field.hasLabel) {
              findings.push(finding({
                severity: 'FAIL',
                title: `Form field has no label: ${field.name || field.id || field.type}`,
                url: page.finalUrl,
                detail: `${label} — ${field.tag}[type=${field.type}]${field.placeholder ? ` (placeholder="${field.placeholder}")` : ''}`,
                fix: 'A placeholder is not a label. Add <label for> or aria-label.',
                defectId: 'EMJ-024',
              }));
            }
          }
        }

        if (cfg.forms.requireEmailInputType && form.hasEmailField && !form.emailFieldTyped) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Email field is not type="email"',
            url: page.finalUrl,
            detail: label,
            fix: 'type="email" gives mobile users the right keyboard and free validation.',
            defectId: 'EMJ-024',
          }));
        }

        if (form.actionAbs) {
          let actionHost = '';
          try { actionHost = new URL(form.actionAbs).hostname.toLowerCase(); } catch { /* ignore */ }
          const allowed = cfg.forms.allowedActionHosts.some((h) => h === '' || actionHost === h || actionHost.endsWith('.' + h));
          if (!allowed) {
            findings.push(finding({
              severity: 'WARN',
              title: 'Form posts to an unexpected host',
              url: page.finalUrl,
              detail: `${label} -> ${form.actionAbs}`,
              fix: 'Confirm this endpoint is intended and still live.',
            }));
          }
          if (/^http:\/\//i.test(form.actionAbs)) {
            findings.push(finding({
              severity: 'FAIL',
              title: 'Form submits over plain http',
              url: page.finalUrl,
              detail: form.actionAbs,
              defectId: 'EMJ-024',
            }));
          }
        }

        const carriesPersonalDetails =
          form.hasEmailField || form.visibleFields.some((f) => f.type === 'tel' || /phone|mobile|name|address/i.test(f.name || ''));
        if (!form.isSearch && form.method === 'get' && carriesPersonalDetails) {
          findings.push(finding({
            severity: 'WARN',
            title: 'Enquiry form uses GET',
            url: page.finalUrl,
            detail: label,
            fix: 'Personal details in a query string get logged and cached. Use POST.',
          }));
        }
      }
    }
    return findings;
  },
};

function shorten(url) {
  return url.length > 90 ? url.slice(0, 87) + '...' : url;
}

export default [altText, documentSemantics, linkText, formStructure];
