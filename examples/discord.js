/**
 * SD YT Live — Discord Bot & Webhook Integration Example
 * 
 * Note: `yt-live` does NOT require discord.js or any external library.
 * This example demonstrates sending Discord webhooks using standard HTTP fetch,
 * as well as integrating with a Discord.js client.
 */

import { YouTubeLive } from '../src/index.js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const yt = new YouTubeLive({
  cacheTTL: 60000
});

const watcher = yt.watch('@CruzGaming', {
  interval: 30000
});

// Generic Webhook Handler
watcher.on('live', async stream => {
  console.log(`[LIVE DETECTED] ${stream.channelName} is live! Sending notification...`);

  // Send to Discord Webhook using native fetch
  if (DISCORD_WEBHOOK_URL) {
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'SD YT Live Notifier',
          content: `🔴 **${stream.channelName}** is now **LIVE**!\n${stream.url}`,
          embeds: [
            {
              title: stream.title || 'Live Stream',
              url: stream.url,
              color: 16711680, // Red
              image: stream.thumbnail ? { url: stream.thumbnail } : undefined,
              fields: [
                { name: 'Channel', value: stream.channelName || 'YouTube Channel', inline: true },
                { name: 'Status', value: '🔴 LIVE NOW', inline: true }
              ],
              footer: { text: 'Powered by SD YT Live' },
              timestamp: stream.detectedAt
            }
          ]
        })
      });
      console.log('Discord webhook sent successfully!');
    } catch (err) {
      console.error('Failed to send Discord webhook:', err.message);
    }
  }
});

/*
 * Example Integration with Discord.js Client:
 * 
 * const { Client, GatewayIntentBits } = require('discord.js');
 * const client = new Client({ intents: [GatewayIntentBits.Guilds] });
 * 
 * watcher.on('live', async (stream) => {
 *   const channel = await client.channels.fetch('123456789012345678');
 *   if (channel) {
 *     await channel.send({
 *       content: `🔴 **${stream.channelName}** is now LIVE!\n${stream.url}`
 *     });
 *   }
 * });
 */
