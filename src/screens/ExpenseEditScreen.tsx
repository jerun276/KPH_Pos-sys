import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '../db/database';
import { getExpenseById, updateExpense } from '../db/queries';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseEdit'>;

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

export function ExpenseEditScreen({ navigation, route }: Props) {
  const { expenseId } = route.params;

  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [note, setNote] = React.useState('');

  const [expenseDate, setExpenseDate] = React.useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const datePickerMod = React.useMemo(() => tryGetDateTimePicker(), []);
  const DateTimePicker = datePickerMod?.DateTimePicker;

  React.useEffect(() => {
    const load = async () => {
      const db = await getDb();
      const row = await getExpenseById(db, expenseId);
      if (!row) {
        Alert.alert('Not found', 'Expense not found');
        navigation.goBack();
        return;
      }
      setAmount(String(row.amount));
      setCategory(row.category);
      setNote(row.note ?? '');
      setExpenseDate(new Date(row.expense_date));
    };

    void load();
  }, [expenseId, navigation]);

  const onSave = React.useCallback(async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount > 0');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Invalid category', 'Enter a category');
      return;
    }

    try {
      const db = await getDb();
      await updateExpense(db, {
        id: expenseId,
        category: category.trim(),
        amount: parsed,
        expenseDate: expenseDate.getTime(),
        note: note.trim() ? note.trim() : null,
      });
      Alert.alert('Saved', 'Expense updated.');
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      Alert.alert('Error', msg);
    }
  }, [amount, category, expenseDate, expenseId, navigation, note]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <TextInput value={category} onChangeText={setCategory} style={styles.input} />

      <Text style={styles.label}>Date</Text>
      {DateTimePicker ? (
        <>
          <Pressable onPress={() => setShowDatePicker(true)} style={styles.select}>
            <Text style={styles.selectText}>{formatDate(expenseDate)}</Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, selected?: Date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (event?.type === 'dismissed') return;
                if (!selected) return;
                setExpenseDate(selected);
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
        <Text style={styles.muted}>Install date picker to enable date selection.</Text>
      )}

      <Text style={styles.label}>Note</Text>
      <TextInput value={note} onChangeText={setNote} style={styles.input} placeholder="optional" />

      <Pressable onPress={() => void onSave()} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
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
  label: {
    marginTop: 12,
    fontWeight: '800',
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
    fontWeight: '800',
  },
  muted: {
    marginTop: 8,
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
    fontWeight: '900',
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
    fontWeight: '900',
  },
});
