import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PageParser from '../src/parser/PageParser.js';
import StreamParser from '../src/parser/StreamParser.js';
import { STATUS } from '../src/utils/normalize.js';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

function loadFixture(filename) {
  return readFileSync(join(fixturesDir, filename), 'utf-8');
}

describe('PageParser & StreamParser (HTML Fixture Tests)', () => {
  const pageParser = new PageParser();
  const streamParser = new StreamParser();

  it('should parse LIVE status correctly from live.html fixture', () => {
    const html = loadFixture('live.html');
    const parsedPage = pageParser.parse(html);

    assert.notEqual(parsedPage.ytInitialData, null);
    assert.equal(parsedPage.meta['og:site_name'], 'Cruz Gaming');

    const result = streamParser.parse(parsedPage, {
      finalUrl: 'https://www.youtube.com/watch?v=live1234567'
    });

    assert.equal(result.status, STATUS.LIVE);
    assert.equal(result.live, true);
    assert.equal(result.videoId, 'live1234567');
    assert.equal(result.channelName, 'Cruz Gaming');
    assert.equal(result.isLive(), true);
    assert.equal(result.isOffline(), false);
  });

  it('should parse UPCOMING status correctly from upcoming.html fixture', () => {
    const html = loadFixture('upcoming.html');
    const parsedPage = pageParser.parse(html);

    const result = streamParser.parse(parsedPage, {
      finalUrl: 'https://www.youtube.com/watch?v=upc12345678'
    });

    assert.equal(result.status, STATUS.UPCOMING);
    assert.equal(result.upcoming, true);
    assert.equal(result.videoId, 'upc12345678');
    assert.notEqual(result.scheduledStartTime, null);
    assert.equal(result.isUpcoming(), true);
  });

  it('should parse OFFLINE status correctly from offline.html fixture', () => {
    const html = loadFixture('offline.html');
    const parsedPage = pageParser.parse(html);

    const result = streamParser.parse(parsedPage, {
      finalUrl: 'https://www.youtube.com/@CruzGaming'
    });

    assert.equal(result.status, STATUS.OFFLINE);
    assert.equal(result.offline, true);
    assert.equal(result.live, false);
    assert.equal(result.videoId, null);
    assert.equal(result.channelName, 'Cruz Gaming');
    assert.equal(result.isOffline(), true);
  });

  it('should return clean UNKNOWN state for changed_page.html fixture', () => {
    const html = loadFixture('changed_page.html');
    const parsedPage = pageParser.parse(html);

    const result = streamParser.parse(parsedPage, {
      finalUrl: 'https://www.youtube.com/unknown'
    });

    assert.equal(result.status, STATUS.UNKNOWN);
    assert.equal(result.live, false);
    assert.equal(result.upcoming, false);
    assert.equal(result.offline, false);
    assert.equal(result.isUnknown(), true);
    assert.notEqual(result.error, null);
    assert.equal(result.error.code, 'DETECTION_FAILED');
  });
});
