import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Hitmarker } from '@/components/hitmarker';
import { Chip, ScreenHeader } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { listTimeline, type TimelineEntry } from '@/db/timeline';
import { formatDate } from '@/lib/dates';

type Filter = 'all' | 'meme' | 'event';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'meme', label: 'Memes' },
  { key: 'event', label: 'Events' },
];

/** Memes and world events side by side, one section per year. */
export default function TimelineScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  // on focus, so "in your library" counts pick up tags made in the viewer
  useFocusEffect(
    useCallback(() => {
      listTimeline(db).then(setEntries);
    }, [db])
  );

  const sections = useMemo(() => {
    const byYear = new Map<string, TimelineEntry[]>();
    for (const e of entries) {
      if (filter !== 'all' && e.kind !== filter) continue;
      const year = e.date.slice(0, 4);
      const list = byYear.get(year);
      if (list) list.push(e);
      else byYear.set(year, [e]);
    }
    return [...byYear].map(([year, data]) => ({ title: year, data }));
  }, [entries, filter]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Timeline" />
      <SectionList
        sections={sections}
        keyExtractor={(e) => `${e.kind}:${e.id}`}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: Spacing.six }}
        ListHeaderComponent={
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.year}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() =>
              router.push({
                pathname: item.kind === 'meme' ? '/meme/[id]' : '/event/[id]',
                params: { id: item.id },
              })
            }>
            <View style={styles.rail}>
              {item.kind === 'meme' ? (
                <View style={styles.marker}>
                  <Hitmarker size={18} color={Colors.accent} />
                </View>
              ) : (
                <View style={styles.eventDot} />
              )}
            </View>
            <View style={styles.body}>
              <Text style={styles.meta}>
                {formatDate(item.date)}
                {item.label ? ` · ${item.label}` : ''}
              </Text>
              <Text style={item.kind === 'meme' ? styles.memeTitle : styles.eventTitle}>
                {item.title}
              </Text>
              {item.media_count > 0 && (
                <Text style={styles.count}>
                  {item.media_count} in your library
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  year: {
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    fontSize: 22,
    color: Colors.accent,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: { flexDirection: 'row', paddingHorizontal: Spacing.three },
  // a vertical line down the left: a hitmarker per meme, a ring per event
  rail: {
    width: 20,
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    marginLeft: 5,
  },
  marker: { position: 'absolute', left: -10, top: Spacing.three - 3 },
  eventDot: {
    position: 'absolute',
    left: -7,
    top: Spacing.three,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.cyan,
  },
  body: { flex: 1, paddingVertical: Spacing.two + 2, gap: 2 },
  meta: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  memeTitle: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.text },
  eventTitle: { fontFamily: Fonts.body, fontSize: 16, color: Colors.cyan },
  count: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.gold },
});
