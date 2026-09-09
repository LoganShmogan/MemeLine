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

# checked in order, first substring match wins. Add to this if TikTok renames things.
COLLECTION_RULES = [
    ("like", "Likes"),
    ("favorite", "Favorites"),
    ("post", "Posts"),
]

# paths containing these are noisy/huge and not "saved" content -- skipped by default
SKIP_SUBSTRINGS = ("browsing", "search", "hashtag", "share", "comment", "live")


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
    # your own uploaded videos live under a top-level "Video" key with no
    # "post" in the path (e.g. Video.Videos.Videos), so check that first
    if low.startswith("video.") or low.startswith("post."):
        return "Posts"
    for substring, label in COLLECTION_RULES:
        if substring in low:
            return label
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
