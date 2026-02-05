import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import {
  deleteVariant,
  listVariantsForProduct,
  upsertVariant,
  type VariantRow,
  type VariantUpsertInput,
} from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VariantsEditor'>;

type EditableVariant = {
  id?: string;
  size_label: string;
  cost_price: string;
  min_selling_price: string;
  max_selling_price: string;
  current_stock: string;
  notes: string;
};

function fromRow(v: VariantRow): EditableVariant {
  return {
    id: v.id,
    size_label: v.size_label,
    cost_price: String(v.cost_price ?? ''),
    min_selling_price: v.min_selling_price == null ? '' : String(v.min_selling_price),
    max_selling_price: v.max_selling_price == null ? '' : String(v.max_selling_price),
    current_stock: String(v.current_stock ?? 0),
    notes: v.notes ?? '',
  };
}

export function VariantsEditorScreen({ navigation, route }: Props) {
  const { productId } = route.params;

  const [items, setItems] = React.useState<EditableVariant[]>([]);

  const refresh = React.useCallback(async () => {
    const db = await getDb();
    const rows = await listVariantsForProduct(db, productId);
    setItems(rows.map(fromRow));
  }, [productId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    navigation.setOptions({ title: 'Variants' });
  }, [navigation]);

  const addRow = React.useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        size_label: '',
        cost_price: '',
        min_selling_price: '',
        max_selling_price: '',
        current_stock: '0',
        notes: '',
      },
    ]);
  }, []);

  const update = React.useCallback((index: number, patch: Partial<EditableVariant>) => {
    setItems((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }, []);

  const onDelete = React.useCallback(
    async (index: number) => {
      const id = items[index]?.id;
      if (id) {
        const db = await getDb();
        await deleteVariant(db, id);
      }
      setItems((prev) => prev.filter((_, i) => i !== index));
    },
    [items],
  );

  const onSaveAll = React.useCallback(async () => {
    for (const v of items) {
      if (!v.size_label.trim()) {
        Alert.alert('Invalid variant', 'Each variant needs a Size (e.g. M, L, Free Size).');
        return;
      }

      const cost = Number(v.cost_price);
      const stock = Number(v.current_stock);
      if (!Number.isFinite(cost) || cost <= 0) {
        Alert.alert('Invalid cost price', `Check cost price for size ${v.size_label}`);
        return;
      }
      if (!Number.isInteger(stock) || stock < 0) {
        Alert.alert('Invalid stock', `Check stock for size ${v.size_label}`);
        return;
      }

      const minSell = v.min_selling_price.trim() ? Number(v.min_selling_price) : null;
      const maxSell = v.max_selling_price.trim() ? Number(v.max_selling_price) : null;
      if (minSell != null && !Number.isFinite(minSell)) {
        Alert.alert('Invalid min selling price', `Check min selling price for size ${v.size_label}`);
        return;
      }
      if (maxSell != null && !Number.isFinite(maxSell)) {
        Alert.alert('Invalid max selling price', `Check max selling price for size ${v.size_label}`);
        return;
      }

      const input: VariantUpsertInput = {
        id: v.id,
        productId,
        sizeLabel: v.size_label.trim(),
        costPrice: cost,
        minSellingPrice: minSell,
        maxSellingPrice: maxSell,
        currentStock: stock,
        notes: v.notes.trim() ? v.notes.trim() : null,
      };

      const db = await getDb();
      await upsertVariant(db, input);
    }

    Alert.alert('Saved', 'Variants saved locally.');
    await refresh();
  }, [items, productId, refresh]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={addRow} style={styles.buttonSecondary}>
          <Text style={styles.buttonSecondaryText}>Add Variant</Text>
        </Pressable>
        <Pressable onPress={() => void onSaveAll()} style={styles.buttonPrimary}>
          <Text style={styles.buttonPrimaryText}>Save</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, idx) => item.id ?? `new-${idx}`}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Variant {index + 1}</Text>
              <Pressable onPress={() => void onDelete(index)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Size</Text>
            <TextInput
              value={item.size_label}
              onChangeText={(t) => update(index, { size_label: t })}
              placeholder="e.g. M"
              style={styles.input}
            />

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cost Price</Text>
                <TextInput
                  value={item.cost_price}
                  onChangeText={(t) => update(index, { cost_price: t })}
                  keyboardType="numeric"
                  placeholder="500"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stock</Text>
                <TextInput
                  value={item.current_stock}
                  onChangeText={(t) => update(index, { current_stock: t })}
                  keyboardType="number-pad"
                  placeholder="10"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Min Sell</Text>
                <TextInput
                  value={item.min_selling_price}
                  onChangeText={(t) => update(index, { min_selling_price: t })}
                  keyboardType="numeric"
                  placeholder="700"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Max Sell</Text>
                <TextInput
                  value={item.max_selling_price}
                  onChangeText={(t) => update(index, { max_selling_price: t })}
                  keyboardType="numeric"
                  placeholder="900"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={item.notes}
              onChangeText={(t) => update(index, { notes: t })}
              placeholder="optional"
              style={styles.input}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No variants yet</Text>
            <Text style={styles.emptySubtitle}>Tap Add Variant to create size rows.</Text>
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
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: 'white',
    fontWeight: '800',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#111827',
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: '800',
  },
  deleteText: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  label: {
    marginTop: 10,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
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
