#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from memebrowser import db
from memebrowser.importers import tiktok_export


def main():
    ap = argparse.ArgumentParser(description="Import a TikTok data-export JSON into MemeBrowser's library.")
    ap.add_argument("json_path", help="Path to the TikTok export .json file")
    ap.add_argument("--include-all", action="store_true",
                     help="Also import link lists that couldn't be classified as Likes/Favorites/Posts")
    args = ap.parse_args()

    db.init_db()
    items, skipped = tiktok_export.parse_file(args.json_path, include_all=args.include_all)

    inserted, duplicates = 0, 0
    for item in items:
        if db.insert_media(item) is not None:
            inserted += 1
        else:
            duplicates += 1

    print(f"Parsed {len(items)} link(s) from {args.json_path}")
    print(f"  inserted:   {inserted}")
    print(f"  duplicates: {duplicates} (already in library)")
    print(f"  skipped:    {skipped} (unclassified lists; rerun with --include-all to keep them)")
    print(f"\nCounts by collection: {db.counts_by_collection()}")
    print("\nNext: python scripts/download_pending.py")


if __name__ == "__main__":
    main()
