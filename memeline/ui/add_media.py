"""Add your own photo/video (copied into data/media) or a text note to the
Manual collection. See docs/ui.md.
"""
import shutil
import subprocess
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, simpledialog

from .. import config, db
from ..thumbnails import save_thumbnail
from . import style

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi"}


class AddMediaFrame(tk.Frame):
    def __init__(self, parent, on_added):
        super().__init__(parent, bg=style.BG)
        self.on_added = on_added

        tk.Label(
            self, text="Add media", font=style.FONT_TITLE, bg=style.BG, fg=style.FG
        ).pack(pady=(40, 20))

        style.nav_button(self, "\U0001f5bc  Add photo / video", self._add_file).pack(pady=12, ipadx=20, ipady=10)
        style.nav_button(self, "\U0001f4c4  Add text note", self._add_text).pack(pady=12, ipadx=20, ipady=10)

        self.status = tk.Label(self, font=style.FONT_BODY, bg=style.BG, fg=style.FG_DIM)
        self.status.pack(pady=20)

    def _add_file(self):
        path = filedialog.askopenfilename(title="Choose a photo or video")
        if not path:
            return
        src = Path(path)
        ext = src.suffix.lower()
        if ext in IMAGE_EXT:
            media_type = "image"
        elif ext in VIDEO_EXT:
            media_type = "video"
        else:
            self.status.configure(text=f"Unsupported file type: {ext}")
            return

        # insert first to get an id, then copy using that id as the filename
        media_id = db.insert_media({
            "media_type": media_type, "collection": "Manual",
            "title": src.stem, "status": "manual",
        })
        dest = config.MEDIA_DIR / f"{media_id}{ext}"
        shutil.copy2(src, dest)
        thumb_path = self._make_thumbnail(media_id, dest, media_type)
        db.update_media(media_id, file_path=str(dest), thumbnail_path=str(thumb_path) if thumb_path else None)

        self.status.configure(text=f"Added: {src.name}")
        self.on_added()

    def _add_text(self):
        text = simpledialog.askstring("Add text note", "Enter text:", parent=self)
        if not text:
            return
        media_id = db.insert_media({
            "media_type": "text", "collection": "Manual",
            "title": text[:40], "caption": text, "status": "manual",
        })
        dest = config.MEDIA_DIR / f"{media_id}.txt"
        dest.write_text(text, encoding="utf-8")
        db.update_media(media_id, file_path=str(dest))
        self.status.configure(text="Text note added")
        self.on_added()

    def _make_thumbnail(self, media_id, file_path, media_type):
        thumb_dest = config.THUMB_DIR / f"{media_id}.jpg"
        try:
            if media_type == "image":
                save_thumbnail(file_path, thumb_dest)
                return thumb_dest
            else:  # video: grab a frame with ffmpeg if it's on PATH
                result = subprocess.run(
                    ["ffmpeg", "-y", "-ss", "00:00:01", "-i", str(file_path),
                     "-frames:v", "1", str(thumb_dest)],
                    capture_output=True, timeout=15,
                )
                if result.returncode != 0 or not thumb_dest.exists():
                    return None
                save_thumbnail(thumb_dest, thumb_dest)
                return thumb_dest
        except Exception:
            return None
