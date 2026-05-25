/**
 * One-time script: delete all Bluesky posts, then re-sync original tweets.
 * Usage: node scripts/resync.cjs
 * (loads from .env.local automatically if present)
 */

// Proxy support for China (uses HTTP_PROXY env var via undici)
{
  const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '';
  if (proxyUrl) {
    const { setGlobalDispatcher, ProxyAgent } = require('undici');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }
}

const { AtpAgent, RichText } = require('@atproto/api');
const { fetchUserTweets } = require('../dist/lib/twitter.js');

// Load .env.local manually
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

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
    if (posts.length === 0) break;

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
        await sleep(300);
      } catch (e) {
        console.error(`  Failed to delete ${rkey}: ${e.message}`);
      }
    }

    cursor = feed.data.cursor;
  } while (cursor);

  console.log(`Deleted ${deleted} posts total`);

  // ========== Step 2: Fetch original tweets from Twitter ==========
  console.log('\n=== Step 2: Fetching tweets from Twitter ===');
  const tweets = await fetchUserTweets(TWITTER_USERNAME, 100, TWITTER_AUTH_TOKEN, TWITTER_CT0);
  console.log(`Fetched ${tweets.length} original tweets (no RTs, replies, quotes)`);

  // ========== Step 3: Post to Bluesky ==========
  console.log('\n=== Step 3: Posting to Bluesky ===');
  let posted = 0;
  let failed = 0;

  for (const tweet of tweets) {
    try {
      // Append invisible dedup marker
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
              console.warn(`  Skipping image ${photo.url}: ${imgResp.status}`);
              continue;
            }
            const imgBuf = Buffer.from(await imgResp.arrayBuffer());
            const blobRef = await agent.uploadBlob(imgBuf, { encoding: 'image/jpeg' });
            images.push({ alt: '', image: blobRef.data.blob });
          } catch (e) {
            console.warn(`  Failed image ${photo.url}: ${e.message}`);
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
        createdAt: tweet.timeParsed
          ? new Date(tweet.timeParsed).toISOString()
          : new Date().toISOString(),
      });

      posted++;
      process.stdout.write(posted % 10 === 0 ? `  Posted ${posted}...\n` : '.');
      await sleep(500);
    } catch (e) {
      console.error(`\n  Failed tweet ${tweet.id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`Posted: ${posted}, Failed: ${failed}`);
  console.log(`Check https://bsky.app/profile/${BLUESKY_HANDLE}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
