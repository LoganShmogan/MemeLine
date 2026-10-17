# Known issues and limitations

Found while reviewing the code and data on 2026-10-17. Ordered by how much
they matter for running on the Pi.

## Gallery builds every tile on every visit
`GalleryFrame.reload()` creates a frame and labels for **every** row in the
collection, and decodes every thumbnail with PIL, each time a tab is opened
(screens are rebuilt, not cached). "All" has 5,840 items: about 17,000 Tk
widgets and 5,840 JPEG decodes. The decoding alone measured about 18 s on a
16-core desktop, and a Pi 3B+ will be many times slower and may run short
of its 1 GB of RAM. The thumbnails are also full-size covers (for example
554x540, 577 MB in total) that are shrunk on every load.

**Likely fixes:** shrink thumbnails to tile size once, at download time;
load tiles lazily or in pages as the user scrolls; cache the gallery frame
instead of rebuilding it.

## Database stores absolute paths
`file_path` and `thumbnail_path` are saved as absolute paths such as
`/home/loganyoung/Documents/Projects/memeBrowser/data/media/1.mp4`. If you
copy `data/` to the Pi, or move the repo, every item shows "Not downloaded
yet". There's a SQL workaround in
[raspberry-pi.md](raspberry-pi.md#getting-the-library-onto-the-pi). A proper
fix would store paths relative to `config.DATA_DIR`, or derive them from the
id.

## Photo slideshows download as audio only
617 TikTok "photo mode" posts were saved by yt-dlp as `.mp3` (343) or `.m4a`
(274) with `media_type='video'`. The viewer plays them as audio over a
black frame; the photos themselves weren't downloaded.

## Posts and Reposts tabs are empty
All 33 Posts failed (expired signed links) and all 11 Reposts are
region-blocked or removed, and failed items are hidden. The tabs still show
in `config.COLLECTIONS`. Your own videos could be fetched from your public
profile URL with yt-dlp instead.

## Pi service setup is untested
See the ⚠ items in [raspberry-pi.md](raspberry-pi.md): the hard-coded `pi`
user and paths, Xorg's console-user restriction, display rotation under KMS,
and the 1280x720 vs 720x1280 resolution.

## Mouse wheel doesn't scroll on Linux
The gallery binds `<MouseWheel>`, which Tk 8.6 on X11 never sends (Linux
sends `<Button-4>` and `<Button-5>`). Drag-scrolling and the scrollbar work.
This only matters with a mouse attached.

## Smaller items
- **Manual items sort to the bottom of "All".** They have no `date_original`,
  and SQLite puts `NULL`s last in a `DESC` sort.
- **Text notes are stored twice**, in `caption` and in
  `data/media/<id>.txt`. The viewer reads `caption` first.
- **Leftover files** from interrupted downloads in `data/media/`:
  `1967.mp4.part`, `1967.image`, `2691.image`. They're harmless, and 3
  downloaded rows have no thumbnail.
- **`caption` holds error text for failed rows.** Fine while failed rows are
  hidden, but it's an overloaded column.
- **`PRAGMA foreign_keys = ON`** in `db.connect()` does nothing; there are no
  foreign keys.
- **Untested on hardware:** touch behaviour, VLC rendering into the Tk
  frame, and performance have only been checked on a dev machine.
