module.exports = {
  expo: {
    owner: 'jeayoung114',
    name: 'I Have Been Here',
    slug: 'i-have-been-here',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'ihavebeenhere',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.ihavebeenhere.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.ihavebeenhere.app',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-updates'],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: 'https://u.expo.dev/8a231e7e-1a01-4e8a-9b37-c983cb018a6e',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      API_URL: process.env.API_URL ?? 'https://ihavebeenhere-production.up.railway.app',
      APP_ENV: process.env.APP_ENV ?? 'production',
      SUPABASE_URL: process.env.SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
      eas: {
        projectId: '8a231e7e-1a01-4e8a-9b37-c983cb018a6e',
      },
    },
  },
};
