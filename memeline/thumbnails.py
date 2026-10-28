"""Tile-sized thumbnails, made once so the gallery never decodes full-size art."""
from pathlib import Path

from PIL import Image

from . import config


def save_thumbnail(src: str | Path, dest: str | Path):
    """Shrink src to fit THUMB_SIZE and save it as a JPEG at dest (may be src)."""
    with Image.open(src) as img:
        img.thumbnail((config.THUMB_SIZE, config.THUMB_SIZE))
        small = img.convert("RGB")
    small.save(dest, "JPEG", quality=85)
