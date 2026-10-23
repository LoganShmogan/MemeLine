import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { MediaGrid } from '@/components/media-grid';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deleteFolder, getFolder, renameFolder } from '@/db/library';

export default function FolderScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const folderId = Number(useLocalSearchParams<{ id: string }>().id);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getFolder(db, folderId).then((f) => f && setName(f.name));
    }, [db, folderId])
  );

  async function save() {
    try {
      await renameFolder(db, folderId, name);
      setEditing(false);
    } catch {
      Alert.alert('Folder exists', `You already have a folder called “${name.trim()}”.`);
    }
  }

  function confirmDelete() {
    Alert.alert(`Delete “${name}”?`, 'The items stay in your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFolder(db, folderId);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name }} />
      <MediaGrid
        scope={{ kind: 'folder', folderId }}
        empty={{
          title: 'Empty folder',
          hint: 'Open anything in your library and tap “Folders” to add it here.',
        }}
        header={
          <View style={styles.actions}>
            {editing ? (
              <>
                <Input value={name} onChangeText={setName} autoFocus style={{ flex: 1 }} />
                <Button label="Save" onPress={save} disabled={!name.trim()} />
              </>
            ) : (
              <>
                <Button label="Rename" variant="outline" onPress={() => setEditing(true)} />
                <Button label="Delete folder" variant="danger" onPress={confirmDelete} />
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
});
