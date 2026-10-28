import { StyleSheet, Text, View } from 'react-native';

import { Hitmarker } from '@/components/hitmarker';
import { Colors, Fonts, glow } from '@/constants/theme';

/** The MemeLine logo: hitmarker, then MEME in white and LINE in glowing green. */
export function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <Hitmarker size={size * 0.8} color={Colors.accent} />
      <Text style={[styles.text, { fontSize: size, lineHeight: size * 1.25 }]}>
        MEME<Text style={[{ color: Colors.accent }, glow()]}>LINE</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: Fonts.heading, color: Colors.text, letterSpacing: 1 },
});
