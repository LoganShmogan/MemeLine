"""Scrollable thumbnail grid for one collection. See docs/ui.md."""
import tkinter as tk
from pathlib import Path

from PIL import Image, ImageTk

from .. import db
from . import style

PLACEHOLDER_GLYPH_COLOR = {"video": style.BLUE, "image": style.GREEN, "text": style.GOLD}
PLACEHOLDER_GLYPH = {"video": "▶", "image": "\U0001f5bc", "text": "\U0001f4c4"}


class GalleryFrame(tk.Frame):
    def __init__(self, parent, collection, on_open):
        super().__init__(parent, bg=style.BG)
        self.collection = collection
        self.on_open = on_open
        self._thumb_cache = []  # keep PhotoImage refs alive

        canvas = tk.Canvas(self, bg=style.BG, highlightthickness=0)
        vscroll = tk.Scrollbar(self, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vscroll.set)
        canvas.pack(side="left", fill="both", expand=True)
        vscroll.pack(side="right", fill="y")

        self.inner = tk.Frame(canvas, bg=style.BG)
        canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        # touch-drag scrolling
        canvas.bind("<ButtonPress-1>", lambda e: canvas.scan_mark(e.x, e.y))
        canvas.bind("<B1-Motion>", lambda e: canvas.scan_dragto(e.x, e.y, gain=1))
        # mouse wheel for dev-machine testing
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(int(-e.delta / 60), "units"))

        self.reload()

    def reload(self):
        for child in self.inner.winfo_children():
            child.destroy()
        self._thumb_cache.clear()

        items = db.get_by_collection(self.collection)
        cols = 4
        if not items:
            tk.Label(
                self.inner, text="Nothing here yet.", font=style.FONT_BODY_LARGE,
                bg=style.BG, fg=style.FG_DIM,
            ).grid(row=0, column=0, padx=40, pady=40)
            return

        for i, item in enumerate(items):
            r, c = divmod(i, cols)
            self._add_tile(item, r, c)

    def _add_tile(self, item, r, c):
        tile = tk.Frame(self.inner, bg=style.BG_PANEL, width=style.TILE_SIZE, height=style.TILE_SIZE)
        tile.grid(row=r, column=c, padx=10, pady=10)
        tile.grid_propagate(False)

        img_label = tk.Label(tile, bg=style.BG_PANEL)
        img_label.pack(fill="both", expand=True)
        photo = self._load_thumb(item)
        if photo:
            img_label.configure(image=photo)
        else:
            img_label.configure(
                text=PLACEHOLDER_GLYPH.get(item["media_type"], "?"),
                font=("DejaVu Sans", 48),
                fg=PLACEHOLDER_GLYPH_COLOR.get(item["media_type"], style.FG_DIM),
                bg=style.BG_TILE,
            )

        caption = item.get("title") or item.get("caption") or item["media_type"]
        tk.Label(
            tile, text=caption[:28], font=style.FONT_BODY, bg=style.BG_PANEL, fg=style.FG,
            wraplength=style.TILE_SIZE - 10,
        ).pack(side="bottom", fill="x")

        status = item["status"]
        if status in ("pending", "failed"):
            tk.Label(
                tile, text=status, font=("DejaVu Sans", 10), bg=style.BG_PANEL,
                fg=style.ERROR if status == "failed" else style.FG_DIM,
            ).place(relx=1.0, rely=0.0, anchor="ne")

        for widget in (tile, img_label):
            widget.bind("<Button-1>", lambda e, it=item: self.on_open(it))

    def _load_thumb(self, item):
        thumb_path = item.get("thumbnail_path")
        if not thumb_path or not Path(thumb_path).exists():
            return None
        try:
            img = Image.open(thumb_path)
            img.thumbnail((style.TILE_SIZE, style.TILE_SIZE))
            photo = ImageTk.PhotoImage(img)
            self._thumb_cache.append(photo)
            return photo
        except Exception:
            return None
