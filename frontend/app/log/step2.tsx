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
  sessionId: string;
}

export default function Step2Screen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as RouteParams;

  const { imageUri, restaurantName, sessionId } = params;

  const [candidates, setCandidates] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnedSessionId, setReturnedSessionId] = useState<string | null>(null);
  const [serverImagePath, setServerImagePath] = useState<string | null>(null);

  useEffect(() => {
    const detect = async (): Promise<void> => {
      if (!imageUri || !restaurantName) {
        setError('Missing image or restaurant name');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const result = await api.detectMenu(imageUri, restaurantName, sessionId);
        setReturnedSessionId(result.session_id);
        setServerImagePath(result.image_path);

        if (result.candidates.length === 0) {
          setCandidates(['Enter menu name manually']);
        } else {
          setCandidates(result.candidates);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect menu');
      } finally {
        setIsLoading(false);
      }
    };

    void detect();
  }, [imageUri, restaurantName, sessionId]);

  const handleNext = (): void => {
    if (selectedIndex === null) {
      return;
    }
    const selected = candidates[selectedIndex];
    if (selected === undefined) return;

    router.push({
      pathname: '/log/step3',
      params: {
        imageUri,
        restaurantName,
        menuName: selected,
        sessionId: returnedSessionId ?? sessionId ?? '',
        imagePath: serverImagePath ?? '',
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
          STEP 2 OF 4
        </Text>
      </View>

      <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
        Select Menu Item
      </Text>

      <Text variant="body" style={[styles.subtitle, { color: `${theme.colors.text}88` }]}>
        {restaurantName}
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" style={[styles.loadingText, { color: `${theme.colors.text}88` }]}>
            Analyzing your photo...
          </Text>
        </View>
      ) : error !== null ? (
        <View style={styles.errorContainer}>
          <Text variant="body" style={{ color: theme.colors.secondary }}>
            {error}
          </Text>
          <Button
            title="Go Back"
            onPress={() => { router.back(); }}
            variant="outline"
          />
        </View>
      ) : (
        <View style={styles.candidatesList}>
          {candidates.map((candidate, index) => (
            <Pressable
              key={`${candidate}-${index}`}
              onPress={() => { setSelectedIndex(index); }}
            >
              <Card
                style={[
                  styles.candidateCard,
                  selectedIndex === index && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  },
                ]}
              >
                <View style={styles.candidateRow}>
                  <Text
                    variant="h2"
                    style={[styles.candidateName, { color: theme.colors.text }]}
                  >
                    {candidate}
                  </Text>
                </View>
                {selectedIndex === index && (
                  <Text
                    variant="caption"
                    style={[styles.selectedLabel, { color: theme.colors.primary }]}
                  >
                    Selected
                  </Text>
                )}
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      {!isLoading && error === null && (
        <Button
          title="Next →"
          onPress={handleNext}
          variant="secondary"
          disabled={selectedIndex === null}
        />
      )}
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
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    textAlign: 'center',
  },
  errorContainer: {
    paddingTop: 40,
    alignItems: 'center',
    gap: 16,
  },
  candidatesList: {
    gap: 10,
    marginBottom: 20,
  },
  candidateCard: {
    gap: 4,
  },
  candidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateName: {
    flex: 1,
    fontSize: 16,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedLabel: {
    marginTop: 4,
  },
});
