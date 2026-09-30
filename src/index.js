/**
 * SD YT Live — Public Entry Point
 * Tagline: Detect YouTube Live Streams Without an API Key
 * Stacks Development (SD)
 */

import YouTubeLive from './YouTubeLive.js';
import Watcher from './watcher/Watcher.js';
import errors from './errors/index.js';

export const VERSION = '1.0.0';

/**
 * Convenience helper to create a channel watcher instance.
 * 
 * @param {string|string[]} channel 
 * @param {object} [options={}] 
 * @returns {Watcher}
 */
export function createWatcher(channel, options = {}) {
  const yt = new YouTubeLive(options);
  return Array.isArray(channel) ? yt.watchMany(channel, options) : yt.watch(channel, options);
}

export {
  YouTubeLive,
  Watcher,
  errors
};

export default YouTubeLive;
