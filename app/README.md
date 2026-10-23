# MemeBrowser (mobile)

The mobile-first MemeBrowser app: Expo + React Native, targeting the iOS
App Store and Google Play. It replaces the Python/Tkinter Pi app in the repo
root, which is now legacy.

## What it does so far

- **Library**: add photos/videos from the camera roll, links, or text notes.
- **Favourites**: star anything from the viewer.
- **Folders**: create, rename and delete folders. One item can be in any
  number of folders.

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
  (tabs)/           Library, Favourites, Folders
  media/[id].tsx    viewer: Prev/Next, ★, folder toggles, delete
  folder/[id].tsx   one folder's grid, rename, delete
  add.tsx           modal: photos & videos / link / note
src/db/schema.ts    SQLite migrations (PRAGMA user_version)
src/db/library.ts   every query
src/lib/storage.ts  copying picked files into app storage, thumbnails
src/components/     grid + shared branded UI
src/constants/theme.ts  brand colours and fonts (same as savepoint.cc)
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
