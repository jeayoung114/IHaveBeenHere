import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { env } from '@/lib/env';
import type { Meal } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

interface MealCardProps {
  meal: Meal;
}

function StarRating({
  rating,
  primaryColor,
}: {
  rating: number | null;
  primaryColor: string;
}): React.JSX.Element {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.starRow}>
      {stars.map((star) => (
        <RNText
          key={star}
          style={[
            styles.star,
            { color: rating !== null && star <= rating ? primaryColor : '#555555' },
          ]}
        >
          {'\u2605'}
        </RNText>
      ))}
    </View>
  );
}

export function MealCard({ meal }: MealCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const imageUrl =
    meal.image_url != null
      ? meal.image_url.startsWith('http')
        ? meal.image_url
        : `${env.API_URL}${meal.image_url}`
      : null;

  const formattedDate = new Date(meal.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePress = (): void => {
    if (meal.id > 0) {
      router.push(`/meal/${meal.id}`);
    }
  };

  return (
    <Pressable onPress={handlePress}>
    <Card style={styles.card}>
      <View style={styles.row}>
        {imageUrl != null ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { borderRadius: 8, backgroundColor: theme.colors.border }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: theme.colors.border, borderRadius: 8 },
            ]}
          >
            <Text variant="caption" style={{ color: `${theme.colors.text}66` }}>
              No photo
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <RNText
              numberOfLines={1}
              style={[
                styles.menuName,
                theme.typography.h2,
                { color: theme.colors.text, flex: 1 },
              ]}
            >
              {meal.menu_name}
            </RNText>
            <RNText
              style={[
                styles.date,
                theme.typography.caption,
                { color: `${theme.colors.text}88` },
              ]}
            >
              {formattedDate}
            </RNText>
          </View>

          <RNText
            numberOfLines={1}
            style={[
              styles.restaurantName,
              theme.typography.body,
              { color: `${theme.colors.text}99` },
            ]}
          >
            {meal.restaurant.name}
          </RNText>

          <StarRating rating={meal.rating} primaryColor={theme.colors.primary} />

          {meal.review != null && meal.review.length > 0 && (
            <RNText
              numberOfLines={2}
              style={[
                styles.review,
                theme.typography.caption,
                { color: `${theme.colors.text}cc` },
              ]}
            >
              {`\u201c${meal.review}\u201d`}
            </RNText>
          )}

          {meal.tags != null && meal.tags.length > 0 && (
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
                  <RNText
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {tag}
                  </RNText>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    width: 80,
    height: 80,
    flexShrink: 0,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    flexShrink: 0,
  },
  restaurantName: {
    fontSize: 13,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
  },
  review: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
});
