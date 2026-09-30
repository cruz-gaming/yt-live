import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { YouTubeLive, createWatcher, errors, VERSION } from '../src/index.js';
import Watcher from '../src/watcher/Watcher.js';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

function loadFixture(filename) {
  return readFileSync(join(fixturesDir, filename), 'utf-8');
}

class MockHttpClient {
  constructor(routes = {}) {
    this.routes = routes;
  }

  async get(url) {
    if (this.routes[url]) {
      return this.routes[url];
    }
    return {
      body: loadFixture('live.html'),
      finalUrl: 'https://www.youtube.com/watch?v=live1234567',
      statusCode: 200,
      headers: new Map()
    };
  }
}

describe('Public YouTubeLive API Export Tests', () => {
  it('should export correct version and error structure', () => {
    assert.equal(VERSION, '1.0.0');
    assert.notEqual(errors.SDYouTubeError, undefined);
    assert.notEqual(errors.YouTubeRequestError, undefined);
    assert.notEqual(errors.ChannelNotFoundError, undefined);
  });

  it('should create watcher instance via createWatcher helper', () => {
    const watcher = createWatcher('@CruzGaming', { interval: 10000 });
    assert.ok(watcher instanceof Watcher);
    watcher.stop();
  });

  it('should evaluate isLive, getLive, and getLiveMany helpers strictly for live streams', async () => {
    const mockClient = new MockHttpClient({
      'https://www.youtube.com/@LiveChannel/live': {
        body: loadFixture('live.html'),
        finalUrl: 'https://www.youtube.com/watch?v=live1234567',
        statusCode: 200,
        headers: new Map()
      },
      'https://www.youtube.com/@OfflineChannel/live': {
        body: loadFixture('offline.html'),
        finalUrl: 'https://www.youtube.com/@OfflineChannel/live',
        statusCode: 200,
        headers: new Map()
      },
      'https://www.youtube.com/@UpcomingChannel/live': {
        body: loadFixture('upcoming.html'),
        finalUrl: 'https://www.youtube.com/watch?v=upcoming123',
        statusCode: 200,
        headers: new Map()
      }
    });

    const yt = new YouTubeLive({ cache: false });
    yt.detector.httpClient = mockClient;

    // Test live channel
    const isLive = await yt.isLive('@LiveChannel');
    assert.equal(isLive, true);

    const liveStream = await yt.getLive('@LiveChannel');
    assert.notEqual(liveStream, null);
    assert.equal(liveStream.status, 'LIVE');

    // Test offline channel - MUST return null for getLive and false for isLive
    const offlineIsLive = await yt.isLive('@OfflineChannel');
    assert.equal(offlineIsLive, false);

    const offlineStream = await yt.getLive('@OfflineChannel');
    assert.equal(offlineStream, null);

    // Test upcoming channel - MUST return null for getLive and false for isLive
    const upcomingIsLive = await yt.isLive('@UpcomingChannel');
    assert.equal(upcomingIsLive, false);

    const upcomingStream = await yt.getLive('@UpcomingChannel');
    assert.equal(upcomingStream, null);

    // Test getLiveMany - MUST only return live streams
    const liveMany = await yt.getLiveMany(['@LiveChannel', '@OfflineChannel', '@UpcomingChannel']);
    assert.equal(liveMany.length, 1);
    assert.equal(liveMany[0].channelName, 'Cruz Gaming');
  });
});
