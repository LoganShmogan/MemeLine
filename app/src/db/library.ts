import type { SQLiteDatabase } from 'expo-sqlite';

export type MediaType = 'image' | 'video' | 'text' | 'link';

export type Media = {
  id: number;
  media_type: MediaType;
  title: string | null;
  body: string | null;
  source_url: string | null;
  file_name: string | null;
  thumb_name: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  favorite: 0 | 1;
  date_added: string;
};

export type NewMedia = Partial<Omit<Media, 'id' | 'favorite' | 'date_added'>> & {
  media_type: MediaType;
};

export type Folder = {
  id: number;
  name: string;
  count: number;
  // the most recently added image/video, shown as the folder's cover
  cover_type: MediaType | null;
  cover_file: string | null;
  cover_thumb: string | null;
};

/** Which items a grid shows. */
export type Scope =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'folder'; folderId: number }
  | { kind: 'meme'; memeId: string };

// ---- media ----

export async function listMedia(db: SQLiteDatabase, scope: Scope): Promise<Media[]> {
  switch (scope.kind) {
    case 'all':
      return db.getAllAsync<Media>('SELECT * FROM media ORDER BY date_added DESC, id DESC');
    case 'favorites':
      return db.getAllAsync<Media>(
        'SELECT * FROM media WHERE favorite = 1 ORDER BY date_added DESC, id DESC'
      );
    case 'folder':
      // newest-added-to-folder first, so a folder reads like its own feed
      return db.getAllAsync<Media>(
        `SELECT m.* FROM media m JOIN media_folders mf ON mf.media_id = m.id
         WHERE mf.folder_id = ? ORDER BY mf.date_added DESC, m.id DESC`,
        scope.folderId
      );
    case 'meme':
      return db.getAllAsync<Media>(
        `SELECT m.* FROM media m JOIN media_memes mm ON mm.media_id = m.id
         WHERE mm.meme_id = ? ORDER BY m.date_added DESC, m.id DESC`,
        scope.memeId
      );
  }
}

export function getMedia(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Media>('SELECT * FROM media WHERE id = ?', id);
}

export async function insertMedia(db: SQLiteDatabase, item: NewMedia): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO media (media_type, title, body, source_url, file_name, thumb_name,
                        width, height, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.media_type,
    item.title ?? null,
    item.body ?? null,
    item.source_url ?? null,
    item.file_name ?? null,
    item.thumb_name ?? null,
    item.width ?? null,
    item.height ?? null,
    item.duration_ms ?? null
  );
  return result.lastInsertRowId;
}

export async function setFavorite(db: SQLiteDatabase, id: number, favorite: boolean) {
  await db.runAsync('UPDATE media SET favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
}

/** Deletes the row only; the caller removes its files (see lib/storage). */
export async function deleteMedia(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM media WHERE id = ?', id);
}

// ---- folders ----

export function listFolders(db: SQLiteDatabase): Promise<Folder[]> {
  return db.getAllAsync<Folder>(
    `SELECT f.id, f.name,
            (SELECT COUNT(*) FROM media_folders WHERE folder_id = f.id) AS count,
            c.media_type AS cover_type, c.file_name AS cover_file, c.thumb_name AS cover_thumb
     FROM folders f
     LEFT JOIN media c ON c.id = (
       SELECT m.id FROM media_folders x JOIN media m ON m.id = x.media_id
       WHERE x.folder_id = f.id AND m.media_type IN ('image', 'video')
       ORDER BY x.date_added DESC LIMIT 1)
     ORDER BY f.name COLLATE NOCASE`
  );
}

export function getFolder(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<{ id: number; name: string }>(
    'SELECT id, name FROM folders WHERE id = ?',
    id
  );
}

/** Returns the new folder's id; throws if the name is taken (case-insensitive). */
export async function createFolder(db: SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO folders (name) VALUES (?)', name.trim());
  return result.lastInsertRowId;
}

export async function renameFolder(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE folders SET name = ? WHERE id = ?', name.trim(), id);
}

/** Removes the folder and its links; the items themselves stay in the library. */
export async function deleteFolder(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

/** Ids of the folders an item is in. */
export async function foldersOf(db: SQLiteDatabase, mediaId: number): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ folder_id: number }>(
    'SELECT folder_id FROM media_folders WHERE media_id = ?',
    mediaId
  );
  return new Set(rows.map((r) => r.folder_id));
}

export async function setInFolder(
  db: SQLiteDatabase,
  mediaId: number,
  folderId: number,
  inFolder: boolean
) {
  if (inFolder) {
    await db.runAsync(
      'INSERT OR IGNORE INTO media_folders (media_id, folder_id) VALUES (?, ?)',
      mediaId,
      folderId
    );
  } else {
    await db.runAsync(
      'DELETE FROM media_folders WHERE media_id = ? AND folder_id = ?',
      mediaId,
      folderId
    );
  }
}
