# SD YT Live — `sd-yt-live`

> **YouTube Live Stream Detection Without an API Key**  
> *Developed by Stacks Development (SD)*

`sd-yt-live` is a production-ready, zero-dependency Node.js package designed exclusively to detect **currently active YouTube Live streams** without requiring a YouTube Data API key.

---

## Critical Design: Live-Only Detection

`sd-yt-live` is built specifically for **live stream detection**. It filters out noise and non-live broadcasts:

| Status | Detection Action | `getLive()` | `isLive()` | `getLiveMany()` |
| :--- | :--- | :--- | :--- | :--- |
| **`LIVE`** | Broadcast is currently active | Returns stream object | `true` | Included in results |
| **`UPCOMING`** | Scheduled / Premiere not started | Returns `null` | `false` | Ignored |
| **`OFFLINE`** | Stream ended / No live stream | Returns `null` | `false` | Ignored |
| **`UNKNOWN`** | Unparseable / Invalid page | Returns `null` | `false` | Ignored |

*Scheduled streams, upcoming broadcasts, premieres that haven't started, normal video uploads, recently ended streams, and Shorts are never returned as live streams.*

---

## Installation

```bash
npm install sd-yt-live
```

*Requires Node.js 18.0.0 or higher (ES Modules).*

---

## Quick Start

### Fetch Active Live Stream (`getLive`)

```js
import { YouTubeLive } from "sd-yt-live";

const yt = new YouTubeLive();

const live = await yt.getLive("@CruzGaming");

if (live) {
  console.log("🔴 LIVE STREAM DETECTED!");
  console.log("Title:", live.title);
  console.log("URL:", live.url);
} else {
  console.log("⚫ No active live stream");
}
```

#### Example Live Stream Output

```js
{
  status: "LIVE",
  live: true,
  videoId: "abc123xyz11",
  title: "GTA 5 Live RP",
  channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
  channelName: "Cruz Gaming",
  channelUrl: "https://www.youtube.com/@CruzGaming",
  url: "https://www.youtube.com/watch?v=abc123xyz11",
  thumbnail: "https://i.ytimg.com/vi/abc123xyz11/maxresdefault.jpg",
  startedAt: "2026-09-28T20:00:00.000Z",
  detectedAt: "2026-09-28T20:05:00.000Z"
}
```

---

## Multiple Channel Checking (`getLiveMany`)

Fetch currently live streams for multiple channels concurrently. Non-live channels are automatically omitted from the returned array:

```js
import { YouTubeLive } from "sd-yt-live";

const yt = new YouTubeLive();

const liveStreams = await yt.getLiveMany([
  "@CruzGaming",
  "@ChannelTwo",
  "@ChannelThree"
]);

console.log(`Found ${liveStreams.length} active live streams:`);
liveStreams.forEach(stream => {
  console.log(`- ${stream.channelName}: ${stream.url}`);
});
```

---

## `isLive()` Check

```js
const isLive = await yt.isLive("@CruzGaming");

console.log(isLive); // true or false
```

---

## Automatic Live Detection (Watcher)

Monitor channels continuously and receive events on state transitions (**`NOT LIVE → LIVE`** and **`LIVE → OFFLINE`**):

```js
import { YouTubeLive } from "sd-yt-live";

const yt = new YouTubeLive();

const watcher = yt.watchMany([
  "@CruzGaming",
  "@ChannelTwo",
  "@ChannelThree"
], {
  interval: 30000 // Poll every 30 seconds
});

// Emitted when a channel starts streaming live
watcher.on("live", ({ channel, stream }) => {
  console.log(`🔴 ${channel} is now LIVE: ${stream.url}`);
});

// Emitted when an active live stream ends
watcher.on("offline", ({ channel, previousStream }) => {
  console.log(`⚫ ${channel} ended their live stream`);
});

// Error handling per channel
watcher.on("error", ({ channel, error }) => {
  console.error(`Failed check for ${channel}:`, error.message);
});
```

### Watcher State Transition Rules

The watcher internally tracks channel status transitions (`OFFLINE → LIVE → OFFLINE`) so it **never floods events**:

```text
OFFLINE
   ↓
OFFLINE
   ↓
LIVE      ──▶ Emits "live" event once
   ↓
LIVE      ──▶ (Suppressed, no duplicate event)
   ↓
LIVE      ──▶ (Suppressed, no duplicate event)
   ↓
OFFLINE   ──▶ Emits "offline" event once with previousStream
```

---

## Watcher Controls & Dynamic Channels

```js
const watcher = yt.watchMany(["@CruzGaming"], { interval: 30000 });

// Add channels dynamically
watcher.add("@NewChannel");
watcher.add(["@ChannelThree", "@ChannelFour"]);

// Remove channels dynamically
watcher.remove("@CruzGaming");

// Inspect active channels
console.log(watcher.channels());

// Control running state
console.log(watcher.isRunning()); // true
watcher.stop();
watcher.start();
```

---

## Supported Inputs

| Format | Example |
| :--- | :--- |
| **Handle** | `@CruzGaming` |
| **Channel URL** | `https://www.youtube.com/@CruzGaming` |
| **Channel ID** | `UCxxxxxxxxxxxxxxxxxxxxxx` |
| **YouTube `/channel/` URL** | `https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx` |
| **YouTube `/c/` URL** | `https://www.youtube.com/c/CruzGaming` |
| **YouTube `/user/` URL** | `https://www.youtube.com/user/CruzGaming` |
| **Video URL** | `https://www.youtube.com/watch?v=abc123xyz11` |
| **Video ID** | `abc123xyz11` |

---

## Modular Detection Architecture

```text
Channel Input
      ↓
Channel Resolver
      ↓
YouTube Public Page
      ↓
HTTP Client
      ↓
Page Parser (HTML / ytInitialData / JSON-LD)
      ↓
Live Detector Engine
      ↓
Is currently LIVE?
 ├── YES ──▶ Return Live Stream Object
 └── NO  ──▶ Return null
```

---

## Polling & No Built-In Rate Limiter

- **NO Rate Limiter**: `sd-yt-live` does **NOT** contain any built-in rate limiter, request throttle, concurrency limiter, or hidden delays.
- **Developer Control**: Polling frequency is strictly controlled by the developer via `{ interval: 30000 }`.
- **Caching & Deduplication**: Built-in TTL cache and request deduplication prevent duplicate outbound requests without rate-limiting.
- **Responsible Usage**: Developers are responsible for setting reasonable polling intervals for their application needs and resource limits.

---

## Command Line Interface (CLI)

```bash
# Check single channel live status
npx sd-yt-live @CruzGaming
```

If the channel is live:
```text
🔴 LIVE
Cruz Gaming
Title: GTA 5 Live RP
URL: https://www.youtube.com/watch?v=abc123xyz11
```

If not live:
```text
⚫ No live stream
```

---

## Custom Errors

- `SDYouTubeError` (Base error class)
- `YouTubeRequestError` (HTTP / network errors)
- `YouTubeParseError` (HTML / Data parsing errors)
- `ChannelNotFoundError` (404 channel missing)
- `VideoNotFoundError` (404 video missing)
- `DetectionError` (General detection error)

---

## License

MIT © [Stacks Development](https://github.com/stacks-development)
