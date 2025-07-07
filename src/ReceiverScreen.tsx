import React, { useEffect, useState, useLayoutEffect } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { mediaDevices } from 'react-native-webrtc';

import { useESP } from './ESPContext';
import { RootStackParamList } from './types';
import { useEmitterRTC } from './EmitterRTC';

type Props = NativeStackScreenProps<RootStackParamList, 'Receiver'>

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';

const pc = new RTCPeerConnection({
  iceServers: [], // empty means purely local
});

async function startLocalCamera() {
  const stream = await mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  return stream;
}


export default function ReceiverScreen({ navigation }: Props) {
  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(camSide)
  const { sendToESP } = useESP();
  useEmitterRTC();


  useEffect(() => {
     (async () => {
      await Camera.requestCameraPermission()
      await Camera.requestMicrophonePermission()
    })()
  }, [])


  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{
            backgroundColor: camSide === 'back' ? '#2080ee' : '#cccc66',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 4,
          }}
          onPress={() =>
            setCamSide((p) => (p === 'back' ? 'front' : 'back'))
          }
          activeOpacity={0.7}
        >
          <Text style={{ 
            color: camSide === 'back' ? 'white' : 'black',
            fontSize: 16 }}>
            {camSide === 'back' ? 'Back Cam' : 'Front Cam'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, camSide]);


  // loading screen for while the camera device isnt ready yet
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
