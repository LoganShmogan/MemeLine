import { Platform, type TextStyle } from 'react-native';

/**
 * MemeLine's own look: the 2012-era MLG montage. Black screens,
 * radioactive soda green, orange-chip orange, Impact-style captions with a
 * glow, and the hitmarker (see components/hitmarker.tsx). No real brands'
 * logos or names, only the feel. The app is dark-only, so there is one
 * palette.
 */

export const Colors = {
  background: '#050805',
  surface: '#0f190d',
  surfaceRaised: '#172614',
  border: '#2b4a20',
  text: '#ffffff',
  textSecondary: '#a3b99d',
  // the soda green: buttons, chips, memes on the timeline
  accent: '#8cff1a',
  // favourites, scores, "in your library" counts
  gold: '#ffd400',
  // links and the occasional loud highlight
  orange: '#ff7a1a',
  // world events on the timeline
  cyan: '#19e6ff',
  danger: '#ff3b3b',
} as const;

// Family names registered by useFonts() in src/app/_layout.tsx.
export const Fonts = {
  // Impact-style caption face, for headings and buttons; always uppercase
  heading: 'Anton-Regular',
  body: 'Rajdhani-Medium',
  bodyBold: 'Rajdhani-Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * A coloured glow behind heading text, like a montage title card. Android
 * clips text shadows to the text's own box (padding doesn't help), so it
 * gets a tight glow that stays inside it.
 */
export function glow(color: string = Colors.accent): TextStyle {
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: Platform.OS === 'android' ? 4 : 12,
  };
}
