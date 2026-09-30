import { YouTubeLive } from '../src/index.js';

const yt = new YouTubeLive();

async function main() {
  console.log('Checking status for @CruzGaming...');
  const result = await yt.check('@CruzGaming');

  console.log('Detection Result:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\nHelper Methods:');
  console.log('isLive():', result.isLive());
  console.log('isUpcoming():', result.isUpcoming());
  console.log('isOffline():', result.isOffline());
  console.log('isUnknown():', result.isUnknown());
}

main().catch(console.error);
