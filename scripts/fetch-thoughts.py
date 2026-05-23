"""Fetch Bluesky feed and generate docs/thoughts.md."""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone

BLUESKY_HANDLE = "lxgy1024.bsky.social"
API_URL = "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed"
MAX_POSTS = 20
OUTPUT = "docs/thoughts.md"


def fetch_feed():
    params = f"?actor={BLUESKY_HANDLE}&filter=posts_no_replies&limit={MAX_POSTS}"
    url = API_URL + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "personal-website/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f"Bluesky API error (primary): {e}")
        # Fallback to alternative endpoint
        fallback_url = "https://api.bsky.app" + url[url.index("/xrpc"):]
        try:
            req2 = urllib.request.Request(fallback_url, headers={"User-Agent": "personal-website/1.0"})
            with urllib.request.urlopen(req2, timeout=10) as resp2:
                return json.loads(resp2.read())
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e2:
            print(f"Bluesky API error (fallback): {e2}")
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
        "<div class=\"thoughts-header\">",
        "# 碎碎念",
        "",
        "同步自 [Bluesky](https://bsky.app/profile/lxgy1024.bsky.social)",
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
        lines.append(f'  <div class="thought-text">{_escape_html(text)}</div>')

        # Embedded images
        embed = record.get("embed")
        if embed and embed.get("$type") == "app.bsky.embed.images":
            images = embed.get("images", [])
            if images:
                lines.append('  <div class="thought-images">')
                for img in images:
                    src = img.get("fullsize", "")
                    alt = img.get("alt", "")
                    if src:
                        lines.append(f'    <img src="{src}" alt="{_escape_html(alt)}" loading="lazy">')
                lines.append("  </div>")

        # External link preview
        if embed and embed.get("$type") == "app.bsky.embed.external":
            ext = embed.get("external", {})
            uri = ext.get("uri", "")
            title = ext.get("title", "")
            if uri:
                lines.append(f'  <div class="thought-link"><a href="{uri}" target="_blank" rel="noopener">{_escape_html(title) or uri}</a></div>')

        lines.append(f'  <div class="thought-time">{format_time(created_at)}</div>')
        lines.append("</div>")
        lines.append("")

    lines.extend([
        '<div class="thoughts-footer">',
        "更多想法请关注我的 ",
        "[Bluesky](https://bsky.app/profile/lxgy1024.bsky.social)",
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


def _escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def main():
    os.makedirs("docs", exist_ok=True)
    data = fetch_feed()
    page = build_page(data)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
