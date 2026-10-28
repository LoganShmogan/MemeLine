import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { migrate } from '@/db/schema';
import { syncTimeline } from '@/db/timeline';

SplashScreen.preventAutoHideAsync();

async function initDatabase(db: SQLiteDatabase) {
  await migrate(db);
  await syncTimeline(db);
}

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [Fonts.heading]: require('../../assets/fonts/Anton-Regular.ttf'),
    [Fonts.body]: require('../../assets/fonts/Rajdhani-Medium.ttf'),
    [Fonts.bodyBold]: require('../../assets/fonts/Rajdhani-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SQLiteProvider databaseName="memeline.db" onInit={initDatabase}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerTintColor: Colors.accent,
            headerTitleStyle: { fontFamily: Fonts.heading, color: Colors.text },
            headerStyle: { backgroundColor: Colors.background },
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="media/[id]" options={{ title: '' }} />
          <Stack.Screen name="folder/[id]" options={{ title: '' }} />
          <Stack.Screen name="meme/[id]" options={{ title: '' }} />
          <Stack.Screen name="event/[id]" options={{ title: '' }} />
          <Stack.Screen name="tag-meme" options={{ title: 'Memes', presentation: 'modal' }} />
          <Stack.Screen name="about" options={{ title: 'About' }} />
          <Stack.Screen name="add" options={{ title: 'Add', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
