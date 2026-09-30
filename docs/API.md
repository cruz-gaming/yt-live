# SD YT Live — API Reference

## Class: `YouTubeLive`

The primary class for interacting with YouTube live detection.

### Constructor `new YouTubeLive([options])`

- `options` `<Object>`
  - `timeout` `<number>` HTTP timeout in milliseconds. Default: `10000`.
  - `retries` `<number>` Maximum HTTP retry count. Default: `2`.
  - `userAgent` `<string>` Custom User-Agent header. Default: `'yt-live/1.0.0 (Stacks Development)'`.
  - `cache` `<boolean>` Enable in-memory result caching. Default: `true`.
  - `cacheTTL` `<number>` Cache Time-To-Live in milliseconds. Default: `30000`.
  - `minRequestInterval` `<number>` Minimum throttling delay between requests in ms. Default: `0`.
  - `debug` `<boolean>` Enable debug logging. Default: `false`.
  - `logger` `<Object>` Custom logger implementation. Default: `null`.
  - `provider` `<string>` Provider mode (`'public'`). Default: `'public'`.

---

### Method: `yt.check(input)`

Detects status for a channel handle, channel URL, channel ID, or video URL.

- `input` `<string>` e.g. `'@CruzGaming'`, `'https://www.youtube.com/@CruzGaming'`, `'UCxxxxxxxxxxxxxxxx'`, or video URL.
- Returns: `<Promise<ResultObject>>`

---

### Method: `yt.checkVideo(videoInput)`

Detects status specifically for a YouTube video ID or video URL.

- `videoInput` `<string>` Video ID (11 chars) or full watch URL.
- Returns: `<Promise<ResultObject>>`

---

### Method: `yt.isLive(input)`

Returns `true` if the channel or video is currently streaming live.

- `input` `<string>`
- Returns: `<Promise<boolean>>`

---

### Method: `yt.isUpcoming(input)`

Returns `true` if the channel or video has a scheduled upcoming stream.

- `input` `<string>`
- Returns: `<Promise<boolean>>`

---

### Method: `yt.getLive(input)`

Returns the result object if the status is `LIVE`, otherwise `null`.

- `input` `<string>`
- Returns: `<Promise<ResultObject|null>>`

---

### Method: `yt.watch(channel, [options])`

Creates and starts a single-channel watcher.

- `channel` `<string>`
- `options` `<Object>`
  - `interval` `<number>` Polling interval in ms. Default: `30000`.
  - `immediate` `<boolean>` Run check immediately on start. Default: `true`.
- Returns: `<Watcher>`

---

### Method: `yt.watchMany(channels, [options])`

Creates and starts a multi-channel watcher.

- `channels` `<Array<string>>`
- `options` `<Object>`
- Returns: `<Watcher>`

---

### Property: `yt.cache`

Exposes cache management methods:
- `yt.cache.get(key)`
- `yt.cache.set(key, value, [ttl])`
- `yt.cache.delete(key)`
- `yt.cache.clear()`
- `yt.cache.stats()` -> `{ hits, misses, entries }`

---

## Result Object Schema

```js
{
  status: "LIVE" | "UPCOMING" | "OFFLINE" | "UNKNOWN",
  live: boolean,
  upcoming: boolean,
  offline: boolean,
  videoId: string | null,
  title: string | null,
  description: string | null,
  channelId: string | null,
  channelName: string | null,
  channelUrl: string | null,
  thumbnail: string | null,
  url: string | null,
  startedAt: string | null,
  scheduledStartTime: string | null,
  detectedAt: string,
  metadata: object,
  error: { code: string, message: string } | null
}
```

Helper methods on result object:
- `result.isLive()` -> `<boolean>`
- `result.isUpcoming()` -> `<boolean>`
- `result.isOffline()` -> `<boolean>`
- `result.isUnknown()` -> `<boolean>`
