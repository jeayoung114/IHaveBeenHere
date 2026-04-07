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

// Initializes the session — must always be mounted
function SessionInitializer(): null {
  const { setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return null;
}

// Handles navigation after session is resolved
function NavigationGate(): null {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  return null;
}

function AppContent(): React.JSX.Element {
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return <></>;

  return (
    <>
      <NavigationGate />
      <Stack screenOptions={{ headerShown: false }} />
      <ThemedStatusBar />
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  return (
    <ThemeProvider colorSchemeMode={colorScheme} onColorSchemeModeChange={setColorScheme}>
      <SessionInitializer />
      <AppContent />
    </ThemeProvider>
  );
}
