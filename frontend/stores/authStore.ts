import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useMealStore } from '@/stores/mealStore';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'ihavebeenhere://auth-callback';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  },
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw new Error(error?.message ?? 'OAuth error');

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
    if (result.type !== 'success') return;

    // Implicit flow returns tokens in the URL hash fragment
    const hash = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) throw new Error('No tokens in redirect URL');

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw new Error(sessionError.message);
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Network errors are non-fatal — local session is cleared below
    }
    useMealStore.getState().clearMeals();
    set({ session: null, user: null });
  },
}));
