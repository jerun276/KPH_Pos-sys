import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getDb } from '../db/database';
import { createSampleDealer, getTableCounts } from '../db/queries';

export function DealersScreen() {
  const [countsText, setCountsText] = React.useState<string>('');

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const counts = await getTableCounts(db);
    setCountsText(`Dealers: ${counts.dealers}`);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onAdd = React.useCallback(async () => {
    const db = await getDb();
    await createSampleDealer(db);
    await refresh();
  }, [refresh]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dealers</Text>
      <Text style={styles.subtitle}>Supplier list + sourcing history will live here.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Local DB quick check</Text>
        <Text style={styles.cardBody}>{countsText || 'Loading…'}</Text>
        <Pressable onPress={onAdd} style={styles.button}>
          <Text style={styles.buttonText}>Add sample dealer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#374151',
    fontSize: 14,
  },
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    color: '#111827',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
});
