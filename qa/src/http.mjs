/**
 * Read-only HTTP layer.
 *
 * Every request made by this suite goes through here, which guarantees:
 *  - GET/HEAD only (never POST/PUT/DELETE against the live site)
 *  - full redirect-chain capture (manual redirect following)
 *  - a polite delay + bounded concurrency
 *  - one fetch per normalised URL (response cache)
 */

const METHOD_ALLOWLIST = new Set(['GET', 'HEAD']);

export class Http {
  constructor(config) {
    this.cfg = config;
    this.cache = new Map(); // normalisedUrl -> result
    this.robots = null;
    this.stats = { requests: 0, bytes: 0, errors: 0 };
    this._lastRequestAt = 0;
  }

  /** Strip tracking params, drop fragments, normalise trailing slash + host case. */
  normalise(input, base = this.cfg.site.baseUrl) {
    let u;
    try {
      u = new URL(input, base);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const p of this.cfg.crawl.stripParams) u.searchParams.delete(p);
    // Sort remaining params so ?a=1&b=2 and ?b=2&a=1 are one URL.
    u.searchParams.sort();
    if (u.pathname !== '/' && u.pathname.endsWith('/') && !this.cfg.site.canonicalTrailingSlash) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  }

  isInternal(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return this.cfg.site.internalHosts.includes(host);
    } catch {
      return false;
    }
  }

  isIgnored(url) {
    // Fragments are already stripped by normalise(); test the path only.
    let path;
    try {
      const u = new URL(url);
      path = u.pathname + u.search;
    } catch {
      return true;
    }
    return this.cfg.crawl.ignore.some((re) => re.test(path));
  }

  async _throttle() {
    const wait = this.cfg.crawl.delayMs - (Date.now() - this._lastRequestAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this._lastRequestAt = Date.now();
  }

  /**
   * Fetch a URL, following redirects by hand so the whole chain is recorded.
   * Returns { url, finalUrl, status, ok, chain, headers, body, contentType, timingMs, error }.
   */
  async fetchWithChain(rawUrl, { method = 'GET', maxHops = 10, wantBody = true } = {}) {
    if (!METHOD_ALLOWLIST.has(method)) {
      throw new Error(`Refusing non-read-only method: ${method}`);
    }
    const url = this.normalise(rawUrl);
    if (!url) {
      return { url: rawUrl, finalUrl: rawUrl, status: 0, ok: false, chain: [], headers: {}, body: '', error: 'invalid-url' };
    }

    const cacheKey = `${method}:${url}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const chain = [];
    let current = url;
    let result = null;
    const started = Date.now();

    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await this._raw(current, method);
      if (res.error) {
        result = {
          url, finalUrl: current, status: 0, ok: false, chain,
          headers: {}, body: '', contentType: '', timingMs: Date.now() - started,
          error: res.error,
        };
        break;
      }
      const status = res.status;
      const location = res.headers.get('location');
      if (status >= 300 && status < 400 && location) {
        const next = this.normalise(location, current);
        chain.push({ from: current, to: next, status });
        if (!next || next === current) {
          result = { url, finalUrl: current, status, ok: false, chain, headers: headersToObject(res.headers), body: '', contentType: '', timingMs: Date.now() - started, error: 'redirect-loop' };
          break;
        }
        current = next;
        continue;
      }

      let body = '';
      const contentType = res.headers.get('content-type') || '';
      if (wantBody && method === 'GET' && /text\/|json|xml|javascript|\+xml/i.test(contentType)) {
        try {
          body = await res.text();
          this.stats.bytes += body.length;
        } catch {
          body = '';
        }
      } else if (res.body) {
        try { await res.arrayBuffer(); } catch { /* drain */ }
      }

      result = {
        url,
        finalUrl: current,
        status,
        ok: status >= 200 && status < 300,
        chain,
        headers: headersToObject(res.headers),
        body,
        contentType,
        timingMs: Date.now() - started,
        error: null,
      };
      break;
    }

    if (!result) {
      result = { url, finalUrl: current, status: 0, ok: false, chain, headers: {}, body: '', contentType: '', timingMs: Date.now() - started, error: 'too-many-redirects' };
    }
    if (!result.ok) this.stats.errors++;
    this.cache.set(cacheKey, result);
    return result;
  }

  async _raw(url, method) {
    const { retries, timeoutMs, userAgent } = this.cfg.crawl;
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      await this._throttle();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        this.stats.requests++;
        const res = await fetch(url, {
          method,
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'user-agent': userAgent,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language': 'en-AU,en;q=0.9',
          },
        });
        clearTimeout(timer);
        return { status: res.status, headers: res.headers, body: res.body, text: () => res.text(), arrayBuffer: () => res.arrayBuffer() };
      } catch (err) {
        clearTimeout(timer);
        lastError = err?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : (err?.cause?.code || err?.message || String(err));
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
    }
    return { error: lastError };
  }

  /** Fetch and parse robots.txt once. */
  async loadRobots() {
    if (this.robots) return this.robots;
    const res = await this.fetchWithChain(new URL('/robots.txt', this.cfg.site.baseUrl).toString());
    this.robots = parseRobots(res.ok ? res.body : '', res);
    return this.robots;
  }

  /** True when robots.txt permits our user-agent to fetch this path. */
  allowedByRobots(url) {
    if (!this.cfg.crawl.respectRobots || !this.robots) return true;
    if (!this.isInternal(url)) return true;
    let path;
    try {
      const u = new URL(url);
      path = u.pathname + u.search;
    } catch {
      return true;
    }
    return this.robots.isAllowed(path);
  }
}

function headersToObject(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) out[k.toLowerCase()] = v;
  return out;
}

/**
 * Minimal robots.txt parser: enough for allow/disallow on the `*` group plus
 * Sitemap discovery. Longest-match wins, Allow beats Disallow on a tie.
 */
export function parseRobots(text, response = null) {
  const groups = [];
  const sitemaps = [];
  let current = null;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([a-zA-Z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (field === 'disallow' || field === 'allow') {
      if (!current) {
        current = { agents: ['*'], rules: [] };
        groups.push(current);
      }
      current.rules.push({ type: field, path: value });
    } else if (field === 'sitemap') {
      sitemaps.push(value);
    }
  }

  const group = groups.find((g) => g.agents.includes('*')) || { rules: [] };

  function matchLength(pattern, path) {
    if (pattern === '') return -1;
    // Support the * wildcard and $ end-anchor used by robots.txt.
    const hasWildcard = pattern.includes('*') || pattern.endsWith('$');
    if (!hasWildcard) return path.startsWith(pattern) ? pattern.length : -1;
    const re = new RegExp(
      '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'),
    );
    return re.test(path) ? pattern.length : -1;
  }

  return {
    raw: String(text),
    ok: response ? response.ok : true,
    status: response ? response.status : 0,
    sitemaps,
    groups,
    /** Whole-site block: `Disallow: /` with no offsetting Allow. */
    blocksEverything() {
      const disallowRoot = group.rules.some((r) => r.type === 'disallow' && r.path === '/');
      const allowRoot = group.rules.some((r) => r.type === 'allow' && r.path === '/');
      return disallowRoot && !allowRoot;
    },
    isAllowed(path) {
      let best = { type: 'allow', len: -1 };
      for (const rule of group.rules) {
        const len = matchLength(rule.path, path);
        if (len > best.len || (len === best.len && rule.type === 'allow')) {
          best = { type: rule.type, len };
        }
      }
      return best.len < 0 || best.type === 'allow';
    },
  };
}
