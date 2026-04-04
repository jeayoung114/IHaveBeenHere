import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'IHaveBeenHere',
  slug: 'i-have-been-here',
  extra: {
    API_URL: process.env.API_URL ?? 'http://localhost:8000',
    APP_ENV: process.env.APP_ENV ?? 'development',
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font', 'expo-image-picker'],
});
