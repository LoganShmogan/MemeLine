import { View } from 'react-native';

import { MediaGrid } from '@/components/media-grid';
import { ScreenHeader } from '@/components/ui';

export default function FavoritesScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Favourites" />
      <MediaGrid
        scope={{ kind: 'favorites' }}
        empty={{ title: 'No favourites yet', hint: 'Open anything and tap ☆ to star it.' }}
      />
    </View>
  );
}
