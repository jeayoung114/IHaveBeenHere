import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

interface RouteParams {
  imageUri: string;
  restaurantName: string;
  menuName: string;
  sessionId: string;
  imagePath: string;  // server-side path for AI review context
}

const REVIEW_EMOJIS = ['\u{1F60B}', '\u{1F44F}', '\u{2764}', '\u{1F31F}'];

export default function Step3Screen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as RouteParams;

  const { imageUri, restaurantName, menuName, sessionId, imagePath } = params;

  const [rating, setRating] = useState<number>(0);
  const [reviews, setReviews] = useState<string[]>([]);
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async (selectedRating: number): Promise<void> => {
    if (selectedRating === 0 || !menuName || !restaurantName) return;
    setIsLoadingReviews(true);
    setError(null);
    setSelectedReviewIndex(null);
    try {
      const result = await api.generateReviews(
        menuName,
        restaurantName,
        selectedRating,
        sessionId,
        imagePath || undefined,
      );
      setReviews(result.reviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reviews');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleStarPress = (star: number): void => {
    setRating(star);
    void fetchReviews(star);
  };

  const handleNext = (): void => {
    if (rating === 0) return;
    const selectedReview =
      selectedReviewIndex !== null ? reviews[selectedReviewIndex] : undefined;

    router.push({
      pathname: '/log/step4',
      params: {
        imageUri,
        restaurantName,
        menuName,
        rating: String(rating),
        review: selectedReview ?? '',
        sessionId: sessionId ?? '',
        imagePath: imagePath ?? '',
      },
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
          STEP 3 OF 4
        </Text>
      </View>

      <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
        Rate + Review
      </Text>

      <Text
        variant="body"
        style={[styles.menuLabel, { color: `${theme.colors.text}88` }]}
      >
        {menuName} at {restaurantName}
      </Text>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Your Rating
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => { handleStarPress(star); }}>
              <Text
                variant="h1"
                style={[
                  styles.starIcon,
                  { color: star <= rating ? theme.colors.primary : `${theme.colors.text}33` },
                ]}
              >
                {'\u2605'}
              </Text>
            </Pressable>
          ))}
        </View>
        {rating > 0 && (
          <Text variant="caption" style={{ color: `${theme.colors.text}66`, marginTop: 4 }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </Text>
        )}
      </Card>

      {rating > 0 && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Choose a Review
          </Text>
          {isLoadingReviews ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="body" style={{ color: `${theme.colors.text}88` }}>
                Generating review suggestions...
              </Text>
            </View>
          ) : error !== null ? (
            <Text variant="body" style={{ color: theme.colors.secondary }}>
              {error}
            </Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((reviewText, index) => {
                const emoji = REVIEW_EMOJIS[index % REVIEW_EMOJIS.length];
                return (
                  <Pressable
                    key={`review-${index}`}
                    onPress={() => {
                      setSelectedReviewIndex(index === selectedReviewIndex ? null : index);
                    }}
                  >
                    <Card
                      style={[
                        styles.reviewCard,
                        selectedReviewIndex === index && {
                          borderColor: theme.colors.primary,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <View style={styles.reviewRow}>
                        <Text variant="body" style={styles.reviewEmoji}>
                          {emoji}
                        </Text>
                        <Text
                          variant="body"
                          style={[styles.reviewText, { color: theme.colors.text }]}
                        >
                          {reviewText}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => { setSelectedReviewIndex(null); }}
              >
                <Card
                  style={[
                    styles.reviewCard,
                    selectedReviewIndex === null && reviews.length > 0 && {
                      borderColor: `${theme.colors.text}44`,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text
                    variant="body"
                    style={[styles.skipText, { color: `${theme.colors.text}88` }]}
                  >
                    Skip review (save rating only)
                  </Text>
                </Card>
              </Pressable>
            </View>
          )}
        </Card>
      )}

      <Button
        title="Generate Post →"
        onPress={handleNext}
        variant="secondary"
        disabled={rating === 0}
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
  menuLabel: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starIcon: {
    fontSize: 36,
    lineHeight: 44,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  reviewsList: {
    gap: 8,
  },
  reviewCard: {
    padding: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  reviewEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  reviewText: {
    flex: 1,
    lineHeight: 22,
  },
  skipText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
