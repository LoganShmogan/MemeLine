import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getEvent, type Meme, memesOfEvent, type TimelineEvent } from '@/db/timeline';
import { formatDate } from '@/lib/dates';

/** A world event and the memes linked to it. */
export default function EventScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<TimelineEvent | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);

  useEffect(() => {
    getEvent(db, id).then(setEvent);
    memesOfEvent(db, id).then(setMemes);
  }, [db, id]);

  if (!event) return <Stack.Screen options={{ title: '' }} />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: '' }} />
      <Text style={styles.meta}>
        {formatDate(event.date)}
        {event.category ? ` · ${event.category}` : ''}
      </Text>
      <Text style={styles.title}>{event.title}</Text>
      {event.summary ? <Text style={styles.summary}>{event.summary}</Text> : null}

      {memes.length > 0 && <Text style={styles.heading}>Memes</Text>}
      {memes.map((m) => (
        <Pressable
          key={m.id}
          style={({ pressed }) => [styles.meme, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: '/meme/[id]', params: { id: m.id } })}>
          <Text style={styles.meta}>
            {formatDate(m.date)}
            {m.style ? ` · ${m.style}` : ''}
          </Text>
          <Text style={styles.memeTitle}>{m.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.blue },
  meta: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSecondary },
  summary: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, color: Colors.text },
  heading: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.accent, marginTop: Spacing.three },
  meme: {
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    gap: 2,
  },
  memeTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
});
