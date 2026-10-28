import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MediaGrid } from '@/components/media-grid';
import { Button, ScreenHeader } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

export default function LibraryScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Library"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Pressable onPress={() => router.push('/about')} hitSlop={12} accessibilityLabel="About MemeLine">
              <Text style={{ fontSize: 22, color: Colors.textSecondary }}>ⓘ</Text>
            </Pressable>
            <Button label="+ Add" onPress={() => router.push('/add')} />
          </View>
        }
      />
      <MediaGrid
        scope={{ kind: 'all' }}
        empty={{
          title: 'Nothing here yet',
          hint: 'Tap “+ Add” to bring in memes from your photos, save a link, or write a note.',
        }}
      />
    </View>
  );
}
