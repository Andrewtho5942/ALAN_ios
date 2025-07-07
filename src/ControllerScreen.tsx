import React, { useEffect, useState, useLayoutEffect } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useESP } from './ESPContext';

import Joystick from './Joystick'
import VerticalSlider from './VerticalSlider'
import { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Controller'>



export default function ControllerScreen({ navigation }: Props) {
  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(camSide)
  const { sendToESP } = useESP();


  function joystickOnMove(
    pos: { x: number; y: number }, 
  ) {
    pos.y = -pos.y
    let l = pos.y + pos.x
    let r = pos.y - pos.x
    const maxMag = Math.max(Math.abs(l), Math.abs(r), 1);
    l = Math.round((l / maxMag) * 255);
    r = Math.round((r / maxMag) * 255);

    console.log('joystick moved..  pos: ', pos, ' | l: ', l, ' , r: ', r);
    sendToESP('m', {'l' : l, 'r' : r});
  }

  function sliderOnMove(pos: number) {
    console.log('slider moved: ', pos)
    sendToESP('s', {'s' : pos});
  }

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
      <Joystick onMove={joystickOnMove} style={{
        position: 'absolute',
        right: 50,
        bottom: 40
      }} />
      <VerticalSlider onMove={sliderOnMove} style={{
        position: 'absolute',
        left: 70,
        bottom: 40
      }}/>
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
