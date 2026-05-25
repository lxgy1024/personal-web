"""Fetch Bluesky feed and generate docs/thoughts/ pages with year-based navigation."""

import html
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

BLUESKY_HANDLE = "lxgy1024.bsky.social"
BLUESKY_PROFILE_URL = f"https://bsky.app/profile/{BLUESKY_HANDLE}"
API_PATH = "/xrpc/app.bsky.feed.getAuthorFeed"
PRIMARY_HOST = "https://public.api.bsky.app"
FALLBACK_HOST = "https://api.bsky.app"
MAX_POSTS = 50
OUTPUT_DIR = "docs/thoughts"
CST = timezone(timedelta(hours=8), "CST")


def _do_request(url):
    req = urllib.request.Request(url, headers={"User-Agent": "personal-website/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def fetch_feed():
    params = f"?actor={BLUESKY_HANDLE}&filter=posts_no_replies&limit={MAX_POSTS}"
    for host in (PRIMARY_HOST, FALLBACK_HOST):
        url = host + API_PATH + params
        try:
            return _do_request(url)
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
            print(f"Bluesky API error ({host}): {e}")
    return None


def format_time(iso_str):
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        cst = dt.astimezone(CST)
        return cst.strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return iso_str


def extract_year(iso_str):
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return str(dt.astimezone(CST).year)
    except (ValueError, AttributeError):
        return None


def strip_dedup_marker(text: str) -> str:
    """Remove invisible dedup markers from text.

    Handles both:
      - Old format: ​<digits>​ (zero-width space wrapping tweet ID)
      - New format: consecutive zero-width chars only (base-4 encoded tweet ID)
    """
    import re
    # Old format: zero-width space wrapping tweet ID digits
    text = re.sub('​\\d+​', '', text)
    # New format: strip all zero-width / invisible marker characters
    # (ZWS, ZWNJ, ZWJ, ZWNBSP) — these are the invisible digit set
    text = re.sub('[​‌‍﻿]', '', text)
    return text


def strip_twitter_url(text: str) -> str:
    """Remove trailing x.com/twitter.com URLs and t.co media links."""
    import re
    text = re.sub(
        r'\n+https?://(?:twitter|x)\.com/\w+/status/\d+\s*$',
        '',
        text,
    ).rstrip()
    # Strip trailing t.co links (Twitter auto-appends these for media attachments)
    text = re.sub(r'\s*https://t\.co/\w+\s*$', '', text).rstrip()
    return text


def render_post(created_at, text, post, record):
    """Render a single thought post as markdown lines."""
    lines = []
    lines.append(f"### {format_time(created_at)}")
    lines.append("")
    lines.append('<div class="thought-card">')
    lines.append(f'<div class="thought-text">{html.escape(strip_twitter_url(strip_dedup_marker(text)))}</div>')

    embed = post.get("embed") or record.get("embed")
    if embed:
        etype = embed.get("$type", "")
        if "images" in etype:
            img_tags = []
            for img in embed.get("images", []):
                src = img.get("fullsize", "")
                alt = img.get("alt", "")
                if src:
                    img_tags.append(f'  <img src="{html.escape(src)}" alt="{html.escape(alt)}" loading="lazy">')
            if img_tags:
                lines.append('  <div class="thought-images">')
                lines.extend(img_tags)
                lines.append("  </div>")
        elif "external" in etype:
            ext = embed.get("external", {})
            uri = ext.get("uri", "")
            title = ext.get("title", "")
            if uri:
                lines.append(f'  <div class="thought-link"><a href="{html.escape(uri)}" target="_blank" rel="noopener">{html.escape(title) or html.escape(uri)}</a></div>')

    lines.append("</div>")
    lines.append("")
    return lines


def make_year_page(year, posts):
    """Build a page for a single year."""
    lines = [
        f"# {year} 年",
        "",
        f"同步自 [Bluesky]({BLUESKY_PROFILE_URL}) · 时间为北京时间 (UTC+8)",
        "",
    ]
    for created_at, text, post, record in posts:
        lines.extend(render_post(created_at, text, post, record))

    lines.extend([
        '<div class="thoughts-footer">',
        "更多想法请关注我的 ",
        f"[Bluesky]({BLUESKY_PROFILE_URL})",
        "</div>",
    ])
    return "\n".join(lines)


def make_index_page(sorted_years, all_posts):
    """Build the landing page for thoughts showing all years."""
    lines = [
        "# 碎碎念",
        "",
        f"同步自 [Bluesky]({BLUESKY_PROFILE_URL}) · 时间为北京时间 (UTC+8)",
        "",
    ]
    # Show latest year's posts on the landing page
    latest = sorted_years[0] if sorted_years else None
    if latest:
        lines.append(f"最新：{latest} 年")
        lines.append("")

    for created_at, text, post, record in all_posts:
        lines.extend(render_post(created_at, text, post, record))

    lines.extend([
        '<div class="thoughts-footer">',
        "更多想法请关注我的 ",
        f"[Bluesky]({BLUESKY_PROFILE_URL})",
        "</div>",
    ])
    return "\n".join(lines)


def make_empty_page():
    return "\n".join([
        "# 碎碎念",
        "",
        "还没有碎碎念～",
    ])


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    data = fetch_feed()
    if data is None:
        page = "\n".join([
            "# 碎碎念",
            "",
            "> 暂时无法同步，请稍后再来喵～",
        ])
        with open(os.path.join(OUTPUT_DIR, "index.md"), "w", encoding="utf-8") as f:
            f.write(page)
        print("Generated docs/thoughts/index.md (error)")
        return

    feed = data.get("feed", [])
    if not feed:
        page = make_empty_page()
        with open(os.path.join(OUTPUT_DIR, "index.md"), "w", encoding="utf-8") as f:
            f.write(page)
        print("Generated docs/thoughts/index.md (empty)")
        return

    # Collect posts with text-based dedup (prefer original Bluesky posts)
    posts = []
    seen = {}  # normalized_text -> index in posts
    for item in feed:
        post = item.get("post", {})
        record = post.get("record", {})
        text = record.get("text", "")
        created_at = record.get("createdAt", "")
        if not text:
            continue
        normalized = strip_twitter_url(text)
        has_sync_url = text != normalized
        if normalized in seen:
            # If existing entry is a synced copy and this one is original, replace
            existing_idx = seen[normalized]
            existing_text = posts[existing_idx][1]
            if strip_twitter_url(existing_text) != existing_text and not has_sync_url:
                posts[existing_idx] = (created_at, text, post, record)
            continue
        seen[normalized] = len(posts)
        posts.append((created_at, text, post, record))

    # Sort by createdAt descending (newest first), since dedup can disrupt API order
    posts.sort(key=lambda p: p[0], reverse=True)

    # Group by year
    years = {}
    for created_at, text, post, record in posts:
        year = extract_year(created_at) or "未知"
        years.setdefault(year, []).append((created_at, text, post, record))

    sorted_years = sorted(years.keys(), reverse=True)

    # Generate per-year pages
    for year in sorted_years:
        page = make_year_page(year, years[year])
        path = os.path.join(OUTPUT_DIR, f"{year}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(page)
        print(f"Generated {path}")

    # Generate index (landing) page
    index_page = make_index_page(sorted_years, posts)
    with open(os.path.join(OUTPUT_DIR, "index.md"), "w", encoding="utf-8") as f:
        f.write(index_page)
    print("Generated docs/thoughts/index.md")


if __name__ == "__main__":
    main()
