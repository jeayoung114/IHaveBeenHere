import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { MealCard } from '@/components/MealCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Meal } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { useMealStore } from '@/stores/mealStore';

function StatItem({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderRadius: 8 }]}>
      <Text variant="h2" style={{ color: theme.colors.primary }}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: `${theme.colors.text}88` }}>
        {label}
      </Text>
    </View>
  );
}

function EmptyState(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Text variant="h2" style={{ color: theme.colors.text, marginBottom: 8 }}>
        No meals logged yet
      </Text>
      <Text variant="body" style={{ color: `${theme.colors.text}88`, textAlign: 'center' }}>
        Tap the camera button below to log your first meal!
      </Text>
    </View>
  );
}

export default function TimelineScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { meals, isLoading, stats, fetchMeals } = useMealStore();

  useEffect(() => {
    fetchMeals().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to load meals';
      Alert.alert('Error', message);
    });
  }, [fetchMeals]);

  const avgRatingDisplay =
    stats.avg_rating !== null ? stats.avg_rating.toFixed(1) : '--';

  return (
    <Screen padding={false}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.md }]}>
        <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
          YOUR FOOD JOURNAL
        </Text>
        <View style={styles.statsRow}>
          <StatItem label="Meals" value={String(stats.total_meals)} />
          <StatItem label="Restaurants" value={String(stats.total_restaurants)} />
          <StatItem label="Avg Rating" value={avgRatingDisplay} />
        </View>
      </View>

      {isLoading && meals.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList<Meal>
          data={meals}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MealCard meal={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: theme.spacing.md },
          ]}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => {
            fetchMeals().catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : 'Failed to refresh';
              Alert.alert('Error', message);
            });
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    letterSpacing: 2,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
});
