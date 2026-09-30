import { YouTubeLive } from '../src/index.js';

const yt = new YouTubeLive();

// Start watcher for a single channel with 10s poll interval
const watcher = yt.watch('@CruzGaming', {
  interval: 10000,
  immediate: true
});

watcher.on('live', stream => {
  console.log('🔴 CHANNEL IS LIVE!');
  console.log('Title:', stream.title);
  console.log('URL:', stream.url);
});

watcher.on('offline', stream => {
  console.log('⚪ STREAM ENDED OR OFFLINE');
  console.log('Channel:', stream.channelName || stream.channelId);
});

watcher.on('upcoming', stream => {
  console.log('🟡 UPCOMING STREAM SCHEDULED');
  console.log('Scheduled for:', stream.scheduledStartTime);
});

watcher.on('change', result => {
  console.log('Status changed to:', result.status);
});

watcher.on('error', error => {
  console.error('Watcher encountered error:', error.message);
});

// Stop after 30 seconds for demonstration purposes
setTimeout(() => {
  console.log('Stopping watcher...');
  watcher.stop();
  process.exit(0);
}, 30000);
