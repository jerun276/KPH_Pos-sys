import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActionModal'>;

export function ActionModalScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.navigate('RecordSale')}
        style={[styles.bigButton, { backgroundColor: '#16A34A' }]}
      >
        <Text style={styles.bigButtonTitle}>Record Sale</Text>
        <Text style={styles.bigButtonSubtitle}>Deduct stock, calculate revenue.</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('AddExpense')}
        style={[styles.bigButton, { backgroundColor: '#DC2626' }]}
      >
        <Text style={styles.bigButtonTitle}>Add Expense</Text>
        <Text style={styles.bigButtonSubtitle}>Track rent, electricity, etc.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    gap: 12,
  },
  bigButton: {
    padding: 16,
    borderRadius: 14,
  },
  bigButtonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  bigButtonSubtitle: {
    marginTop: 6,
    color: 'white',
    opacity: 0.9,
  },
});
