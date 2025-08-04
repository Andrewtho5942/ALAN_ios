import React, { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { mediaDevices, RTCView  } from 'react-native-webrtc';

import { useESP } from './ESPContext';
import { RootStackParamList } from './types';
import useEmitterRTC from './EmitterRTC';
// import { initTF, getModel } from './tfSetup.tsx'

// computer vision imports
import { captureRef } from 'react-native-view-shot';

import Tflite from 'react-native-tflite';

import RNFS from 'react-native-fs';
const path = RNFS.MainBundlePath + '/MobileNet-v2.tflite';
RNFS.exists(path).then(exists =>
  console.log('model bundled?', exists)
);

type Props = NativeStackScreenProps<RootStackParamList, 'Receiver'>

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';

const pc = new RTCPeerConnection({
  iceServers: [], // empty means purely local
});


async function runInference() {
  console.log('runInference start');
  const tflite = new Tflite();
  console.log('→ Tflite instance created:', tflite);

  console.log('loading model…');
  tflite.loadModel(
    {
      model: 'MobileNet-v2.tflite',   
    },
    (err: any, res: any) => {
      if (err) {
        console.error('loadModel error:', err);
        return;
      }
      console.log('loadModel result:', res);

      // now that the model is loaded, run your inference
      console.log('running inference on image…');
      tflite.runModelOnImage(
        {
          path: 'bball.jpg',    // put your image in the same bundle folder
          imageMean: 127.5,
          imageStd: 127.5,
          numResults: 5,
          threshold: 0.1,
        },
        (err2: any, out: any) => {
          if (err2) {
            console.error('runModelOnImage error:', err2);
          } else {
            console.log('runModelOnImage results:', out);
          }
        }
      );
    }
  );
}

export default function ReceiverScreen({ navigation }: Props) {
  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const [zoom, setZoom] = useState<any>(1.0);

  const { sendToESP } = useESP();
  const [stream, setStream] = useState<any>(null);
  const streamRef = useRef<any>(null);
  const viewCamRef = useRef<View>(null);

  runInference()


  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  
  const handleControllerCommand = async (cmd: string, value?: any) => {
    if(cmd == 'switchCam') {
      if(value) {
        setCamSide(value);
      } else {
        setCamSide(s => s === 'back' ? 'front' : 'back');
      }
    } else if (cmd == 'zoomCam') {
      if (value == null) {
        console.error('zoomCam: No zoom value provided');
        return;
      }
      setZoom(value)
    } else {
      console.error('ERROR in ReceiverScreen: Unrecognized controller command!')
    }
  }

  const sendCommand = useEmitterRTC(handleControllerCommand, stream);


  useEffect(() => {
     (async () => {
      await Camera.requestCameraPermission()
      await Camera.requestMicrophonePermission()
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const devices:any = await mediaDevices.enumerateDevices()
      const front  = devices.find((d:any) => d.label.includes('Front'));
      const backUltra = devices.find((d:any) => d.label.includes('Ultra'));
      
      const newStream = await mediaDevices.getUserMedia({
        video: {
          deviceId: camSide == 'front' ? front.deviceId : backUltra.deviceId
        },
        audio: true,
      });
      setStream(newStream);
    })();
  }, [camSide]);


  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <>
        <TouchableOpacity
          style={{
            backgroundColor: camSide === 'back' ? '#2080ee' : '#cccc66',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 4,
          }}
          onPress={() => {
            let newCamSide : ('front' | 'back') = (camSide === 'back' ? 'front' : 'back');
            handleControllerCommand('switchCam', newCamSide);
            sendCommand('switchCam', newCamSide);
          }
          }
          activeOpacity={0.7}
        >
          <Text style={{ 
            color: camSide === 'back' ? 'white' : 'black',
            fontSize: 16 }}>
            {camSide === 'back' ? 'Back Cam' : 'Front Cam'}
          </Text>
        </TouchableOpacity>
        </>
        
      ),
    });
  }, [navigation, camSide]);



 return (
  <View ref={viewCamRef} style={styles.container}>
    {stream ? (
      <View style={{
         flex:1,
          transform: [{ scale: zoom }],
          alignItems:'center',
          justifyContent:'center',
      }}>
        <RTCView
          style={StyleSheet.absoluteFill}
          streamURL={stream.toURL()}
          objectFit="cover" 
        />
      </View>
      
    ) : (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading camera…</Text>
      </View>
    )}
  </View>
);
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black'
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: { color: 'white', fontSize: 24 },
})
