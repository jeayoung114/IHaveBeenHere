import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar(): React.JSX.Element {
  const { colorScheme } = useTheme();
  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
}

function AuthGate(): null {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession } = useAuthStore();

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Not signed in — redirect to login
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Signed in but still on auth screen — redirect to app
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  return null;
}

export default function RootLayout(): React.JSX.Element {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider colorSchemeMode={colorScheme} onColorSchemeModeChange={setColorScheme}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }} />
      <ThemedStatusBar />
    </ThemeProvider>
  );
}
