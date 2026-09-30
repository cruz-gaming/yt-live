import { YouTubeLive } from '../src/index.js';

const yt = new YouTubeLive();

async function main() {
  const channel = '@CruzGaming';

  // Quick live status check
  const live = await yt.isLive(channel);
  console.log(`Is ${channel} live?`, live);

  // Check upcoming status
  const upcoming = await yt.isUpcoming(channel);
  console.log(`Is ${channel} upcoming?`, upcoming);

  // Get active stream object if live
  const activeStream = await yt.getLive(channel);
  if (activeStream) {
    console.log(`Active live stream title: "${activeStream.title}" at ${activeStream.url}`);
  } else {
    console.log(`No active live stream found for ${channel}.`);
  }
}

main().catch(console.error);
