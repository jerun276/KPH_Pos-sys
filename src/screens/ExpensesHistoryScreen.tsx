import * as React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDb } from '../db/database';
import { deleteExpense, listExpensesHistory, type ExpenseHistoryRow } from '../db/queries';

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function currency(n: number): string {
  const v = Number(n ?? 0);
  return `LKR ${v.toFixed(0)}`;
}

export function ExpensesHistoryScreen() {
  const [rows, setRows] = React.useState<ExpenseHistoryRow[]>([]);

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const r = await listExpensesHistory(db, { limit: 200 });
    setRows(r);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onDelete = React.useCallback(
    async (id: string) => {
      const db = await getDb();
      await deleteExpense(db, id);
      await refresh();
    },
    [refresh],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={1}>
                {item.category}
              </Text>
              <View style={styles.rightHeader}>
                <Text style={styles.date}>{formatDate(item.expense_date)}</Text>
                <Pressable
                  onPress={() => {
                    Alert.alert('Delete expense?', 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            try {
                              await onDelete(item.id);
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : 'Failed to delete';
                              Alert.alert('Error', msg);
                            }
                          })();
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.amount}>{currency(item.amount)}</Text>
              {item.note ? <Text style={styles.note} numberOfLines={1}>{item.note}</Text> : null}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No expenses yet.</Text>}
      />

      <Pressable onPress={() => void refresh()} style={styles.refreshButton}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '900',
    color: '#111827',
  },
  date: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteText: {
    color: '#B91C1C',
    fontWeight: '900',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  amount: {
    fontWeight: '900',
    color: '#B91C1C',
  },
  note: {
    flex: 1,
    textAlign: 'right',
    color: '#374151',
    fontWeight: '600',
  },
  muted: {
    color: '#6B7280',
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '900',
  },
});
