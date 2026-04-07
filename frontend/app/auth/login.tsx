import type React from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';

type Mode = 'login' | 'signup';

export default function LoginScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSignUpSuccess(false);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        // Navigation is handled by _layout.tsx auth listener
      } else {
        await signUp(email.trim(), password);
        setSignUpSuccess(true);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToLogin = () => {
    setMode('login');
    setErrorMessage(null);
    setSignUpSuccess(false);
  };

  const switchToSignUp = () => {
    setMode('signup');
    setErrorMessage(null);
    setSignUpSuccess(false);
  };

  return (
    <Screen scroll padding>
      <View style={styles.container}>
        <Text variant="h1" style={styles.title}>
          I Have Been Here
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </Text>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { borderColor: theme.colors.border }]}>
          <Pressable
            style={[
              styles.tab,
              { borderRadius: 6 },
              mode === 'login' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={switchToLogin}
          >
            <Text
              variant="body"
              style={{ color: mode === 'login' ? '#FFFFFF' : theme.colors.text, fontWeight: '600' }}
            >
              Login
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              { borderRadius: 6 },
              mode === 'signup' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={switchToSignUp}
          >
            <Text
              variant="body"
              style={{ color: mode === 'signup' ? '#FFFFFF' : theme.colors.text, fontWeight: '600' }}
            >
              Sign Up
            </Text>
          </Pressable>
        </View>

        {/* Inputs */}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={theme.colors.border}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={theme.colors.border}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {/* Error */}
        {errorMessage ? (
          <Text variant="caption" style={{ textAlign: 'center', color: '#EF4444', marginTop: -8 }}>
            {errorMessage}
          </Text>
        ) : null}

        {/* Sign up success message */}
        {signUpSuccess ? (
          <Text variant="caption" style={{ textAlign: 'center', color: '#22C55E', marginTop: -8 }}>
            Account created! Please check your email to confirm your account, then log in.
          </Text>
        ) : null}

        {/* Submit */}
        <View style={styles.buttonRow}>
          <Button
            title={mode === 'login' ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          />
        </View>

        {/* Toggle mode link */}
        <Pressable onPress={mode === 'login' ? switchToSignUp : switchToLogin} style={styles.toggleRow}>
          <Text variant="caption" style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    gap: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  buttonRow: {
    marginTop: 4,
  },
  toggleRow: {
    alignItems: 'center',
    marginTop: 4,
  },
});
