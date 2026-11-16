
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { initializeDatabase } from '@/src/database/init';
import { AppThemeProvider, useAppTheme } from '@/src/theme/ThemeContext';
import { syncTaskWidgetSnapshot } from '@/src/widgets/taskWidget';
import { AppState } from 'react-native';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SQLiteProvider
      databaseName="myday.db"
      onInit={initializeDatabase}
    >
      <AppThemeProvider>
        <WidgetSnapshotSync />
        <RootLayoutNav />
      </AppThemeProvider>
    </SQLiteProvider>
  );
}

function WidgetSnapshotSync() {
  const db = useSQLiteContext();

  useEffect(() => {
    void syncTaskWidgetSnapshot(db).catch(console.error);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncTaskWidgetSnapshot(db).catch(console.error);
    });
    return () => subscription.remove();
  }, [db]);

  return null;
}

function RootLayoutNav() {
  const { scheme } = useAppTheme();

  return (
    <ThemeProvider
      value={scheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="note-editor"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="habits"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="pomodoro"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
