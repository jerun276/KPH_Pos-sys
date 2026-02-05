import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>Products + Variants (size matrix) will live here.</Text>
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
