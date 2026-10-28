"""Fetch actual video files for rows the TikTok export only gave us a link for.

Note: TikTok's "liked videos" list is private on most accounts, so yt-dlp will
fail on those links unless it's given a logged-in session's cookies. Pass
cookies_file (a Netscape-format cookies.txt exported from your browser while
logged into tiktok.com) or cookies_from_browser (e.g. "chrome", "firefox") if
downloads of Likes/Favorites are failing with 403/private errors.
"""
from pathlib import Path

from .. import config, db
from ..thumbnails import save_thumbnail


def download_pending(limit=None, cookies_file=None, cookies_from_browser=None, on_progress=None):
    import yt_dlp

    rows = db.get_pending()
    if limit:
        rows = rows[:limit]

    results = {"downloaded": 0, "failed": 0}

    for row in rows:
        media_id = row["id"]
        outtmpl = str(config.MEDIA_DIR / f"{media_id}.%(ext)s")
        ydl_opts = {
            "outtmpl": outtmpl,
            "writethumbnail": True,
            "quiet": True,
            "noprogress": True,
            "format": "mp4/best",
        }
        if cookies_file:
            ydl_opts["cookiefile"] = str(cookies_file)
        elif cookies_from_browser:
            ydl_opts["cookiesfrombrowser"] = (cookies_from_browser,)

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(row["source_url"], download=True)

            video_path = _find_downloaded_file(media_id, exclude_thumb=True)
            thumb_path = _find_thumbnail(media_id)
            if video_path is None:
                raise RuntimeError("yt-dlp reported success but no output file was found")

            db.update_media(
                media_id,
                file_path=str(video_path),
                thumbnail_path=str(thumb_path) if thumb_path else None,
                title=info.get("description") or info.get("title"),
                status="downloaded",
            )
            results["downloaded"] += 1
        except Exception as e:
            db.update_media(media_id, status="failed", caption=str(e)[:500])
            results["failed"] += 1

        if on_progress:
            on_progress(row, results)

    return results


# TikTok thumbnails come down with a generic ".image" extension (they're JPEGs)
THUMB_EXTS = (".jpg", ".jpeg", ".webp", ".png", ".image")


def _find_downloaded_file(media_id, exclude_thumb=False):
    candidates = sorted(config.MEDIA_DIR.glob(f"{media_id}.*"))
    for c in candidates:
        if exclude_thumb and c.suffix.lower() in THUMB_EXTS:
            continue
        return c
    return None


def _find_thumbnail(media_id):
    for ext in THUMB_EXTS:
        p = config.MEDIA_DIR / f"{media_id}{ext}"
        if p.exists():
            # keep the full-size cover; the gallery only ever loads the small copy
            cover = config.COVER_DIR / f"{media_id}.jpg"
            p.replace(cover)
            dest = config.THUMB_DIR / f"{media_id}.jpg"
            try:
                save_thumbnail(cover, dest)
            except Exception:
                return None
            return dest
    return None
