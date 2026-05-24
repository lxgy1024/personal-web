import { Scraper } from 'agent-twitter-client';
import { AtpAgent, RichText } from '@atproto/api';

const {
  TWITTER_AUTH_TOKEN,
  TWITTER_CT0,
  TWITTER_USERNAME,
  BLUESKY_HANDLE,
  BLUESKY_APP_PASSWORD,
  CRON_SECRET,
} = process.env;

// Regex to find original tweet links in Bluesky post text
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
  // ---- Security ----
  if (CRON_SECRET && req.query?.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const errors: string[] = [];
  let synced = 0;

  try {
    // ========== 1. Twitter: fetch recent tweets ==========
    if (!TWITTER_AUTH_TOKEN) throw new Error('Missing TWITTER_AUTH_TOKEN');
    if (!TWITTER_USERNAME) throw new Error('Missing TWITTER_USERNAME');

    console.log(`[sync] Fetching tweets for @${TWITTER_USERNAME} ...`);

    const scraper = new Scraper();

    // Authenticate via cookies (RSSHub style)
    const cookies: string[] = [`auth_token=${TWITTER_AUTH_TOKEN}`];
    if (TWITTER_CT0) cookies.push(`ct0=${TWITTER_CT0}`);
    await scraper.setCookies(cookies);

    const tweetIter = scraper.getTweets(TWITTER_USERNAME, 20);
    const tweets: Array<{ id: string; text: string; timeParsed?: Date; photos?: Array<{ url: string }> }> = [];
    for await (const t of tweetIter) {
      if (t.id && t.text) {
        tweets.push(t);
      }
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
        const postText = `${tweet.text}\n\nhttps://x.com/${TWITTER_USERNAME}/status/${tweet.id}`;
        const rt = new RichText({ text: postText });
        await rt.detectFacets(agent);

        await agent.post({
          text: rt.text,
          facets: rt.facets,
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

  const status = errors.length > 0 && synced === 0 ? 500 : 200;
  const body: Record<string, unknown> = { synced };
  if (errors.length > 0) body.errors = errors;

  console.log(`[sync] Done: synced=${synced}, errors=${errors.length}`);
  return res.status(status).json(body);
}
