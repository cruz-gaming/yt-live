import { YouTubeLive } from "./src/index.js";

const yt = new YouTubeLive({
  timeout: 10000,
  retries: 2,
  cache: true
});

try {
  const result = await yt.check("@AADUTHOMA-OG");

  console.log("\n========== SD YT LIVE ==========");
  console.log("Status:", result.status);
  console.log("Live:", result.live);
  console.log("Title:", result.title);
  console.log("Video ID:", result.videoId);
  console.log("Channel:", result.channelName);
  console.log("URL:", result.url);
  console.log("================================\n");
} catch (error) {
  console.error("ERROR:", error);
}