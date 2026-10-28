/** Small branded building blocks shared by every screen. */
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, glow, Spacing } from '@/constants/theme';

/** Top-of-tab title bar with an optional action on the right. */
export function ScreenHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {action}
      <View style={styles.rule} />
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: Colors.accent },
        variant === 'outline' && { borderColor: Colors.accent, borderWidth: 1 },
        variant === 'danger' && { borderColor: Colors.danger, borderWidth: 1 },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text
        style={[
          styles.buttonLabel,
          { color: variant === 'primary' ? Colors.background : variant === 'danger' ? Colors.danger : Colors.accent },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A pill toggle: outlined when off, filled when on. */
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipLabel, on && { color: Colors.background }]}>{label}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.textSecondary}
      selectionColor={Colors.accent}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    fontSize: 30,
    color: Colors.text,
    ...glow(),
  },
  rule: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
    height: 2,
    backgroundColor: Colors.accent,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonLabel: {
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    fontSize: 16,
    letterSpacing: 1,
  },
  chip: {
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  chipOn: { backgroundColor: Colors.accent },
  chipLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.accent },
  input: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  empty: { alignItems: 'center', padding: Spacing.five, gap: Spacing.two },
  emptyTitle: {
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    fontSize: 20,
    color: Colors.text,
  },
  emptyHint: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
