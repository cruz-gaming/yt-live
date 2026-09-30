import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Cache from '../src/cache/Cache.js';

describe('Cache & Request Deduplication', () => {
  it('should store and retrieve cached items within TTL', () => {
    const cache = new Cache({ enabled: true, ttl: 1000 });
    cache.set('key1', { status: 'LIVE' });

    const val = cache.get('key1');
    assert.deepEqual(val, { status: 'LIVE' });

    const stats = cache.stats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 0);
    assert.equal(stats.entries, 1);
  });

  it('should expire cached items after TTL', async () => {
    const cache = new Cache({ enabled: true, ttl: 50 });
    cache.set('key1', { status: 'LIVE' });

    await new Promise(res => setTimeout(res, 60));

    const val = cache.get('key1');
    assert.equal(val, null);
    const stats = cache.stats();
    assert.equal(stats.misses, 1);
  });

  it('should delete and clear cache properly', () => {
    const cache = new Cache();
    cache.set('k1', 'val1');
    cache.set('k2', 'val2');

    cache.delete('k1');
    assert.equal(cache.get('k1'), null);

    cache.clear();
    assert.equal(cache.stats().entries, 0);
  });

  it('should deduplicate concurrent async requests', async () => {
    const cache = new Cache();
    let executionCount = 0;

    const task = async () => {
      executionCount++;
      await new Promise(res => setTimeout(res, 50));
      return 'result';
    };

    // Trigger 5 concurrent requests for the same key
    const promises = Array.from({ length: 5 }, () => cache.deduplicate('channel1', task));
    const results = await Promise.all(promises);

    assert.equal(executionCount, 1);
    assert.deepEqual(results, ['result', 'result', 'result', 'result', 'result']);
  });
});
