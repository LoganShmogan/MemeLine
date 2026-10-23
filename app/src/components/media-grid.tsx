import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { listMedia, type Media, type MediaType, type Scope } from '@/db/library';
import { thumbUri } from '@/lib/storage';

const COLUMNS = 3;
const GAP = 2;

// shown when there's no picture to draw: text notes, links, failed video grabs
const GLYPH: Record<MediaType, { glyph: string; color: string }> = {
  image: { glyph: '▣', color: Colors.blue },
  video: { glyph: '▶', color: Colors.accent },
  text: { glyph: '¶', color: Colors.gold },
  link: { glyph: '↗', color: Colors.green },
};

/** Reloads every time its screen gains focus, so edits made elsewhere show up. */
export function MediaGrid({
  scope,
  header,
  empty,
}: {
  scope: Scope;
  header?: React.ReactElement;
  empty: { title: string; hint: string };
}) {
  const db = useSQLiteContext();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<Media[] | null>(null);
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const scopeKey = JSON.stringify(scope);
  useFocusEffect(
    useCallback(() => {
      listMedia(db, JSON.parse(scopeKey)).then(setItems);
    }, [db, scopeKey])
  );

  return (
    <FlatList
      data={items ?? []}
      keyExtractor={(m) => String(m.id)}
      numColumns={COLUMNS}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP }}
      ListHeaderComponent={header}
      ListEmptyComponent={items ? <EmptyState {...empty} /> : undefined}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/media/[id]', params: { id: item.id, scope: scopeKey } })
          }>
          <Tile item={item} size={tile} />
        </Pressable>
      )}
    />
  );
}

export function Tile({ item, size }: { item: Media; size: number }) {
  const uri = thumbUri(item);
  const fallback = GLYPH[item.media_type];
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      {uri ? (
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={uri} />
      ) : item.media_type === 'text' ? (
        <Text style={styles.note} numberOfLines={6}>
          {item.body}
        </Text>
      ) : (
        <Text style={[styles.glyph, { color: fallback.color }]}>{fallback.glyph}</Text>
      )}
      {item.media_type === 'video' && uri && <Text style={styles.badge}>▶</Text>}
      {item.favorite === 1 && <Text style={styles.star}>★</Text>}
      {item.media_type === 'link' && (
        <Text style={styles.caption} numberOfLines={2}>
          {item.title || item.source_url}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glyph: { fontSize: 36 },
  note: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.text,
    padding: Spacing.two,
    alignSelf: 'stretch',
  },
  caption: {
    position: 'absolute',
    bottom: Spacing.one,
    left: Spacing.two,
    right: Spacing.two,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  badge: { position: 'absolute', bottom: Spacing.one, left: Spacing.two, color: Colors.text, fontSize: 12 },
  star: { position: 'absolute', top: Spacing.one, right: Spacing.two, color: Colors.gold, fontSize: 14 },
});
