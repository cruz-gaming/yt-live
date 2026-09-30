import { YouTubeLive } from '../src/index.js';

const yt = new YouTubeLive();

const channels = [
  '@CruzGaming',
  '@ExampleChannel',
  'UCxxxxxxxxxxxxxxxxxxxxxx'
];

console.log(`Monitoring ${channels.length} channels...`);

const watcher = yt.watchMany(channels, {
  interval: 15000
});

watcher.on('live', ({ channel, stream }) => {
  console.log(`🔴 [LIVE] Channel ${channel} (${stream.channelName}) is live!`);
  console.log(`Stream: ${stream.url}`);
});

watcher.on('offline', ({ channel, stream }) => {
  console.log(`⚪ [OFFLINE] Channel ${channel} is offline.`);
});

watcher.on('change', ({ channel, result }) => {
  console.log(`[STATUS CHANGE] ${channel} -> ${result.status}`);
});

watcher.on('error', ({ channel, error }) => {
  console.error(`[ERROR] Channel ${channel} check failed: ${error.message}`);
});

// Stop after 40 seconds
setTimeout(() => {
  console.log('Stopping multi-channel watcher...');
  watcher.stop();
  process.exit(0);
}, 40000);
