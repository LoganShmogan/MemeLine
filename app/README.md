# MemeLine

MemeLine, by Save Point Limited: Expo + React Native, targeting the iOS
App Store and Google Play. It replaces the Python/Tkinter Pi app in the repo
root, which is now legacy.

## What it does so far

- **Library**: add photos/videos from the camera roll, links, or text notes.
- **Favourites**: star anything from the viewer.
- **Folders**: create, rename and delete folders. One item can be in any
  number of folders.
- **Timeline**: memes and world events by year. Tag library items with the
  memes they are, and see them on each meme's page.

## Run it

```bash
npm install
npx expo start          # then scan the QR code with a development build
npx expo run:android    # local Android build (needs Android Studio / an emulator)
npx eas-cli@latest build --profile development --platform ios   # iOS, built in the cloud, no Mac needed
```

The app uses native modules (expo-sqlite, expo-video, expo-video-thumbnails),
so it needs a development build rather than Expo Go.

Before committing, run `npx tsc --noEmit` and `npx expo lint`.

## Layout

```
src/app/            screens (Expo Router: every file is a route)
  (tabs)/           Library, Timeline, Favourites, Folders
  media/[id].tsx    viewer: Prev/Next, ★, folder toggles, meme tags, delete
  meme/[id].tsx     a meme, its linked events, library items tagged with it
  event/[id].tsx    a world event and its linked memes
  tag-meme.tsx      modal: search memes and tag the open item
  folder/[id].tsx   one folder's grid, rename, delete
  add.tsx           modal: photos & videos / link / note
  about.tsx         version, credit, links to the legal pages
src/db/schema.ts    SQLite migrations (PRAGMA user_version)
src/db/library.ts   library and folder queries
src/db/timeline.ts  syncing the bundled meme/event data, timeline queries
src/data/timeline.json  the curated memes, world events and styles
src/lib/storage.ts  copying picked files into app storage, thumbnails
src/components/     grid + shared branded UI
src/constants/theme.ts  brand colours and fonts (same as savepoint.cc)
src/constants/legal.ts  public URLs of the legal pages (source text in ../legal/)
```

## Data model

- `media`: one row per item (`image`, `video`, `text` or `link`), with a
  `favorite` flag. Files are copied into the app's document directory, and
  only the **file name** is stored. iOS moves the app container on every
  update, so absolute paths would break.
- `folders` + `media_folders`: a many-to-many join. Deleting a folder or an
  item cascades its links away.
- Schema changes go in a new entry at the end of `MIGRATIONS` in
  `src/db/schema.ts`. Never edit one that has shipped.

## Meme timeline data

The timeline puts memes next to world events.
Its data is curated by hand in `src/data/timeline.json` and ships with the
app:

- `styles`: meme formats (image macro, challenge, template...).
- `events`: world, internet and culture events.
- `memes`: each with a `style`, and optional `events` it's linked to, with a
  `note` saying why.

On launch, `syncTimeline` copies it into the `memes`, `events`,
`meme_styles` and `meme_events` tables if the file's `version` has changed.
**Bump `version` on every edit** or installed apps won't pick it up.

- Ids are text slugs and never change once shipped: rows are upserted by id,
  so the user's tags (`media_memes`) survive data updates. Removing a meme
  also removes the user's tags on it.
- Dates are ISO prefixes (`2007`, `2007-05`, `2007-05-15`), as precise as the
  source allows. A year-only date sorts at the start of its year.
- A meme's date is when it took off as a meme, not when its source was made;
  the `summary` mentions the original date where they differ.
- The current 34 memes and 21 events are a starter set. Check them before
  release.

