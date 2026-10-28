import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaGrid } from '@/components/media-grid';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { eventsOfMeme, getMeme, type Meme, type TimelineEvent } from '@/db/timeline';
import { formatDate } from '@/lib/dates';

/** A meme's story, the world events around it, and the library items tagged with it. */
export default function MemeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meme, setMeme] = useState<Meme | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    getMeme(db, id).then(setMeme);
    eventsOfMeme(db, id).then(setEvents);
  }, [db, id]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '' }} />
      <MediaGrid
        scope={{ kind: 'meme', memeId: id }}
        empty={{
          title: 'Nothing tagged yet',
          hint: 'Open anything in your library and tap “Tag a meme” to link it here.',
        }}
        header={
          meme ? (
            <View style={styles.info}>
              <Text style={styles.meta}>
                {formatDate(meme.date)}
                {meme.style ? ` · ${meme.style}` : ''}
              </Text>
              <Text style={styles.title}>{meme.name}</Text>
              {meme.platform ? <Text style={styles.meta}>Spread on {meme.platform}</Text> : null}
              {meme.summary ? <Text style={styles.summary}>{meme.summary}</Text> : null}

              {events.length > 0 && (
                <>
                  <Text style={styles.heading}>Around the world</Text>
                  {events.map((e) => (
                    <Pressable
                      key={e.id}
                      style={({ pressed }) => [styles.event, pressed && { opacity: 0.7 }]}
                      onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}>
                      <Text style={styles.meta}>{formatDate(e.date)}</Text>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      {e.note ? <Text style={styles.note}>{e.note}</Text> : null}
                    </Pressable>
                  ))}
                </>
              )}

              <Text style={styles.heading}>In your library</Text>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  info: { padding: Spacing.three, gap: Spacing.two },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSecondary },
  summary: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, color: Colors.text },
  heading: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.accent, marginTop: Spacing.three },
  event: {
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blue,
    gap: 2,
  },
  eventTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.blue },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
});
