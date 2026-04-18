import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import type { NearbyRestaurant } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

export default function Step1Screen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [suggestions, setSuggestions] = useState<NearbyRestaurant[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const userCoords = useRef<{ lat: number; lng: number } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        userCoords.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    })();
  }, []);

  const pickImage = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset?.uri != null) {
        setImageUri(asset.uri);
      }
    }
  };

  const takePhoto = async (): Promise<void> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset?.uri != null) {
        setImageUri(asset.uri);
      }
    }
  };

  const handleRestaurantChange = (text: string): void => {
    setRestaurantName(text);
    setShowSuggestions(text.length > 1);
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    if (text.length > 1) {
      setIsFetchingSuggestions(true);
      debounceTimer.current = setTimeout(() => {
        const coords = userCoords.current;
        api.searchNearbyRestaurants(text, coords?.lat, coords?.lng)
          .then((data) => { setSuggestions(data); })
          .catch(() => { setSuggestions([]); })
          .finally(() => { setIsFetchingSuggestions(false); });
      }, 500);
    } else {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
    }
  };

  const selectSuggestion = (name: string): void => {
    setRestaurantName(name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleNext = (): void => {
    if (imageUri === null) {
      Alert.alert('Photo required', 'Please select or take a photo of your meal.');
      return;
    }
    if (restaurantName.trim().length === 0) {
      Alert.alert('Restaurant required', 'Please enter the restaurant name.');
      return;
    }
    router.push({
      pathname: '/log/step2',
      params: { imageUri, restaurantName: restaurantName.trim() },
    });
  };

  return (
    <Screen scroll padding>
      <View style={styles.header}>
        <Pressable onPress={() => { router.back(); }} style={styles.backButton}>
          <Text variant="body" style={{ color: theme.colors.primary }}>
            {'< Back'}
          </Text>
        </Pressable>
        <Text variant="caption" style={{ color: `${theme.colors.text}88` }}>
          STEP 1 OF 4
        </Text>
      </View>

      <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
        Photo + Restaurant
      </Text>

      <Card style={{ marginBottom: theme.spacing.md }}>
        {imageUri !== null ? (
          <View>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={[styles.imageActions, { marginTop: theme.spacing.sm }]}>
              <Button
                title="Retake"
                onPress={() => { void takePhoto(); }}
                variant="outline"
              />
              <Button
                title="Choose Different"
                onPress={() => { void pickImage(); }}
                variant="outline"
              />
            </View>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text
              variant="body"
              style={[styles.placeholderText, { color: `${theme.colors.text}55` }]}
            >
              No photo selected
            </Text>
            <View style={styles.imageActions}>
              <Button
                title="Take Photo"
                onPress={() => { void takePhoto(); }}
                variant="primary"
              />
              <Button
                title="Choose from Library"
                onPress={() => { void pickImage(); }}
                variant="outline"
              />
            </View>
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h2" style={[styles.label, { color: theme.colors.text }]}>
          Restaurant Name
        </Text>
        <TextInput
          value={restaurantName}
          onChangeText={handleRestaurantChange}
          placeholder="e.g. Ichiran Ramen"
          placeholderTextColor={`${theme.colors.text}44`}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          autoCorrect={false}
          returnKeyType="done"
        />
        {showSuggestions && suggestions.length > 0 && (
          <View
            style={[
              styles.suggestionsList,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            {suggestions.map((restaurant, idx) => (
              <Pressable
                key={`${restaurant.name}-${idx}`}
                onPress={() => { selectSuggestion(restaurant.name); }}
                style={[styles.suggestionItem, { borderBottomColor: theme.colors.border }]}
              >
                <Text variant="body" style={{ color: theme.colors.text }}>
                  {restaurant.name}
                </Text>
                <Text variant="caption" style={{ color: `${theme.colors.text}66`, marginTop: 2 }} numberOfLines={1}>
                  {restaurant.address}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {isFetchingSuggestions && (
          <Text variant="caption" style={{ color: `${theme.colors.text}55`, marginTop: 4 }}>
            Searching...
          </Text>
        )}
      </Card>

      <Button
        title="Next →"
        onPress={handleNext}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  imagePlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  placeholderText: {
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
