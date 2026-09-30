import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInput, validateSecurity, extractVideoId } from '../src/utils/url.js';
import ChannelResolver from '../src/resolver/ChannelResolver.js';

describe('ChannelResolver & URL Utilities', () => {
  it('should parse handle inputs correctly', () => {
    const res = parseInput('@CruzGaming');
    assert.equal(res.type, 'handle');
    assert.equal(res.identifier, '@CruzGaming');
    assert.equal(res.normalizedUrl, 'https://www.youtube.com/@CruzGaming');
  });

  it('should parse full handle URLs correctly', () => {
    const res = parseInput('https://www.youtube.com/@CruzGaming');
    assert.equal(res.type, 'handle');
    assert.equal(res.identifier, '@CruzGaming');
    assert.equal(res.normalizedUrl, 'https://www.youtube.com/@CruzGaming');
  });

  it('should parse channel IDs correctly', () => {
    const id = 'UC1234567890123456789012';
    const res = parseInput(id);
    assert.equal(res.type, 'channelId');
    assert.equal(res.identifier, id);
    assert.equal(res.normalizedUrl, `https://www.youtube.com/channel/${id}`);
  });

  it('should parse channel ID URLs correctly', () => {
    const url = 'https://www.youtube.com/channel/UC1234567890123456789012';
    const res = parseInput(url);
    assert.equal(res.type, 'channelId');
    assert.equal(res.identifier, 'UC1234567890123456789012');
  });

  it('should parse watch video URLs correctly', () => {
    const url = 'https://www.youtube.com/watch?v=abc123xyz11';
    const res = parseInput(url);
    assert.equal(res.type, 'videoUrl');
    assert.equal(res.identifier, 'abc123xyz11');
    assert.equal(res.normalizedUrl, url);
  });

  it('should parse short youtu.be URLs correctly', () => {
    const url = 'https://youtu.be/abc123xyz11';
    const res = parseInput(url);
    assert.equal(res.type, 'videoUrl');
    assert.equal(res.identifier, 'abc123xyz11');
  });

  it('should extract video ID using extractVideoId', () => {
    assert.equal(extractVideoId('https://youtu.be/abc123xyz11'), 'abc123xyz11');
    assert.equal(extractVideoId('abc123xyz11'), 'abc123xyz11');
    assert.equal(extractVideoId('@CruzGaming'), null);
  });

  it('should reject insecure or non-YouTube protocols/domains in validateSecurity', () => {
    assert.throws(() => validateSecurity('http://www.youtube.com/@CruzGaming'), /Only HTTPS/);
    assert.throws(() => validateSecurity('https://evil-site.com/@CruzGaming'), /Target domain is not/);
    assert.throws(() => validateSecurity('file:///etc/passwd'), /Only HTTPS/);
  });

  it('should resolve probe URLs correctly via ChannelResolver', () => {
    const resolver = new ChannelResolver();
    const resolved = resolver.resolve('@CruzGaming');
    assert.equal(resolved.primaryUrl, 'https://www.youtube.com/@CruzGaming/live');
    assert.equal(resolved.secondaryUrl, 'https://www.youtube.com/@CruzGaming');
    assert.equal(resolved.isDirectVideo, false);
  });
});
