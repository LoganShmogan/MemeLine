import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { MediaGrid } from '@/components/media-grid';
import { Button, ScreenHeader } from '@/components/ui';

export default function LibraryScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Library"
        action={<Button label="+ Add" onPress={() => router.push('/add')} />}
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
