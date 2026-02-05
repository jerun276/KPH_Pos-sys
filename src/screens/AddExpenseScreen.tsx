import * as React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import { createExpense } from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

export function AddExpenseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [amount, setAmount] = React.useState<string>('');
  const [category, setCategory] = React.useState<string>('Rent');
  const [note, setNote] = React.useState<string>('');

  const onSave = React.useCallback(async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount > 0');
      return;
    }

    const db = await getDb();
    await createExpense(db, {
      amount: parsed,
      category,
      note: note.trim() ? note.trim() : undefined,
      expenseDate: Date.now(),
    });

    setAmount('');
    setNote('');
    Alert.alert('Saved', 'Expense recorded locally.');
    navigation.popToTop();
  }, [amount, category, navigation, note]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="e.g. 2500"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipsRow}>
        {['Rent', 'Electricity', 'Food', 'Transport', 'Salary', 'Packaging', 'Other'].map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Note</Text>
      <TextInput value={note} onChangeText={setNote} placeholder="optional" style={styles.input} />

      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Expense</Text>
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
    fontWeight: '600',
  },
  chipTextActive: {
    color: 'white',
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
});
