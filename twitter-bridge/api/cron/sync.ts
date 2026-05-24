import { AtpAgent, RichText } from '@atproto/api';
import { fetchUserTweets } from '../../lib/twitter.js';

const {
  TWITTER_AUTH_TOKEN,
  TWITTER_CT0,
  TWITTER_USERNAME,
  BLUESKY_HANDLE,
  BLUESKY_APP_PASSWORD,
} = process.env;

/** Regex to find original tweet links in Bluesky post text. */
function buildTweetUrlPattern(username: string): RegExp {
  return new RegExp(
    `https?://(?:twitter|x)\\.com/${username}/status/(\\d+)`,
    'gi',
  );
}

function extractTweetIds(text: string, username: string): string[] {
  const pattern = buildTweetUrlPattern(username);
  return [...text.matchAll(pattern)].map((m) => m[1]);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const errors: string[] = [];
  let synced = 0;

  try {
    // ========== 1. Twitter: fetch recent tweets ==========
    if (!TWITTER_AUTH_TOKEN) throw new Error('Missing TWITTER_AUTH_TOKEN');
    if (!TWITTER_CT0) throw new Error('Missing TWITTER_CT0 — ct0 is required for GraphQL auth');
    if (!TWITTER_USERNAME) throw new Error('Missing TWITTER_USERNAME');

    console.log(`[sync] Fetching tweets for @${TWITTER_USERNAME} ...`);

    const tweets = await fetchUserTweets(TWITTER_USERNAME, 20, TWITTER_AUTH_TOKEN, TWITTER_CT0);

    if (tweets.length === 0) {
      // Could be an auth failure or genuinely empty — log a warning
      const msg =
        'Got 0 tweets from Twitter — cookies may be expired. Renew via F12 → Application → Cookies → twitter.com → copy auth_token and ct0';
      console.warn('[sync] ' + msg);
      errors.push(msg);
    }

    console.log(`[sync] Got ${tweets.length} tweets from Twitter`);

    // ========== 2. Bluesky: connect & fetch existing posts ==========
    if (!BLUESKY_HANDLE) throw new Error('Missing BLUESKY_HANDLE');
    if (!BLUESKY_APP_PASSWORD) throw new Error('Missing BLUESKY_APP_PASSWORD');

    console.log(`[sync] Connecting to Bluesky as @${BLUESKY_HANDLE} ...`);

    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({
      identifier: BLUESKY_HANDLE,
      password: BLUESKY_APP_PASSWORD,
    });

    const feed = await agent.getAuthorFeed({
      actor: BLUESKY_HANDLE,
      filter: 'posts_no_replies',
      limit: 50,
    });

    // Build set of tweet IDs already on Bluesky (via link facets or text)
    const alreadySynced = new Set<string>();
    for (const item of feed.data.feed) {
      const text = (item.post.record as any)?.text || '';
      extractTweetIds(text, TWITTER_USERNAME).forEach((id) => alreadySynced.add(id));
    }

    console.log(`[sync] Found ${alreadySynced.size} already-synced tweets in Bluesky feed`);

    // ========== 3. Post new tweets to Bluesky ==========
    for (const tweet of tweets) {
      if (alreadySynced.has(tweet.id)) {
        continue;
      }

      try {
        const postText = tweet.text;
        const rt = new RichText({ text: postText });
        await rt.detectFacets(agent);

        // Build embed with images if present
        let embed: any = undefined;
        if (tweet.photos && tweet.photos.length > 0) {
          const images: any[] = [];
          for (const photo of tweet.photos) {
            try {
              const imgResp = await fetch(photo.url);
              if (!imgResp.ok) {
                console.warn(`[sync] Failed to download image ${photo.url}: ${imgResp.status}`);
                continue;
              }
              const imgBuf = Buffer.from(await imgResp.arrayBuffer());
              const blobRef = await agent.uploadBlob(imgBuf, {
                encoding: 'image/jpeg',
              });
              images.push({
                alt: '',
                image: blobRef.data.blob,
              });
            } catch (e: any) {
              console.warn(`[sync] Failed to upload image ${photo.url}: ${e.message}`);
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
          createdAt: tweet.timeParsed?.toISOString() ?? new Date().toISOString(),
        });

        synced++;
        console.log(`[sync] Posted tweet ${tweet.id}`);
      } catch (e: any) {
        errors.push(`Failed to post tweet ${tweet.id}: ${e.message}`);
        console.error(`[sync] Error posting tweet ${tweet.id}:`, e.message);
      }
    }
  } catch (e: any) {
    errors.push(`Fatal error: ${e.message}`);
    console.error('[sync] Fatal:', e.message);
  }

  // Partial success (some tweets posted, some failed) still returns 200
  const status = errors.length > 0 && synced === 0 ? 500 : 200;
  const body: Record<string, unknown> = { synced };
  if (errors.length > 0) body.errors = errors;

  console.log(`[sync] Done: synced=${synced}, errors=${errors.length}`);
  return res.status(status).json(body);
}
