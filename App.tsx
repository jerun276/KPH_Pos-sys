import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { initDb } from './src/db/database';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const boot = React.useCallback(async () => {
    try {
      setError(null);
      setReady(false);
      await initDb();
      setReady(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
    }
  }, []);

  React.useEffect(() => {
    void boot();
  }, [boot]);

  if (!ready) {
    return (
      <View style={styles.bootContainer}>
        <Text style={styles.bootTitle}>KPH</Text>
        {error ? (
          <>
            <Text style={styles.bootError}>{error}</Text>
            <Pressable onPress={() => void boot()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator />
        )}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
  },
  bootTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  bootError: {
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '800',
  },
});
