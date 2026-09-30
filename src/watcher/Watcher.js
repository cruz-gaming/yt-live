/**
 * SD YT Live — Single & Multi-Channel Watcher
 * Stacks Development (SD)
 */

import { EventEmitter } from 'node:events';
import { STATUS } from '../utils/normalize.js';

export class Watcher extends EventEmitter {
  /**
   * @param {object} detector - Instance of LiveDetector or YouTubeLive
   * @param {string|string[]} channels - Single channel string or array of channel strings
   * @param {object} [options={}]
   * @param {number} [options.interval=30000] Polling interval in ms (default 30s)
   * @param {boolean} [options.immediate=true] Execute immediate check upon start
   * @param {boolean} [options.isMulti] Force multi-channel payload mode
   */
  constructor(detector, channels, options = {}) {
    super();
    this.detector = detector;
    
    const initialChannels = Array.isArray(channels) ? channels : [channels];
    this._channelsSet = new Set(initialChannels.map(c => typeof c === 'string' ? c.trim() : c).filter(Boolean));
    this.isMulti = options.isMulti ?? (Array.isArray(channels) || this._channelsSet.size > 1);

    // Follow configured interval directly without modifying user's requested interval
    this.interval = options.interval ?? 30000;
    this.immediate = options.immediate ?? true;

    this.timerId = null;
    this.running = false;
    this._stopped = false;
    this.channelStates = new Map(); // channelIdentifier -> { previousStatus, lastResult }
  }

  /**
   * Returns list of currently monitored channels.
   * 
   * @returns {string[]}
   */
  channels() {
    return Array.from(this._channelsSet);
  }

  /**
   * Dynamically adds one or more channels to the watcher.
   * 
   * @param {string|string[]} channel 
   * @returns {Watcher}
   */
  add(channel) {
    const toAdd = Array.isArray(channel) ? channel : [channel];
    for (const c of toAdd) {
      if (typeof c === 'string' && c.trim()) {
        this._channelsSet.add(c.trim());
      }
    }
    if (this._channelsSet.size > 1) {
      this.isMulti = true;
    }
    return this;
  }

  /**
   * Dynamically removes one or more channels from the watcher.
   * 
   * @param {string|string[]} channel 
   * @returns {Watcher}
   */
  remove(channel) {
    const toRemove = Array.isArray(channel) ? channel : [channel];
    for (const c of toRemove) {
      this._channelsSet.delete(c);
      this.channelStates.delete(c);
    }
    return this;
  }

  /**
   * Starts the polling watcher.
   * 
   * @returns {Watcher}
   */
  start() {
    if (this.running) return this;
    this.running = true;
    this._stopped = false;

    if (this.immediate) {
      this.poll();
    }

    this.timerId = setInterval(() => {
      this.poll();
    }, this.interval);

    return this;
  }

  /**
   * Stops the polling watcher.
   * 
   * @returns {Watcher}
   */
  stop() {
    if (!this.running) return this;
    this.running = false;
    this._stopped = true;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    return this;
  }

  /**
   * Checks whether the watcher is currently running.
   * 
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }

  /**
   * Gets the last known state for a given channel.
   * 
   * @param {string} channel 
   * @returns {object|null}
   */
  getChannelState(channel) {
    return this.channelStates.get(channel) || null;
  }

  /**
   * Performs a single poll cycle across all monitored channels.
   * Error isolation: A failure on one channel will not stop or throw for other channels.
   * 
   * @returns {Promise<void>}
   */
  async poll() {
    const activeChannels = this.channels();
    for (const channel of activeChannels) {
      if (this._stopped) break;

      try {
        const result = await this.detector.check(channel);
        this._handleChannelResult(channel, result);
      } catch (err) {
        // Emit error event with channel details
        this.emit('error', { channel, error: err });
      }
    }

    this.emit('poll', { timestamp: new Date().toISOString() });
  }

  /**
   * Processes result for a channel and emits state transition events.
   * Only transitions trigger events (e.g. NOT LIVE -> LIVE or LIVE -> NOT LIVE).
   * @private
   */
  _handleChannelResult(channel, result) {
    const currentState = this.channelStates.get(channel);
    const previousStatus = currentState ? currentState.previousStatus : null;
    const previousStream = currentState ? currentState.lastResult : null;
    const currentStatus = result.status;

    // Save updated state
    this.channelStates.set(channel, {
      previousStatus: currentStatus,
      lastResult: result
    });

    const isTransitioningToLive = previousStatus !== STATUS.LIVE && currentStatus === STATUS.LIVE;
    const isTransitioningFromLive = previousStatus === STATUS.LIVE && currentStatus !== STATUS.LIVE;

    // Generic change event on status change
    if (previousStatus !== currentStatus) {
      if (this.isMulti) {
        this.emit('change', { channel, result, stream: result });
      } else {
        this.emit('change', result);
      }
    }

    // Transition into LIVE stream
    if (isTransitioningToLive) {
      if (this.isMulti) {
        this.emit('live', { channel, stream: result });
      } else {
        this.emit('live', result);
      }
    }

    // Transition out of LIVE stream (live stream ended)
    if (isTransitioningFromLive) {
      if (this.isMulti) {
        this.emit('offline', { channel, previousStream, stream: result });
      } else {
        this.emit('offline', previousStream || result);
      }
    }
  }
}

export default Watcher;
