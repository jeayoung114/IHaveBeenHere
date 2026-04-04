import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';


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

  // "Other options" state
  const [showOther, setShowOther] = useState(false);
  const [otherMenus, setOtherMenus] = useState<string[]>([]);
  const [customMenuName, setCustomMenuName] = useState('');
  const [customSelected, setCustomSelected] = useState<string | null>(null);

  useEffect(() => {
    const detect = async (): Promise<void> => {
      if (!imageUri || !restaurantName) {
        setError('Missing image or restaurant name');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [result, allMenus] = await Promise.all([
          api.detectMenu(imageUri, restaurantName, sessionId),
          api.getRestaurantMenus(restaurantName, sessionId ?? undefined),
        ]);
        setReturnedSessionId(result.session_id);
        setServerImagePath(result.image_path);

        const detected = result.candidates.length === 0 ? ['Enter menu name manually'] : result.candidates;
        setCandidates(detected);
        setOtherMenus(allMenus.filter((m) => !detected.includes(m)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect menu');
      } finally {
        setIsLoading(false);
      }
    };

    void detect();
  }, [imageUri, restaurantName, sessionId]);

  const handleToggleOther = (): void => {
    setShowOther((v) => !v);
  };

  const selectOtherMenu = (name: string): void => {
    setCustomSelected(name);
    setSelectedIndex(null);
    setCustomMenuName('');
  };

  const selectCandidate = (index: number): void => {
    setSelectedIndex(index);
    setCustomSelected(null);
    setCustomMenuName('');
  };

  const handleCustomConfirm = (): void => {
    if (customMenuName.trim().length === 0) return;
    setCustomSelected(customMenuName.trim());
    setSelectedIndex(null);
  };

  const resolvedMenu = customSelected ?? (selectedIndex !== null ? candidates[selectedIndex] : null);

  const handleNext = (): void => {
    if (resolvedMenu == null) return;
    router.push({
      pathname: '/log/step3',
      params: {
        imageUri,
        restaurantName,
        menuName: resolvedMenu,
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
        <>
          <Text variant="caption" style={[styles.sectionLabel, { color: `${theme.colors.text}66` }]}>
            AI DETECTED
          </Text>
          <View style={styles.candidatesList}>
            {candidates.map((candidate, index) => (
              <Pressable
                key={`${candidate}-${index}`}
                onPress={() => { selectCandidate(index); }}
              >
                <Card
                  style={[
                    styles.candidateCard,
                    (selectedIndex === index && customSelected === null) && {
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
                  {selectedIndex === index && customSelected === null && (
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

          {/* Manual input — always visible */}
          <Card style={{ marginBottom: 12 }}>
            <Text variant="caption" style={{ color: `${theme.colors.text}66`, marginBottom: 8 }}>
              NOT IN THE LIST? TYPE DIRECTLY
            </Text>
            <View style={styles.customRow}>
              <TextInput
                value={customMenuName}
                onChangeText={(t) => {
                  setCustomMenuName(t);
                  if (customSelected !== null && !otherMenus.includes(customSelected)) {
                    setCustomSelected(null);
                  }
                }}
                placeholder="e.g. Tonkotsu Ramen"
                placeholderTextColor={`${theme.colors.text}44`}
                style={[
                  styles.customInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                returnKeyType="done"
                onSubmitEditing={handleCustomConfirm}
              />
              <Pressable
                onPress={handleCustomConfirm}
                style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
              >
                <Text variant="caption" style={{ color: '#fff' }}>
                  Use
                </Text>
              </Pressable>
            </View>
            {customSelected !== null && !otherMenus.includes(customSelected) && (
              <Text variant="caption" style={{ color: theme.colors.primary, marginTop: 6 }}>
                ✓ "{customSelected}" selected
              </Text>
            )}
          </Card>

          {/* More menu options from this restaurant */}
          {otherMenus.length > 0 && (
            <>
              <Pressable
                onPress={handleToggleOther}
                style={[styles.otherToggle, { borderColor: theme.colors.border }]}
              >
                <Text variant="body" style={{ color: theme.colors.primary }}>
                  {showOther ? '▲ Hide restaurant menu' : `▼ See full menu (${otherMenus.length} items)`}
                </Text>
              </Pressable>

              {showOther && (
                <Card style={{ marginBottom: 16 }}>
                  <Text variant="caption" style={{ color: `${theme.colors.text}66`, marginBottom: 8 }}>
                    FROM THIS RESTAURANT
                  </Text>
                  <View style={styles.chipGrid}>
                    {otherMenus.map((menu) => (
                      <Pressable
                        key={menu}
                        onPress={() => { selectOtherMenu(menu); }}
                        style={[
                          styles.chip,
                          customSelected === menu
                            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            : { backgroundColor: `${theme.colors.primary}22`, borderColor: `${theme.colors.primary}66` },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{ color: customSelected === menu ? '#fff' : theme.colors.primary }}
                        >
                          {menu}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {!isLoading && error === null && (
        <Button
          title="Next →"
          onPress={handleNext}
          variant="secondary"
          disabled={resolvedMenu === null}
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
  sectionLabel: {
    marginBottom: 8,
    letterSpacing: 0.5,
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
    marginBottom: 12,
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
  selectedLabel: {
    marginTop: 4,
  },
  otherToggle: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
    marginVertical: 12,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
  },
  confirmBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
