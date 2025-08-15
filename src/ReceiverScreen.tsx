import React, { useEffect, useState, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity, PixelRatio } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { mediaDevices, RTCView } from 'react-native-webrtc';

import { useESP } from './ESPContext';
import { RootStackParamList } from './types';
import useEmitterRTC from './EmitterRTC';

import RNFS from 'react-native-fs';

import { loadTensorflowModel } from 'react-native-fast-tflite';
import { captureRef } from 'react-native-view-shot';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';


const filePath = `${RNFS.MainBundlePath}/EfficientDet-lite0.tflite`;
const url = `file://${filePath}`;

 const model_labels = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
  "truck", "boat", "traffic light", "fire hydrant", "???",
  "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep",
  "cow", "elephant", "bear", "zebra", "giraffe", "???", "backpack",
  "umbrella", "???", "???", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite",
  "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "???", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
  "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
  "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "???", "dining table", "???", "???",
  "toilet", "???", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
  "microwave", "oven", "toaster", "sink", "refrigerator", "???", "book",
  "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

type Props = NativeStackScreenProps<RootStackParamList, 'Receiver'>

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';
import { over } from 'lodash';

const pc = new RTCPeerConnection({
  iceServers: [], // empty means purely local
});


export default function ReceiverScreen({ navigation }: Props) {
  const viewShotRef = useRef<View>(null);
  const [boxes, setBoxes] = useState<any>([]);
  // const [overlaySize, setOverlaySize] = useState({width:0, height:0});
  const busyRef = useRef(false);
  const modelRef = useRef<ReturnType<typeof loadTensorflowModel> extends Promise<infer T> ? T : any | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const [zoom, setZoom] = useState<any>(1.0);

  const { sendToESP } = useESP();
  const [stream, setStream] = useState<any>(null);
  const streamRef = useRef<any>(null);

 // load the model once
  useEffect(() => {
    let cancelled = false;
    loadTensorflowModel({ url }, 'core-ml').then(m => {
      if (!cancelled) modelRef.current = m;
    }).catch(e => console.warn('model load failed', e));
    return () => { cancelled = true; };
  }, []);

  const onLayout = useCallback((e:any) => {
  const { width, height } = e.nativeEvent.layout;
  sizeRef.current = { w: width, h: height };
  }, []);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);


  const tick = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      if (!modelRef.current || !viewShotRef.current) return;

      // Read shape + dtype directly from the model
      const inputInfo = modelRef.current.inputs[0]; // { name, dataType, shape: [1, H, W, C] }
      const [, H, W, C] = inputInfo.shape;
      if (C !== 3) throw new Error(`Unsupported channels: expected 3, got ${C}`);

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

      const outs = modelRef.current.runSync([input]);

      const boxes = outs[0];
      const classes = outs[1];
      const scores = outs[2];
      const count = Math.min((outs[3] as Float32Array)[0] | 0, scores.length);; // Float32Array length = 1

      const threshold = 0.5;
      const dets = [];
      for (let i = 0; i < count; i++) {
        const score = scores[i];
        if (score < threshold) continue;

        const id = Math.round(classes[i] as any);
        const off = i * 4;
        let w= sizeRef.current.w;
        let h=sizeRef.current.h;
        let xmin:any = boxes[off + 1]
        let ymin:any = boxes[off + 0]

        let box = {
        left:  Math.max(0, xmin * w),
        top:   Math.max(0, ymin * h),
        width: Math.max(0, (boxes[off + 3] as any - xmin) * w),
        height:Math.max(0, (boxes[off + 2] as any - ymin) * h),
        };  
        
        let label = model_labels[id]

        dets.push({ id, label, score, box: box });
      }

      console.log(dets)
      setBoxes(dets)
    } catch (e: any) {
      console.warn('runSync failed:', e?.message ?? e);
    } finally {
      busyRef.current = false;
    }
  }, [viewShotRef]);


  useEffect(() => {
    const id = setInterval(() => { tick().catch(() => { }); }, 100);
    return () => clearInterval(id);
  }, [tick]);


  const handleControllerCommand = async (cmd: string, value?: any) => {
    if (cmd == 'switchCam') {
      if (value) {
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
      const devices: any = await mediaDevices.enumerateDevices()
      const front = devices.find((d: any) => d.label.includes('Front'));
      const backUltra = devices.find((d: any) => d.label.includes('Ultra'));

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
              let newCamSide: ('front' | 'back') = (camSide === 'back' ? 'front' : 'back');
              handleControllerCommand('switchCam', newCamSide);
              sendCommand('switchCam', newCamSide);
            }
            }
            activeOpacity={0.7}
          >
            <Text style={{
              color: camSide === 'back' ? 'white' : 'black',
              fontSize: 16
            }}>
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
        onLayout={onLayout}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: zoom }],
        }}
      >
        <RTCView
          style={StyleSheet.absoluteFill}
          streamURL={stream.toURL()}
          objectFit="cover"
        />

        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="none">
         
          {boxes.map((b:any, i:any) => (
             <View
              key={i}
              style={[
               
                { 
                left: b.box.left, top: b.box.top, width: b.box.width, height: b.box.height,
                position: 'absolute',
                borderWidth: 2,
                borderColor: '#00e913ff',
                 },
              ]}
            >
              <Text style={styles.tag}>
                {b.label} {(b.score * 100).toFixed(0)}%
              </Text>
            </View> 
          ))} 
             

        </View>
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
  tag: {
    position: 'absolute',
    left: 0, top: -18,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    fontSize: 12,
  },
})
