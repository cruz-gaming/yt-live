/**
 * SD YT Live — HTML & Structured Data Parser
 * Stacks Development (SD)
 */

export class PageParser {
  /**
   * Extracts ytInitialData, JSON-LD, and meta tags from YouTube HTML.
   * 
   * @param {string} html 
   * @returns {{
   *   ytInitialData: object|null,
   *   jsonLd: object|array|null,
   *   meta: object
   * }}
   */
  parse(html) {
    if (typeof html !== 'string') {
      return { ytInitialData: null, jsonLd: null, meta: {} };
    }

    const meta = this.extractMetaTags(html);
    const ytInitialData = this.extractInitialData(html);
    const jsonLd = this.extractJsonLd(html);

    return {
      ytInitialData,
      jsonLd,
      meta
    };
  }

  /**
   * Safely extracts and parses window.ytInitialData / var ytInitialData
   * @param {string} html 
   * @returns {object|null}
   */
  extractInitialData(html) {
    // Patterns for ytInitialData
    const patterns = [
      /(?:window\["ytInitialData"\]|var\s+ytInitialData|ytInitialData)\s*=\s*({[\s\S]*?});\s*<\/script>/i,
      /(?:window\["ytInitialData"\]|var\s+ytInitialData|ytInitialData)\s*=\s*({[\s\S]*?});\s*(?:var|window|document)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
          // Attempt balanced brace extraction if trailing characters caused JSON.parse failure
          const parsed = this._extractJsonByBraces(match[1]);
          if (parsed) return parsed;
        }
      }
    }

    // Direct search for "ytInitialData" = {
    const idx = html.indexOf('ytInitialData');
    if (idx !== -1) {
      const startBrace = html.indexOf('{', idx);
      if (startBrace !== -1) {
        const parsed = this._extractJsonByBraces(html.slice(startBrace));
        if (parsed) return parsed;
      }
    }

    return null;
  }

  /**
   * Helper to parse JSON string by scanning balanced braces
   * @private
   */
  _extractJsonByBraces(str) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 0) {
            const candidate = str.slice(0, i + 1);
            try {
              return JSON.parse(candidate);
            } catch {
              return null;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Extracts schema.org JSON-LD scripts
   * @param {string} html 
   * @returns {object|array|null}
   */
  extractJsonLd(html) {
    const regex = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
    let match;
    const results = [];

    while ((match = regex.exec(html)) !== null) {
      if (match[1]) {
        try {
          const parsed = JSON.parse(match[1].trim());
          results.push(parsed);
        } catch {
          // Ignore invalid JSON-LD blocks
        }
      }
    }

    if (results.length === 0) return null;
    return results.length === 1 ? results[0] : results;
  }

  /**
   * Extracts open graph and canonical meta tags
   * @param {string} html 
   * @returns {object}
   */
  extractMetaTags(html) {
    const meta = {};

    // Helper for meta tags
    const metaRegex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      meta[match[1].toLowerCase()] = match[2];
    }

    // Alternative ordering: content="..." property="..."
    const metaRegexAlt = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']([^"']+)["']/gi;
    while ((match = metaRegexAlt.exec(html)) !== null) {
      meta[match[2].toLowerCase()] = match[1];
    }

    // Canonical link
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalMatch) {
      meta['canonical'] = canonicalMatch[1];
    }

    // Title element
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      meta['pageTitle'] = titleMatch[1];
    }

    return meta;
  }
}

export default PageParser;
