import * as React from 'react';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDb } from '../db/database';
import { deleteSaleAndRollbackStock, listSalesHistory, type SaleHistoryRow } from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function currency(n: number): string {
  const v = Number(n ?? 0);
  return `LKR ${v.toFixed(0)}`;
}

function moneySigned(n: number): string {
  const v = Number(n ?? 0);
  const sign = v < 0 ? '-' : '';
  return `${sign}LKR ${Math.abs(v).toFixed(0)}`;
}

export function SalesHistoryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [rows, setRows] = React.useState<SaleHistoryRow[]>([]);

  const [filter, setFilter] = React.useState<'today' | '7d' | 'month' | 'all'>('all');

  const range = React.useMemo(() => {
    const now = new Date();
    if (filter === 'all') return undefined;
    if (filter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { startMs: start, endMs: start + 24 * 60 * 60 * 1000 };
    }
    if (filter === '7d') {
      const end = now.getTime();
      const start = end - 7 * 24 * 60 * 60 * 1000;
      return { startMs: start, endMs: end };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    return { startMs: start, endMs: end };
  }, [filter]);

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const r = await listSalesHistory(db, { limit: 200, range });
    setRows(r);
  }, [range]);

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
      await deleteSaleAndRollbackStock(db, id);
      await refresh();
    },
    [refresh],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        <Pressable onPress={() => setFilter('today')} style={[styles.pill, filter === 'today' && styles.pillActive]}>
          <Text style={[styles.pillText, filter === 'today' && styles.pillTextActive]}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('7d')} style={[styles.pill, filter === '7d' && styles.pillActive]}>
          <Text style={[styles.pillText, filter === '7d' && styles.pillTextActive]}>7 Days</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('month')} style={[styles.pill, filter === 'month' && styles.pillActive]}>
          <Text style={[styles.pillText, filter === 'month' && styles.pillTextActive]}>This Month</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('all')} style={[styles.pill, filter === 'all' && styles.pillActive]}>
          <Text style={[styles.pillText, filter === 'all' && styles.pillTextActive]}>All</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={1}>
                {item.product_name} · {item.size_label}
              </Text>
              <View style={styles.rightHeader}>
                <Text style={styles.date}>{formatDate(item.sale_date)}</Text>
                <Pressable onPress={() => navigation.navigate('SaleEdit', { saleId: item.id })}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert('Delete sale?', 'Stock will be reverted. This cannot be undone.', [
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
              <Text style={styles.meta}>Qty: {item.quantity_sold}</Text>
              <Text style={styles.meta}>Price: {currency(item.final_sold_price)}</Text>
              {item.is_return ? <Text style={styles.returnBadge}>RETURN</Text> : null}
            </View>

            {(() => {
              const qty = Number(item.quantity_sold ?? 0);
              const isReturn = Number(item.is_return ?? 0) === 1;
              const dir = isReturn ? -1 : 1;

              const revenue = dir * Number(item.final_sold_price ?? 0) * qty;
              const cogs = dir * Number(item.cost_price ?? 0) * qty;
              const profit = revenue - cogs;

              return (
                <View style={styles.profitRow}>
                  <Text style={styles.profitMeta}>Rev: {moneySigned(revenue)}</Text>
                  <Text style={styles.profitMeta}>COGS: {moneySigned(cogs)}</Text>
                  <Text style={[styles.profitMeta, profit >= 0 ? styles.profitPositive : styles.profitNegative]}>
                    Profit: {moneySigned(profit)}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No sales yet.</Text>}
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
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  pillText: {
    fontWeight: '900',
    color: '#111827',
    fontSize: 12,
  },
  pillTextActive: {
    color: 'white',
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
  editText: {
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  profitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  meta: {
    color: '#111827',
    fontWeight: '700',
  },
  profitMeta: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 12,
  },
  profitPositive: {
    color: '#047857',
  },
  profitNegative: {
    color: '#B91C1C',
  },
  returnBadge: {
    backgroundColor: '#111827',
    color: 'white',
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
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
