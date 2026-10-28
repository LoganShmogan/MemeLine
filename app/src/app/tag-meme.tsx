import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Input } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { listMemes, type Meme, memesOfMedia, setMemeTag } from '@/db/timeline';
import { formatDate } from '@/lib/dates';

/** Modal: search the meme list and toggle which ones an item is tagged with. */
export default function TagMemeScreen() {
  const db = useSQLiteContext();
  const mediaId = Number(useLocalSearchParams<{ mediaId: string }>().mediaId);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    listMemes(db).then(setMemes);
    memesOfMedia(db, mediaId).then((rows) => setTagged(new Set(rows.map((m) => m.id))));
  }, [db, mediaId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? memes.filter((m) => m.name.toLowerCase().includes(q)) : memes;
  }, [memes, query]);

  async function toggle(memeId: string) {
    const on = !tagged.has(memeId);
    await setMemeTag(db, mediaId, memeId, on);
    const next = new Set(tagged);
    if (on) next.add(memeId);
    else next.delete(memeId);
    setTagged(next);
  }

  return (
    <FlatList
      data={shown}
      keyExtractor={(m) => m.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
      ListHeaderComponent={
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search memes"
          autoCorrect={false}
          style={{ marginBottom: Spacing.two }}
        />
      }
      ListEmptyComponent={
        memes.length ? <EmptyState title="No match" hint="Try a different name." /> : undefined
      }
      renderItem={({ item }) => {
        const on = tagged.has(item.id);
        return (
          <Pressable
            onPress={() => toggle(item.id)}
            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {formatDate(item.date)}
                {item.style ? ` · ${item.style}` : ''}
              </Text>
            </View>
            <Text style={[styles.check, on && { color: Colors.accent }]}>{on ? '✓' : '+'}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  rowOn: { borderColor: Colors.accent },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  check: {
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    fontSize: 22,
    color: Colors.textSecondary,
  },
});
