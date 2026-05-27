// Check a specific tweet's structure
const { setGlobalDispatcher, ProxyAgent } = require('undici');
setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7890'));

const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const fs = require('fs');
let AUTH, CT0;
for (const l of fs.readFileSync('.env.local','utf-8').split('\n')) {
  const t=l.trim(); if(!t||t.startsWith('#')) continue;
  const eq=t.indexOf('='); if(eq===-1) continue; let v=t.slice(eq+1);
  if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
  const k=t.slice(0,eq); if(k==='TWITTER_AUTH_TOKEN') AUTH=v; if(k==='TWITTER_CT0') CT0=v;
}
const TWEET_ID = '2051936617481593068';
const hdrs = {authorization:'Bearer '+BEARER,'x-csrf-token':CT0,cookie:'auth_token='+AUTH+'; ct0='+CT0,'user-agent':'Mozilla/5.0','origin':'https://twitter.com','referer':'https://twitter.com/'};

(async()=>{
  // Resolve user
  const p1 = new URLSearchParams({
    variables: JSON.stringify({screen_name:'lxgy1024',withSafetyModeUserFields:true}),
    features: JSON.stringify({hidden_profile_likes_enabled:false,hidden_profile_subscriptions_enabled:false,responsive_web_graphql_exclude_directive_enabled:true,verified_phone_label_enabled:false,subscriptions_verification_info_is_identity_verified_enabled:false,subscriptions_verification_info_verified_since_enabled:true,highlights_tweets_tab_ui_enabled:true,creator_subscriptions_tweet_preview_api_enabled:true,responsive_web_graphql_skip_user_profile_image_extensions_enabled:false,responsive_web_graphql_timeline_navigation_enabled:true}),
    fieldToggles: JSON.stringify({withAuxiliaryUserLabels:false}),
  });
  const ur = await (await fetch('https://twitter.com/i/api/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?'+p1, {headers:hdrs})).json();
  const userId = ur?.data?.user?.result?.rest_id;
  console.log('userId:', userId);

  // Fetch timeline
  const p2 = new URLSearchParams({
    variables: JSON.stringify({userId,count:50,includePromotedContent:false,withQuickPromoteEligibilityTweetFields:true,withVoice:true,withV2Timeline:true}),
    features: JSON.stringify({rweb_tipjar_consumption_enabled:true,responsive_web_graphql_exclude_directive_enabled:true,verified_phone_label_enabled:false,creator_subscriptions_tweet_preview_api_enabled:true,responsive_web_graphql_timeline_navigation_enabled:true,responsive_web_graphql_skip_user_profile_image_extensions_enabled:false,communities_web_enable_tweet_community_results_fetch:true,c9s_tweet_anatomy_moderator_badge_enabled:true,articles_preview_enabled:true,tweetypie_unmention_optimization_enabled:true,responsive_web_edit_tweet_api_enabled:true,graphql_is_translatable_rweb_tweet_is_translatable_enabled:true,view_counts_everywhere_api_enabled:true,longform_notetweets_consumption_enabled:true,responsive_web_twitter_article_tweet_consumption_enabled:true,tweet_awards_web_tipping_enabled:false,creator_subscriptions_quote_tweet_preview_enabled:false,freedom_of_speech_not_reach_fetch_enabled:true,standardized_nudges_misinfo:true,tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:true,rweb_video_timestamps_enabled:true,longform_notetweets_rich_text_read_enabled:true,longform_notetweets_inline_media_enabled:true,responsive_web_enhance_cards_enabled:false}),
    fieldToggles: JSON.stringify({withArticlePlainText:false}),
  });
  const td = await (await fetch('https://twitter.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets?'+p2, {headers:hdrs})).json();
  const insts = td?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];

  for (const inst of insts) {
    for (const e of inst.entries ?? []) {
      let r = e?.content?.itemContent?.tweet_results?.result;
      if (r?.result) r = r.result;
      if (!r?.rest_id || r.rest_id !== TWEET_ID) continue;
      const l = r.legacy ?? {};
      console.log('\n=== Tweet found ===');
      console.log('full_text:', l.full_text);
      console.log('is_quote_status:', l.is_quote_status);
      console.log('in_reply_to_status_id_str:', l.in_reply_to_status_id_str);
      console.log('retweeted_status_result:', !!l.retweeted_status_result);
      console.log('has extended_entities:', !!l.extended_entities);
      if (l.extended_entities?.media) {
        console.log('media count:', l.extended_entities.media.length);
        for (const m of l.extended_entities.media) {
          console.log('  media type:', m.type);
          console.log('  media_url:', m.media_url_https);
          console.log('  url:', m.url); // t.co link for this media
        }
      }
      // Check entities.urls
      if (l.entities?.urls) {
        console.log('urls in entities:');
        for (const u of l.entities.urls) {
          console.log('  display_url:', u.display_url);
          console.log('  expanded_url:', u.expanded_url);
          console.log('  url:', u.url); // t.co
        }
      }
      // Check full_text for t.co
      const tcoMatches = l.full_text?.match(/https:\/\/t\.co\/\w+/g);
      console.log('t.co links in text:', tcoMatches ? tcoMatches.join(', ') : 'none');
      process.exit(0);
    }
  }
  console.log('Tweet not found in timeline (might need to scroll further)');
})();
