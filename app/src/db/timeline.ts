import type { SQLiteDatabase } from 'expo-sqlite';

import bundled from '@/data/timeline.json';

/** Shape of src/data/timeline.json. Bump `version` whenever its contents change. */
type TimelineData = {
  version: number;
  styles: { id: string; name: string; description?: string }[];
  events: { id: string; title: string; date: string; category?: string; summary?: string }[];
  memes: {
    id: string;
    name: string;
    date: string;
    style?: string;
    platform?: string;
    summary?: string;
    events?: { id: string; note?: string }[];
  }[];
};

const data: TimelineData = bundled;

export type Meme = {
  id: string;
  name: string;
  date: string;
  style_id: string | null;
  style: string | null;
  platform: string | null;
  summary: string | null;
};

export type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  category: string | null;
  summary: string | null;
  // set when listed for a meme: why the two are linked
  note?: string | null;
};

/** One row of the timeline: a meme or a world event, sorted together by date. */
export type TimelineEntry = {
  kind: 'meme' | 'event';
  id: string;
  title: string;
  date: string;
  // meme style name, or event category
  label: string | null;
  summary: string | null;
  // how many library items are tagged with this meme (always 0 for events)
  media_count: number;
};

// ---- syncing the bundled data ----

/**
 * Brings the reference tables in line with src/data/timeline.json when its
 * version differs from the one last synced. Rows are upserted by id rather
 * than wiped and reinserted, so the user's media_memes links survive; only
 * links to memes the new data drops are cascaded away.
 */
export async function syncTimeline(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'timeline_version'"
  );
  if (row?.value === String(data.version)) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const s of data.styles) {
      await tx.runAsync(
        `INSERT INTO meme_styles (id, name, description) VALUES (?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, description = excluded.description`,
        s.id,
        s.name,
        s.description ?? null
      );
    }
    for (const e of data.events) {
      await tx.runAsync(
        `INSERT INTO events (id, title, date, category, summary) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = excluded.title, date = excluded.date,
           category = excluded.category, summary = excluded.summary`,
        e.id,
        e.title,
        e.date,
        e.category ?? null,
        e.summary ?? null
      );
    }
    for (const m of data.memes) {
      await tx.runAsync(
        `INSERT INTO memes (id, name, date, style_id, platform, summary) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, date = excluded.date,
           style_id = excluded.style_id, platform = excluded.platform, summary = excluded.summary`,
        m.id,
        m.name,
        m.date,
        m.style ?? null,
        m.platform ?? null,
        m.summary ?? null
      );
    }

    // drop whatever the new data no longer has; memes go before styles so
    // no meme is left pointing at a deleted style
    const ids = (rows: { id: string }[]) => JSON.stringify(rows.map((r) => r.id));
    await tx.runAsync('DELETE FROM memes WHERE id NOT IN (SELECT value FROM json_each(?))', ids(data.memes));
    await tx.runAsync('DELETE FROM events WHERE id NOT IN (SELECT value FROM json_each(?))', ids(data.events));
    await tx.runAsync('DELETE FROM meme_styles WHERE id NOT IN (SELECT value FROM json_each(?))', ids(data.styles));

    // meme_events holds no user data, so it's simply rebuilt
    await tx.runAsync('DELETE FROM meme_events');
    for (const m of data.memes) {
      for (const link of m.events ?? []) {
        await tx.runAsync(
          'INSERT INTO meme_events (meme_id, event_id, note) VALUES (?, ?, ?)',
          m.id,
          link.id,
          link.note ?? null
        );
      }
    }

    await tx.runAsync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('timeline_version', ?)",
      String(data.version)
    );
  });
}

// ---- timeline ----

/** Every meme and event, oldest first; on the same date the event comes first. */
export function listTimeline(db: SQLiteDatabase): Promise<TimelineEntry[]> {
  return db.getAllAsync<TimelineEntry>(
    `SELECT 'meme' AS kind, m.id, m.name AS title, m.date, s.name AS label, m.summary,
            (SELECT COUNT(*) FROM media_memes WHERE meme_id = m.id) AS media_count
     FROM memes m LEFT JOIN meme_styles s ON s.id = m.style_id
     UNION ALL
     SELECT 'event', id, title, date, category, summary, 0 FROM events
     ORDER BY date, kind`
  );
}

export function getMeme(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Meme>(
    `SELECT m.*, s.name AS style FROM memes m LEFT JOIN meme_styles s ON s.id = m.style_id
     WHERE m.id = ?`,
    id
  );
}

export function getEvent(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<TimelineEvent>('SELECT * FROM events WHERE id = ?', id);
}

export function eventsOfMeme(db: SQLiteDatabase, memeId: string): Promise<TimelineEvent[]> {
  return db.getAllAsync<TimelineEvent>(
    `SELECT e.*, me.note FROM events e JOIN meme_events me ON me.event_id = e.id
     WHERE me.meme_id = ? ORDER BY e.date`,
    memeId
  );
}

export function memesOfEvent(db: SQLiteDatabase, eventId: string): Promise<Meme[]> {
  return db.getAllAsync<Meme>(
    `SELECT m.*, s.name AS style FROM memes m
     JOIN meme_events me ON me.meme_id = m.id
     LEFT JOIN meme_styles s ON s.id = m.style_id
     WHERE me.event_id = ? ORDER BY m.date`,
    eventId
  );
}

// ---- tagging library items with memes ----

/** Every meme, A-Z, for picking one to tag an item with. */
export function listMemes(db: SQLiteDatabase): Promise<Meme[]> {
  return db.getAllAsync<Meme>(
    `SELECT m.*, s.name AS style FROM memes m LEFT JOIN meme_styles s ON s.id = m.style_id
     ORDER BY m.name COLLATE NOCASE`
  );
}

/** The memes an item is tagged with, oldest first. */
export function memesOfMedia(db: SQLiteDatabase, mediaId: number): Promise<Meme[]> {
  return db.getAllAsync<Meme>(
    `SELECT m.*, s.name AS style FROM memes m
     JOIN media_memes mm ON mm.meme_id = m.id
     LEFT JOIN meme_styles s ON s.id = m.style_id
     WHERE mm.media_id = ? ORDER BY m.date`,
    mediaId
  );
}

export async function setMemeTag(
  db: SQLiteDatabase,
  mediaId: number,
  memeId: string,
  tagged: boolean
) {
  if (tagged) {
    await db.runAsync(
      'INSERT OR IGNORE INTO media_memes (media_id, meme_id) VALUES (?, ?)',
      mediaId,
      memeId
    );
  } else {
    await db.runAsync(
      'DELETE FROM media_memes WHERE media_id = ? AND meme_id = ?',
      mediaId,
      memeId
    );
  }
}
