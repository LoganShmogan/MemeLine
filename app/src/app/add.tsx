import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { insertMedia } from '@/db/library';
import { importAsset } from '@/lib/storage';

/** Modal with the three ways in: photos/videos, a link, or a text note. */
export default function AddScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [note, setNote] = useState('');

  async function pickMedia() {
    // iOS asks for library access when a video is picked; ask up front instead
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access needed', 'Allow access to your photos to add memes from them.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) return;

    setBusy(true);
    let failed = 0;
    for (const asset of result.assets) {
      try {
        await insertMedia(db, await importAsset(asset));
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed) Alert.alert('Some items failed', `${failed} of ${result.assets.length} couldn't be added.`);
    router.back();
  }

  async function saveLink() {
    let href = url.trim();
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
    await insertMedia(db, {
      media_type: 'link',
      source_url: href,
      title: linkTitle.trim() || null,
    });
    router.back();
  }

  async function saveNote() {
    const body = note.trim();
    await insertMedia(db, {
      media_type: 'text',
      body,
      title: body.split('\n')[0].slice(0, 60),
    });
    router.back();
  }

  if (busy) {
    return (
      <View style={styles.busy}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.hint}>Copying into your library…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Section title="Photos & videos" hint="Pick one or more from your camera roll.">
        <Button label="Choose from library" onPress={pickMedia} />
      </Section>

      <Section title="Link" hint="Save a meme you found online.">
        <Input
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Input value={linkTitle} onChangeText={setLinkTitle} placeholder="Title (optional)" />
        <Button label="Save link" onPress={saveLink} disabled={!url.trim()} />
      </Section>

      <Section title="Text note" hint="Copypasta, a quote, or a meme you want to remember.">
        <Input
          value={note}
          onChangeText={setNote}
          placeholder="Write something…"
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Button label="Save note" onPress={saveNote} disabled={!note.trim()} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  section: {
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  title: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.accent },
  hint: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSecondary },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
});
