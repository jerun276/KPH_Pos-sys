import * as React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDb } from '../db/database';
import {
  getDashboardTotals,
  listBestSellers,
  listLowStockVariants,
  type BestSellerRow,
  type DateRange,
  type DashboardTotals,
  type LowStockRow,
} from '../db/queries';

type FilterKey = 'today' | 'month' | 'year' | 'all';

function currency(n: number): string {
  const v = Number(n ?? 0);
  return `LKR ${v.toFixed(0)}`;
}

function startOfToday(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function getRange(key: FilterKey): DateRange | undefined {
  const now = new Date();
  if (key === 'all') return undefined;
  if (key === 'today') {
    const start = startOfToday(now);
    const end = addDays(start, 1);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }
  if (key === 'month') {
    const start = startOfMonth(now);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }
  const start = startOfYear(now);
  const end = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function HomeScreen() {
  const [filter, setFilter] = React.useState<FilterKey>('today');
  const [totals, setTotals] = React.useState<DashboardTotals>({
    revenue: 0,
    cogs: 0,
    expenses: 0,
    netProfit: 0,
    itemsSold: 0,
  });
  const [bestSellers, setBestSellers] = React.useState<BestSellerRow[]>([]);
  const [lowStock, setLowStock] = React.useState<LowStockRow[]>([]);

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const range = getRange(filter);

    const [t, bs, ls] = await Promise.all([
      getDashboardTotals(db, range),
      listBestSellers(db, { range, limit: 3 }),
      listLowStockVariants(db, { threshold: 2, limit: 20 }),
    ]);

    setTotals(t);
    setBestSellers(bs);
    setLowStock(ls);
  }, [filter]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.container}>
      <View style={styles.pillsRow}>
        <Pill label="Today" active={filter === 'today'} onPress={() => setFilter('today')} />
        <Pill label="This Month" active={filter === 'month'} onPress={() => setFilter('month')} />
        <Pill label="This Year" active={filter === 'year'} onPress={() => setFilter('year')} />
        <Pill label="All Time" active={filter === 'all'} onPress={() => setFilter('all')} />
      </View>

      <View style={styles.cardsGrid}>
        <Card title="Revenue" value={currency(totals.revenue)} tone="good" />
        <Card title="COGS" value={currency(totals.cogs)} tone="neutral" />
        <Card title="Expenses" value={currency(totals.expenses)} tone="bad" />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>NET PROFIT</Text>
        <Text style={styles.heroValue}>{currency(totals.netProfit)}</Text>
        <Text style={styles.heroSub}>Items sold: {totals.itemsSold}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Best Sellers</Text>
      </View>
      {bestSellers.length ? (
        <View style={styles.listBox}>
          {bestSellers.map((b) => (
            <View key={b.product_id} style={styles.listRow}>
              <Text style={styles.listLeft} numberOfLines={1}>
                {b.product_name}
              </Text>
              <Text style={styles.listRight}>{b.quantity}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>No sales yet.</Text>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Low Stock (≤ 2)</Text>
      </View>
      <FlatList
        data={lowStock}
        keyExtractor={(x) => x.variant_id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={styles.lowRow}>
            <Text style={styles.lowLeft} numberOfLines={1}>
              {item.product_name} · {item.size_label}
            </Text>
            <Text style={styles.lowRight}>{item.current_stock}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No low-stock variants.</Text>}
      />
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Card({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const borderColor = tone === 'good' ? '#16A34A' : tone === 'bad' ? '#DC2626' : '#E5E7EB';
  const valueColor = tone === 'good' ? '#16A34A' : tone === 'bad' ? '#DC2626' : '#111827';
  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  pillText: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 12,
  },
  pillTextActive: {
    color: 'white',
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#374151',
  },
  cardValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
  },
  heroCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#111827',
  },
  heroTitle: {
    color: 'white',
    fontWeight: '800',
    opacity: 0.9,
  },
  heroValue: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSub: {
    color: 'white',
    opacity: 0.85,
    marginTop: 4,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 14,
  },
  sectionTitle: {
    fontWeight: '900',
    color: '#111827',
  },
  muted: {
    marginTop: 8,
    color: '#6B7280',
  },
  listBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listLeft: {
    flex: 1,
    marginRight: 10,
    fontWeight: '700',
    color: '#111827',
  },
  listRight: {
    fontWeight: '900',
    color: '#111827',
  },
  lowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lowLeft: {
    flex: 1,
    marginRight: 10,
    fontWeight: '700',
    color: '#111827',
  },
  lowRight: {
    fontWeight: '900',
    color: '#B91C1C',
  },
});
