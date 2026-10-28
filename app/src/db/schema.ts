import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migrations, keyed by the PRAGMA user_version they bring the database to.
 * Append new ones; never edit one that has shipped.
 *
 * - media: one row per thing in the library. Files live in the app's
 *   document directory and only their *names* are stored, because iOS moves
 *   the app container on every update and absolute paths would break.
 * - folders + media_folders: user folders. Many-to-many, so one item can sit
 *   in any number of folders; deleting either side cascades the link away.
 * - favorite is a flag on media rather than a special folder: it's a single
 *   yes/no per item and the star toggles it in one UPDATE.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'text', 'link')),
    title TEXT,
    body TEXT,
    source_url TEXT,
    file_name TEXT,
    thumb_name TEXT,
    width INTEGER,
    height INTEGER,
    duration_ms INTEGER,
    favorite INTEGER NOT NULL DEFAULT 0,
    date_added TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_media_favorite ON media(favorite);

  CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    date_added TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE media_folders (
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    date_added TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (media_id, folder_id)
  );
  CREATE INDEX idx_media_folders_folder ON media_folders(folder_id);
  `,
  /*
   * The meme timeline. memes, events, meme_styles and meme_events are
   * reference data bundled with the app (src/data/timeline.json) and
   * re-synced by db/timeline.ts whenever the bundled version changes; only
   * media_memes is the user's own data.
   *
   * - ids are text slugs ('rickroll'), not autoincrement, so a data update
   *   can upsert by id and the user's media_memes links keep pointing at the
   *   same meme.
   * - dates are ISO prefixes: '2007', '2007-05' or '2007-05-15', as precise
   *   as the source allows. They sort correctly as text and the length gives
   *   the precision, so no separate precision column.
   * - a meme's date is when it took off as a meme, not when its source
   *   material was made (Doge is 2013, not the 2010 photo); `summary` says
   *   which.
   */
  `
  CREATE TABLE meme_styles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE memes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    style_id TEXT REFERENCES meme_styles(id),
    platform TEXT,
    summary TEXT
  );
  CREATE INDEX idx_memes_date ON memes(date);

  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    summary TEXT
  );
  CREATE INDEX idx_events_date ON events(date);

  CREATE TABLE meme_events (
    meme_id TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (meme_id, event_id)
  );
  CREATE INDEX idx_meme_events_event ON meme_events(event_id);

  CREATE TABLE media_memes (
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    meme_id TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    PRIMARY KEY (media_id, meme_id)
  );
  CREATE INDEX idx_media_memes_meme ON media_memes(meme_id);

  CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export async function migrate(db: SQLiteDatabase) {
  // foreign_keys is per connection; SQLiteProvider keeps one open for the app's life
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[v]);
      await tx.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
