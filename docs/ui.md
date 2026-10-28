# User interface

A Tkinter app (`memeline/ui/`) built for a 7" touchscreen, which also
works with a keyboard and mouse. Start it with `python main.py`.

## Screens

```
+--------------------------------------------------------------+
| [All] [Likes] [Favorites] [Posts] [Reposts] [Manual]  [+ Add] |  nav bar (app.py)
|==============================================================|  2px accent rule
|                                                              |
|   content frame: exactly one of                              |
|     GalleryFrame   (gallery.py)                              |
|     ViewerFrame    (viewer.py)                               |
|     AddMediaFrame  (add_media.py)                            |
|                                                              |
+--------------------------------------------------------------+
```

### `App` (app.py)
- A `tk.Tk` subclass. Sets the window size from `config.SCREEN_WIDTH` x
  `SCREEN_HEIGHT`, and goes fullscreen if `config.FULLSCREEN`. **Esc** leaves
  fullscreen.
- Builds one nav button per entry in `config.COLLECTIONS`. The active one is
  drawn in the accent colour; none is highlighted while the viewer or "Add"
  screen is open.
- `show_gallery(collection)`, `show_viewer(item)` and `show_add_media()`
  destroy whatever is in `content` and build the new screen. The screen
  objects talk back only through the callbacks they're given (`on_open`,
  `on_back`, `on_added`), so screens never import each other.

### Gallery (gallery.py)
- A scrollable grid of 200x200 tiles (`style.TILE_SIZE`), newest first.
  As many columns as fit the width: 5 in 1280px landscape, 3 in 720px
  portrait. Rows come from `db.get_by_collection()`, which leaves out
  `failed` items.
- **Virtualised:** everything is drawn on one `Canvas`, and only the visible
  rows plus 2 either side exist at any time. Scrolling draws new rows and
  deletes old ones. See
  [architecture.md](architecture.md#a-virtualised-gallery-on-a-single-canvas).
- **Scrolling:** drag with a finger (`scan_mark`/`scan_dragto`), the
  scrollbar, or the mouse wheel.
- **Tile:** the thumbnail, or a coloured glyph if there isn't one (blue ▶
  video, green 🖼 image, gold 📄 text). Below it, the first 28 characters of
  the title, trimmed with "…" to fit the tile. `pending` items get a small
  grey "pending" label in the corner. Tapping a tile (a press that moves less
  than 10px) opens the viewer.
- **Back from the viewer** scrolls the gallery to the last item you viewed,
  even if you used Next/Prev to get there.

### Viewer (viewer.py)
- Top bar: **◀ Back**, **‹ Prev**, **Next ›** and the first 60 characters
  of the title. Prev/Next step through the same list, in the same order, as
  the gallery it was opened from.
- **Video and audio:** a black `Frame` whose X window id is given to a
  libVLC player, which starts playing immediately. Below it is a **▶ / ⏸**
  toggle. There's one shared `vlc.Instance` per process, and one
  `MediaPlayer` per item, released when you move to another item or leave.
- **Image:** scaled with PIL to fit the body, and redrawn on resize.
- **Text:** a read-only `Text` widget showing `caption`, or the `.txt` file
  as a fallback.
- If the file is missing, or python-vlc isn't installed, it shows a message
  instead of crashing.

### Add media (add_media.py)
- **Add photo / video:** a file picker. Accepts images
  (`.jpg .jpeg .png .gif .bmp .webp`) and videos
  (`.mp4 .mov .mkv .webm .avi`). It inserts the row first to get an id,
  copies the file to `data/media/<id><ext>`, then makes a 200px thumbnail
  with `save_thumbnail()`. For videos, `ffmpeg` first grabs the frame at 1s,
  if ffmpeg is installed.
- **Add text note:** a text prompt. The note is stored in the row's
  `caption` and also written to `data/media/<id>.txt`.
- New items go in the `Manual` collection, with `status='manual'`.

## Styling (style.py)

The UI follows the Save Point / loganyoung.foo brand.

| Token | Value | Use |
|---|---|---|
| `BG` | `#000000` | window background |
| `BG_PANEL` / `BG_TILE` | `#111111` / `#1a1a1a` | nav bar, tiles / placeholder tile |
| `FG` / `FG_DIM` | `#f5f5f5` / `#a1a1a1` | text / secondary text |
| `ACCENT` | `#b791c2` | lavender: active tab, divider rule |
| `ACCENT_DIM` | `#4a3a52` | pressed button |
| `GOLD` `GREEN` `BLUE` | `#eecc67` `#82c88a` `#699fd5` | placeholder glyphs (text / image / video) |
| `ERROR` | `#c96a5b` | "failed" label (not from the brand palette) |

Fonts: **Chakra Petch** Bold for navigation and titles, **Figtree** for body
text. Tk looks fonts up by family name, so the bundled files in
`assets/fonts/` must be installed on every machine:

```
mkdir -p ~/.local/share/fonts && cp assets/fonts/*.ttf ~/.local/share/fonts/ && fc-cache -f
```

If they're missing, Tk silently falls back to a default font.

`style.nav_button()` is the one button factory: flat, no border, and padded
by `TOUCH_PAD` (14px) so buttons are big enough to tap.

## Input

| Action | Touch | Mouse / keyboard |
|---|---|---|
| Scroll gallery | drag | drag, wheel, or the scrollbar |
| Open item | tap tile | click |
| Leave fullscreen | n/a | Esc |

There's no swipe gesture for Prev/Next; it's buttons only.
