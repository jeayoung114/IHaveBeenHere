import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { useMealStore } from '@/stores/mealStore';

export default function MapScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const meals = useMealStore((s) => s.meals);
  const fetchMeals = useMealStore((s) => s.fetchMeals);
  const geocoded = useRef(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  useEffect(() => {
    if (geocoded.current) return;
    geocoded.current = true;
    api.geocodeAllRestaurants()
      .then(() => fetchMeals())
      .catch(() => {});
  }, [fetchMeals]);

  // Deduplicate restaurants with coordinates
  const pins = useMemo(() => {
    const map = new Map<number, { name: string; lat: number; lng: number; mealCount: number; avgRating: number | null }>();
    for (const meal of meals) {
      const r = meal.restaurant;
      if (r.latitude == null || r.longitude == null) continue;
      if (!map.has(r.id)) {
        map.set(r.id, { name: r.name, lat: r.latitude, lng: r.longitude, mealCount: 0, avgRating: null });
      }
      const pin = map.get(r.id)!;
      pin.mealCount += 1;
      if (meal.rating != null) {
        const prev = pin.avgRating ?? 0;
        pin.avgRating = Math.round(((prev * (pin.mealCount - 1) + meal.rating) / pin.mealCount) * 10) / 10;
      }
    }
    return Array.from(map.values());
  }, [meals]);

  // Initial center: user location > first pin > fallback (NYC)
  const centerLat = userLocation?.lat ?? (pins.length > 0 ? pins[0].lat : 40.7128);
  const centerLng = userLocation?.lng ?? (pins.length > 0 ? pins[0].lng : -74.0060);

  const userMarkerJs = userLocation
    ? `L.circleMarker([${userLocation.lat}, ${userLocation.lng}], {
        radius: 8, color: '#fff', weight: 2,
        fillColor: '#4A90E2', fillOpacity: 1
      }).addTo(map).bindPopup('You are here');`
    : '';

  const markersJs = pins.map((p) => {
    const label = p.avgRating != null
      ? `${p.name}<br/>${p.mealCount} meal${p.mealCount > 1 ? 's' : ''} · ${p.avgRating}★`
      : `${p.name}<br/>${p.mealCount} meal${p.mealCount > 1 ? 's' : ''}`;
    return `L.marker([${p.lat}, ${p.lng}]).addTo(map).bindPopup(${JSON.stringify(label)});`;
  }).join('\n');

  if (pins.length === 0 && userLocation === null) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text variant="h2" style={{ color: theme.colors.text, marginBottom: 8 }}>
            No locations yet
          </Text>
          <Text variant="body" style={{ color: `${theme.colors.text}88`, textAlign: 'center' }}>
            Log a meal at a restaurant to see it pinned on the map.
          </Text>
        </View>
      </Screen>
    );
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${centerLat}, ${centerLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    ${userMarkerJs}
    ${markersJs}
  </script>
</body>
</html>`;

  return (
    <View style={styles.fill}>
      <WebView
        source={{ html }}
        style={styles.fill}
        originWhitelist={['*']}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
});
