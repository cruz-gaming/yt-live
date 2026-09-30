/**
 * SD YT Live — Stream Data Analysis & Status Parser
 * Stacks Development (SD)
 */

import { STATUS, createNormalizedResult, createUnknownResult } from '../utils/normalize.js';
import { extractVideoId } from '../utils/url.js';

export class StreamParser {
  /**
   * Analyzes parsed page data and HTTP context to determine live stream status.
   * 
   * @param {object} parsedPage - Output from PageParser
   * @param {object} httpContext - { finalUrl: string, requestedUrl: string, statusCode: number }
   * @param {object} [options={}]
   * @returns {object} Normalized result object
   */
  parse(parsedPage, httpContext = {}, options = {}) {
    const { ytInitialData, jsonLd, meta } = parsedPage || {};
    const finalUrl = httpContext.finalUrl || '';

    // Step 1: Detect video ID from final URL or meta tags
    let videoId = extractVideoId(finalUrl) || extractVideoId(meta.canonical || '') || extractVideoId(meta['og:url'] || '');

    // Deep search videoId in ytInitialData if not found in URL
    if (!videoId && ytInitialData) {
      videoId = this._extractVideoIdFromData(ytInitialData);
    }

    // Step 2: Extract microformat and player details from ytInitialData
    const microformat = this._extractMicroformat(ytInitialData);
    const videoDetails = this._extractVideoDetails(ytInitialData);
    const jsonLdInfo = this._extractJsonLdInfo(jsonLd);

    // Step 3: Extract channel metadata
    const channelId = microformat?.externalChannelId ||
                      videoDetails?.channelId ||
                      jsonLdInfo?.channelId ||
                      this._extractChannelIdFromHtml(parsedPage) ||
                      null;

    const channelName = microformat?.ownerChannelName ||
                        videoDetails?.author ||
                        jsonLdInfo?.channelName ||
                        meta['og:site_name'] ||
                        this._extractChannelNameFromData(ytInitialData) ||
                        null;

    const channelUrl = channelId
      ? `https://www.youtube.com/channel/${channelId}`
      : (microformat?.ownerProfileUrl || null);

    // Step 4: Extract video metadata
    const title = microformat?.title?.simpleText ||
                  videoDetails?.title ||
                  jsonLdInfo?.title ||
                  meta['og:title'] ||
                  null;

    const description = microformat?.description?.simpleText ||
                        videoDetails?.shortDescription ||
                        jsonLdInfo?.description ||
                        meta['og:description'] ||
                        null;

    const thumbnail = this._selectBestThumbnail(microformat?.thumbnail?.thumbnails || videoDetails?.thumbnail?.thumbnails, meta['og:image']);

    // Timestamps
    const startedAt = microformat?.liveDetails?.startTimestamp ||
                      jsonLdInfo?.startedAt ||
                      null;

    const scheduledStartTime = microformat?.liveDetails?.scheduledStartTime ||
                               jsonLdInfo?.scheduledStartTime ||
                               null;

    // Step 5: Evaluate Live / Upcoming / Offline status
    let status = STATUS.UNKNOWN;

    const isUpcomingFlag = Boolean(
      microformat?.isUpcoming ||
      videoDetails?.isUpcoming ||
      jsonLdInfo?.isUpcoming ||
      this._hasUpcomingBadge(ytInitialData) ||
      (scheduledStartTime && !startedAt && !microformat?.liveDetails?.isLiveNow)
    );

    const isLiveFlag = Boolean(
      !isUpcomingFlag && (
        microformat?.isLive ||
        microformat?.liveDetails?.isLiveNow === true ||
        videoDetails?.isLive === true ||
        jsonLdInfo?.isLive === true ||
        this._hasLiveBadge(ytInitialData)
      )
    );

    if (isLiveFlag) {
      status = STATUS.LIVE;
    } else if (isUpcomingFlag) {
      status = STATUS.UPCOMING;
    } else if (videoId || ytInitialData || channelId || meta['og:site_name'] === 'YouTube' || (meta['pageTitle'] && meta['pageTitle'].endsWith('- YouTube'))) {
      // Valid YouTube content found without active live indicators = OFFLINE
      status = STATUS.OFFLINE;
    } else {
      // Evidence insufficient to determine status
      return createUnknownResult('Unable to parse channel live status from page content.', 'DETECTION_FAILED', {
        channelId,
        channelName,
        channelUrl,
        url: finalUrl
      });
    }

    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (channelUrl || finalUrl);

    return createNormalizedResult({
      status,
      videoId,
      title,
      description,
      channelId,
      channelName,
      channelUrl,
      thumbnail,
      url: watchUrl,
      startedAt,
      scheduledStartTime,
      metadata: {
        rawType: jsonLdInfo?.type || null
      }
    });
  }

