/**
 * SD YT Live — Logger Utility
 * Stacks Development (SD)
 */

export class Logger {
  /**
   * @param {object} [options={}]
   * @param {boolean} [options.debug=false]
   * @param {object} [options.logger=null]
   */
  constructor(options = {}) {
    this.enabled = Boolean(options.debug);
    this.customLogger = options.logger || null;
  }

  _format(message) {
    return `[yt-live] ${message}`;
  }

  debug(message, ...args) {
    if (!this.enabled && !this.customLogger) return;
    if (this.customLogger && typeof this.customLogger.debug === 'function') {
      this.customLogger.debug(this._format(message), ...args);
    } else if (this.enabled) {
      console.log(this._format(message), ...args);
    }
  }

  info(message, ...args) {
    if (!this.enabled && !this.customLogger) return;
    if (this.customLogger && typeof this.customLogger.info === 'function') {
      this.customLogger.info(this._format(message), ...args);
    } else if (this.enabled) {
      console.info(this._format(message), ...args);
    }
  }

  warn(message, ...args) {
    if (this.customLogger && typeof this.customLogger.warn === 'function') {
      this.customLogger.warn(this._format(message), ...args);
    } else if (this.enabled) {
      console.warn(this._format(message), ...args);
    }
  }

  error(message, ...args) {
    if (this.customLogger && typeof this.customLogger.error === 'function') {
      this.customLogger.error(this._format(message), ...args);
    } else if (this.enabled) {
      console.error(this._format(message), ...args);
    }
  }
}

export default Logger;
