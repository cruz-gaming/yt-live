/**
 * SD YT Live — Main Public API Class
 * Stacks Development (SD)
 */

import LiveDetector from './detector/LiveDetector.js';
import Watcher from './watcher/Watcher.js';
import { extractVideoId } from './utils/url.js';
import { STATUS } from './utils/normalize.js';

export class YouTubeLive {
  /**
   * @param {object} [options={}]
   * @param {number} [options.timeout=10000] Request timeout in ms
   * @param {number} [options.retries=2] Max request retry count
   * @param {string} [options.userAgent] Custom HTTP User-Agent string
   * @param {boolean} [options.cache=true] Enable in-memory caching
   * @param {number} [options.cacheTTL=30000] Cache TTL in ms
   * @param {boolean} [options.debug=false] Enable debug logging
   * @param {object} [options.logger=null] Custom logger implementation
   */
  constructor(options = {}) {
    this.options = { ...options };
    this.detector = new LiveDetector(this.options);
  }

  /**
   * Access to internal cache instance.
   * Exposes yt.cache.clear(), yt.cache.delete(id), yt.cache.stats(), etc.
   */
  get cache() {
    return this.detector.cache;
  }

  /**
   * Diagnostic check returning status of channel or video (LIVE, UPCOMING, OFFLINE, UNKNOWN).
   * 
   * @param {string} input 
   * @returns {Promise<object>} Standard result object
   */
  async check(input) {
    return await this.detector.check(input);
  }

  /**
   * Checks status of a specific YouTube video.
   * 
   * @param {string} videoInput - Video ID or Video URL
   * @returns {Promise<object>} Standard result object
   */
  async checkVideo(videoInput) {
    const videoId = extractVideoId(videoInput) || videoInput;
    return await this.detector.check(videoId);
  }

  /**
   * Returns stream data object ONLY if the channel or video is currently LIVE.
   * Returns null if OFFLINE, UPCOMING, UNKNOWN, or error occurs.
   * 
   * @param {string} input 
   * @returns {Promise<object|null>} Live stream object or null
   */
  async getLive(input) {
    try {
      const result = await this.check(input);
      return result && result.status === STATUS.LIVE ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks multiple channels and returns array containing stream data ONLY for currently LIVE channels.
   * Returns empty array [] if no channels are currently live.
   * 
   * @param {string[]} channels 
   * @returns {Promise<object[]>} Array of active live stream objects
   */
  async getLiveMany(channels) {
    if (!Array.isArray(channels)) return [];

    const results = await Promise.all(
      channels.map(async (channel) => {
        try {
          return await this.getLive(channel);
        } catch {
          return null;
        }
      })
    );

    return results.filter(Boolean);
  }

  /**
   * Returns true ONLY when the channel currently has an active LIVE broadcast.
   * Returns false for UPCOMING, OFFLINE, UNKNOWN, or error.
   * 
   * @param {string} input 
   * @returns {Promise<boolean>}
   */
  async isLive(input) {
    try {
      const result = await this.check(input);
      return Boolean(result && result.status === STATUS.LIVE);
    } catch {
      return false;
    }
  }

  /**
   * Convenience helper returning true if stream is scheduled or upcoming.
   * 
   * @param {string} input 
   * @returns {Promise<boolean>}
   */
  async isUpcoming(input) {
    try {
      const result = await this.check(input);
      return Boolean(result && result.status === STATUS.UPCOMING);
    } catch {
      return false;
    }
  }

  /**
   * Convenience helper returning full channel status object.
   * 
   * @param {string} input 
   * @returns {Promise<object>}
   */
  async getChannel(input) {
    return await this.check(input);
  }

  /**
   * Creates and starts a live watcher for a single channel.
   * 
   * @param {string} channel 
   * @param {object} [options={}]
   * @param {number} [options.interval=30000] Polling interval in ms
   * @param {boolean} [options.immediate=true] Run immediate check on start
   * @returns {Watcher}
   */
  watch(channel, options = {}) {
    const watcher = new Watcher(this.detector, channel, { ...options, isMulti: Array.isArray(channel) });
    watcher.start();
    return watcher;
  }

  /**
   * Creates and starts a live watcher for multiple channels.
   * 
   * @param {string[]} channels 
   * @param {object} [options={}]
   * @param {number} [options.interval=30000] Polling interval in ms
   * @param {boolean} [options.immediate=true] Run immediate check on start
   * @returns {Watcher}
   */
  watchMany(channels, options = {}) {
    const watcher = new Watcher(this.detector, channels, { ...options, isMulti: true });
    watcher.start();
    return watcher;
  }
}

export default YouTubeLive;
