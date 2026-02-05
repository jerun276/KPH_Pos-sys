import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import { listDealers, upsertProduct, type DealerRow, type ProductUpsertInput } from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductUpsert'>;

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

export function ProductUpsertScreen({ navigation, route }: Props) {
  const productId = route.params?.productId ?? null;

  const [name, setName] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [purchaseDateText, setPurchaseDateText] = React.useState<string>('');
  const [purchaseDate, setPurchaseDate] = React.useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [notes, setNotes] = React.useState<string>('');
  const [category, setCategory] = React.useState<string>('');
  const [material, setMaterial] = React.useState<string>('');

  const [dealers, setDealers] = React.useState<DealerRow[]>([]);
  const [dealerId, setDealerId] = React.useState<string | null>(null);
  const [showDealerPicker, setShowDealerPicker] = React.useState(false);

  React.useEffect(() => {
    navigation.setOptions({ title: productId ? 'Edit Product' : 'Add Product' });
  }, [navigation, productId]);

  React.useEffect(() => {
    const load = async () => {
      const db = await getDb();
      const d = await listDealers(db);
      setDealers(d);

      if (productId) {
        const p = await db.getFirstAsync<{
          id: string;
          dealer_id: string | null;
          name: string;
          image_uri: string | null;
          purchase_date: number | null;
          category: string | null;
          material: string | null;
          notes: string | null;
        }>('SELECT id, dealer_id, name, image_uri, purchase_date, category, material, notes FROM Products WHERE id = ?;', [
          productId,
        ]);

        if (!p) {
          Alert.alert('Not found', 'Product not found');
          navigation.goBack();
          return;
        }

        setName(p.name ?? '');
        setImageUri(p.image_uri ?? null);
        const dt = p.purchase_date ? new Date(p.purchase_date) : null;
        setPurchaseDate(dt);
        setPurchaseDateText(dt ? formatDate(dt) : '');
        setCategory(p.category ?? '');
        setMaterial(p.material ?? '');
        setNotes(p.notes ?? '');
        setDealerId(p.dealer_id ?? null);
      }
    };

    void load();
  }, [navigation, productId]);

  const pickImage = React.useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to pick product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (uri) setImageUri(uri);
  }, []);

  const parsePurchaseDate = React.useCallback((): number | null => {
    if (purchaseDate) return purchaseDate.getTime();

    const t = purchaseDateText.trim();
    if (!t) return null;

    const parsed = Date.parse(t);
    if (Number.isNaN(parsed)) return null;

    return parsed;
  }, [purchaseDate, purchaseDateText]);

  const onSave = React.useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter product name');
      return;
    }

    const parsedPurchaseDate = parsePurchaseDate();
    if (purchaseDateText.trim() && parsedPurchaseDate === null) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD (example: 2026-02-05)');
      return;
    }

    const input: ProductUpsertInput = {
      id: productId ?? undefined,
      dealerId,
      name: name.trim(),
      imageUri,
      purchaseDate: parsedPurchaseDate,
      category: category.trim() ? category.trim() : null,
      material: material.trim() ? material.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    const db = await getDb();
    const savedId = await upsertProduct(db, input);

    navigation.replace('VariantsEditor', { productId: savedId });
  }, [category, dealerId, imageUri, material, name, navigation, notes, parsePurchaseDate, productId, purchaseDateText]);

  const dealerName = React.useMemo(() => {
    if (!dealerId) return 'None';
    return dealers.find((d) => d.id === dealerId)?.name ?? 'Unknown';
  }, [dealerId, dealers]);

  const datePickerMod = React.useMemo(() => tryGetDateTimePicker(), []);
  const DateTimePicker = datePickerMod?.DateTimePicker;
  const datePickerAvailable = !!DateTimePicker;
  const effectiveDate = purchaseDate ?? (purchaseDateText.trim() ? new Date(Date.parse(purchaseDateText.trim())) : new Date());

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Silk Saree" style={styles.input} />

      <Text style={styles.label}>Image</Text>
      <View style={styles.row}>
        <Pressable onPress={pickImage} style={styles.button}>
          <Text style={styles.buttonText}>{imageUri ? 'Change Image' : 'Pick Image'}</Text>
        </Pressable>
        <Text style={styles.muted} numberOfLines={1}>
          {imageUri ?? 'No image selected'}
        </Text>
      </View>

      <Text style={styles.label}>Dealer</Text>
      <Pressable onPress={() => setShowDealerPicker((v) => !v)} style={styles.select}>
        <Text style={styles.selectText}>{dealerName}</Text>
      </Pressable>
      {showDealerPicker ? (
        <View style={styles.pickerBox}>
          <Pressable
            onPress={() => {
              setDealerId(null);
              setShowDealerPicker(false);
            }}
            style={styles.pickerItem}
          >
            <Text style={styles.pickerText}>None</Text>
          </Pressable>
          <FlatList
            data={dealers}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setDealerId(item.id);
                  setShowDealerPicker(false);
                }}
                style={styles.pickerItem}
              >
                <Text style={styles.pickerText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <Text style={styles.label}>Purchase Date</Text>
      {datePickerAvailable ? (
        <>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.select}
          >
            <Text style={styles.selectText}>{purchaseDate ? formatDate(purchaseDate) : 'Select date'}</Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={effectiveDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, selected?: Date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (event?.type === 'dismissed') return;
                if (!selected) return;
                setPurchaseDate(selected);
                setPurchaseDateText(formatDate(selected));
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showDatePicker ? (
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={[styles.button, { alignSelf: 'flex-start', marginTop: 10 }]}
            >
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <TextInput
            value={purchaseDateText}
            onChangeText={(t) => {
              setPurchaseDate(null);
              setPurchaseDateText(t);
            }}
            placeholder="YYYY-MM-DD (example: 2026-02-05)"
            style={styles.input}
          />
        </>
      )}

      <Text style={styles.label}>Category</Text>
      <TextInput value={category} onChangeText={setCategory} placeholder="optional" style={styles.input} />

      <Text style={styles.label}>Material</Text>
      <TextInput value={material} onChangeText={setMaterial} placeholder="optional" style={styles.input} />

      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="optional" style={styles.input} />

      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save & Manage Variants</Text>
      </Pressable>

      {!dealers.length ? (
        <Text style={styles.helper}>Tip: add dealers from the Dealers tab to select here.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  label: {
    marginTop: 12,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  muted: {
    flex: 1,
    color: '#6B7280',
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
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
    fontWeight: '600',
  },
  pickerBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 180,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerText: {
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  helper: {
    marginTop: 12,
    color: '#6B7280',
  },
});
