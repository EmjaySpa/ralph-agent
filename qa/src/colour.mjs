/**
 * Colour maths: parsing, perceptual distance (for palette matching) and
 * WCAG contrast (for the accessibility check).
 */

export function parseColour(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'none' || s === 'currentcolor') return null;

  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6 && hex.length !== 8) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const num = (v, max) => (v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v));
    const a = parts[3] === undefined ? 1 : (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]));
    return {
      r: clamp(Math.round(num(parts[0], 255)), 0, 255),
      g: clamp(Math.round(num(parts[1], 255)), 0, 255),
      b: clamp(Math.round(num(parts[2], 255)), 0, 255),
      a: Number.isFinite(a) ? clamp(a, 0, 1) : 1,
    };
  }

  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const sat = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] === undefined ? 1 : (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]));
    const rgb = hslToRgb(h, sat, l);
    return { ...rgb, a: Number.isFinite(a) ? clamp(a, 0, 1) : 1 };
  }

  return null;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + mm) * 255),
    g: Math.round((g + mm) * 255),
    b: Math.round((b + mm) * 255),
  };
}

export function toHex(c) {
  if (!c) return null;
  const h = (v) => v.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

/** Composite a possibly-translucent colour over an opaque backdrop. */
export function composite(fg, bg) {
  if (!fg) return bg;
  if (fg.a >= 1) return { ...fg, a: 1 };
  if (!bg) return null;
  return {
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  };
}

// --- perceptual distance (CIE76 deltaE over Lab) ---

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab({ r, g, b }) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // sRGB D65 -> XYZ
  let x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  let y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) / 1.0;
  let z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/**
 * Lab chroma — how far a colour sits from the neutral grey axis.
 * Near zero for greys, blacks and off-whites; high for saturated brand colours.
 */
export function chroma(c) {
  if (!c) return 0;
  const lab = rgbToLab(c);
  return Math.sqrt(lab.a ** 2 + lab.b ** 2);
}

export function deltaE(c1, c2) {
  if (!c1 || !c2) return Infinity;
  const a = rgbToLab(c1), b = rgbToLab(c2);
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

// --- WCAG contrast ---

export function relativeLuminance({ r, g, b }) {
  const [R, G, B] = [r, g, b].map(srgbToLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(fg, bg) {
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG 2.1 large text: at least 18pt (24px), or 14pt (18.66px) **bold**.
 *
 * "Bold" is weight 700 or heavier. This is the distinction that catches people
 * out: 21px at weight 600 (semibold) is NOT large text, so it takes the 4.5:1
 * threshold, not 3:1. Semibold looks bold and is routinely misread as bold when
 * only the pixel size is quoted.
 *
 * `boldWeight` is configurable for teams that deliberately treat 600 as bold,
 * but the WCAG-conformant default is 700 and lowering it will let genuine
 * failures through.
 */
export function isLargeText(fontSizePx, fontWeight, boldWeight = 700) {
  const size = parseFloat(fontSizePx);
  const weight = Number(fontWeight) || (String(fontWeight).includes('bold') ? 700 : 400);
  if (!Number.isFinite(size)) return false;
  return size >= 24 || (size >= 18.66 && weight >= boldWeight);
}

/** Every hex/rgb/hsl literal in a blob of CSS or HTML, with its offset. */
export function extractColourLiterals(source) {
  const out = [];
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
  let m;
  while ((m = re.exec(source))) {
    const parsed = parseColour(m[0]);
    if (parsed) out.push({ raw: m[0], index: m.index, colour: parsed, hex: toHex(parsed) });
  }
  return out;
}
