import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MealCard } from '@/components/MealCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { useMealStore } from '@/stores/mealStore';

interface RouteParams {
  imageUri: string;
  restaurantName: string;
  menuName: string;
  rating: string;
  review: string;
  sessionId: string;
}

export default function Step4Screen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as RouteParams;
  const addMeal = useMealStore((s) => s.addMeal);

  const { imageUri, restaurantName, menuName, rating: ratingStr, review } = params;
  const rating = ratingStr ? parseInt(ratingStr, 10) : 0;

  const [isSaving, setIsSaving] = useState(false);

  // Build a preview meal object for MealCard
  const previewMeal = {
    id: -1,
    menu_name: menuName ?? '',
    restaurant: {
      id: -1,
      name: restaurantName ?? '',
      latitude: null,
      longitude: null,
    },
    rating: rating > 0 ? rating : null,
    review: review && review.length > 0 ? review : null,
    tags: null,
    image_url: imageUri ?? null,
    created_at: new Date().toISOString(),
  };

  const handleSave = async (): Promise<void> => {
    if (!imageUri || !menuName || !restaurantName) {
      Alert.alert('Missing data', 'Please complete all steps before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);

      const mealData: Record<string, unknown> = {
        menu_name: menuName,
        restaurant_name: restaurantName,
      };
      if (rating > 0) {
        mealData.rating = rating;
      }
      if (review && review.length > 0) {
        mealData.review = review;
      }
      formData.append('data', JSON.stringify(mealData));

      const savedMeal = await api.createMeal(formData);
      addMeal(savedMeal);

      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save meal';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
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
          STEP 4 OF 4
        </Text>
      </View>

      <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
        Confirm & Save
      </Text>

      <Text
        variant="body"
        style={[styles.subtitle, { color: `${theme.colors.text}88` }]}
      >
        Review your entry before saving
      </Text>

      <View style={{ marginBottom: theme.spacing.md }}>
        <MealCard meal={previewMeal} />
      </View>

      <Card style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="h2" style={[styles.detailsTitle, { color: theme.colors.text }]}>
          Entry Details
        </Text>
        <View style={styles.detailRow}>
          <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
            Menu
          </Text>
          <Text variant="body" style={{ color: theme.colors.text }}>
            {menuName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
            Restaurant
          </Text>
          <Text variant="body" style={{ color: theme.colors.text }}>
            {restaurantName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
            Rating
          </Text>
          <Text variant="body" style={{ color: theme.colors.primary }}>
            {rating > 0 ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : 'Not rated'}
          </Text>
        </View>
        {review != null && review.length > 0 && (
          <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
            <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
              Review
            </Text>
            <Text
              variant="body"
              style={[styles.reviewText, { color: theme.colors.text }]}
            >
              {review}
            </Text>
          </View>
        )}
      </Card>

      <Button
        title="Save to Journal"
        onPress={() => { void handleSave(); }}
        variant="secondary"
        loading={isSaving}
        disabled={isSaving}
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
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 20,
  },
  detailsTitle: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  reviewText: {
    flex: 1,
    textAlign: 'right',
    fontStyle: 'italic',
  },
});
