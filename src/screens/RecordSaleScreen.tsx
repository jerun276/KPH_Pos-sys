import * as React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import {
  createSaleAndUpdateStock,
  listProductsForSale,
  listVariantsForSale,
  type ProductSaleRow,
  type VariantSaleRow,
} from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tryGetDateTimePicker(): null | {
  DateTimePicker: React.ComponentType<any>;
} {
  try {
    const mod = require('@react-native-community/datetimepicker');
    const DateTimePicker = mod?.default ?? mod?.DateTimePicker;
    if (!DateTimePicker) return null;
    return { DateTimePicker };
  } catch {
    return null;
  }
}

export function RecordSaleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [productSearch, setProductSearch] = React.useState('');
  const [products, setProducts] = React.useState<ProductSaleRow[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);

  const [variants, setVariants] = React.useState<VariantSaleRow[]>([]);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);

  const [soldPriceText, setSoldPriceText] = React.useState('');
  const [qty, setQty] = React.useState(1);
  const [isReturn, setIsReturn] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const [saleDate, setSaleDate] = React.useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const datePickerMod = React.useMemo(() => tryGetDateTimePicker(), []);
  const DateTimePicker = datePickerMod?.DateTimePicker;

  const selectedVariant = React.useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const refreshProducts = React.useCallback(async () => {
    const db = await getDb();
    const rows = await listProductsForSale(db, { search: productSearch });
    setProducts(rows);
  }, [productSearch]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      void refreshProducts();
    }, 250);
    return () => clearTimeout(t);
  }, [refreshProducts]);

  const refreshVariants = React.useCallback(async () => {
    if (!selectedProductId) {
      setVariants([]);
      setSelectedVariantId(null);
      return;
    }

    const db = await getDb();
    const rows = await listVariantsForSale(db, selectedProductId);
    setVariants(rows);
    setSelectedVariantId(null);
  }, [selectedProductId]);

  React.useEffect(() => {
    void refreshVariants();
  }, [refreshVariants]);

  const onSelectVariant = React.useCallback(
    (v: VariantSaleRow) => {
      setSelectedVariantId(v.id);
      const suggested = v.min_selling_price ?? v.max_selling_price ?? null;
      if (suggested != null) {
        setSoldPriceText(String(suggested));
      } else {
        setSoldPriceText('');
      }
      setQty(1);
    },
    [],
  );

  const onSave = React.useCallback(async () => {
    if (!selectedVariantId) {
      Alert.alert('Missing variant', 'Select a size/variant');
      return;
    }

    const price = Number(soldPriceText);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a sold price > 0');
      return;
    }

    const db = await getDb();
    try {
      await createSaleAndUpdateStock(db, {
        variantId: selectedVariantId,
        finalSoldPrice: price,
        quantity: qty,
        saleDate: saleDate.getTime(),
        isReturn,
        notes: notes.trim() ? notes.trim() : null,
      });

      Alert.alert('Saved', isReturn ? 'Return recorded.' : 'Sale recorded.');

      setSoldPriceText('');
      setQty(1);
      setNotes('');
      setSelectedVariantId(null);
      await refreshVariants();
      navigation.popToTop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      Alert.alert('Error', msg);
    }
  }, [isReturn, navigation, notes, qty, refreshVariants, saleDate, selectedVariantId, soldPriceText]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Product</Text>
      <TextInput
        value={productSearch}
        onChangeText={setProductSearch}
        placeholder="Search product"
        style={styles.search}
        autoCapitalize="words"
      />

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        style={{ maxHeight: 180 }}
        renderItem={({ item }) => {
          const active = item.id === selectedProductId;
          return (
            <Pressable
              onPress={() => setSelectedProductId(item.id)}
              style={[styles.listItem, active && styles.listItemActive]}
            >
              <Text style={[styles.listItemText, active && styles.listItemTextActive]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.muted}>No products found.</Text>}
      />

      <Text style={styles.sectionTitle}>Size / Variant</Text>
      <View style={styles.chipsRow}>
        {variants.map((v) => {
          const active = v.id === selectedVariantId;
          const disabled = !isReturn && v.current_stock <= 0;
          return (
            <Pressable
              key={v.id}
              disabled={disabled}
              onPress={() => onSelectVariant(v)}
              style={[
                styles.chip,
                active && styles.chipActive,
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {v.size_label} ({v.current_stock})
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!selectedProductId ? <Text style={styles.muted}>Select a product first.</Text> : null}
      {selectedProductId && !variants.length ? <Text style={styles.muted}>No variants for this product yet.</Text> : null}

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Return mode</Text>
        <Switch value={isReturn} onValueChange={setIsReturn} />
      </View>

      <View style={styles.grid2}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Sold Price</Text>
          <TextInput
            value={soldPriceText}
            onChangeText={setSoldPriceText}
            placeholder={selectedVariant?.min_selling_price != null ? String(selectedVariant.min_selling_price) : '0'}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQty((q) => Math.max(1, q - 1))}
              style={styles.stepperBtn}
            >
              <Text style={styles.stepperBtnText}>-</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{qty}</Text>
            <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Date</Text>
      {DateTimePicker ? (
        <>
          <Pressable onPress={() => setShowDatePicker(true)} style={styles.select}>
            <Text style={styles.selectText}>{formatDate(saleDate)}</Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={saleDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, selected?: Date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (event?.type === 'dismissed') return;
                if (!selected) return;
                setSaleDate(selected);
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showDatePicker ? (
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={[styles.buttonPrimary, { alignSelf: 'flex-start', marginTop: 10 }]}
            >
              <Text style={styles.buttonPrimaryText}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>Install date picker to enable date selection.</Text>
      )}

      <Text style={styles.sectionTitle}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="optional" style={styles.input} />

      <Pressable onPress={() => void onSave()} style={styles.buttonPrimary}>
        <Text style={styles.buttonPrimaryText}>{isReturn ? 'Save Return' : 'Save Sale'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    marginTop: 12,
    fontWeight: '800',
    color: '#111827',
  },
  muted: {
    marginTop: 8,
    color: '#6B7280',
  },
  search: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  listItem: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  listItemActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  listItemText: {
    fontWeight: '700',
    color: '#111827',
  },
  listItemTextActive: {
    color: 'white',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    color: '#111827',
    fontWeight: '700',
  },
  chipTextActive: {
    color: 'white',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepper: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  stepperValue: {
    fontWeight: '900',
    fontSize: 16,
    color: '#111827',
  },
  select: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  selectText: {
    color: '#111827',
    fontWeight: '700',
  },
  buttonPrimary: {
    marginTop: 18,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: 'white',
    fontWeight: '900',
  },
});
