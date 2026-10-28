"""Scrollable thumbnail grid for one collection. See docs/ui.md.

Tiles are drawn as canvas items, and only for the rows currently on screen
(plus a small buffer); rows that scroll away are deleted. A collection of
thousands of items therefore costs a few dozen canvas items and thumbnail
decodes at a time instead of one widget tree and decode per item.
"""
import tkinter as tk
import tkinter.font as tkfont
from pathlib import Path

from PIL import Image, ImageTk

from .. import db
from . import style

PLACEHOLDER_GLYPH_COLOR = {"video": style.BLUE, "image": style.GREEN, "text": style.GOLD}
PLACEHOLDER_GLYPH = {"video": "▶", "image": "\U0001f5bc", "text": "\U0001f4c4"}

GAP = 10                         # space around each tile
PITCH = style.TILE_SIZE + 2 * GAP  # distance between tile origins
CAPTION_H = 26                   # caption strip at the bottom of a tile
BUFFER_ROWS = 2                  # rows drawn above/below the visible area
TAP_SLOP = 10                    # px a press may move and still count as a tap


class GalleryFrame(tk.Frame):
    def __init__(self, parent, collection, on_open, focus_id=None):
        super().__init__(parent, bg=style.BG)
        self.on_open = on_open
        self.items = db.get_by_collection(collection)
        # index -> PhotoImage (or None); keeps Tk images alive while drawn
        self._drawn = {}
        self._cols = 0
        self._width = 0
        self._refresh_pending = False
        self._press = None
        self._caption_font = tkfont.Font(font=style.FONT_BODY)
        self._focus_index = next(
            (i for i, it in enumerate(self.items) if it["id"] == focus_id), None
        )

        self.canvas = tk.Canvas(self, bg=style.BG, highlightthickness=0, yscrollincrement=PITCH // 4)
        self.vscroll = tk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self._on_scroll)
        self.vscroll.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)

        if not self.items:
            self.canvas.create_text(
                40, 40, text="Nothing here yet.", anchor="nw",
                font=style.FONT_BODY_LARGE, fill=style.FG_DIM,
            )
            return

        self.canvas.bind("<Configure>", self._on_resize)
        # touch: drag scrolls, a press that barely moves is a tap
        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        # mouse wheel: X11 sends buttons 4/5, Windows/macOS send <MouseWheel>
        self.canvas.bind("<Button-4>", lambda e: self.canvas.yview_scroll(-1, "units"))
        self.canvas.bind("<Button-5>", lambda e: self.canvas.yview_scroll(1, "units"))
        self.canvas.bind("<MouseWheel>", lambda e: self.canvas.yview_scroll(-1 if e.delta > 0 else 1, "units"))

    # -- layout -----------------------------------------------------------

    def _x_offset(self):
        return (self._width - self._cols * PITCH) // 2

    def _on_resize(self, event):
        if event.width == self._width:
            return
        self._width = event.width
        self._cols = max(1, event.width // PITCH)
        self.canvas.delete("all")
        self._drawn.clear()

        rows = -(-len(self.items) // self._cols)
        height = rows * PITCH
        self.canvas.configure(scrollregion=(0, 0, event.width, height))
        if self._focus_index is not None:
            # coming back from the viewer: put that item's row at the top
            self.canvas.yview_moveto((self._focus_index // self._cols) * PITCH / height)
            self._focus_index = None
        self._schedule_refresh()

    def _on_scroll(self, first, last):
        self.vscroll.set(first, last)
        self._schedule_refresh()

    def _schedule_refresh(self):
        if not self._refresh_pending:
            self._refresh_pending = True
            self.after_idle(self._refresh)

    def _refresh(self):
        """Draw tiles in the visible rows, delete the ones that scrolled away."""
        self._refresh_pending = False
        if not self._cols:
            return
        top = self.canvas.canvasy(0)
        bottom = self.canvas.canvasy(self.canvas.winfo_height())
        first_row = max(0, int(top // PITCH) - BUFFER_ROWS)
        last_row = int(bottom // PITCH) + BUFFER_ROWS
        wanted = range(first_row * self._cols, min(len(self.items), (last_row + 1) * self._cols))

        for index in [i for i in self._drawn if i not in wanted]:
            self.canvas.delete(f"tile{index}")
            del self._drawn[index]
        for index in wanted:
            if index not in self._drawn:
                self._draw_tile(index)

    def _draw_tile(self, index):
        item = self.items[index]
        row, col = divmod(index, self._cols)
        x0 = self._x_offset() + col * PITCH + GAP
        y0 = row * PITCH + GAP
        size = style.TILE_SIZE
        tag = f"tile{index}"
        c = self.canvas

        c.create_rectangle(x0, y0, x0 + size, y0 + size, fill=style.BG_PANEL, outline="", tags=tag)
        photo = self._load_thumb(item)
        image_mid = (x0 + size // 2, y0 + (size - CAPTION_H) // 2)
        if photo:
            c.create_image(*image_mid, image=photo, tags=tag)
        else:
            c.create_rectangle(x0, y0, x0 + size, y0 + size - CAPTION_H, fill=style.BG_TILE, outline="", tags=tag)
            c.create_text(
                *image_mid, text=PLACEHOLDER_GLYPH.get(item["media_type"], "?"),
                font=("DejaVu Sans", 48),
                fill=PLACEHOLDER_GLYPH_COLOR.get(item["media_type"], style.FG_DIM), tags=tag,
            )
        self._drawn[index] = photo

        caption = item.get("title") or item.get("caption") or item["media_type"]
        c.create_text(
            x0 + size // 2, y0 + size - CAPTION_H // 2, text=self._fit(caption, size - 12),
            font=style.FONT_BODY, fill=style.FG, tags=tag,
        )

        status = item["status"]
        if status in ("pending", "failed"):
            c.create_text(
                x0 + size - 4, y0 + 4, text=status, anchor="ne", font=("DejaVu Sans", 10),
                fill=style.ERROR if status == "failed" else style.FG_DIM, tags=tag,
            )

    def _fit(self, text, max_px):
        """One line of text, cut with an ellipsis to fit max_px."""
        # TikTok descriptions can be thousands of chars; no tile fits 40
        text = " ".join(text[:200].split())[:40]
        if self._caption_font.measure(text) <= max_px:
            return text
        lo, hi = 0, len(text)  # binary search for the longest prefix that fits
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if self._caption_font.measure(text[:mid] + "…") <= max_px:
                lo = mid
            else:
                hi = mid - 1
        return text[:lo].rstrip() + "…"

    def _load_thumb(self, item):
        thumb_path = item.get("thumbnail_path")
        if not thumb_path or not Path(thumb_path).exists():
            return None
        try:
            with Image.open(thumb_path) as img:
                img.thumbnail((style.TILE_SIZE, style.TILE_SIZE - CAPTION_H))
                return ImageTk.PhotoImage(img)
        except Exception:
            return None

    # -- input ------------------------------------------------------------

    def _on_press(self, event):
        self.canvas.scan_mark(event.x, event.y)
        self._press = (event.x, event.y, False)

    def _on_drag(self, event):
        if self._press is None:
            return
        x, y, moved = self._press
        if moved or abs(event.x - x) > TAP_SLOP or abs(event.y - y) > TAP_SLOP:
            self._press = (x, y, True)
            self.canvas.scan_dragto(event.x, event.y, gain=1)

    def _on_release(self, event):
        press, self._press = self._press, None
        if press is None or press[2]:
            return
        index = self._index_at(event.x, event.y)
        if index is not None:
            self.on_open(self.items[index])

    def _index_at(self, x, y):
        cx = self.canvas.canvasx(x) - self._x_offset()
        cy = self.canvas.canvasy(y)
        col, col_off = divmod(int(cx), PITCH)
        row, row_off = divmod(int(cy), PITCH)
        inside = GAP <= col_off < GAP + style.TILE_SIZE and GAP <= row_off < GAP + style.TILE_SIZE
        if not inside or not 0 <= col < self._cols or cx < 0:
            return None
        index = row * self._cols + col
        return index if index < len(self.items) else None
