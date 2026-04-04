import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { env } from '@/lib/env';
import { useTheme } from '@/providers/ThemeProvider';
import { useMealStore } from '@/stores/mealStore';

export default function MealDetailScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meals = useMealStore((s) => s.meals);
  const deleteMeal = useMealStore((s) => s.deleteMeal);
  const [isDeleting, setIsDeleting] = useState(false);

  const meal = meals.find((m) => String(m.id) === id);

  if (meal == null) {
    return (
      <Screen padding>
        <Text variant="h2" style={{ color: theme.colors.text }}>
          Meal not found.
        </Text>
      </Screen>
    );
  }

  const imageUrl =
    meal.image_url != null
      ? meal.image_url.startsWith('http')
        ? meal.image_url
        : `${env.API_URL}${meal.image_url}`
      : null;

  const formattedDate = new Date(meal.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const stars = [1, 2, 3, 4, 5];

  const handleDelete = (): void => {
    Alert.alert('Delete Meal', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteMeal(meal.id);
            router.replace('/(tabs)');
          } catch {
            Alert.alert('Error', 'Failed to delete meal.');
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll padding>
      <View style={styles.header}>
        <Pressable onPress={() => { router.back(); }} style={styles.backButton}>
          <Text variant="body" style={{ color: theme.colors.primary }}>
            {'< Back'}
          </Text>
        </Pressable>
      </View>

      {imageUrl != null && (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.heroImage, { borderRadius: 12, backgroundColor: theme.colors.border }]}
          resizeMode="cover"
        />
      )}

      <Text variant="h1" style={[styles.menuName, { color: theme.colors.text }]}>
        {meal.menu_name}
      </Text>

      <Text variant="body" style={[styles.restaurantName, { color: `${theme.colors.text}99` }]}>
        {meal.restaurant.name}
      </Text>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={styles.detailRow}>
          <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
            Date
          </Text>
          <Text variant="body" style={{ color: theme.colors.text }}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
            Rating
          </Text>
          <View style={styles.starRow}>
            {stars.map((star) => (
              <RNText
                key={star}
                style={[
                  styles.star,
                  {
                    color:
                      meal.rating !== null && star <= meal.rating
                        ? theme.colors.primary
                        : `${theme.colors.text}33`,
                  },
                ]}
              >
                {'\u2605'}
              </RNText>
            ))}
          </View>
        </View>
      </Card>

      {meal.review != null && meal.review.length > 0 && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Review
          </Text>
          <Text variant="body" style={[styles.reviewText, { color: theme.colors.text }]}>
            {`\u201c${meal.review}\u201d`}
          </Text>
        </Card>
      )}

      {meal.tags != null && meal.tags.length > 0 && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tags
          </Text>
          <View style={styles.tagsRow}>
            {meal.tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  {
                    backgroundColor: `${theme.colors.primary}22`,
                    borderColor: `${theme.colors.primary}55`,
                  },
                ]}
              >
                <RNText style={[{ color: theme.colors.primary, fontSize: 12 }]}>
                  {tag}
                </RNText>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Button
        title="Delete Entry"
        onPress={handleDelete}
        variant="outline"
        loading={isDeleting}
        disabled={isDeleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  heroImage: {
    width: '100%',
    height: 240,
    marginBottom: 16,
  },
  menuName: {
    marginBottom: 4,
  },
  restaurantName: {
    marginBottom: 20,
    fontSize: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 18,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  reviewText: {
    lineHeight: 24,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});
