import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import LiveDetector from '../src/detector/LiveDetector.js';
import { STATUS } from '../src/utils/normalize.js';
import { ChannelNotFoundError } from '../src/errors/index.js';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

function loadFixture(filename) {
  return readFileSync(join(fixturesDir, filename), 'utf-8');
}

// Mock HttpClient for deterministic offline testing
class MockHttpClient {
  constructor(routes = {}) {
    this.routes = routes;
    this.callCount = 0;
  }

  async get(url) {
    this.callCount++;
    if (this.routes[url]) {
      const res = this.routes[url];
      if (res.error) throw res.error;
      return res;
    }
    // Default fallback route
    return {
      body: loadFixture('offline.html'),
      finalUrl: url,
      statusCode: 200,
      headers: new Map()
    };
  }
}

describe('LiveDetector Core Engine Integration', () => {
  it('should detect LIVE stream via mocked HttpClient', async () => {
    const mockClient = new MockHttpClient({
      'https://www.youtube.com/@CruzGaming/live': {
        body: loadFixture('live.html'),
        finalUrl: 'https://www.youtube.com/watch?v=live1234567',
        statusCode: 200,
        headers: new Map()
      }
    });

    const detector = new LiveDetector({ httpClient: mockClient, cache: false });
    const result = await detector.check('@CruzGaming');

    assert.equal(result.status, STATUS.LIVE);
    assert.equal(result.videoId, 'live1234567');
    assert.equal(result.channelName, 'Cruz Gaming');
    assert.equal(mockClient.callCount, 1);
  });

  it('should detect OFFLINE channel via mocked HttpClient', async () => {
    const mockClient = new MockHttpClient({
      'https://www.youtube.com/@CruzGaming/live': {
        body: loadFixture('offline.html'),
        finalUrl: 'https://www.youtube.com/@CruzGaming/live',
        statusCode: 200,
        headers: new Map()
      }
    });

    const detector = new LiveDetector({ httpClient: mockClient, cache: false });
    const result = await detector.check('@CruzGaming');

    assert.equal(result.status, STATUS.OFFLINE);
    assert.equal(result.live, false);
  });

  it('should throw ChannelNotFoundError on 404 response', async () => {
    const mockClient = new MockHttpClient({
      'https://www.youtube.com/@NonExistentChannel/live': {
        error: new ChannelNotFoundError('@NonExistentChannel', { statusCode: 404 })
      }
    });

    const detector = new LiveDetector({ httpClient: mockClient, cache: false });
    await assert.rejects(
      async () => await detector.check('@NonExistentChannel'),
      ChannelNotFoundError
    );
  });

  it('should return clean UNKNOWN state on network failure', async () => {
    const mockClient = new MockHttpClient({
      'https://www.youtube.com/@Broken/live': {
        error: new Error('Network socket reset')
      }
    });

    const detector = new LiveDetector({ httpClient: mockClient, cache: false });
    const result = await detector.check('@Broken');

    assert.equal(result.status, STATUS.UNKNOWN);
    assert.equal(result.error.code, 'DETECTION_FAILED');
  });
});
