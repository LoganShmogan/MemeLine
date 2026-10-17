# Known issues and limitations

Found while reviewing the code and data on 2026-10-17, ordered by how much
they matter for running on the Pi. Three issues found that day have since
been fixed: the gallery building every tile on every visit, absolute paths
in the database, and the mouse wheel on Linux.

## Photo slideshows download as audio only
617 TikTok "photo mode" posts were saved by yt-dlp as `.mp3` (343) or `.m4a`
(274) with `media_type='video'`. The viewer plays them as audio over a
black frame; the photos themselves weren't downloaded.

## Posts and Reposts tabs are empty
All 33 Posts failed (expired signed links) and all 11 Reposts are
region-blocked or removed, and failed items are hidden. The tabs still show
in `config.COLLECTIONS`. Your own videos could be fetched from your public
profile URL with yt-dlp instead.

## Gallery speed on the Pi is unmeasured
On the dev machine, opening "All" takes about 0.4 s and drawing a screenful
after a long jump about 0.1 s; while scrolling, only one new row is drawn at
a time. A Pi 3B+ is several times slower, so expect a short pause when a new
row appears mid-drag. If that's noticeable, the next step is to cache the
fitted captions and decoded thumbnails per item.

## Pi service setup is untested
See the ⚠ items in [raspberry-pi.md](raspberry-pi.md): the hard-coded `pi`
user and paths, Xorg's console-user restriction, display rotation under KMS,
and the 1280x720 vs 720x1280 resolution.

## Smaller items
- **Manual items sort to the bottom of "All".** They have no `date_original`,
  and SQLite puts `NULL`s last in a `DESC` sort.
- **Text notes are stored twice**, in `caption` and in
  `data/media/<id>.txt`. The viewer reads `caption` first.
- **Leftover files** from interrupted downloads in `data/media/`:
  `1967.mp4.part`, `1967.image`, `2691.image`. They're harmless, and 3
  downloaded rows have no thumbnail.
- **Desktop window managers that tile windows** (such as Pop!_OS's
  auto-tiling) ignore the 1280x720 `geometry()` on the dev machine. The
  gallery adapts to whatever width it gets.
- **`caption` holds error text for failed rows.** Fine while failed rows are
  hidden, but it's an overloaded column.
- **`PRAGMA foreign_keys = ON`** in `db.connect()` does nothing; there are no
  foreign keys.
- **Untested on hardware:** touch behaviour, VLC rendering into the Tk
  frame, and performance have only been checked on a dev machine.
