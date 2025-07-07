import React, { useEffect, useState, useLayoutEffect } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useESP } from './ESPContext';

import { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>



export default function SettingsScreen({ navigation }: Props) {
  const { sendToESP } = useESP();


  return (
    <View style={styles.container}>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1f1f1f' },
})
