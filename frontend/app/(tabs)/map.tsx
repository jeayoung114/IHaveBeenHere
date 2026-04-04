import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/providers/ThemeProvider';

export default function MapScreen(): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>
          MAP
        </Text>
        <Text variant="body" style={{ color: `${theme.colors.text}88`, textAlign: 'center' }}>
          Map coming soon
        </Text>
        <Text variant="caption" style={[styles.note, { color: `${theme.colors.text}55` }]}>
          Restaurant locations will be displayed here once map integration is complete.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    letterSpacing: 2,
  },
  note: {
    textAlign: 'center',
    marginTop: 8,
  },
});
