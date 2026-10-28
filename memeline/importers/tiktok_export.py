"""Parse a TikTok "Download your data" JSON export.

TikTok has changed the exact key names/casing of this export multiple times
(and localizes some keys to the account's language), so instead of hardcoding
a fixed schema this walks the whole tree looking for lists of dicts that carry
a link + date, and classifies each list by the path it was found at.
"""
import json
from pathlib import Path

LINK_KEYS = ("link", "url")
DATE_KEYS = ("date",)

# Matched against the *section* name (the key holding the list's parent dict,
# e.g. "Like List" in "Likes and Favorites.Like List.ItemFavoriteList"), not the
# whole path -- the 2026 export nests Favorites under a top-level "Likes and
# Favorites" key, so whole-path matching filed every favorite as a like.
# Checked in order, first substring match wins. None = not a video, skip it.
SECTION_RULES = [
    ("sound", None),      # Favorite Sounds -- music page links, not videos
    ("effect", None),     # Favorite Effects
    ("deleted", None),    # Recently Deleted Posts
    ("repost", "Reposts"),  # before "post": other people's videos you reposted
    ("like", "Likes"),
    ("favorite", "Favorites"),
    ("post", "Posts"),
]

# paths containing these are noisy/huge and not "saved" content -- skipped by default
SKIP_SUBSTRINGS = ("browsing", "watch history", "search", "hashtag", "share", "comment", "live")


def _find_ci(d: dict, candidates) -> str | None:
    lowered = {k.lower(): v for k, v in d.items()}
    for name in candidates:
        if name in lowered:
            return lowered[name]
    return None


def _classify(path: str) -> str | None:
    low = path.lower()
    if any(s in low for s in SKIP_SUBSTRINGS):
        return None
    parts = low.split(".")
    section = parts[-2] if len(parts) >= 2 else low
    for substring, label in SECTION_RULES:
        if substring in section:
            return label
    # older exports keep your own uploads under a top-level "Video" key
    # (e.g. Video.Videos.Videos) with no "post" anywhere in the path
    if low.startswith("video."):
        return "Posts"
    return None


def _walk(node, path="", include_all=False, out=None, skipped=None):
    if out is None:
        out, skipped = [], {"count": 0}

    if isinstance(node, dict):
        for key, value in node.items():
            _walk(value, f"{path}.{key}" if path else key, include_all, out, skipped)

    elif isinstance(node, list):
        dict_items = [x for x in node if isinstance(x, dict)]
        looks_like_link_list = dict_items and all(
            _find_ci(x, LINK_KEYS) is not None for x in dict_items
        )
        if looks_like_link_list:
            label = _classify(path)
            if label is None and not include_all:
                skipped["count"] += len(dict_items)
            else:
                for item in dict_items:
                    out.append(
                        {
                            "media_type": "video",
                            "collection": label or "Manual",
                            "source_url": _find_ci(item, LINK_KEYS),
                            "date_original": _find_ci(item, DATE_KEYS),
                            "status": "pending",
                        }
                    )
        else:
            for i, item in enumerate(node):
                _walk(item, f"{path}[{i}]", include_all, out, skipped)

    return out, skipped


def parse_file(json_path: str | Path, include_all: bool = False):
    """Returns (items, skipped_count). items are dicts ready for db.insert_media."""
    data = json.loads(Path(json_path).read_text(encoding="utf-8"))
    items, skipped = _walk(data, include_all=include_all)
    return items, skipped["count"]
