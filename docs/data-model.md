# Data model

Everything MemeBrowser knows lives in two places under `data/` (git-ignored):

```
data/
  memebrowser.db         SQLite database: one row per library item
  media/<id>.<ext>       the media file itself (mp4, m4a, mp3, jpg, txt, ...)
  thumbnails/<id>.jpg    cover shrunk to fit 200x200 (config.THUMB_SIZE): what the gallery loads
  covers/<id>.jpg        TikTok's full-size cover art, kept but not used by the UI yet
```

`<id>` is the row's `media.id`. `config.py` creates these directories the
first time any module imports it. Covers aren't recorded in the database;
the path is always derived from the id.

## The `media` table

Defined in `memebrowser/db.py` (`SCHEMA`), created by `db.init_db()`, which
every entry point calls on startup.

| Column | Type | Null? | Meaning |
|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | no | Row id; also the base filename in `media/` and `thumbnails/`. `AUTOINCREMENT` means ids are never reused after a delete, so a new item can't inherit a deleted item's leftover file. |
| `media_type` | TEXT, CHECK `video`/`image`/`text` | no | Decides how the viewer renders it. Everything from TikTok is `video`, including the audio-only slideshow downloads (see [known-issues.md](known-issues.md#photo-slideshows-download-as-audio-only)). |
| `collection` | TEXT, default `Manual` | no | Which tab it appears under: `Likes`, `Favorites`, `Posts`, `Reposts` or `Manual`. Exactly one per item (see "One collection per item" below). |
| `title` | TEXT | yes | TikTok's description (from yt-dlp) for downloads, the filename stem for added files, or the first 40 characters of a text note. Shown on tiles and in the viewer header. |
| `caption` | TEXT | yes | Double duty: the full text of a text note, **or** the error message (up to 500 characters) for a `failed` download. `requeue_failed()` clears it. |
| `source_url` | TEXT UNIQUE | yes | The link from the TikTok export. This is the deduplication key. `NULL` for manual items; SQLite allows any number of `NULL`s in a `UNIQUE` column. |
| `file_path` | TEXT | yes | Path to the media file, **relative to `data/`** (`media/12.mp4`). See "Paths" below. |
| `thumbnail_path` | TEXT | yes | Path to the small thumbnail JPEG, relative to `data/`. `NULL` if none could be made; the gallery then shows a coloured glyph. |
| `date_original` | TEXT | yes | When you liked/favourited/posted it, copied verbatim from the export (`YYYY-MM-DD HH:MM:SS`). The gallery sorts on this column, newest first. |
| `date_added` | TEXT, default `datetime('now')` | no | When the row was inserted (UTC). |
| `status` | TEXT, CHECK, default `pending` | no | Where the item is in its lifecycle; see below. |

Indexes: `idx_media_collection` (the gallery filters by collection) and
`idx_media_status` (the downloader and retry logic filter by status).

### Why one table
Every item has the same shape: a file, a cover, a caption, a date and where
it came from. A single table keeps every query a one-line `SELECT`. The
alternatives were a separate table per source or a tags table with a join.
The first only pays off once there's metadata specific to one source, and
the second once an item needs more than one collection. Neither is needed yet.

### Paths
`file_path` and `thumbnail_path` are stored relative to `config.DATA_DIR`
and converted at the edge of `db.py`:
- **Writing:** `insert_media()` and `update_media()` pass the path columns
  through `_to_stored()`, which strips the `data/` prefix. Callers can pass
  absolute paths.
- **Reading:** every row returned (`_row()`) has the path columns made
  absolute with `_to_absolute()`, so UI code can open them directly.
- **Migration:** rows written before 2026-10-17 held absolute paths.
  `init_db()` calls `_migrate_absolute_paths()`, which rewrites any path
  starting with `/` to its last two parts (`media/12.mp4`). The query is
  idempotent and cheap, so it runs on every start.

Why relative: the dev machine stores the repo at
`/home/loganyoung/Documents/Projects/memeBrowser`, but the Pi won't. With
absolute paths, copying `data/` across left every item showing "Not
downloaded yet".

### Why dates are TEXT
SQLite has no date type. ISO-style `YYYY-MM-DD HH:MM:SS` strings sort the
same alphabetically as chronologically, so `ORDER BY date_original DESC`
works without parsing anything. The export already uses this format, so it's
stored exactly as given.

### Why `status` and `media_type` are constrained strings
These are readable in the `sqlite3` shell and in tracebacks, and the `CHECK`
constraints reject typos. An integer enum would need a lookup table or
constants in Python to read.

### One collection per item
Because `source_url` is `UNIQUE`, a video that's both liked and favourited
is only inserted once, and the first list the parser reaches wins. In the
2026 export that left those overlaps in **Favorites**. Deduplication is by
exact URL string: the same video under two different URL forms (for example
`tiktokv.com/share/video/<n>` and `tiktok.com/@user/video/<n>`) would be
stored twice. The current export uses one form consistently.

## Status lifecycle

```
                  import_tiktok.py                       "+ Add"
                         |                                  |
                         v                                  v
                    +---------+                        +--------+
       +----------> | pending |                        | manual |
       |            +---------+                        +--------+
       |                 | download_pending.py
       |       +---------+---------+
       |       v                   v
       |  +------------+       +--------+
       |  | downloaded |       | failed |  error text in caption,
       |  +------------+       +--------+  hidden from the gallery
       |                           |
       +---------------------------+
        download_pending.py --retry-failed
        (not Posts, not "status code 10231/10240")
```

| Status | Set by | Shown in gallery? | Picked up by the downloader? |
|---|---|---|---|
| `pending` | importer; `requeue_failed()` | yes, with a grey "pending" label | yes |
| `downloaded` | downloader on success | yes | no |
| `failed` | downloader on any exception; manually for skipped items | **no** | only after `--retry-failed` |
| `manual` | "+ Add" | yes | no |

`requeue_failed()` treats some failures as permanent and leaves them alone:
- **Captions containing `status code 10231` or `10240`.** TikTok's codes
  for a removed or unavailable video.
- **The whole `Posts` collection.** The export only gives signed CDN links
  for your own uploads, and those expire before they can be downloaded.

The patterns live in `db.PERMANENT_FAILURES`.

## In-memory structures

| Where | Structure | Why |
|---|---|---|
| `db.get_by_collection()` / `get_pending()` | `list[dict]` (rows converted from `sqlite3.Row` by `_row()`, paths made absolute) | Plain dicts can be passed anywhere and support `.get()` with defaults, which the UI relies on for nullable columns. They also don't hold a connection open. |
| `db.connect()` | context manager yielding a connection | Each call opens, commits and closes its own connection. That's simple and safe for one process, and avoids a long-lived connection shared between the Tk loop and scripts. The cost is opening a connection per query, which is negligible for SQLite. |
| `tiktok_export.SECTION_RULES` | ordered `list` of `(substring, label)` tuples | **Order matters**: first match wins, so `repost` must be checked before `post`, and the "skip" rules (`sound`, `effect`, `deleted`) before everything else. A dict wouldn't make the order obvious. A label of `None` means "this list isn't videos, skip it". |
| `tiktok_export.SKIP_SUBSTRINGS` | `tuple` of substrings | Whole-path deny list for huge or irrelevant lists (watch history alone is about 162k rows). |
| `tiktok_export.LINK_KEYS` / `DATE_KEYS` | `tuple` of lowercase key names | Looked up case-insensitively by `_find_ci()`, because TikTok has used both `Link` and `link`. |
| `tiktok_export._walk()` output | `list[dict]` ready for `insert_media()`, plus a `{"count": n}` dict | The skipped count is a one-element dict so it can be shared and changed across recursive calls without a global variable. |
| `downloader.THUMB_EXTS` | `tuple` of extensions | The order in which to look for the cover yt-dlp wrote. Includes `.image`, the extension TikTok's JPEG covers come down with. The same tuple tells `_find_downloaded_file()` which files *aren't* the media file. |
| `GalleryFrame.items` | the collection's rows, `list[dict]` | Fetched once per gallery. Tile *n* is `items[n]` at row `n // cols`, column `n % cols`, so a tap position or scroll offset converts to an item index with plain arithmetic and no lookup structure. |
| `GalleryFrame._drawn` | `dict[int, PhotoImage or None]`: item index → its thumbnail | The set of tiles currently on the canvas. Each tile's canvas items share the tag `tile<n>`, so deleting a tile is one `canvas.delete(tag)`. The dict also keeps each `PhotoImage` alive: Tk doesn't hold a Python reference to images, so without it they'd be garbage-collected and the tile would go blank. Removing an entry when the tile scrolls away frees the image. |
| `GalleryFrame._press` | `(x, y, moved)` tuple or `None` | Tells a tap from a drag: a press that moves more than `TAP_SLOP` (10px) scrolls; otherwise the release opens the tile under it. |
| `ViewerFrame.items` + `index` | the collection's row list and a position in it | Prev/Next just move the index, with no extra query. The list is fetched once when the viewer opens, in the same order as the gallery. |
| `ViewerFrame._player` | the current `vlc.MediaPlayer` or `None` | Exactly one player at a time; released on Prev/Next/Back and on `<Destroy>`, so audio never keeps playing after leaving the viewer. |
| `gallery.PLACEHOLDER_GLYPH` / `PLACEHOLDER_GLYPH_COLOR` | `dict` keyed by `media_type` | Fallback tile art when there's no thumbnail. |

## Inspecting the library

```
sqlite3 data/memebrowser.db
sqlite> SELECT collection, status, COUNT(*) FROM media GROUP BY 1, 2;
sqlite> SELECT id, substr(caption, 1, 100) FROM media WHERE status = 'failed' LIMIT 20;
```

The library as of 2026-10-17: 5,840 `downloaded` (4,941 Likes, 899
Favorites) and 856 `failed`. Media takes 25 GB, covers 577 MB and
thumbnails 48 MB.
