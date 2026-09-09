# MemeBrowser

A touchscreen media browser for the Raspberry Pi 3B+ + Pi Touch Display 2.
Starts with your saved TikTok videos (Likes / Favorites / your own Posts) and
also lets you drop in your own photos, videos, and text notes.

## Layout

```
memebrowser/
  config.py            paths + screen size
  db.py                sqlite library (one row per media item)
  importers/
    tiktok_export.py   parses the TikTok "download your data" json
    downloader.py       yt-dlp wrapper that fetches the actual video files
  ui/
    app.py              main window, nav bar, screen switching
    gallery.py           scrollable thumbnail grid
    viewer.py            video (VLC) / image / text viewer with prev/next
    add_media.py         import your own files or a text note
scripts/
  import_tiktok.py      python scripts/import_tiktok.py export.json
  download_pending.py   python scripts/download_pending.py
pi-setup/
  xinitrc                minimal X session that launches the app fullscreen
  memebrowser.service     systemd unit -> boots straight into it
```

## Once your TikTok export lands

1. `python scripts/import_tiktok.py path/to/export.json`
   Walks the export tree, classifies each list of links as Likes /
   Favorites / Posts (unrecognized lists like watch history are skipped by
   default -- pass `--include-all` to keep everything), and adds them to the
   library as `pending`.

2. `python scripts/download_pending.py`
   Fetches the actual video file for each pending row via yt-dlp.

   **Important:** TikTok's Likes/Favorites lists are private on most
   accounts, so yt-dlp needs your logged-in session to fetch those specific
   videos -- your own Posts are usually public and don't need this. If you
   see 403/private errors:
   - Install the "Get cookies.txt" extension in your browser, log into
     tiktok.com, export a `cookies.txt`, then run:
     `python scripts/download_pending.py --cookies-file cookies.txt`
   - Or, if running on a machine with a logged-in browser installed:
     `python scripts/download_pending.py --cookies-from-browser chrome`

   Re-running the script only retries rows still marked `pending`/`failed`,
   so it's safe to run again after fixing cookies.

3. `python main.py` to view the library.

## Styling

The UI matches the Save Point / loganyoung.foo brand: black background,
lavender accent (`#b791c2`), Chakra Petch for headings/buttons, Figtree for
body text, and a shared pastel palette (gold/green/blue) for tags and
placeholder icons. All of it lives in `memebrowser/ui/style.py`. The two font
files are bundled in `assets/fonts/` -- install them locally so Tkinter can
find them by family name:

```
mkdir -p ~/.local/share/fonts
cp assets/fonts/*.ttf ~/.local/share/fonts/
fc-cache -f
```

## Dev machine setup (this repo already has a venv)

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Raspberry Pi OS Lite setup

```
sudo apt update
sudo apt install -y python3-venv python3-tk vlc ffmpeg \
                     xserver-xorg xinit x11-xserver-utils unclutter fontconfig

git clone <this repo> /home/pi/memeBrowser
cd /home/pi/memeBrowser
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

mkdir -p ~/.local/share/fonts
cp assets/fonts/*.ttf ~/.local/share/fonts/
fc-cache -f
```

Copy your TikTok export onto the Pi (or straight into the repo directory)
and run the two import/download scripts above using `.venv/bin/python`.

**Boot straight into the app:**

```
sudo cp pi-setup/memebrowser.service /etc/systemd/system/
sudo systemctl enable memebrowser.service
```

Before enabling the service, flip `FULLSCREEN = True` in `memebrowser/config.py`
and confirm `SCREEN_WIDTH`/`SCREEN_HEIGHT` match how you've mounted the panel
(the official Touch Display 2 is 720x1280 native/portrait -- rotate via
`display_rotate`/`lcd_rotate` in `/boot/firmware/config.txt` if you're
mounting it landscape, and match that rotated resolution here).

## Adding your own media later

The "+ Add" button in the app copies a photo/video into the library (with an
auto-generated thumbnail), or lets you type a text note. Everything lands in
the "Manual" collection alongside the TikTok tabs.

## Status so far

- Parser + downloader + db tested against synthetic export data (dedup and
  collection classification both verified).
- App launches cleanly and the widget tree builds without errors on this dev
  machine (X11 via XWayland).
- **Not yet verified**: actual rendering/touch behavior, and video playback
  through python-vlc -- this sandbox can't screenshot a Wayland session or
  drive real touch input, so the first real check needs to happen either
  with a real TikTok export + real video files, or on the Pi + touchscreen
  itself.
