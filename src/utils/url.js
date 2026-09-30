/**
 * SD YT Live — URL Parsing and Security Validation
 * Stacks Development (SD)
 */

import { SDYouTubeError } from '../errors/index.js';

const CHANNEL_ID_REGEX = /^UC[\w-]{22}$/;
const HANDLE_REGEX = /^@[\w.-]{3,30}$/;
const VIDEO_ID_REGEX = /^[\w-]{11}$/;

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be'
]);

/**
 * Validates that a target URL uses HTTPS protocol and points to an allowed YouTube domain.
 * Protects against local file access, SSFR, non-HTTPS protocols, or arbitrary domain fetching.
 * 
 * @param {string} urlString 
 * @returns {URL}
 */
export function validateSecurity(urlString) {
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new SDYouTubeError(`Invalid URL provided: ${urlString}`, 'INVALID_URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new SDYouTubeError(`Only HTTPS protocols are permitted: ${parsedUrl.protocol}`, 'INSECURE_PROTOCOL');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_HOSTS.has(hostname) || Array.from(ALLOWED_HOSTS).some(h => hostname.endsWith('.' + h));
  if (!isAllowedHost) {
    throw new SDYouTubeError(`Target domain is not a valid YouTube host: ${hostname}`, 'INVALID_DOMAIN');
  }

  return parsedUrl;
}

/**
 * Normalizes input string (handle, URL, channel ID, video ID) into standard form.
 * 
 * @param {string} input 
 * @returns {{ type: string, identifier: string, normalizedUrl: string, rawInput: string }}
 */
export function parseInput(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new SDYouTubeError('Input must be a non-empty string', 'INVALID_INPUT');
  }

  const trimmed = input.trim();

  // Handle format: @handle
  if (HANDLE_REGEX.test(trimmed)) {
    const handle = trimmed;
    return {
      type: 'handle',
      identifier: handle,
      normalizedUrl: `https://www.youtube.com/${handle}`,
      rawInput: trimmed
    };
  }

  // Channel ID format: UCxxxxxxxxxxxxxxxxxxxxxx (24 chars)
  if (CHANNEL_ID_REGEX.test(trimmed)) {
    return {
      type: 'channelId',
      identifier: trimmed,
      normalizedUrl: `https://www.youtube.com/channel/${trimmed}`,
      rawInput: trimmed
    };
  }

  // Video ID format: 11 chars
  if (VIDEO_ID_REGEX.test(trimmed) && !trimmed.startsWith('@')) {
    return {
      type: 'videoId',
      identifier: trimmed,
      normalizedUrl: `https://www.youtube.com/watch?v=${trimmed}`,
      rawInput: trimmed
    };
  }

  // URL parsing
  let urlObj;
  let formattedUrl = trimmed;
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }

  try {
    urlObj = new URL(formattedUrl);
  } catch {
    throw new SDYouTubeError(`Cannot parse input as URL or YouTube identifier: ${input}`, 'INVALID_INPUT');
  }

  validateSecurity(urlObj.href);

  const hostname = urlObj.hostname.toLowerCase();
  const pathname = urlObj.pathname;

  // youtu.be/VIDEO_ID
  if (hostname === 'youtu.be') {
    const videoId = pathname.replace(/^\//, '').split('/')[0];
    if (VIDEO_ID_REGEX.test(videoId)) {
      return {
        type: 'videoUrl',
        identifier: videoId,
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
        rawInput: trimmed
      };
    }
  }

  // watch?v=VIDEO_ID
  if (pathname === '/watch' && urlObj.searchParams.has('v')) {
    const videoId = urlObj.searchParams.get('v');
    return {
      type: 'videoUrl',
      identifier: videoId,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      rawInput: trimmed
    };
  }

  // /@handle
  const handleMatch = pathname.match(/^\/(@[\w.-]{3,30})(?:\/.*)?$/);
  if (handleMatch) {
    const handle = handleMatch[1];
    return {
      type: 'handle',
      identifier: handle,
      normalizedUrl: `https://www.youtube.com/${handle}`,
      rawInput: trimmed
    };
  }

  // /channel/UCxxxxxxxxxxxxxxxxxxxxxx
  const channelMatch = pathname.match(/^\/channel\/(UC[\w-]{22})(?:\/.*)?$/);
  if (channelMatch) {
    const channelId = channelMatch[1];
    return {
      type: 'channelId',
      identifier: channelId,
      normalizedUrl: `https://www.youtube.com/channel/${channelId}`,
      rawInput: trimmed
    };
  }

  // /c/name or /user/name
  const customMatch = pathname.match(/^\/(c|user)\/([\w.-]+)(?:\/.*)?$/);
  if (customMatch) {
    const name = customMatch[2];
    return {
      type: 'customUrl',
      identifier: name,
      normalizedUrl: `https://www.youtube.com/${customMatch[1]}/${name}`,
      rawInput: trimmed
    };
  }

  // Fallback URL
  return {
    type: 'channelUrl',
    identifier: trimmed,
    normalizedUrl: urlObj.href,
    rawInput: trimmed
  };
}

/**
 * Extracts Video ID if possible from input string
 * @param {string} input 
 * @returns {string|null}
 */
export function extractVideoId(input) {
  try {
    const parsed = parseInput(input);
    if (parsed.type === 'videoId' || parsed.type === 'videoUrl') {
      return parsed.identifier;
    }
  } catch {
    // Return null if cannot extract
  }
  return null;
}
