// This file exists only so Expo Router registers the "camera" tab route.
// Navigation is handled by the tab button's custom onPress in _layout.tsx
// which redirects to /log/step1.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function CameraTab(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/log/step1');
  }, [router]);

  return null;
}
