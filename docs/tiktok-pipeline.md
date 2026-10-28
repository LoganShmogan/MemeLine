# TikTok import and download

Getting TikTok content into the library takes two steps, run as separate
scripts so each can be re-run on its own:

```
python scripts/import_tiktok.py path/to/user_data_tiktok.json [--include-all]
python scripts/download_pending.py [--limit N] [--retry-failed]
                                   [--cookies-from-browser firefox | --cookies-file cookies.txt]
```

Use `.venv/bin/python` if the venv isn't activated.

## 1. Requesting the export

In the TikTok app: *Settings → Account → Download your data*, choose
**JSON**, and request it. It can take days to arrive. The last export came
through on 2026-10-09.

## 2. Import: `import_tiktok.py`

Parses the JSON and inserts one `pending` row per saved video. It never
touches the network. Re-running it is safe: links already in the library are
counted as duplicates and skipped.

Output:
- **inserted**: new rows.
- **duplicates**: links already in the library.
- **skipped**: links in lists that aren't saved videos (sounds, watch
  history, ...). Pass `--include-all` to import those too; they go to
  `Manual`.

### How the parser works

`memeline/importers/tiktok_export.py` doesn't assume a schema. It:

1. Walks the whole JSON tree recursively, building a dotted path for every
   node (`Likes and Favorites.Like List.ItemFavoriteList`).
2. Treats any list whose objects **all** have a `link` or `url` key (in any
   letter case) as a list of saved items.
3. Classifies that list:
   - If the whole path contains any of `SKIP_SUBSTRINGS` (`browsing`,
     `watch history`, `search`, `hashtag`, `share`, `comment`, `live`),
     it's skipped.
   - Otherwise it takes the **section name**, the second-to-last path
     segment (`Like List` in the example above), and checks `SECTION_RULES`
     in order. The first substring match wins:

     | Substring | Collection |
     |---|---|
     | `sound` | skipped (Favorite Sounds are music pages) |
     | `effect` | skipped |
     | `deleted` | skipped (Recently Deleted Posts) |
     | `repost` | Reposts (must come before `post`) |
     | `like` | Likes |
     | `favorite` | Favorites |
     | `post` | Posts |

   - As a fallback for older exports, a path starting with `video.` counts as
     Posts.
4. Emits `{media_type: "video", collection, source_url, date_original, status: "pending"}`
   for each item.

**Why match the section and not the whole path?** The 2026 export puts both
lists under one top-level key, `Likes and Favorites`. Matching the whole
path filed every Favorite as a Like, because `like` matched first.

### Structure of the 2026 export (relevant parts)

```
Likes and Favorites
  Like List.ItemFavoriteList[]        {date, link}   -> Likes
  Favorite Videos.FavoriteVideoList[] {date, link}   -> Favorites
  Favorite Sounds / Effects / ...                    -> skipped
Post
  Posts.VideoList[]                   {date, link, ...} -> Posts (signed CDN links)
  Recently Deleted Posts ...                         -> skipped
Your Activity
  Reposts ...                                        -> Reposts
  Watch History (~162k rows)                         -> skipped
```

If a future export puts something in the wrong tab or misses a section, add
or reorder entries in `SECTION_RULES`. That's the only place that needs to
change.

## 3. Download: `download_pending.py`

`memeline/importers/downloader.py` loops over every `pending` row and
runs yt-dlp in-process with:
- `outtmpl = data/media/<id>.%(ext)s`
- `format = "mp4/best"`
- `writethumbnail = True`

After each item:
- **Success:** the media file is `data/media/<id>.<ext>` (`mp4`, or
  `mp3`/`m4a` for photo slideshows). The cover yt-dlp wrote is moved to
  `data/covers/<id>.jpg` and a 200px copy saved as
  `data/thumbnails/<id>.jpg`, and the row gets `file_path`,
  `thumbnail_path`, `title` (TikTok's description) and `status='downloaded'`.
- **Any exception:** `status='failed'` and the first 500 characters of the
  error in `caption`.

It runs one item at a time. On the full library that took several hours
and about 25 GB.

### Requirements
`yt-dlp[default,curl-cffi]>=2026.08.19` (pinned in `requirements.txt`).
**curl-cffi isn't optional**: it makes requests look like a real browser at
the TLS level, and without it TikTok rejects everything with "Unexpected
response". Public Likes and Favorites download fine **without** cookies.

### Options
| Flag | Effect |
|---|---|
| `--limit N` | Only process the first N pending rows. Useful for a quick test. |
| `--retry-failed` | First put retryable `failed` rows back to `pending` (see [data-model.md](data-model.md#status-lifecycle)). |
| `--cookies-from-browser firefox` | Use the logged-in session from a local browser. Only helps age-restricted videos (see below). |
| `--cookies-file cookies.txt` | Same, from a Netscape-format cookies file. |

Re-running without `--retry-failed` only processes rows that are still
`pending`.

## What failed, and why (2026-10 runs)

The first run downloaded 5,815 and failed 858. Grouped by yt-dlp's error:

| Error | Count | Meaning | Outcome |
|---|---|---|---|
| `Your IP address is blocked from accessing this post` | 586 | Region-locked: not viewable from NZ. | Skipped. A VPN in another region is the only known fix. |
| `This post may not be comfortable for some audiences. Log in` | 153 | Age-restricted. | Retried with Firefox cookies: 4 recovered; the rest returned 403 (likely region-locked as well). |
| `Video not available, status code 10231` / `10240` | 46 | Removed by the creator or TikTok. | Permanent; never retried. |
| `HTTP Error 401/403` on `video-*.tiktokv.com` / `tiktokcdn.com` | 33 | Your own Posts: the export gives signed CDN links that had already expired. | Permanent for these links. Downloading from your public profile URL with yt-dlp is the alternative (not built). |
| `You do not have permission to view this post` | 26 | Private. | Not recovered. |
| `No video formats found`, `530 Too Many Requests`, partial reads | 14 | Transient or extractor issues. | Not recovered on retry. |

**Logged-in requests and region locks:** when the retry ran with
`--cookies-from-browser firefox`, region-blocked videos came back as a plain
`HTTP Error 403: Forbidden` instead of "IP address blocked". This was checked
by fetching the same video without cookies, which still said "IP address
blocked", and a freshly logged-in session with `--impersonate firefox` still
got 403. So a 403 with cookies doesn't mean the cookies are broken.

**Decision (2026-10-17):** skip the rest. The 303 rows the retry never
reached were marked `failed` with the caption
`Skipped: region-blocked in NZ (2026-10-17 retry)`. The final state is 5,840
downloaded and 856 failed. Failed rows are kept, so running
`--retry-failed` over a VPN later would pick them up.

## Importing a newer export later

1. `import_tiktok.py new_export.json`: only links not already in the library
   are added.
2. `download_pending.py`: downloads just those.

Nothing already downloaded is touched. Videos removed from your Likes since
the last export stay in the library; there's no "sync deletions" step.
