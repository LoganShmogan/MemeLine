"""Main window: nav bar of collection tabs plus one content frame that is
rebuilt for each screen (gallery, viewer, add media). See docs/ui.md.
"""
import tkinter as tk

from .. import config, db
from . import style
from .add_media import AddMediaFrame
from .gallery import GalleryFrame
from .viewer import ViewerFrame


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("MemeBrowser")
        self.configure(bg=style.BG)
        self.geometry(f"{config.SCREEN_WIDTH}x{config.SCREEN_HEIGHT}")
        if config.FULLSCREEN:
            self.attributes("-fullscreen", True)
        self.bind("<Escape>", lambda e: self.attributes("-fullscreen", False))

        db.init_db()

        self.current_collection = "All"
        self.nav_buttons = {}
        self._build_nav()

        self.content = tk.Frame(self, bg=style.BG)
        self.content.pack(fill="both", expand=True)

        self.show_gallery(config.COLLECTIONS[0])

    def _build_nav(self):
        nav = tk.Frame(self, bg=style.BG_PANEL)
        nav.pack(side="top", fill="x")

        for name in config.COLLECTIONS:
            btn = style.nav_button(nav, name, lambda n=name: self.show_gallery(n))
            btn.pack(side="left", padx=4, pady=6)
            self.nav_buttons[name] = btn

        add_btn = style.nav_button(nav, "+ Add", self.show_add_media)
        add_btn.pack(side="right", padx=10, pady=6)

        tk.Frame(self, bg=style.ACCENT, height=2).pack(side="top", fill="x")

    def _set_active_nav(self, name):
        for n, btn in self.nav_buttons.items():
            btn.configure(bg=style.ACCENT if n == name else style.BG_PANEL)

    def _clear_content(self):
        for child in self.content.winfo_children():
            child.destroy()

    def show_gallery(self, collection, focus_id=None):
        self.current_collection = collection
        self._set_active_nav(collection)
        self._clear_content()
        GalleryFrame(
            self.content, collection, on_open=self.show_viewer, focus_id=focus_id,
        ).pack(fill="both", expand=True)

    def show_viewer(self, item):
        items = db.get_by_collection(self.current_collection)
        index = next((i for i, it in enumerate(items) if it["id"] == item["id"]), 0)
        self._set_active_nav(None)
        self._clear_content()
        ViewerFrame(
            self.content, items, index,
            on_back=lambda last: self.show_gallery(self.current_collection, focus_id=last["id"]),
        ).pack(fill="both", expand=True)

    def show_add_media(self):
        self._set_active_nav(None)
        self._clear_content()
        AddMediaFrame(
            self.content,
            on_added=lambda: self.show_gallery(self.current_collection),
        ).pack(fill="both", expand=True)


def main():
    App().mainloop()
