import React, { useEffect, useState, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity, PixelRatio } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { mediaDevices, RTCView  } from 'react-native-webrtc';

import { useESP } from './ESPContext';
import { RootStackParamList } from './types';
import useEmitterRTC from './EmitterRTC';

import RNFS from 'react-native-fs';

import { loadTensorflowModel } from 'react-native-fast-tflite';
import {captureRef} from 'react-native-view-shot';
import {toByteArray} from 'base64-js';
import jpeg from 'jpeg-js';

const MODEL_W = 192;
const MODEL_H = 192;
const filePath = `${RNFS.MainBundlePath}/MobileNet-v2.tflite`;
const url = `file://${filePath}`; 


// (async () => {
//   const filePath = `${RNFS.MainBundlePath}/MobileNet-v2.tflite`;
//   const url = `file://${filePath}`;   
//   const model = await loadTensorflowModel({url}, 'core-ml');
//   console.log('model: ', model)
// })();

type Props = NativeStackScreenProps<RootStackParamList, 'Receiver'>

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';

const pc = new RTCPeerConnection({
  iceServers: [], // empty means purely local
});


export default function ReceiverScreen({ navigation }: Props) {
  const viewShotRef = useRef<View>(null);

  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const [zoom, setZoom] = useState<any>(1.0);

  const { sendToESP } = useESP();
  const [stream, setStream] = useState<any>(null);
  const streamRef = useRef<any>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  
  const modelPromise = useMemo(() => 
    loadTensorflowModel({url}, 'core-ml'),
  []);
  const busyRef = { current: false }; // or useRef(false)

const tick = useCallback(async () => {
  if (busyRef.current) return;
  busyRef.current = true;

  try {
    const model = await modelPromise;
    if (!model || !viewShotRef.current) return;

    // Read shape + dtype directly from the model
    const inputInfo = model.inputs[0]; // { name, dataType, shape: [1, H, W, C] }
    const [, H, W, C] = inputInfo.shape;
    if (C !== 3) throw new Error(`Unsupported channels: expected 3, got ${C}`);

    // Request capture in points -> pixels using PixelRatio
    const pr = PixelRatio.get();

    const b64 = await captureRef(viewShotRef, {
      format: 'jpg',
      quality: 0.7,
      result: 'base64',
      width: Math.max(1, W / pr),
      height: Math.max(1, H / pr),
    });

    const { width, height, data: rgba } = jpeg.decode(toByteArray(b64), { useTArray: true });
    if (width !== W || height !== H) {
      console.warn(`Snapshot size mismatch: got ${width}x${height}, wanted ${W}x${H}`);
      return;
    }

    // Build input tensor exactly matching model spec
    let input: Float32Array | Uint8Array;
    if (inputInfo.dataType === 'float32') {
      const buf = new Float32Array(W * H * 3);
      for (let i = 0, j = 0; i < rgba.length; i += 4) {
        buf[j++] = rgba[i] / 255;       // R
        buf[j++] = rgba[i + 1] / 255;   // G
        buf[j++] = rgba[i + 2] / 255;   // B
      }
      input = buf;
    } else if (inputInfo.dataType === 'uint8') {
      const buf = new Uint8Array(W * H * 3);
      for (let i = 0, j = 0; i < rgba.length; i += 4) {
        buf[j++] = rgba[i];       // R
        buf[j++] = rgba[i + 1];   // G
        buf[j++] = rgba[i + 2];   // B
      }
      input = buf;
    } else {
      throw new Error(`Unsupported input dtype: ${inputInfo.dataType}`);
    }

    const out = model.runSync([input]);
    console.log(out)
  } catch (e: any) {
    console.warn('runSync failed:', e?.message ?? e);
    try {
      const info = (await modelPromise)?.inputs?.[0];
      if (info) {
        const expected = info.shape.reduce((a: number, b: number) => a * (b > 0 ? b : 1), 1);
        console.warn('Model input spec:', info, 'expectedElements=', expected);
      }
    } catch {}
  } finally {
    busyRef.current = false;
  }
}, [modelPromise, viewShotRef]);


  useEffect(() => {
    // 5 Hz capture
    const id = setInterval(() => { tick().catch(()=>{}); }, 2000);
    return () => clearInterval(id);
  }, [tick]);


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

  const sendCommand = useEmitterRTC(stream, handleControllerCommand);


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
  <View style={styles.container}>
    {stream ? (
      <View 
      ref={viewShotRef}
      collapsable={false}
      style={{
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
