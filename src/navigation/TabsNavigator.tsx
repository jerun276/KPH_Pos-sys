import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DealersScreen } from '../screens/DealersScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { RootStackParamList } from './types';

type TabParamList = {
  Home: undefined;
  Inventory: undefined;
  Action: undefined;
  Dealers: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function ActionTabButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('ActionModal')}
      style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.actionButtonText}>+</Text>
    </Pressable>
  );
}

export function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen
        name="Action"
        component={EmptyScreen}
        options={{
          title: '',
          tabBarButton: () => <ActionTabButton />,
        }}
      />
      <Tab.Screen name="Dealers" component={DealersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function EmptyScreen() {
  return <View />;
}

const styles = StyleSheet.create({
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
});
