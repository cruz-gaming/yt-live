import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import HttpClient from '../src/http/HttpClient.js';
import { SDYouTubeError } from '../src/errors/index.js';

describe('HttpClient Security & Request Rules', () => {
  it('should enforce HTTPS protocol check', async () => {
    const client = new HttpClient();
    await assert.rejects(
      async () => await client.get('http://www.youtube.com/@CruzGaming'),
      (err) => err instanceof SDYouTubeError && err.code === 'INSECURE_PROTOCOL'
    );
  });

  it('should reject non-YouTube domains', async () => {
    const client = new HttpClient();
    await assert.rejects(
      async () => await client.get('https://example.com/live'),
      (err) => err instanceof SDYouTubeError && err.code === 'INVALID_DOMAIN'
    );
  });

  it('should reject non-HTTP schemes like file://', async () => {
    const client = new HttpClient();
    await assert.rejects(
      async () => await client.get('file:///etc/passwd'),
      (err) => err instanceof SDYouTubeError
    );
  });
});
