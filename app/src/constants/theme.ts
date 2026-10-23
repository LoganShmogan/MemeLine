/**
 * MemeBrowser brand: the same black / lavender look as savepoint.cc and
 * loganyoung.foo. The app is dark-only, so there is one palette.
 */

export const Colors = {
  background: '#000000',
  surface: '#141217',
  surfaceRaised: '#1f1c23',
  border: '#2e2a33',
  text: '#ffffff',
  textSecondary: '#a9a3ad',
  accent: '#b791c2',
  gold: '#eecc67',
  green: '#82c88a',
  blue: '#699fd5',
  danger: '#e07a7a',
} as const;

// Family names registered by useFonts() in src/app/_layout.tsx.
export const Fonts = {
  heading: 'ChakraPetch-Bold',
  body: 'Figtree-Regular',
  bodyBold: 'Figtree-Bold',
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
