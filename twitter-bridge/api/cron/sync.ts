import { AtpAgent, RichText } from '@atproto/api';
import { fetchUserTweets } from '../../lib/twitter.js';

const {
  TWITTER_AUTH_TOKEN,
  TWITTER_CT0,
  TWITTER_USERNAME,
  BLUESKY_HANDLE,
  BLUESKY_APP_PASSWORD,
  GITHUB_PAT,
} = process.env;

const GITHUB_REPO = 'lxgy1024/personal-web';

/** Trigger GitHub Actions rebuild via workflow_dispatch. */
async function triggerRebuild(): Promise<void> {
  if (!GITHUB_PAT) {
    console.warn('[rebuild] No GITHUB_PAT set — skipping rebuild trigger');
    return;
  }
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ci.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${GITHUB_PAT}`,
        'user-agent': 'twitter-bsky-bridge/1.0',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[rebuild] GitHub dispatch failed (${res.status}): ${body.slice(0, 200)}`);
  } else {
    console.log('[rebuild] GitHub rebuild triggered');
  }
}

/** Extract tweet IDs from text URLs. */
function extractTweetIds(text: string, username: string): string[] {
  const pattern = new RegExp(
    `https?://(?:twitter|x)\\.com/${username}/status/(\\d+)`,
    'gi',
  );
  return [...text.matchAll(pattern)].map((m) => m[1]);
}

/**
 * Invisible character encoding for dedup markers.
 *
 * Uses 4 zero-width characters as a base-4 digit set, so the entire tweet ID
 * is encoded as a sequence of completely invisible characters.
 *
 * Encoding map (base-4 digit → invisible char):
 *   0 → U+200B (ZERO WIDTH SPACE)
 *   1 → U+200C (ZERO WIDTH NON-JOINER)
 *   2 → U+200D (ZERO WIDTH JOINER)
 *   3 → U+FEFF (ZERO WIDTH NO-BREAK SPACE / BYTE ORDER MARK)
 */
const INVISIBLE_DIGITS = ['​', '‌', '‍', '﻿'] as const;
const INVISIBLE_DECODE: Record<string, number> = {
  '​': 0,
  '‌': 1,
  '‍': 2,
  '﻿': 3,
};

function dedupMarker(tweetId: string): string {
  // Convert decimal tweet ID to base-4, map each digit to invisible char
  let n = BigInt(tweetId);
  if (n === 0n) return INVISIBLE_DIGITS[0];
  const digits: number[] = [];
  while (n > 0n) {
    digits.push(Number(n % 4n));
    n /= 4n;
  }
  return digits.reverse().map((d) => INVISIBLE_DIGITS[d]).join('');
}

function extractDedupMarkers(text: string): string[] {
  // Scan for invisible-only markers (new format): consecutive invisible chars
  const ids: string[] = [];
  let current: number[] = [];
  let inMarker = false;

  for (const c of text) {
    const val = INVISIBLE_DECODE[c];
    if (val !== undefined) {
      current.push(val);
      inMarker = true;
    } else if (inMarker) {
      // End of an invisible-only marker sequence — decode from base-4
      if (current.length > 0) {
        let id = 0n;
        for (const d of current) {
          id = id * 4n + BigInt(d);
        }
        ids.push(id.toString());
        current = [];
      }
      inMarker = false;
    }
  }
  // Handle marker at end of text
  if (current.length > 0) {
    let id = 0n;
    for (const d of current) {
      id = id * 4n + BigInt(d);
    }
    ids.push(id.toString());
  }

  // Also scan for old-format markers (​<digits>​) for backward compat
  const oldPattern = /​(\d+)​/g;
  for (const m of text.matchAll(oldPattern)) {
    ids.push(m[1]);
  }

  return ids;
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
    if (!TWITTER_CT0) throw new Error('Missing TWITTER_CT0');
    if (!TWITTER_USERNAME) throw new Error('Missing TWITTER_USERNAME');

    console.log(`[sync] Fetching tweets for @${TWITTER_USERNAME} ...`);

    const tweets = await fetchUserTweets(TWITTER_USERNAME, 20, TWITTER_AUTH_TOKEN, TWITTER_CT0);

    if (tweets.length === 0) {
      const msg =
        'Got 0 tweets from Twitter — cookies may be expired. Renew via F12 → Application → Cookies → twitter.com → copy auth_token and ct0';
      console.warn('[sync] ' + msg);
      errors.push(msg);
    }

    console.log(`[sync] Got ${tweets.length} tweets from Twitter`);

    // ========== 2. Connect to Bluesky and fetch existing posts for dedup ==========
    if (!BLUESKY_HANDLE) throw new Error('Missing BLUESKY_HANDLE');
    if (!BLUESKY_APP_PASSWORD) throw new Error('Missing BLUESKY_APP_PASSWORD');

    console.log(`[sync] Connecting to Bluesky as @${BLUESKY_HANDLE} ...`);

    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD });

    const feed = await agent.getAuthorFeed({
      actor: BLUESKY_HANDLE,
      filter: 'posts_no_replies',
      limit: 50,
    });

    // Build set of already-synced tweet IDs from:
    //   A) dedup markers in text (new invisible markers)
    //   B) Twitter URLs in text (old posts with URL tracking)
    //   C) embed.external URIs (text-only posts with link cards)
    const alreadySynced = new Set<string>();
    for (const item of feed.data.feed) {
      const record = item.post.record as any;
      const text = record?.text || '';
      // A) New invisible dedup markers
      extractDedupMarkers(text).forEach((id) => alreadySynced.add(id));
      // B) Old posts with Twitter URLs in text
      extractTweetIds(text, TWITTER_USERNAME).forEach((id) => alreadySynced.add(id));
      // C) Text-only posts with link card embeds
      const embed = record?.embed;
      if (embed?.$type === 'app.bsky.embed.external') {
        extractTweetIds(embed.external?.uri || '', TWITTER_USERNAME).forEach((id) => alreadySynced.add(id));
      }
    }

    console.log(`[sync] Found ${alreadySynced.size} already-synced tweets in Bluesky feed`);

    // ========== 3. Post new tweets to Bluesky with invisible dedup markers ==========
    for (const tweet of tweets) {
      if (alreadySynced.has(tweet.id)) {
        continue;
      }

      try {
        // Append invisible dedup marker for reliable future dedup
        const marker = dedupMarker(tweet.id);
        const maxLen = 300;
        const rawText = tweet.text;
        const trimmedText = rawText.length + marker.length > maxLen
          ? rawText.slice(0, maxLen - marker.length - 3) + '...'
          : rawText;

        // The dedup marker is invisible (zero-width spaces), clean text for users
        const postText = trimmedText + marker;
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
          createdAt: new Date().toISOString(),
        });

        synced++;
        console.log(`[sync] Posted tweet ${tweet.id}`);
      } catch (e: any) {
        errors.push(`Failed to post tweet ${tweet.id}: ${e.message}`);
        console.error(`[sync] Error posting tweet ${tweet.id}:`, e.message);
      }
    }

    // ========== 4. Trigger rebuild if new content ==========
    if (synced > 0) {
      await triggerRebuild();
    }
  } catch (e: any) {
    errors.push(`Fatal error: ${e.message}`);
    console.error('[sync] Fatal:', e.message);
  }

  // Partial success still returns 200
  const status = errors.length > 0 && synced === 0 ? 500 : 200;
  const body: Record<string, unknown> = { synced };
  if (errors.length > 0) body.errors = errors;

  console.log(`[sync] Done: synced=${synced}, errors=${errors.length}`);
  return res.status(status).json(body);
}
