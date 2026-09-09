#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from memebrowser import db
from memebrowser.importers import downloader


def main():
    ap = argparse.ArgumentParser(description="Download actual video files for pending library entries via yt-dlp.")
    ap.add_argument("--limit", type=int, default=None, help="Only download this many (useful for a test run)")
    ap.add_argument("--cookies-file", default=None,
                     help="Netscape cookies.txt exported while logged into tiktok.com (needed for private Likes/Favorites)")
    ap.add_argument("--cookies-from-browser", default=None,
                     help="e.g. chrome, firefox -- read cookies from a browser installed on this machine")
    args = ap.parse_args()

    db.init_db()
    pending_count = len(db.get_pending())
    if pending_count == 0:
        print("Nothing pending. Run scripts/import_tiktok.py first.")
        return

    print(f"{pending_count} pending item(s). Downloading" + (f" (limit {args.limit})" if args.limit else "") + "...")

    def progress(row, results):
        print(f"  [{results['downloaded']+results['failed']}] {row['collection']:<10} {row['source_url']}")

    results = downloader.download_pending(
        limit=args.limit,
        cookies_file=args.cookies_file,
        cookies_from_browser=args.cookies_from_browser,
        on_progress=progress,
    )
    print(f"\nDone. downloaded={results['downloaded']} failed={results['failed']}")
    if results["failed"]:
        print("Failures are usually private/removed videos. See the caption column in the DB for the error, "
              "or retry with --cookies-file if these are your private Likes/Favorites.")


if __name__ == "__main__":
    main()
