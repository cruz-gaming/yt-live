/**
 * SD YT Live — Internal HTTP Client
 * Stacks Development (SD)
 */

import { validateSecurity } from '../utils/url.js';
import {
  YouTubeRequestError,
  ChannelNotFoundError,
  VideoNotFoundError
} from '../errors/index.js';

const DEFAULT_USER_AGENT = 'yt-live/1.0.0 (Stacks Development)';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export class HttpClient {
  /**
   * @param {object} [options={}]
   * @param {string} [options.userAgent]
   * @param {number} [options.timeout=10000]
   * @param {number} [options.retries=2]
   * @param {number} [options.maxRedirects=5]
   * @param {number} [options.maxSizeBytes=5242880]
   * @param {object} [options.logger=null]
   */
  constructor(options = {}) {
    this.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retries = Math.max(0, Math.min(options.retries ?? 2, 3)); // Max 3 retries
    this.maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
    this.logger = options.logger || null;
  }

  /**
   * Performs an HTTP GET request with security checks, retries, redirects, and timeouts.
   * 
   * @param {string} urlString 
   * @param {object} [requestOptions={}]
   * @param {AbortSignal} [requestOptions.signal]
   * @param {object} [requestOptions.headers]
   * @returns {Promise<{ body: string, finalUrl: string, statusCode: number, headers: Headers }>}
   */
  async get(urlString, requestOptions = {}) {
    // Validate security before request
    validateSecurity(urlString);

    let attempts = 0;
    const maxAttempts = 1 + this.retries;
    let lastError = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        if (this.logger) {
          this.logger.debug(`HTTP GET attempt ${attempts}/${maxAttempts}: ${urlString}`);
        }
        return await this._executeFetch(urlString, requestOptions);
      } catch (err) {
        lastError = err;

        // Do NOT retry for 404 or 403 or non-retryable security errors
        if (
          err instanceof ChannelNotFoundError ||
          err instanceof VideoNotFoundError ||
          (err instanceof YouTubeRequestError && (err.statusCode === 404 || err.statusCode === 403))
        ) {
          throw err;
        }

        if (attempts >= maxAttempts) {
          break;
        }

        // Conservative backoff delay for failed attempts
        const backoffMs = attempts * 500;
        if (this.logger) {
          this.logger.debug(`Retrying HTTP GET in ${backoffMs}ms due to error: ${err.message}`);
        }
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }

    throw lastError || new YouTubeRequestError(`Failed to fetch ${urlString} after ${maxAttempts} attempts`);
  }

  /**
   * Internal fetch executor
   * @private
   */
  async _executeFetch(urlString, requestOptions = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Combine user signal with timeout signal if provided
    if (requestOptions.signal) {
      requestOptions.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...(requestOptions.headers || {})
    };

    try {
      const response = await fetch(urlString, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      const statusCode = response.status;
      const finalUrl = response.url || urlString;

      // Ensure redirected URL is also valid and secure
      if (finalUrl !== urlString) {
        validateSecurity(finalUrl);
      }

      if (statusCode === 404) {
        if (urlString.includes('/watch') || urlString.includes('youtu.be')) {
          throw new VideoNotFoundError(urlString, { statusCode, url: urlString });
        }
        throw new ChannelNotFoundError(urlString, { statusCode, url: urlString });
      }

      if (statusCode >= 400) {
        throw new YouTubeRequestError(`HTTP error ${statusCode} fetching ${urlString}`, statusCode, urlString);
      }

      // Enforce max response size limit
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > this.maxSizeBytes) {
        throw new YouTubeRequestError(`Response size exceeds max limit of ${this.maxSizeBytes} bytes`, statusCode, urlString);
      }

      // Stream text response with size guard
      const body = await this._readResponseBody(response);

      return {
        body,
        finalUrl,
        statusCode,
        headers: response.headers
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new YouTubeRequestError(`Request timed out after ${this.timeout}ms for ${urlString}`, null, urlString);
      }

      if (
        err instanceof ChannelNotFoundError ||
        err instanceof VideoNotFoundError ||
        err instanceof YouTubeRequestError
      ) {
        throw err;
      }

      throw new YouTubeRequestError(`Network request failed for ${urlString}: ${err.message}`, null, urlString, { originalError: err });
    }
  }

  /**
   * Helper to safely read body with byte limit
   * @private
   */
  async _readResponseBody(response) {
    if (!response.body) {
      return await response.text();
    }

    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > this.maxSizeBytes) {
        reader.cancel();
        throw new YouTubeRequestError(`Response size limit of ${this.maxSizeBytes} bytes exceeded during download`);
      }
      chunks.push(value);
    }

    const concatenated = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(concatenated);
  }
}

export default HttpClient;
