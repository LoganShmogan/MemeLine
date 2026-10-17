#!/usr/bin/env python3
"""Shrink existing thumbnails to tile size.

Libraries downloaded before 2026-10-17 kept TikTok's full-size cover as the
thumbnail. This moves each oversized one to data/covers/<id>.jpg and writes a
small copy in its place. Safe to re-run: already-small thumbnails are skipped.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image

from memebrowser import config, db
from memebrowser.thumbnails import save_thumbnail


def main():
    db.init_db()
    shrunk = skipped = errors = 0
    for thumb in sorted(config.THUMB_DIR.glob("*.jpg")):
        try:
            with Image.open(thumb) as img:
                if max(img.size) <= config.THUMB_SIZE:
                    skipped += 1
                    continue
            cover = config.COVER_DIR / thumb.name
            thumb.replace(cover)
            save_thumbnail(cover, thumb)
            shrunk += 1
        except Exception as e:
            cover = config.COVER_DIR / thumb.name
            if cover.exists() and not thumb.exists():
                cover.replace(thumb)  # put the original back rather than lose it
            print(f"  {thumb.name}: {e}")
            errors += 1
    print(f"shrunk={shrunk} already_small={skipped} errors={errors}")


if __name__ == "__main__":
    main()
