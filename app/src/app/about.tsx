import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { Company, LegalUrls } from '@/constants/legal';

const LINKS = [
  { label: 'Privacy Policy', url: LegalUrls.privacy },
  { label: 'Terms of Use', url: LegalUrls.terms },
  { label: 'Community Guidelines', url: LegalUrls.guidelines },
];

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.name}>Memeline</Text>
      <Text style={styles.meta}>Version {Constants.expoConfig?.version}</Text>
      <Text style={styles.body}>
        Save the memes you love, and see where they came from and what was happening in the
        world when they took off.
      </Text>

      <Pressable onPress={() => WebBrowser.openBrowserAsync(Company.site)}>
        <Text style={styles.maker}>
          Made by <Text style={{ color: Colors.accent }}>Save Point</Text>
        </Text>
      </Pressable>

      {LINKS.map((l) => (
        <Pressable
          key={l.url}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() => WebBrowser.openBrowserAsync(l.url)}>
          <Text style={styles.rowLabel}>{l.label}</Text>
          <Text style={styles.arrow}>↗</Text>
        </Pressable>
      ))}

      <Text style={styles.fine}>
        © {new Date().getFullYear()} {Company.name}. Memes, images and trademarks mentioned in
        Memeline belong to their respective owners.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  name: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textSecondary },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, color: Colors.text },
  maker: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.text,
    marginVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  rowLabel: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  arrow: { fontSize: 16, color: Colors.accent },
  fine: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: Spacing.four,
  },
});
