import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { APP_NAME, APP_VERSION } from '@/constants';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMealStore } from '@/stores/mealStore';

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
type ThemeOption = (typeof THEME_OPTIONS)[number];

export default function ProfileScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);
  const stats = useMealStore((s) => s.stats);

  const appVersion = Constants.expoConfig?.version ?? APP_VERSION;
  const avgRatingDisplay =
    stats.avg_rating !== null ? stats.avg_rating.toFixed(1) : '--';

  return (
    <Screen scroll padding>
      <Text variant="h1" style={[styles.heading, { color: theme.colors.text }]}>
        SETTINGS
      </Text>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Your Stats
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text variant="h2" style={{ color: theme.colors.primary }}>
              {String(stats.total_meals)}
            </Text>
            <Text variant="caption" style={{ color: `${theme.colors.text}88` }}>
              Meals Logged
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statCell}>
            <Text variant="h2" style={{ color: theme.colors.primary }}>
              {String(stats.total_restaurants)}
            </Text>
            <Text variant="caption" style={{ color: `${theme.colors.text}88` }}>
              Restaurants
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statCell}>
            <Text variant="h2" style={{ color: theme.colors.primary }}>
              {avgRatingDisplay}
            </Text>
            <Text variant="caption" style={{ color: `${theme.colors.text}88` }}>
              Avg Rating
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Appearance
        </Text>
        <Text variant="body" style={[styles.currentTheme, { color: `${theme.colors.text}88` }]}>
          Current theme: {colorScheme}
        </Text>
        <View style={styles.buttonRow}>
          {THEME_OPTIONS.map((option: ThemeOption) => (
            <View key={option} style={styles.buttonWrapper}>
              <Button
                title={option.charAt(0).toUpperCase() + option.slice(1)}
                onPress={() => { setColorScheme(option); }}
                variant={colorScheme === option ? 'primary' : 'outline'}
              />
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          About
        </Text>
        <Text variant="body" style={[styles.aboutItem, { color: theme.colors.text }]}>
          {APP_NAME}
        </Text>
        <Text variant="body" style={[styles.aboutItem, { color: theme.colors.text }]}>
          Version {appVersion}
        </Text>
        <Text variant="caption" style={[styles.footer, { color: `${theme.colors.text}55` }]}>
          AI-powered food logging
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    letterSpacing: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  currentTheme: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
  aboutItem: {
    marginBottom: 4,
  },
  footer: {
    marginTop: 8,
  },
});
