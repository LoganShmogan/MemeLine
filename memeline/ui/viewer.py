"""Full-screen viewer for one item (libVLC video, image, or text) with
prev/next through the list it was opened from. See docs/ui.md.
"""
import tkinter as tk
from pathlib import Path

from PIL import Image, ImageTk

from . import style

try:
    import vlc
    _VLC_INSTANCE = vlc.Instance("--no-xlib")
except Exception:
    vlc = None
    _VLC_INSTANCE = None


class ViewerFrame(tk.Frame):
    """Shows one media item, with prev/next through the list it came from."""

    def __init__(self, parent, items, index, on_back):
        super().__init__(parent, bg=style.BG)
        self.items = items
        self.index = index
        self.on_back = on_back
        self._player = None
        self._image_ref = None

        top = tk.Frame(self, bg=style.BG_PANEL)
        top.pack(side="top", fill="x")
        style.nav_button(top, "◀ Back", self._back).pack(side="left", padx=6, pady=6)
        style.nav_button(top, "‹ Prev", self._prev).pack(side="left", padx=6, pady=6)
        style.nav_button(top, "Next ›", self._next).pack(side="left", padx=6, pady=6)
        self.caption_label = tk.Label(top, font=style.FONT_TITLE, bg=style.BG_PANEL, fg=style.FG)
        self.caption_label.pack(side="left", padx=20)

        self.body = tk.Frame(self, bg=style.BG)
        self.body.pack(fill="both", expand=True)

        self.bind("<Destroy>", lambda e: self._release_player())
        self._render()

    def _current(self):
        return self.items[self.index]

    def _clear_body(self):
        self._release_player()
        for child in self.body.winfo_children():
            child.destroy()

    def _release_player(self):
        if self._player is not None:
            try:
                self._player.stop()
                self._player.release()
            except Exception:
                pass
            self._player = None

    def _render(self):
        self._clear_body()
        item = self._current()
        self.caption_label.configure(text=(item.get("title") or item.get("caption") or "")[:60])

        if item["media_type"] == "video":
            self._render_video(item)
        elif item["media_type"] == "image":
            self._render_image(item)
        else:
            self._render_text(item)

    def _render_video(self, item):
        file_path = item.get("file_path")
        if not file_path or not Path(file_path).exists():
            self._render_message(f"Not downloaded yet (status: {item['status']}).\n{item.get('source_url', '')}")
            return
        if vlc is None:
            self._render_message("python-vlc is not installed.\nRun: pip install python-vlc  (and make sure libvlc/vlc is installed)")
            return

        canvas = tk.Frame(self.body, bg="black")
        canvas.pack(fill="both", expand=True)
        controls = tk.Frame(self.body, bg=style.BG_PANEL)
        controls.pack(side="bottom", fill="x")
        style.nav_button(controls, "▶ / ⏸", self._toggle_play).pack(side="left", padx=6, pady=6)

        self.update_idletasks()
        player = _VLC_INSTANCE.media_player_new()
        media = _VLC_INSTANCE.media_new(str(file_path))
        player.set_media(media)
        player.set_xwindow(canvas.winfo_id())
        player.play()
        self._player = player

    def _toggle_play(self):
        if self._player is None:
            return
        if self._player.is_playing():
            self._player.pause()
        else:
            self._player.play()

    def _render_image(self, item):
        file_path = item.get("file_path")
        if not file_path or not Path(file_path).exists():
            self._render_message("Image file missing.")
            return
        label = tk.Label(self.body, bg=style.BG)
        label.pack(fill="both", expand=True)

        def draw(_=None):
            w = max(self.body.winfo_width(), 100)
            h = max(self.body.winfo_height(), 100)
            img = Image.open(file_path)
            img.thumbnail((w, h))
            self._image_ref = ImageTk.PhotoImage(img)
            label.configure(image=self._image_ref)

        self.body.bind("<Configure>", draw)
        draw()

    def _render_text(self, item):
        text_widget = tk.Text(
            self.body, font=style.FONT_BODY_LARGE, bg=style.BG, fg=style.FG,
            wrap="word", relief="flat", padx=30, pady=30,
        )
        text_widget.pack(fill="both", expand=True)
        content = item.get("caption") or ""
        file_path = item.get("file_path")
        if not content and file_path and Path(file_path).exists():
            content = Path(file_path).read_text(encoding="utf-8", errors="replace")
        text_widget.insert("1.0", content)
        text_widget.configure(state="disabled")

    def _render_message(self, msg):
        tk.Label(
            self.body, text=msg, font=style.FONT_BODY, bg=style.BG, fg=style.FG_DIM,
            wraplength=600, justify="left",
        ).pack(expand=True)

    def _back(self):
        self._release_player()
        self.on_back(self._current())  # gallery scrolls back to this item

    def _prev(self):
        if self.index > 0:
            self.index -= 1
            self._render()

    def _next(self):
        if self.index < len(self.items) - 1:
            self.index += 1
            self._render()
