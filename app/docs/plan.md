# MemeLine: website + apps plan

MemeLine is becoming a community site, a bit like Reddit. The website
comes first, with iOS and Android apps built from the same code. People
post memes publicly, vote on them and comment. Every post can link to a
meme on the timeline. Each user's library syncs to their account.

## Decisions (2026-10-28)

| Question | Decision |
|---|---|
| Web stack | One Expo Router codebase for web, iOS and Android |
| Backend | Firebase: Auth, Cloud Firestore, Cloud Storage, Cloud Functions |
| Sign-in | Apple and Google. Anyone can read without an account |
| Community | Public posts with up/down votes. Comment threads on posts, memes and events |
| Library | Private, synced to the user's account (replaces on-device SQLite) |

## Architecture

- **Client:** Expo Router with web output. Phones get the current tab bar;
  wide screens get a top nav and a centred content column. Use the
  **Firebase JS SDK** rather than React Native Firebase, because the JS
  SDK is the one that runs on the web as well as on phones.
- **Sign-in:** on the web, `signInWithPopup` with the Google and Apple
  providers. On phones, `expo-apple-authentication` and
  `@react-native-google-signin/google-signin` get an ID token, then
  `signInWithCredential`. To stay signed in, phones use
  `getReactNativePersistence(AsyncStorage)` and the web uses
  `browserLocalPersistence`.
- **Cloud Functions:** they do the work clients can't be trusted with:
  - adding up vote scores and comment counts;
  - calculating "hot" ranking;
  - deleting everything that belongs to an account when it's deleted;
  - turning user reports into the moderation queue.

### Firestore data

```
users/{uid}                     displayName, createdAt, role ('user' | 'mod' | 'admin')
users/{uid}/library/{itemId}    type, title, body, sourceUrl, storagePath, thumbPath,
                                width, height, durationMs, favorite,
                                folderIds[], memeIds[], createdAt
users/{uid}/folders/{folderId}  name, createdAt
users/{uid}/blocks/{blockedUid} createdAt

posts/{postId}                  authorId, authorName, type, caption, storagePath, thumbPath,
                                memeId?, score, commentCount, hotRank, createdAt, removed
posts/{postId}/votes/{uid}      value: 1 | -1          (doc id = voter, so one vote each)

comments/{commentId}            targetType ('post' | 'meme' | 'event'), targetId, parentId?,
                                authorId, authorName, body, score, createdAt, removed

memes/{slug}, events/{slug}, styles/{slug}   timeline data (seeded from src/data/timeline.json)
memes/{slug}/events/{eventSlug}              note

reports/{reportId}              targetType, targetId, reporterId, reason, createdAt, status
```

- Folder membership and meme tags are arrays on the library item. That
  replaces the SQLite join tables, because Firestore can query them with
  `array-contains`.
- Comments live in one collection keyed by target. A single query then
  loads a post's, a meme's or an event's thread, and a single moderation
  view can cover all of them.
- The timeline moves into Firestore so it can be corrected without an app
  release. A script seeds it from `timeline.json`.
- Cloud Storage holds files under `users/{uid}/library/…` (private) and
  `posts/{postId}/…` (public).

### Security rules (outline)

- A user can only read and write their own library, folders and blocks.
- Anyone can read posts, comments and the timeline. Only signed-in users
  can create them, and only the author can delete their own.
- Votes: only your own vote document, and only with a value of 1 or -1.
  Only Cloud Functions write `score`, `commentCount` and `hotRank`.
- Only admins can write to the timeline. Mods and admins can set
  `removed`.

## Phases

1. **Foundation:** Firebase project and config, sign-in on web and
   phones, `users` documents, responsive web layout, About page with the
   legal links, and an agreement to the Terms at first sign-in.
2. **Timeline online:** seed Firestore and read memes and events from it.
   Meme and event pages get their own web URLs.
3. **Library in the cloud:** replace SQLite with Firestore and Storage,
   and replace picking from the camera roll with uploading. Nothing needs
   migrating, because the app hasn't shipped.
4. **Community:** post a meme, a feed sorted by new, hot or top,
   voting, and threads on posts, memes and events.
5. **Safety:** report and block, a moderator queue, and account deletion,
   which the App Store requires.
6. **Launch:** host the website (Firebase Hosting or EAS Hosting), add
   search-engine metadata to meme and event pages, prepare the store
   listings, and publish the legal pages.

## Needed from Save Point before phase 1

- A Firebase project on the **Blaze (pay-as-you-go) plan**: Cloud
  Functions need it, and so do new Cloud Storage buckets. Set a budget
  alert. The web app config from the Firebase console goes in
  `app/.env` (as `EXPO_PUBLIC_FIREBASE_*`).
- Google sign-in turned on in the Firebase console. That gives the web
  client ID; add iOS and Android OAuth clients too.
- An Apple Developer account (Sign in with Apple capability, plus a
  Services ID for the website).
- A domain for the website.
