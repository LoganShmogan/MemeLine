# Architecture

MemeLine is a single-process Python desktop app plus two command-line
scripts that share one SQLite database and one media folder. There is no
server, no network service and no background worker: the scripts fill the
library, and the app only reads it (except for "+ Add", which writes manual
items).

## Components

```
                      TikTok "Download your data" JSON
                                    |
                                    v
  scripts/import_tiktok.py ---> importers/tiktok_export.py   (parse + classify)
                                    |
                                    v  rows with status = 'pending'
                         +----------------------+
                         |  data/memeline.db |  <-- db.py is the only
                         |  (SQLite, 1 table)   |      module that runs SQL
                         +----------------------+
                                    ^  status -> 'downloaded' / 'failed'
                                    |
  scripts/download_pending.py --> importers/downloader.py --> yt-dlp --> TikTok
                                    |
                                    v
     data/media/<id>.<ext>   data/thumbnails/<id>.jpg (200px)   data/covers/<id>.jpg
                                    ^
                                    |  reads files + rows
  main.py --> ui/app.py --+-- ui/gallery.py    thumbnail grid per collection
                          +-- ui/viewer.py     VLC video / image / text, prev/next
                          +-- ui/add_media.py  copy in a file or type a note
                          +-- ui/style.py      colours, fonts, button factory
```

| Module | Responsibility |
|---|---|
| `main.py` | Entry point; calls `ui.app.main()`. |
| `memeline/config.py` | Paths, screen size, fullscreen flag, the list of collection tabs. Creates `data/`, `data/media/`, `data/thumbnails/`, `data/covers/` on import. |
| `memeline/db.py` | Schema and every query. Other modules never write SQL. |
| `memeline/importers/tiktok_export.py` | Turns the export JSON into a list of row dicts. Pure function, no DB access. |
| `memeline/importers/downloader.py` | Runs yt-dlp per pending row, keeps the cover and makes a small thumbnail, records the outcome. |
| `memeline/thumbnails.py` | `save_thumbnail()`: shrink any image to `config.THUMB_SIZE` (200px). Used by the downloader, "+ Add" and `scripts/rebuild_thumbnails.py`. |
| `memeline/ui/*` | Tkinter screens. See [ui.md](ui.md). |
| `scripts/*.py` | Thin argparse wrappers so the importer/downloader can run headless (over SSH on the Pi). |
| `pi-setup/` | X session and systemd unit for booting straight into the app. See [raspberry-pi.md](raspberry-pi.md). |

## Lifecycle of a library item

1. **Import.** `tiktok_export.parse_file()` emits one dict per link found
   (`media_type='video'`, `status='pending'`, a collection, the URL and the
   date). `db.insert_media()` inserts it unless that `source_url` already
   exists, which makes re-importing the same or a newer export safe.
2. **Download.** `downloader.download_pending()` takes every `pending` row,
   asks yt-dlp to save it as `data/media/<id>.<ext>`, moves the full-size
   cover to `data/covers/<id>.jpg`, writes a 200px copy to
   `data/thumbnails/<id>.jpg`, and sets `status` to `downloaded` (plus
   `file_path`, `thumbnail_path`, `title`) or `failed` (error text in
   `caption`).
3. **Browse.** The gallery lists the non-failed rows of a collection and the
   viewer plays `file_path`.

Manual items skip steps 1 and 2: "+ Add" inserts a row with
`status='manual'`, copies the file to `data/media/<id>.<ext>`, and makes its
own thumbnail.

The status values and transitions are documented in
[data-model.md](data-model.md#status-lifecycle).

## Design decisions

### Tkinter for the UI
It ships with Python (`python3-tk` on Pi OS), it runs on a bare X server
with no desktop environment, and it's light enough for a Pi 3B+ with 1 GB of
RAM. Heavier options like Qt or Electron, or a browser in kiosk mode, need
far more memory and setup on Pi OS Lite. The trade-offs: Tkinter can't play
video, has no built-in touch gestures, and doesn't virtualise long lists.
Each of those is handled, or still open, as described below and in
[known-issues.md](known-issues.md).

### libVLC (python-vlc) for playback
Tkinter has no video widget. libVLC can render into any X window, so the
viewer creates an empty `tk.Frame` and gives its window id to VLC
(`player.set_xwindow(frame.winfo_id())`). VLC decodes everything TikTok
serves (H.264/HEVC mp4, m4a, mp3) and can use the Pi's hardware decoding.

### yt-dlp for downloads
The export only contains links, not files. yt-dlp already handles TikTok's
page format, signatures and CDN redirects, and it's updated when TikTok
changes them, so we don't maintain a scraper. It needs its `curl-cffi`
extra: without browser TLS impersonation TikTok answers every request with
"Unexpected response" (see [tiktok-pipeline.md](tiktok-pipeline.md)).

### SQLite, accessed through a single module
This is a single user on a single device, so there's no need for a server
database. SQLite is in the standard library and the whole library lives in
one file that can be copied or backed up. Every SQL statement lives in
`db.py`, so the schema can change in one place. Rows are returned as plain
`dict`s (via `sqlite3.Row`) rather than ORM objects: the UI only reads a
handful of columns and the project has no other dependency that would
justify an ORM.

### Files on disk, keyed by row id
Media is stored as `data/media/<id>.<ext>` and thumbnails as
`data/thumbnails/<id>.jpg`. The database holds the paths **relative to
`data/`** (`media/12.mp4`), and `db.py` turns them into absolute paths
when rows are read. That way the library can be copied to the Pi, or the
repo moved, without breaking anything. The row id
is unique and filesystem-safe, so there's no need to sanitise TikTok
captions or worry about name collisions. Keeping 25 GB of video out of the
database keeps the `.db` file small (about 3.5 MB) and lets VLC and PIL open
the files directly.

### A tolerant export parser instead of a fixed schema
TikTok has renamed, nested and localised the export's keys several times. So
the parser doesn't hard-code paths: it walks the whole JSON tree, treats any
list of objects that all carry a `link`/`url` as a list of saved items, and
classifies the list by the name of its section. Details in
[tiktok-pipeline.md](tiktok-pipeline.md#how-the-parser-works).

### Screens are rebuilt, not hidden
`App` keeps a single `content` frame. Switching screens destroys its
children and builds the new screen from fresh database rows. That keeps state
simple (no stale gallery after "+ Add", and VLC players are always released
through `<Destroy>`). This is cheap because the gallery only draws the
tiles on screen (next section). Returning from the viewer passes back the
last item viewed, so the rebuilt gallery scrolls to it.

### A virtualised gallery on a single canvas
Tkinter has no virtualised list. The first version built a `Frame` and two
`Label`s plus a decoded thumbnail for every item, which for 5,840 items was
about 17,000 widgets and roughly 18 s of JPEG decoding on a desktop each time
a tab opened. The gallery is now one `Canvas`:
- Its scroll region is sized for every row, so the scrollbar is accurate.
- Each tile is a few canvas items: a background, an image or glyph, a
  caption and an optional status label.
- Tiles are drawn only for the visible rows plus 2 rows either side, and
  deleted when they scroll out of range.
- Thumbnails are stored at tile size, so each decode is small.

Opening "All" takes about 0.4 s on the dev machine, and switching tabs about
0.2 s. The number of columns comes from the canvas width, so landscape and
portrait both work.

### Minimal X session instead of a desktop
Pi OS Lite has no desktop. Rather than install one, `startx` runs
`pi-setup/xinitrc`, which disables blanking, hides the cursor and `exec`s the
app as the only X client. There's no window manager, so the app sizes
itself with `geometry()` / `-fullscreen`.
