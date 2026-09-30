/**
 * SD YT Live — Channel & Input Resolver
 * Stacks Development (SD)
 */

import { parseInput } from '../utils/url.js';

export class ChannelResolver {
  /**
   * Resolves raw input into target URLs to probe.
   * 
   * @param {string} input 
   * @returns {{
   *   type: string,
   *   identifier: string,
   *   primaryUrl: string,
   *   secondaryUrl: string|null,
   *   isDirectVideo: boolean,
   *   rawInput: string
   * }}
   */
  resolve(input) {
    const parsed = parseInput(input);

    if (parsed.type === 'videoId' || parsed.type === 'videoUrl') {
      return {
        type: parsed.type,
        identifier: parsed.identifier,
        primaryUrl: `https://www.youtube.com/watch?v=${parsed.identifier}`,
        secondaryUrl: null,
        isDirectVideo: true,
        rawInput: parsed.rawInput
      };
    }

    let baseUrl = parsed.normalizedUrl.replace(/\/+$/, '');

    // For handles, channel IDs, and custom URLs, the /live endpoint is the primary detection probe
    let primaryUrl = `${baseUrl}/live`;
    let secondaryUrl = baseUrl;

    return {
      type: parsed.type,
      identifier: parsed.identifier,
      primaryUrl,
      secondaryUrl,
      isDirectVideo: false,
      rawInput: parsed.rawInput
    };
  }
}

export default ChannelResolver;
