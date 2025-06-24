import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

type RootStackParamList = {
  Home: undefined
  Controller: undefined,
  Receiver: undefined
}
type Props = NativeStackScreenProps<RootStackParamList, 'Receiver'>

export default function ReceiverScreen({}: Props) {
  const device = useCameraDevice('back')

  useEffect(() => {
    ;(async () => {
      const cam = await Camera.requestCameraPermission()
      const mic = await Camera.requestMicrophonePermission()
    })()
  }, [])

  if (device == null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading camera…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        photo={true}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: { color: 'white', fontSize: 18 },
})
