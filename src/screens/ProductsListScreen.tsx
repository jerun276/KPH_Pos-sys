import { NavigationProp, useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import { listProducts, type ProductListRow } from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

export function ProductsListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState<ProductListRow[]>([]);

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const result = await listProducts(db, { search });
    setRows(result);
  }, [search]);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void refresh();
    });

    return unsub;
  }, [navigation, refresh]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 250);

    return () => clearTimeout(t);
  }, [refresh, search]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search product name"
          style={styles.search}
          autoCapitalize="words"
        />
        <Pressable onPress={() => navigation.navigate('ProductUpsert', {})} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('VariantsEditor', { productId: item.id })} style={styles.card}>
            <View style={styles.cardRow}>
              {item.image_uri ? (
                <Image source={{ uri: item.image_uri }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Pressable onPress={() => navigation.navigate('ProductUpsert', { productId: item.id })}>
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.meta}>Stock: {item.total_stock}</Text>
                  {item.low_stock_variants > 0 ? (
                    <Text style={styles.lowStock}>Low: {item.low_stock_variants}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySubtitle}>Tap Add to create your first product.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardBody: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontWeight: '800',
    fontSize: 16,
    color: '#111827',
  },
  editText: {
    fontWeight: '800',
    color: '#2563EB',
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  meta: {
    color: '#111827',
    fontWeight: '700',
  },
  lowStock: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  emptyTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#374151',
  },
});
