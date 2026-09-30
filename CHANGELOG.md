# Changelog

All notable changes to the `yt-live` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-28

### Added
- Initial public release of `yt-live` by Stacks Development (SD).
- Detection engine for YouTube channel & video live status (`LIVE`, `UPCOMING`, `OFFLINE`, `UNKNOWN`).
- Support for Handles (`@channel`), Channel URLs, Channel IDs, Video URLs, and Video IDs.
- Zero API Key requirement with pure public page parsing fallback.
- Lightweight internal HTTP client with timeout, retry limits, size caps, and security validation.
- In-memory cache with configurable TTL and request deduplication.
- Request rate controller (`minRequestInterval`) for throttling.
- Single-channel watcher (`yt.watch()`) and Multi-channel watcher (`yt.watchMany()`) with EventEmitter interface.
- Deduplicated watcher state transitions (`offline` -> `live`, `live` -> `offline`).
- Custom error hierarchy (`SDYouTubeError`, `YouTubeRequestError`, `YouTubeParseError`, `ChannelNotFoundError`, `VideoNotFoundError`, `RateLimitError`, `DetectionError`).
- CLI interface (`npx yt-live @channel`, `yt-live check`, `yt-live watch`).
- Full automated test suite and runnable usage examples.
