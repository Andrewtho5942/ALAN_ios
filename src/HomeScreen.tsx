
import React from 'react';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  Button,
} from 'react-native';

import { RootStackParamList } from './types';


function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Button
        title="Controller Mode"
        onPress={() =>
          navigation.push('Controller')
        }
      />
      <Button
        title="Receiver Mode"
        onPress={() =>
          navigation.push('Receiver')
        }
      />
      <Button
        title="Settings"
        onPress={() =>
          navigation.push('Settings')
        }
      />
    </View>
  );
}

export default HomeScreen;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f1f'
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    color:'yellow'
  }
});
