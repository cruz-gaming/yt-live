import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Watcher from '../src/watcher/Watcher.js';
import { STATUS, createNormalizedResult } from '../src/utils/normalize.js';

class MockDetector {
  constructor(sequence = []) {
    this.sequence = sequence;
    this.callCount = 0;
  }

  async check(channel) {
    if (channel === '@ErrorChannel') {
      throw new Error('Network error during check');
    }
    const idx = Math.min(this.callCount++, this.sequence.length - 1);
    const status = this.sequence[idx] || STATUS.OFFLINE;
    return createNormalizedResult({
      status,
      channelId: 'UC123456',
      channelName: 'Cruz Gaming',
      url: 'https://www.youtube.com/@CruzGaming'
    });
  }
}

describe('Watcher & State Event Deduplication', () => {
  it('should emit live and offline events only on state transitions', async () => {
    // Sequence: OFFLINE -> OFFLINE -> LIVE -> LIVE -> LIVE -> OFFLINE
    const detector = new MockDetector([
      STATUS.OFFLINE,
      STATUS.OFFLINE,
      STATUS.LIVE,
      STATUS.LIVE,
      STATUS.LIVE,
      STATUS.OFFLINE
    ]);

    const watcher = new Watcher(detector, '@CruzGaming', { immediate: false });

    const events = [];
    watcher.on('live', res => events.push({ event: 'live', status: res.status || (res.stream ? res.stream.status : 'LIVE') }));
    watcher.on('offline', res => events.push({ event: 'offline' }));
    watcher.on('change', res => events.push({ event: 'change', status: res.status || (res.result ? res.result.status : null) }));

    // Poll 1: OFFLINE (initial state recorded, no transition event)
    await watcher.poll();
    // Poll 2: OFFLINE (no change, no events emitted)
    await watcher.poll();
    // Poll 3: LIVE (transition from OFFLINE to LIVE -> fires live & change)
    await watcher.poll();
    // Poll 4: LIVE (no change, no events emitted)
    await watcher.poll();
    // Poll 5: LIVE (no change, no events emitted)
    await watcher.poll();
    // Poll 6: OFFLINE (transition from LIVE to OFFLINE -> fires offline & change)
    await watcher.poll();

    const liveEvents = events.filter(e => e.event === 'live');
    assert.equal(liveEvents.length, 1);

    const offlineEvents = events.filter(e => e.event === 'offline');
    assert.equal(offlineEvents.length, 1); // 1 transition from LIVE to OFFLINE
  });

  it('should support multi-channel monitoring and emit channel payload', async () => {
    const detector = new MockDetector([STATUS.LIVE]);
    const watcher = new Watcher(detector, ['@Channel1', '@Channel2'], { immediate: false });

    const liveEmissions = [];
    watcher.on('live', payload => liveEmissions.push(payload));

    await watcher.poll();

    assert.equal(liveEmissions.length, 2);
    assert.equal(liveEmissions[0].channel, '@Channel1');
    assert.equal(liveEmissions[1].channel, '@Channel2');
  });

  it('should support watcher controls (start, stop, isRunning, channels, add, remove)', () => {
    const detector = new MockDetector();
    const watcher = new Watcher(detector, '@CruzGaming', { immediate: false });

    assert.equal(watcher.isRunning(), false);
    assert.deepEqual(watcher.channels(), ['@CruzGaming']);

    watcher.add('@ChannelTwo');
    assert.deepEqual(watcher.channels(), ['@CruzGaming', '@ChannelTwo']);

    watcher.remove('@CruzGaming');
    assert.deepEqual(watcher.channels(), ['@ChannelTwo']);

    watcher.start();
    assert.equal(watcher.isRunning(), true);

    watcher.stop();
    assert.equal(watcher.isRunning(), false);
  });

  it('should isolate errors per channel and emit error event', async () => {
    const detector = new MockDetector([STATUS.LIVE]);
    const watcher = new Watcher(detector, ['@ErrorChannel', '@CruzGaming'], { immediate: false });

    const errorsEmitted = [];
    watcher.on('error', payload => errorsEmitted.push(payload));

    await watcher.poll();

    assert.equal(errorsEmitted.length, 1);
    assert.equal(errorsEmitted[0].channel, '@ErrorChannel');
    assert.equal(errorsEmitted[0].error.message, 'Network error during check');
  });
});
