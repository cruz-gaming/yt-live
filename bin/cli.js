#!/usr/bin/env node

/**
 * SD YT Live — Command Line Interface
 * Stacks Development (SD)
 */

import { YouTubeLive, VERSION } from '../src/index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
  console.log(`sd-yt-live v${VERSION} (Stacks Development)`);
  process.exit(0);
}

let command = 'check';
let targetInput = null;

const flags = {
  json: args.includes('--json'),
  debug: args.includes('--debug'),
  interval: 30000
};

// Parse interval option if provided
const intervalIdx = args.findIndex(arg => arg === '--interval' || arg === '-i');
if (intervalIdx !== -1 && args[intervalIdx + 1]) {
  const parsedInt = parseInt(args[intervalIdx + 1], 10);
  if (!isNaN(parsedInt)) {
    flags.interval = parsedInt;
  }
}

// Filter non-flag arguments
const nonFlags = args.filter(arg => !arg.startsWith('-') && arg !== 'check' && arg !== 'watch' && arg !== 'version');

if (args[0] === 'watch') {
  command = 'watch';
} else if (args[0] === 'check') {
  command = 'check';
}

targetInput = nonFlags[0];

if (!targetInput) {
  console.error('Error: Please provide a YouTube handle, channel URL, or channel ID.');
  printHelp();
  process.exit(1);
}

const yt = new YouTubeLive({
  debug: flags.debug
});

if (command === 'check') {
  runCheck(targetInput, flags);
} else if (command === 'watch') {
  runWatch(targetInput, flags);
}

async function runCheck(input, flags) {
  try {
    const liveStream = await yt.getLive(input);

    if (flags.json) {
      console.log(JSON.stringify(liveStream || { status: 'OFFLINE', live: false }, null, 2));
      return;
    }

    if (liveStream) {
      console.log(`🔴 LIVE`);
      console.log(`${liveStream.channelName || input}`);
      if (liveStream.title) console.log(`Title: ${liveStream.title}`);
      if (liveStream.url) console.log(`URL: ${liveStream.url}`);
    } else {
      console.log(`⚫ No live stream`);
    }

  } catch (err) {
    if (flags.json) {
      console.log(JSON.stringify({ error: err.message, code: err.code || 'CLI_ERROR' }, null, 2));
    } else {
      console.error(`Error checking ${input}: ${err.message}`);
    }
    process.exit(1);
  }
}

function runWatch(input, flags) {
  console.log(`SD YT LIVE\n`);
  console.log(`Watching live streams for ${input} (Interval: ${flags.interval}ms)... Press Ctrl+C to exit.\n`);

  const watcher = yt.watch(input, { interval: flags.interval });

  watcher.on('live', stream => {
    if (!flags.json) {
      console.log(`🔴 LIVE`);
      console.log(`${stream.channelName || input}`);
      if (stream.title) console.log(`Title: ${stream.title}`);
      if (stream.url) console.log(`URL: ${stream.url}\n`);
    } else {
      console.log(JSON.stringify({ event: 'live', stream }, null, 2));
    }
  });

  watcher.on('offline', ({ previousStream }) => {
    if (!flags.json) {
      console.log(`⚫ Live stream ended for ${previousStream?.channelName || input}\n`);
    } else {
      console.log(JSON.stringify({ event: 'offline', previousStream }, null, 2));
    }
  });

  watcher.on('error', err => {
    const errorObj = err.error || err;
    console.error(`[Watcher Error]: ${errorObj.message}`);
  });
}

function printHelp() {
  console.log(`
SD YT LIVE — Live Stream Detector

Usage:
  npx sd-yt-live <handle|url|id> [options]
  sd-yt-live check <handle|url|id> [options]
  sd-yt-live watch <handle|url|id> [options]
  sd-yt-live version

Options:
  --json          Output results in formatted JSON
  --debug         Enable internal debug logging
  --interval <ms> Set polling interval for watcher (default: 30000ms)
  -h, --help      Display help information
  -v, --version   Display version
`);
}
