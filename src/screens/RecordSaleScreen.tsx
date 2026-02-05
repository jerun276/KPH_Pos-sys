import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function RecordSaleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record Sale</Text>
      <Text style={styles.subtitle}>This screen will: select variant, set price/qty, and update stock.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#374151',
    fontSize: 14,
  },
});
