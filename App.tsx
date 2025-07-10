// App.tsx
import React, { createContext, useContext } from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import axios from 'axios';

import HomeScreen from './src/HomeScreen'
import ControllerScreen from './src/ControllerScreen'
import ReceiverScreen from './src/ReceiverScreen'
import SettingsScreen from './src/SettingsScreen'
import { ESPProvider } from './src/ESPContext';
import { RootStackParamList } from './src/types';

import { NativeModules } from 'react-native';
console.log('📦 NativeModules:', NativeModules);
console.log(
  '🔑 All module names:',
  Reflect.ownKeys(NativeModules)
);

// inspect your WebRTC module directly
console.log(
  '🔧 WebRTCModule contents:',
  Reflect.ownKeys(NativeModules.WebRTCModule),
  NativeModules.WebRTCModule
);

//Start command:
// npx react-native start METRO_HOST=100.68.78.107

const Stack = createNativeStackNavigator<RootStackParamList>();





export default function App() {
  return (
  // <MultipeerProvider serviceType='alan_service'>
    <ESPProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerTitleAlign: 'center',
            headerTransparent: true,
            headerStyle: {
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 20
            },
            
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen
            name="Controller"
            component={ControllerScreen}
            options={{ title: 'Controller' }}
          />
          <Stack.Screen
            name="Receiver"
            component={ReceiverScreen}
            options={{ title: 'Receiver' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ESPProvider>
  // </MultipeerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    marginBottom: 16
  }
});