  /**
   * Helper to extract microformat renderer from ytInitialData
   * @private
   */
  _extractMicroformat(ytInitialData) {
    if (!ytInitialData) return null;
    return ytInitialData.microformat?.playerMicroformatRenderer ||
           ytInitialData.playerOverlays?.playerOverlayRenderer?.microformat?.playerMicroformatRenderer ||
           null;
  }

  /**
   * Helper to extract videoDetails from ytInitialData
   * @private
   */
  _extractVideoDetails(ytInitialData) {
    if (!ytInitialData) return null;
    return ytInitialData.videoDetails || null;
  }

  /**
   * Helper to extract stream info from JSON-LD schema
   * @private
   */
  _extractJsonLdInfo(jsonLd) {
    if (!jsonLd) return null;
    const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

    for (const item of items) {
      if (item['@type'] === 'VideoObject' || item['@type'] === 'BroadcastEvent') {
        const publication = item.publication || item;
        const isLive = Boolean(publication.isLiveBroadcast && !publication.endDate && (publication.startDate ? new Date(publication.startDate) <= new Date() : true));
        const isUpcoming = Boolean(publication.isLiveBroadcast && publication.startDate && new Date(publication.startDate) > new Date());
        
        return {
          type: item['@type'],
          title: item.name || null,
          description: item.description || null,
          isLive,
          isUpcoming,
          startedAt: publication.startDate || null,
          scheduledStartTime: isUpcoming ? publication.startDate : null,
          channelName: item.author?.name || null,
          channelId: item.author?.identifier || null
        };
      }
    }
    return null;
  }

  /**
   * Checks ytInitialData for "LIVE" badges
   * @private
   */
  _hasLiveBadge(data) {
    if (!data) return false;
    const jsonStr = JSON.stringify(data);
    return jsonStr.includes('BADGE_STYLE_TYPE_LIVE_NOW') ||
           jsonStr.includes('"text":"LIVE"') ||
           jsonStr.includes('"label":"LIVE"');
  }

  /**
   * Checks ytInitialData for "UPCOMING" badges
   * @private
   */
  _hasUpcomingBadge(data) {
    if (!data) return false;
    const jsonStr = JSON.stringify(data);
    return jsonStr.includes('BADGE_STYLE_TYPE_UPCOMING') ||
           jsonStr.includes('"text":"UPCOMING"') ||
           jsonStr.includes('"label":"UPCOMING"');
  }

  /**
   * Extracts video ID directly from ytInitialData structure
   * @private
   */
  _extractVideoIdFromData(data) {
    if (!data) return null;
    if (data.currentVideoEndpoint?.watchEndpoint?.videoId) {
      return data.currentVideoEndpoint.watchEndpoint.videoId;
    }
    const jsonStr = JSON.stringify(data);
    const match = jsonStr.match(/"videoId":"([\w-]{11})"/);
    return match ? match[1] : null;
  }

  /**
   * Extracts Channel ID from HTML meta tags or attributes
   * @private
   */
  _extractChannelIdFromHtml(parsedPage) {
    const meta = parsedPage.meta || {};
    if (meta['itemprop:channelid']) return meta['itemprop:channelid'];
    return null;
  }

  /**
   * Extracts Channel Name from ytInitialData
   * @private
   */
  _extractChannelNameFromData(data) {
    if (!data) return null;
    const jsonStr = JSON.stringify(data);
    const match = jsonStr.match(/"ownerText":\s*{"runs":\s*\[\s*{"text":\s*"([^"]+)"/);
    return match ? match[1] : null;
  }

  /**
   * Picks highest resolution thumbnail URL
   * @private
   */
  _selectBestThumbnail(thumbnails, metaImage) {
    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
      const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
      return sorted[0].url;
    }
    return metaImage || null;
  }
}

export default StreamParser;
