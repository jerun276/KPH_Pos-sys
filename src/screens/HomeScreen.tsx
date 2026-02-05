import * as React from 'react';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '../db/database';
import {
  getDashboardTotals,
  getDailyAnalytics,
  listBestSellers,
  listLowStockVariants,
  type BestSellerRow,
  type DailyAnalyticsRow,
  type DateRange,
  type DashboardTotals,
  type LowStockRow,
} from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

type FilterKey = 'today' | 'month' | 'year' | 'all';
type GraphRangeKey = '7d' | '30d' | '90d';

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

function getTrailingRange(days: number): DateRange {
  const end = new Date();
  const start = addDays(end, -days);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function tryGetChartKit(): null | {
  LineChart: React.ComponentType<any>;
} {
  try {
    const mod = require('react-native-chart-kit');
    if (!mod?.LineChart) return null;
    return { LineChart: mod.LineChart };
  } catch {
    return null;
  }
}

function sanitizeSeries(xs: number[]): number[] {
  const clean = xs.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });

  if (clean.length === 0) return [0, 0];
  if (clean.length === 1) return [clean[0], clean[0]];
  return clean;
}

function ensureNonFlatRange(series: number[][]): number[][] {
  const all = series.flat();
  const min = Math.min(...all);
  const max = Math.max(...all);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return series;
  if (min !== max) return series;

  const next = series.map((s) => [...s]);
  const i = next[0].length - 1;
  next[0][i] = next[0][i] + 1;
  return next;
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [filter, setFilter] = React.useState<FilterKey>('today');
  const [graphRange, setGraphRange] = React.useState<GraphRangeKey>('30d');
  const [totals, setTotals] = React.useState<DashboardTotals>({
    revenue: 0,
    cogs: 0,
    expenses: 0,
    netProfit: 0,
    itemsSold: 0,
  });
  const [bestSellers, setBestSellers] = React.useState<BestSellerRow[]>([]);
  const [lowStock, setLowStock] = React.useState<LowStockRow[]>([]);
  const [daily, setDaily] = React.useState<DailyAnalyticsRow[]>([]);

  const chartKit = React.useMemo(() => tryGetChartKit(), []);
  const LineChart = chartKit?.LineChart;

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const range = getRange(filter);

    const gRange = graphRange === '7d' ? getTrailingRange(7) : graphRange === '30d' ? getTrailingRange(30) : getTrailingRange(90);

    const [t, bs, ls, d] = await Promise.all([
      getDashboardTotals(db, range),
      listBestSellers(db, { range, limit: 3 }),
      listLowStockVariants(db, { threshold: 2, limit: 20 }),
      getDailyAnalytics(db, gRange),
    ]);

    setTotals(t);
    setBestSellers(bs);
    setLowStock(ls);
    setDaily(d);
  }, [filter, graphRange]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    (() => {
      // const bottomPad = Math.max(0, tabBarHeight) + Math.max(0, insets.bottom) ;

      return (
    <FlatList
      style={styles.list}
      data={lowStock}
      keyExtractor={(x) => x.variant_id}
      bounces
      alwaysBounceVertical
      scrollIndicatorInsets={{ bottom: 16 }}
      contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
      renderItem={({ item }) => (
        <View style={styles.lowRow}>
          <Text style={styles.lowLeft} numberOfLines={1}>
            {item.product_name} · {item.size_label}
          </Text>
          <Text style={styles.lowRight}>{item.current_stock}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.muted}>No low-stock variants.</Text>}
      ListHeaderComponent={
        <>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => navigation.navigate('SalesHistory')} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Sales History</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('ExpensesHistory')} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Expenses History</Text>
            </Pressable>
          </View>

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
            <Text style={styles.sectionTitle}>Graphs</Text>
          </View>

          <View style={styles.pillsRow}>
            <Pill label="7D" active={graphRange === '7d'} onPress={() => setGraphRange('7d')} />
            <Pill label="30D" active={graphRange === '30d'} onPress={() => setGraphRange('30d')} />
            <Pill label="90D" active={graphRange === '90d'} onPress={() => setGraphRange('90d')} />
          </View>

          {LineChart ? (
            <View style={styles.chartBox}>
              {(() => {
                const labels = (
                  daily.length ? daily : ([{ day: '0000-00-00' } as any, { day: '0000-00-00' } as any] as any[])
                ).map((r) => String(r.day ?? '').slice(5));

                let revenue = sanitizeSeries(daily.map((r) => Number(r.revenue ?? 0)));
                let profit = sanitizeSeries(daily.map((r) => Number(r.profit ?? 0)));
                let expenses = sanitizeSeries(daily.map((r) => Number(r.expenses ?? 0)));

                [revenue, profit, expenses] = ensureNonFlatRange([revenue, profit, expenses]);

                const safeLabels = labels.length === revenue.length ? labels : revenue.map((_, idx) => String(idx + 1));

                return (
                  <LineChart
                    data={{
                      labels: safeLabels,
                      datasets: [
                        { data: revenue, color: () => '#2563EB', strokeWidth: 2 },
                        { data: profit, color: () => '#16A34A', strokeWidth: 2 },
                        { data: expenses, color: () => '#DC2626', strokeWidth: 2 },
                      ],
                      legend: ['Revenue', 'Profit', 'Expenses'],
                    }}
                    width={Dimensions.get('window').width - 32}
                    height={220}
                    withDots={false}
                    withInnerLines
                    withOuterLines={false}
                    withVerticalLabels={revenue.length <= 15}
                    withHorizontalLabels
                    segments={4}
                    fromZero
                    chartConfig={{
                      backgroundGradientFrom: '#FFFFFF',
                      backgroundGradientTo: '#FFFFFF',
                      color: () => '#111827',
                      labelColor: () => '#6B7280',
                      decimalPlaces: 0,
                      propsForBackgroundLines: { stroke: '#F3F4F6' },
                    }}
                    bezier
                    style={{ borderRadius: 14 }}
                  />
                );
              })()}
            </View>
          ) : (
            <Text style={styles.muted}>Install chart library to enable graphs.</Text>
          )}

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
        </>
      }
      ListFooterComponent={<View style={{ height: 16 }} />}
    />
      );
    })()
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
    padding: 16,
    backgroundColor: 'white',
  },
  list: {
    flex: 1,
    backgroundColor: 'white',
  },
  listContent: {
    padding: 16,
    backgroundColor: 'white',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chartBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 6,
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
