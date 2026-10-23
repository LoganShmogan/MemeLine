import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Input, ScreenHeader } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { createFolder, type Folder, listFolders } from '@/db/library';
import { thumbUri } from '@/lib/storage';

export default function FoldersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    listFolders(db).then(setFolders);
  }, [db]);
  useFocusEffect(load);

  async function add() {
    if (!name.trim()) return;
    try {
      await createFolder(db, name);
      setName('');
      load();
    } catch {
      Alert.alert('Folder exists', `You already have a folder called “${name.trim()}”.`);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Folders" />
      <FlatList
        data={folders ?? []}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
        ListHeaderComponent={
          <View style={styles.newRow}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="New folder name"
              onSubmitEditing={add}
              returnKeyType="done"
              style={{ flex: 1 }}
            />
            <Button label="Create" onPress={add} disabled={!name.trim()} />
          </View>
        }
        ListEmptyComponent={
          folders ? (
            <EmptyState
              title="No folders yet"
              hint="Make one above, then add things to it from the viewer."
            />
          ) : undefined
        }
        renderItem={({ item }) => {
          const cover = item.cover_type
            ? thumbUri({ media_type: item.cover_type, file_name: item.cover_file, thumb_name: item.cover_thumb })
            : null;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() =>
                router.push({ pathname: '/folder/[id]', params: { id: item.id } })
              }>
              <View style={styles.cover}>
                {cover ? (
                  <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Text style={styles.coverGlyph}>▤</Text>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.count}>{item.count}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  newRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverGlyph: { fontSize: 24, color: Colors.accent },
  name: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.text },
  count: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.textSecondary },
});
