/**
 * SD YT Live — Detection Engine Core
 * Stacks Development (SD)
 */

import ChannelResolver from '../resolver/ChannelResolver.js';
import HttpClient from '../http/HttpClient.js';
import PageParser from '../parser/PageParser.js';
import StreamParser from '../parser/StreamParser.js';
import Cache from '../cache/Cache.js';
import Logger from '../utils/logger.js';
import { STATUS, createUnknownResult } from '../utils/normalize.js';
import {
  ChannelNotFoundError,
  VideoNotFoundError
} from '../errors/index.js';

export class LiveDetector {
  /**
   * @param {object} [options={}]
   * @param {number} [options.timeout=10000]
   * @param {number} [options.retries=2]
   * @param {string} [options.userAgent]
   * @param {boolean} [options.cache=true]
   * @param {number} [options.cacheTTL=30000]
   * @param {boolean} [options.debug=false]
   * @param {object} [options.logger=null]
   * @param {HttpClient} [options.httpClient=null]
   */
  constructor(options = {}) {
    this.logger = new Logger({ debug: options.debug, logger: options.logger });
    this.resolver = new ChannelResolver();
    this.httpClient = options.httpClient || new HttpClient({
      timeout: options.timeout,
      retries: options.retries,
      userAgent: options.userAgent,
      logger: this.logger
    });
    this.pageParser = new PageParser();
    this.streamParser = new StreamParser();
    this.cache = new Cache({ enabled: options.cache ?? true, ttl: options.cacheTTL ?? 30000 });
  }

  /**
   * Detects the status of a channel or video input.
   * 
   * @param {string} input 
   * @returns {Promise<object>}
   */
  async check(input) {
    this.logger.debug(`Resolving input: ${input}`);
    const resolved = this.resolver.resolve(input);

    const cacheKey = resolved.identifier;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Cache hit for identifier: ${cacheKey}`);
      return cachedResult;
    }

    this.logger.debug(`Cache miss for identifier: ${cacheKey}. Fetching public page.`);

    return await this.cache.deduplicate(cacheKey, async () => {
      try {
        const result = await this._performDetection(resolved);
        if (result.status !== STATUS.UNKNOWN) {
          this.cache.set(cacheKey, result);
        }
        return result;
      } catch (err) {
        if (err instanceof ChannelNotFoundError || err instanceof VideoNotFoundError) {
          throw err;
        }

        this.logger.error(`Detection error for ${input}: ${err.message}`);

        const unknownResult = createUnknownResult(
          err.message || 'Unable to determine channel status.',
          err.code || 'DETECTION_FAILED',
          { url: resolved.primaryUrl, channelUrl: resolved.secondaryUrl }
        );

        return unknownResult;
      }
    });
  }

  /**
   * Performs actual HTTP fetch and parsing
   * @private
   */
  async _performDetection(resolved) {
    this.logger.debug(`Fetching primary URL: ${resolved.primaryUrl}`);

    const response = await this.httpClient.get(resolved.primaryUrl);

    this.logger.debug(`Parsing page data for URL: ${response.finalUrl}`);
    const parsedPage = this.pageParser.parse(response.body);

    const result = this.streamParser.parse(parsedPage, {
      finalUrl: response.finalUrl,
      requestedUrl: resolved.primaryUrl,
      statusCode: response.statusCode
    });

    this.logger.info(`Status for ${resolved.identifier}: ${result.status}`);

    // If primary probe returned OFFLINE or UNKNOWN and channel name/id is missing, try secondary URL to enrich channel metadata if available
    if (
      !resolved.isDirectVideo &&
      (result.status === STATUS.OFFLINE || result.status === STATUS.UNKNOWN) &&
      (!result.channelName || !result.channelId) &&
      resolved.secondaryUrl
    ) {
      try {
        this.logger.debug(`Enriching channel metadata via secondary URL: ${resolved.secondaryUrl}`);
        const secondaryResponse = await this.httpClient.get(resolved.secondaryUrl);

        const secondaryParsed = this.pageParser.parse(secondaryResponse.body);
        const enrichedResult = this.streamParser.parse(secondaryParsed, {
          finalUrl: secondaryResponse.finalUrl,
          requestedUrl: resolved.secondaryUrl,
          statusCode: secondaryResponse.statusCode
        });

        if (enrichedResult.channelName) result.channelName = enrichedResult.channelName;
        if (enrichedResult.channelId) result.channelId = enrichedResult.channelId;
        if (enrichedResult.channelUrl) result.channelUrl = enrichedResult.channelUrl;
      } catch {
        // Enriched fetch is best-effort only
      }
    }

    return result;
  }
}

export default LiveDetector;
