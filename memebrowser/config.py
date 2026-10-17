from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MEDIA_DIR = DATA_DIR / "media"
THUMB_DIR = DATA_DIR / "thumbnails"
DB_PATH = DATA_DIR / "memebrowser.db"

for _d in (DATA_DIR, MEDIA_DIR, THUMB_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# Raspberry Pi Touch Display 2 is 720x1280 native (portrait). Landscape rotation
# is common for a browsing app -- adjust to match how you mount the panel.
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
FULLSCREEN = False  # flip to True on the Pi once the layout is confirmed

COLLECTIONS = ["All", "Likes", "Favorites", "Posts", "Reposts", "Manual"]
