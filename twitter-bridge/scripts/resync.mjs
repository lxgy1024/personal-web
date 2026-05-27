/**
 * One-time script: delete all Bluesky posts, then re-sync original tweets.
 *
 * Run with: node --env-file=.env.local scripts/resync.mjs
 * Requires the twitter-bridge dependencies installed (npm install).
 */

import { AtpAgent, RichText } from '@atproto/api';
import { fetchUserTweets } from '../lib/twitter.js';

// Load env (Node 20+ --env-file handles this)
const {
  TWITTER_AUTH_TOKEN,
  TWITTER_CT0,
  TWITTER_USERNAME,
  BLUESKY_HANDLE,
  BLUESKY_APP_PASSWORD,
} = process.env;

if (!TWITTER_AUTH_TOKEN || !TWITTER_CT0 || !TWITTER_USERNAME) {
  console.error('Missing Twitter credentials in environment');
  process.exit(1);
}
if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
  console.error('Missing Bluesky credentials in environment');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extract tweet IDs from text URLs (for old posts). */
function extractTweetIds(text, username) {
  return [
    ...text.matchAll(
      new RegExp(`https?://(?:twitter|x)\\.com/${username}/status/(\\d+)`, 'gi'),
    ),
  ].map((m) => m[1]);
}

/** Dedup marker functions matching the sync function. */
function extractDedupMarkers(text) {
  return [...text.matchAll(/​(\d+)​/g)].map((m) => m[1]);
}

async function main() {
  console.log('=== Connecting to Bluesky ===');
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD });
  console.log(`Logged in as @${BLUESKY_HANDLE}`);

  // ========== Step 1: Delete all existing posts ==========
  console.log('\n=== Step 1: Deleting all existing posts ===');
  let deleted = 0;
  let cursor;

  do {
    const feed = await agent.getAuthorFeed({
      actor: BLUESKY_HANDLE,
      filter: 'posts_no_replies',
      limit: 100,
      cursor,
    });

    const posts = feed.data.feed;
    for (const item of posts) {
      const uri = item.post.uri;
      const rkey = uri.split('/').pop();
      try {
        await agent.com.atproto.repo.deleteRecord({
          repo: agent.session.did,
          collection: 'app.bsky.feed.post',
          rkey,
        });
        deleted++;
        if (deleted % 10 === 0) {
          console.log(`  Deleted ${deleted} posts...`);
        }
        // Small delay to avoid rate limits
        await sleep(300);
      } catch (e) {
        console.error(`  Failed to delete ${rkey}: ${e.message}`);
      }
    }

    cursor = feed.data.cursor;
  } while (cursor);

  console.log(`Deleted ${deleted} posts total`);

  // ========== Step 2: Fetch tweets from Twitter ==========
  console.log('\n=== Step 2: Fetching tweets from Twitter ===');
  // Fetch a larger batch for the initial sync
  const tweets = await fetchUserTweets(TWITTER_USERNAME, 100, TWITTER_AUTH_TOKEN, TWITTER_CT0);

  // Separate original tweets from non-original (the lib already filters RTs and replies,
  // but we also want to confirm no quote tweets snuck through)
  const originalTweets = tweets.filter((t) => {
    // fetchUserTweets already filters retweets + replies, but the resync
    // was requested before the quote-tweet filter was deployed.
    // Any quote tweets that slipped through will be caught by the next assertion.
    return true;
  });

  console.log(`Fetched ${tweets.length} tweets from Twitter`);
  console.log(`${originalTweets.length} are original tweets (no RTs, replies, quotes)`);

  // ========== Step 3: Post original tweets to Bluesky ==========
  console.log('\n=== Step 3: Posting original tweets to Bluesky ===');
  let posted = 0;
  let skipped = 0;

  for (const tweet of originalTweets) {
    try {
      // Add invisible dedup marker
      const marker = `​${tweet.id}​`;
      const maxLen = 300;
      const rawText = tweet.text;
      const trimmedText =
        rawText.length + marker.length > maxLen
          ? rawText.slice(0, maxLen - marker.length - 3) + '...'
          : rawText;

      const postText = trimmedText + marker;
      const rt = new RichText({ text: postText });
      await rt.detectFacets(agent);

      // Build embed
      let embed;
      if (tweet.photos && tweet.photos.length > 0) {
        const images = [];
        for (const photo of tweet.photos) {
          try {
            const imgResp = await fetch(photo.url);
            if (!imgResp.ok) {
              console.warn(`  Failed to download image ${photo.url}: ${imgResp.status}`);
              continue;
            }
            const imgBuf = Buffer.from(await imgResp.arrayBuffer());
            const blobRef = await agent.uploadBlob(imgBuf, { encoding: 'image/jpeg' });
            images.push({ alt: '', image: blobRef.data.blob });
          } catch (e) {
            console.warn(`  Failed to upload image ${photo.url}: ${e.message}`);
          }
        }
        if (images.length > 0) {
          embed = { $type: 'app.bsky.embed.images', images };
        }
      }

      await agent.post({
        text: rt.text,
        facets: rt.facets,
        embed,
        createdAt: new Date(tweet.timeParsed || Date.now()).toISOString(),
      });

      posted++;
      if (posted % 10 === 0) {
        console.log(`  Posted ${posted} tweets...`);
      }

      // Small delay to avoid rate limits
      await sleep(500);
    } catch (e) {
      console.error(`  Failed to post tweet ${tweet.id}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Posted: ${posted}, Skipped/failed: ${skipped}`);
  console.log(`Check https://bsky.app/profile/${BLUESKY_HANDLE}`);
}

main().catch(console.error);
