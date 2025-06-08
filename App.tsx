// App.tsx
import * as React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

// 1) Define the navigation param list
type RootStackParamList = {
  Home: undefined;
  Details: { itemId: number; otherParam?: string };
};

// 2) Create the native stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// 3) Home screen
function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Button
        title="Go to Details"
        onPress={() =>
          navigation.push('Details', {
            itemId: 42,
            otherParam: 'Hello from Home',
          })
        }
      />
    </View>
  );
}

// 4) Details screen
function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Details'>) {
  const { itemId, otherParam } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details Screen</Text>
      <Text>itemId: {itemId}</Text>
      <Text>otherParam: {otherParam}</Text>
      <Button
        title="Update Title"
        onPress={() =>
          navigation.setOptions({ title: `Detail ${itemId}` })
        }
      />
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

// 5) App entrypoint
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          // native-stack uses the platform default animation (iOS slide, Android fade)
          headerTitleAlign: 'center',
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Overview' }}
        />
        <Stack.Screen
          name="Details"
          component={DetailsScreen}
          options={{ title: 'Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// 6) Basic styles
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
