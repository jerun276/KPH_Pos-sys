import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';

import { ActionModalScreen } from '../screens/ActionModalScreen';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { ProductUpsertScreen } from '../screens/ProductUpsertScreen';
import { RecordSaleScreen } from '../screens/RecordSaleScreen';
import { VariantsEditorScreen } from '../screens/VariantsEditorScreen';
import { TabsNavigator } from './TabsNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="ActionModal"
        component={ActionModalScreen}
        options={{
          presentation: 'modal',
          title: 'New',
        }}
      />
      <Stack.Screen name="RecordSale" component={RecordSaleScreen} options={{ title: 'Record Sale' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="ProductUpsert" component={ProductUpsertScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="VariantsEditor" component={VariantsEditorScreen} options={{ title: 'Variants' }} />
    </Stack.Navigator>
  );
}
