# MemeLine

MemeLine, by Save Point Limited, is a community site and app for memes.
Users post memes, vote on them and discuss them, and a timeline shows when
each meme took off alongside the world events of the time. The website,
iOS app and Android app are one Expo codebase in [`app/`](app/README.md).
The plan is in [app/docs/plan.md](app/docs/plan.md) and the legal drafts
are in [legal/](legal/README.md).

## Legacy: the Raspberry Pi app

Everything below describes where MemeLine started, and the Python code in
the repo root. It's kept for reference and isn't part of the new product.

A touchscreen media browser for a Raspberry Pi 3B+ with the official Pi
Touch Display 2, in a 3D-printed case. It holds your saved TikTok videos
(Likes, Favorites, your own Posts, Reposts), imported from TikTok's
"Download your data" export, plus photos, videos and text notes you add
yourself. Everything plays offline from local files.

Python 3.12, Tkinter for the UI, libVLC for playback, yt-dlp for
downloading, SQLite for the library.

## Documentation

| Doc | What's in it |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Components, data flow, and why each technology was chosen |
| [docs/data-model.md](docs/data-model.md) | Database schema column by column, the status lifecycle, on-disk layout, in-memory data structures and the reasons for each |
| [docs/tiktok-pipeline.md](docs/tiktok-pipeline.md) | Importing the export, how the parser classifies it, downloading, failure types and what was done about them |
| [docs/ui.md](docs/ui.md) | Screens, navigation, styling tokens and fonts, input handling |
| [docs/raspberry-pi.md](docs/raspberry-pi.md) | Hardware, OS packages, display setup, booting into the app |
| [docs/known-issues.md](docs/known-issues.md) | Current limitations and bugs, ordered by impact |

## Quick start (dev machine)

```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
mkdir -p ~/.local/share/fonts && cp assets/fonts/*.ttf ~/.local/share/fonts/ && fc-cache -f

.venv/bin/python scripts/import_tiktok.py path/to/user_data_tiktok.json
.venv/bin/python scripts/download_pending.py
.venv/bin/python main.py
```

System packages needed: `python3-tk`, `vlc` (libVLC) and, optionally,
`ffmpeg`. Downloads need yt-dlp's `curl-cffi` extra, which
`requirements.txt` already includes.

## Repository layout

```
main.py                       entry point -> memeline.ui.app.main()
memeline/
  config.py                   paths, screen size, fullscreen flag, collection tabs
  db.py                       SQLite schema + every query
  thumbnails.py               save_thumbnail(): shrink an image to tile size
  importers/
    tiktok_export.py          export JSON -> row dicts (classifies Likes/Favorites/...)
    downloader.py             yt-dlp wrapper: pending rows -> files on disk
  ui/
    app.py                    main window, nav bar, screen switching
    gallery.py                scrollable thumbnail grid
    viewer.py                 VLC video / image / text viewer with prev/next
    add_media.py              add your own files or text notes
    style.py                  brand colours, fonts, button factory
scripts/
  import_tiktok.py            CLI for the importer
  download_pending.py         CLI for the downloader (--retry-failed, cookies)
  rebuild_thumbnails.py       one-off: shrink old full-size thumbnails
pi-setup/
  xinitrc                     minimal X session that runs the app
  memeline.service         systemd unit to boot into it
assets/fonts/                 Chakra Petch + Figtree (install with fc-cache)
docs/                         see the table above
*.stl                         enclosure parts (back, back v2, top, hinge)
data/                         git-ignored: memeline.db, media/, thumbnails/, covers/
```

## Status (2026-10-17)

- **Library:** 5,840 videos downloaded (4,941 Likes, 899 Favorites), about
  25 GB. 856 couldn't be downloaded and are hidden. Most are region-locked
  from NZ; the rest were removed or are expired own-Post links. Details in
  [docs/tiktok-pipeline.md](docs/tiktok-pipeline.md#what-failed-and-why-2026-10-runs).
- **App:** runs on the dev machine. Not yet tried on the Pi or touchscreen.
- **Gallery:** only draws what's on screen. "All" (5,840 items) opens in
  about 0.4 s on the dev machine.
- **Before deploying to the Pi**, read [docs/raspberry-pi.md](docs/raspberry-pi.md)
  and [docs/known-issues.md](docs/known-issues.md). The service setup and
  display rotation are untested.
