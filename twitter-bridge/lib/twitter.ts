/**
 * Minimal Twitter API client using native fetch + cookie auth.
 *
 * Replaces agent-twitter-client which depends on @roamhq/wrtc (WebRTC
 * native binary) and fails on Vercel's serverless runtime.
 */

const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const USER_TWEETS_QUERY_ID = 'V7H0Ap3_Hh2FyS75OCDO3Q';
const USER_TWEETS_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const USER_TWEETS_FIELD_TOGGLES = {
  withArticlePlainText: false,
};

export interface Tweet {
  id: string;
  text: string;
  timeParsed?: Date;
  photos?: Array<{ url: string }>;
}

function authHeaders(authToken: string, ct0: string): Record<string, string> {
  return {
    authorization: `Bearer ${BEARER_TOKEN}`,
    'x-csrf-token': ct0,
    cookie: `auth_token=${authToken}; ct0=${ct0}`,
    'content-type': 'application/json',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    origin: 'https://twitter.com',
    referer: 'https://twitter.com/',
  };
}

/** Walk the timeline instruction entries and extract tweet results. */
function extractTweetsFromTimeline(
  instructions: any[],
): Array<{ id: string; text: string; timeParsed?: Date; photos?: Array<{ url: string }> }> {
  const tweets: any[] = [];

  for (const instruction of instructions) {
    const entries = instruction?.entries ?? [];
    for (const entry of entries) {
      const result = entry?.content?.itemContent?.tweet_results?.result;
      if (!result?.rest_id) continue;

      const legacy = result.legacy ?? {};
      const id = result.rest_id;
      const text = legacy.full_text ?? '';
      const createdAt = legacy.created_at ?? '';

      // Skip retweets and replies
      if (legacy.retweeted_status) continue;
      if (legacy.in_reply_to_status_id_str) continue;

      // Extract photos from extended_entities
      const photos: Array<{ url: string }> = [];
      const media = legacy.extended_entities?.media ?? [];
      for (const m of media) {
        if (m.type === 'photo' && m.media_url_https) {
          photos.push({ url: m.media_url_https });
        }
      }

      tweets.push({
        id,
        text,
        timeParsed: createdAt ? new Date(createdAt) : undefined,
        photos: photos.length > 0 ? photos : undefined,
      });
    }
  }

  return tweets;
}

/**
 * Fetch recent tweets for a user using Twitter's internal GraphQL API.
 * Requires valid auth_token and ct0 cookies from a logged-in browser session.
 */
export async function fetchUserTweets(
  username: string,
  count: number,
  authToken: string,
  ct0: string,
): Promise<Tweet[]> {
  const headers = authHeaders(authToken, ct0);

  // Step 1: resolve screen_name → user ID
  const userRes = await fetch(
    `https://api.twitter.com/1.1/users/show.json?screen_name=${encodeURIComponent(username)}`,
    { headers },
  );
  if (!userRes.ok) {
    const body = await userRes.text().catch(() => '');
    const hint =
      userRes.status === 401
        ? ' — Twitter cookies may have expired. Renew: F12 → Application → Cookies → twitter.com → copy auth_token and ct0'
        : '';
    throw new Error(
      `Twitter user lookup failed (${userRes.status})${hint}: ${body.slice(0, 200)}`,
    );
  }
  const userData: any = await userRes.json();
  const userId: string = userData.id_str;
  if (!userId) throw new Error('Could not resolve user ID');

  // Step 2: fetch UserTweets timeline via GraphQL
  const variables = {
    userId,
    count,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
  };

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(USER_TWEETS_FEATURES),
    fieldToggles: JSON.stringify(USER_TWEETS_FIELD_TOGGLES),
  });

  const timelineRes = await fetch(
    `https://twitter.com/i/api/graphql/${USER_TWEETS_QUERY_ID}/UserTweets?${params}`,
    { headers },
  );
  if (!timelineRes.ok) {
    const body = await timelineRes.text().catch(() => '');
    throw new Error(`Twitter timeline fetch failed (${timelineRes.status}): ${body.slice(0, 200)}`);
  }
  const timelineData: any = await timelineRes.json();

  const instructions =
    timelineData?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];
  return extractTweetsFromTimeline(instructions);
}
