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
