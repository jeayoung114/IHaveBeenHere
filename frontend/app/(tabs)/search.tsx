import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { MealCard } from '@/components/MealCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import type { Meal } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

export default function SearchScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.searchMeals(q.trim());
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      void search(query);
    }, 400);

    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, search]);

  return (
    <Screen padding={false}>
      <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.md, paddingTop: 16 }]}>
        <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
          SEARCH
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search meals, restaurants..."
          placeholderTextColor={`${theme.colors.text}55`}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error !== null ? (
        <View style={styles.centered}>
          <Text variant="body" style={{ color: `${theme.colors.text}88` }}>
            {error}
          </Text>
        </View>
      ) : query.trim().length === 0 ? (
        <View style={styles.centered}>
          <Text variant="body" style={{ color: `${theme.colors.text}55` }}>
            Type to search your food journal
          </Text>
        </View>
      ) : (
        <FlatList<Meal>
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MealCard meal={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: theme.spacing.md },
          ]}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="body" style={{ color: `${theme.colors.text}88` }}>
                No results found
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingBottom: 12,
  },
  title: {
    letterSpacing: 2,
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
});
