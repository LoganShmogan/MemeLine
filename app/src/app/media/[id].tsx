import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import {
  deleteMedia,
  type Folder,
  foldersOf,
  listFolders,
  listMedia,
  type Media,
  type Scope,
  setFavorite,
  setInFolder,
} from '@/db/library';
import { deleteFiles, mediaUri } from '@/lib/storage';

/**
 * One item, with Prev/Next through the grid it was opened from (the `scope`
 * param), a favourite star and folder membership toggles.
 */
export default function ViewerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const [items, setItems] = useState<Media[]>([]);
  const [index, setIndex] = useState(-1);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [memberOf, setMemberOf] = useState<Set<number>>(new Set());
  const item = items[index];

  useEffect(() => {
    const scope: Scope = params.scope ? JSON.parse(params.scope) : { kind: 'all' };
    listMedia(db, scope).then((rows) => {
      setItems(rows);
      setIndex(rows.findIndex((r) => r.id === Number(params.id)));
    });
    listFolders(db).then(setFolders);
  }, [db, params.id, params.scope]);

  useEffect(() => {
    if (item) foldersOf(db, item.id).then(setMemberOf);
  }, [db, item]);

  const patch = useCallback(
    (changes: Partial<Media>) =>
      setItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...changes } : r))),
    [index]
  );

  if (!item) return <Stack.Screen options={{ title: '' }} />;

  async function toggleFavorite() {
    const next = item.favorite === 0;
    await setFavorite(db, item.id, next);
    patch({ favorite: next ? 1 : 0 });
  }

  async function toggleFolder(folderId: number) {
    const inFolder = !memberOf.has(folderId);
    await setInFolder(db, item.id, folderId, inFolder);
    const next = new Set(memberOf);
    if (inFolder) next.add(folderId);
    else next.delete(folderId);
    setMemberOf(next);
  }

  function confirmDelete() {
    Alert.alert('Delete from library?', 'This removes it from every folder too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMedia(db, item.id);
          deleteFiles(item);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${index + 1} / ${items.length}`,
          headerRight: () => (
            <Pressable onPress={toggleFavorite} hitSlop={12}>
              <Text style={[styles.star, item.favorite === 1 && { color: Colors.gold }]}>
                {item.favorite === 1 ? '★' : '☆'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.six }}>
        <MediaView key={item.id} item={item} />

        <View style={styles.nav}>
          <Button label="‹ Prev" variant="outline" disabled={index <= 0} onPress={() => setIndex(index - 1)} />
          <Button
            label="Next ›"
            variant="outline"
            disabled={index >= items.length - 1}
            onPress={() => setIndex(index + 1)}
          />
        </View>

        <View style={styles.section}>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
          <Text style={styles.meta}>Added {item.date_added.slice(0, 10)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Folders</Text>
          {folders.length === 0 ? (
            <Text style={styles.meta}>Make a folder in the Folders tab first.</Text>
          ) : (
            <View style={styles.chips}>
              {folders.map((f) => {
                const on = memberOf.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => toggleFolder(f.id)}
                    style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipLabel, on && { color: Colors.background }]}>
                      {on ? '✓ ' : ''}
                      {f.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Button label="Delete" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </>
  );
}

function MediaView({ item }: { item: Media }) {
  const { width } = useWindowDimensions();
  const aspect = item.width && item.height ? item.width / item.height : 1;
  const height = Math.min(width / aspect, width * 1.5);

  switch (item.media_type) {
    case 'image':
      return <Image source={mediaUri(item)} style={{ width, height }} contentFit="contain" />;
    case 'video':
      return <VideoItem uri={mediaUri(item)!} width={width} height={height} />;
    case 'text':
      return (
        <View style={styles.noteBox}>
          <Text style={styles.note}>{item.body}</Text>
        </View>
      );
    case 'link':
      return (
        <View style={styles.noteBox}>
          <Text style={styles.link} numberOfLines={3}>
            {item.source_url}
          </Text>
          <Button label="Open link ↗" onPress={() => WebBrowser.openBrowserAsync(item.source_url!)} />
        </View>
      );
  }
}

function VideoItem({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

const styles = StyleSheet.create({
  star: { fontSize: 26, color: Colors.textSecondary },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, gap: Spacing.two },
  title: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSecondary },
  heading: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  chipOn: { backgroundColor: Colors.accent },
  chipLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.accent },
  noteBox: {
    margin: Spacing.three,
    padding: Spacing.four,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    gap: Spacing.three,
  },
  note: { fontFamily: Fonts.body, fontSize: 18, lineHeight: 26, color: Colors.text },
  link: { fontFamily: Fonts.body, fontSize: 15, color: Colors.green },
});
