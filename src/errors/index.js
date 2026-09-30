/**
 * SD YT Live — Custom Error Hierarchy
 * Stacks Development (SD)
 */

export class SDYouTubeError extends Error {
  /**
   * @param {string} message 
   * @param {string} [code='UNKNOWN_ERROR']
   * @param {object} [details={}]
   */
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class YouTubeRequestError extends SDYouTubeError {
  constructor(message, statusCode = null, url = null, details = {}) {
    super(message, 'REQUEST_FAILED', { statusCode, url, ...details });
    this.statusCode = statusCode;
    this.url = url;
  }
}

export class YouTubeParseError extends SDYouTubeError {
  constructor(message, details = {}) {
    super(message, 'PARSE_ERROR', details);
  }
}

export class ChannelNotFoundError extends SDYouTubeError {
  constructor(identifier, details = {}) {
    super(`Channel not found: ${identifier}`, 'CHANNEL_NOT_FOUND', { identifier, ...details });
    this.identifier = identifier;
  }
}

export class VideoNotFoundError extends SDYouTubeError {
  constructor(videoId, details = {}) {
    super(`Video not found: ${videoId}`, 'VIDEO_NOT_FOUND', { videoId, ...details });
    this.videoId = videoId;
  }
}

export class DetectionError extends SDYouTubeError {
  constructor(message = 'Unable to determine channel status.', details = {}) {
    super(message, 'DETECTION_FAILED', details);
  }
}

export const errors = {
  SDYouTubeError,
  YouTubeRequestError,
  YouTubeParseError,
  ChannelNotFoundError,
  VideoNotFoundError,
  DetectionError
};

export default errors;
