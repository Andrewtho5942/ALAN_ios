// App.tsx
import * as React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import HomeScreen from './src/HomeScreen'
import ControllerScreen from './src/ControllerScreen'

type RootStackParamList = {
  Home: undefined;
  Controller: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();





export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTitleAlign: 'center',
          // make the header semi-transparent:
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',  // adjust alpha to taste
          },
          // set the color of the title & back button:
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
      </Stack.Navigator>
    </NavigationContainer>
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
