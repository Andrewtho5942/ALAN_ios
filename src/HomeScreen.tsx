
import React from 'react';
import axios, {AxiosError} from 'axios';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  Button,
} from 'react-native';

type RootStackParamList = {
  Home: undefined;
  Controller: undefined;
  Receiver: undefined;
};


const sendToESP = async () => {
  try {
    const start = performance.now()
    const res = await axios.get("http://192.168.6.123/msg", {
    params: { data: "ping" },
  });
  console.log('Latency: ', performance.now() - start)
  console.log('Status: ', res.data.status); 
  console.log('Echo: ', res.data.echo);
  console.log('Mode: ', res.data.mode);

  } catch (err) {
   if (axios.isAxiosError(err)) {
      console.error("Axios error:", err.message);
    } else {
      console.error("Unknown error:", (err as Error).message);
    }
  }
};


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
      <Button title="Send to ESP" onPress={sendToESP} />
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
