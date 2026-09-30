/**
 * SD YT Live — Result Normalization Utility
 * Stacks Development (SD)
 */

export const STATUS = {
  LIVE: 'LIVE',
  UPCOMING: 'UPCOMING',
  OFFLINE: 'OFFLINE',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Creates a standard normalized result object.
 * 
 * @param {object} params
 * @param {string} params.status - 'LIVE' | 'UPCOMING' | 'OFFLINE' | 'UNKNOWN'
 * @param {string|null} [params.videoId=null]
 * @param {string|null} [params.title=null]
 * @param {string|null} [params.description=null]
 * @param {string|null} [params.channelId=null]
 * @param {string|null} [params.channelName=null]
 * @param {string|null} [params.channelUrl=null]
 * @param {string|null} [params.thumbnail=null]
 * @param {string|null} [params.url=null]
 * @param {string|null} [params.startedAt=null]
 * @param {string|null} [params.scheduledStartTime=null]
 * @param {string} [params.detectedAt=null]
 * @param {object} [params.metadata={}]
 * @param {object|null} [params.error=null]
 * @returns {object} Normalized status object with helper methods
 */
export function createNormalizedResult({
  status = STATUS.UNKNOWN,
  videoId = null,
  title = null,
  description = null,
  channelId = null,
  channelName = null,
  channelUrl = null,
  thumbnail = null,
  url = null,
  startedAt = null,
  scheduledStartTime = null,
  detectedAt = null,
  metadata = {},
  error = null
} = {}) {
  const normalizedStatus = Object.values(STATUS).includes(status) ? status : STATUS.UNKNOWN;

  const live = normalizedStatus === STATUS.LIVE;
  const upcoming = normalizedStatus === STATUS.UPCOMING;
  const offline = normalizedStatus === STATUS.OFFLINE;

  const resultObj = {
    status: normalizedStatus,
    live,
    upcoming,
    offline,
    videoId: videoId || null,
    title: title || null,
    description: description || null,
    channelId: channelId || null,
    channelName: channelName || null,
    channelUrl: channelUrl || null,
    thumbnail: thumbnail || null,
    url: url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelUrl || null),
    startedAt: startedAt || null,
    scheduledStartTime: scheduledStartTime || null,
    detectedAt: detectedAt || new Date().toISOString(),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    error: error || null
  };

  // Attach non-enumerable helper methods for convenience
  Object.defineProperties(resultObj, {
    isLive: {
      value: function() { return this.status === STATUS.LIVE; },
      writable: true,
      configurable: true,
      enumerable: false
    },
    isUpcoming: {
      value: function() { return this.status === STATUS.UPCOMING; },
      writable: true,
      configurable: true,
      enumerable: false
    },
    isOffline: {
      value: function() { return this.status === STATUS.OFFLINE; },
      writable: true,
      configurable: true,
      enumerable: false
    },
    isUnknown: {
      value: function() { return this.status === STATUS.UNKNOWN; },
      writable: true,
      configurable: true,
      enumerable: false
    }
  });

  return resultObj;
}

/**
 * Creates an UNKNOWN result object with error details.
 * 
 * @param {string} message 
 * @param {string} [code='DETECTION_FAILED'] 
 * @param {object} [context={}] 
 * @returns {object}
 */
export function createUnknownResult(message = 'Unable to determine channel status.', code = 'DETECTION_FAILED', context = {}) {
  return createNormalizedResult({
    status: STATUS.UNKNOWN,
    channelId: context.channelId || null,
    channelName: context.channelName || null,
    channelUrl: context.channelUrl || null,
    url: context.url || null,
    error: {
      code,
      message
    }
  });
}
