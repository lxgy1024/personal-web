"""Fetch Bluesky feed and generate docs/thoughts.md."""

import html
import json
import os
import urllib.request
import urllib.error
from datetime import datetime

BLUESKY_HANDLE = "lxgy1024.bsky.social"
BLUESKY_PROFILE_URL = f"https://bsky.app/profile/{BLUESKY_HANDLE}"
API_PATH = "/xrpc/app.bsky.feed.getAuthorFeed"
PRIMARY_HOST = "https://public.api.bsky.app"
FALLBACK_HOST = "https://api.bsky.app"
MAX_POSTS = 50
OUTPUT = "docs/thoughts.md"


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
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return iso_str


def build_page(data):
    if data is None:
        return _error_page("暂时无法同步，请稍后再来喵～")

    feed = data.get("feed", [])
    if not feed:
        return _error_page("还没有碎碎念～")

    lines = [
        "---",
        "hide:",
        "  - navigation",
        "  - toc",
        "---",
        "",
        '<div class="thoughts-header" markdown="1">',
        "# 碎碎念",
        "",
        f"同步自 [Bluesky]({BLUESKY_PROFILE_URL})",
        "</div>",
        "",
    ]

    for item in feed:
        post = item.get("post", {})
        record = post.get("record", {})
        text = record.get("text", "")
        created_at = record.get("createdAt", "")
        if not text:
            continue

        lines.append('<div class="thought-card">')
        lines.append(f'  <div class="thought-text">{html.escape(text)}</div>')

        embed = post.get("embed") or record.get("embed")
        if embed:
            etype = embed.get("$type", "")
            if "images" in etype:
                img_tags = []
                for img in embed.get("images", []):
                    src = img.get("fullsize", "")
                    alt = img.get("alt", "")
                    if src:
                        img_tags.append(f'    <img src="{html.escape(src)}" alt="{html.escape(alt)}" loading="lazy">')
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

        lines.append(f'  <div class="thought-time">{format_time(created_at)}</div>')
        lines.append("</div>")
        lines.append("")

    lines.extend([
        '<div class="thoughts-footer">',
        "更多想法请关注我的 ",
        f"[Bluesky]({BLUESKY_PROFILE_URL})",
        "</div>",
        "",
    ])

    return "\n".join(lines)


def _error_page(message):
    return "\n".join([
        "---",
        "hide:",
        "  - navigation",
        "  - toc",
        "---",
        "",
        "# 碎碎念",
        "",
        f">{message}",
        "",
    ])


def main():
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    data = fetch_feed()
    page = build_page(data)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
