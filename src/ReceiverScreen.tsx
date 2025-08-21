import React, { useEffect, useState, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { View, Text, Image, StyleSheet, Button, TouchableOpacity, PixelRatio, Vibration, Pressable } from 'react-native'
import { Camera, useCameraDevice } from 'react-native-vision-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { mediaDevices, RTCView } from 'react-native-webrtc';

import { useESP } from './ESPContext';
import { RootStackParamList } from './types';
import useEmitterRTC from './EmitterRTC';
import { GreedyTracker, Track, Det } from './tracker';

import RNFS from 'react-native-fs';

import { loadTensorflowModel } from 'react-native-fast-tflite';
import { captureRef } from 'react-native-view-shot';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';


const filePath = `${RNFS.MainBundlePath}/EfficientDet-lite0.tflite`;
const url = `file://${filePath}`;

 const model_labels = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
  "truck", "boat", "traffic light", "fire hydrant", "???", "stop sign", "parking meter", 
  "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", 
  "giraffe", "???", "backpack", "umbrella", "???", "???", "handbag", "tie", "suitcase", 
  "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "???", "wine glass", "cup", "fork", 
  "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
  "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "???", 
  "dining table", "???", "???", "toilet", "???", "tv", "laptop", "mouse", "remote", "keyboard", 
  "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "???", "book",
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
  const trackerRef = useRef(new GreedyTracker());
  const [tracks, setTracks] = useState<Track[]>([]);

  const viewShotRef = useRef<View>(null);

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
      const model = modelRef.current;
      const view  = viewShotRef.current;
      if (!model || !view) return

      const inputInfo = model.inputs[0];
      const [, H, W, C] = inputInfo.shape;
      if (C !== 3) throw new Error(`Unsupported channels: expected 3, got ${C}`);

      const pr = PixelRatio.get();

      const b64 = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.7,
        result: 'base64',
        width: W/pr,
        height: H/pr
      });

      const { width: srcW, height: srcH, data: rgba } = jpeg.decode(toByteArray(b64), { useTArray: true });

      if ((srcW !== W) || (srcH !== H)) {
        console.warn(`Snapshot size mismatch: got ${srcW}x${srcH}, wanted ${W}x${H}`);
        return;
      }

      // Build input tensor exactly matching model specs
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



      const r = sizeRef.current.w / sizeRef.current.h; // target aspect ratio
      let contentWFrac = 1, contentHFrac = 1, padXFrac = 0, padYFrac = 0;
      if (r < 1) {                 // tall screen (portrait)
        contentWFrac = r;
        padXFrac = (1 - contentWFrac) / 2;
      } else if (r > 1) {          // wide screen (landscape/wide)
        contentHFrac = 1 / r;
        padYFrac = (1 - contentHFrac) / 2;
      }
      const clamp01 = (v:number) => Math.max(0, Math.min(1, v));
      const unpadX = (x:number) => clamp01((x - padXFrac) / contentWFrac);
      const unpadY = (y:number) => clamp01((y - padYFrac) / contentHFrac);


      const outs = model.runSync([input]);

      const boxes = outs[0];
      const classes = outs[1];
      const scores = outs[2];
      const count = Math.min((outs[3] as Float32Array)[0] | 0, scores.length);

      const threshold = 0.5;

    const dets: Det[] = [];
    for (let i = 0; i < count; i++) {
      const score = scores[i] as number;
      if (score < threshold) continue;

      const id = Math.round(classes[i] as number);

      const offset = i * 4;
      let ymin = boxes[offset + 0] as number;
      let xmin = boxes[offset + 1] as number;
      let ymax = boxes[offset + 2] as number;
      let xmax = boxes[offset + 3] as number;

      // clamp and fix any inverted edges
      ymin = clamp01(ymin);
      xmin = clamp01(xmin);
      ymax = clamp01(ymax);
      xmax = clamp01(xmax);
      if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
      if (xmax < xmin) [xmin, xmax] = [xmax, xmin];

      // unletterbox
      const sxmin = unpadX(xmin);
      const symin = unpadY(ymin);
      const sxmax = unpadX(xmax);
      const symax = unpadY(ymax);

      // drop degenerate boxes
      if (sxmax <= sxmin || symax <= symin) continue;

      const label = model_labels[id] ?? `class_${id}`;

      dets.push({
        label,
        score,
        box: { ymin: symin, xmin: sxmin, ymax: symax, xmax: sxmax },
        });
    }

    // skip the tracker for debugging
    // let id=1
    // setTracks(dets.map(det => ({
    //     id: id++,
    //     label: det.label,
    //     label_conf: det.score,
    //     box: det.box,
    //     v: {dx:0, dy:0, ds:0},
    //     age: 1, hits: 1, misses: 0,
    //     confirmed: false,
    //     lastSeenTs: 0,
    //     locked: false
    //   })))

      let trks = trackerRef.current.update(dets, Date.now() / 1000);
      console.log(trks)

     setTracks(prev => {
      const lockedById = new Map(prev.map(p => [p.id, p.locked]));
      return trks.map(t => ({
          ...t,
          locked: lockedById.get(t.id) ?? false,
        })).filter(t => t.confirmed);
    });

    } catch (e: any) {
      console.warn('runSync failed:', e?.message ?? e);
    } finally {
      busyRef.current = false;
    }
  }, [viewShotRef]);


  useEffect(() => {
    const id = setInterval(() => { tick().catch(() => { }); }, 25);
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
      <>
      <View
      ref={viewShotRef}
      style={{
        width:  320,
        height: 320,
        position: 'absolute',
        left: -9999, top: -9999,
        backgroundColor: 'black',
        overflow: 'hidden',
      }}
    >
      <RTCView
        style={StyleSheet.absoluteFill}
        streamURL={stream.toURL()}
        objectFit="contain"
      />
    </View>

    <View
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

        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
          {tracks.map((t: any) => {
            const left = t.box.xmin * sizeRef.current.w;
            const top  = t.box.ymin * sizeRef.current.h;
            const width  = (t.box.xmax - t.box.xmin) * sizeRef.current.w;
            const height = (t.box.ymax - t.box.ymin) * sizeRef.current.h;

            return (
              <React.Fragment key={t.id}>

                <Pressable
                  onLongPress={() => {
                    // Update tracks so that they all have locked=false, and flip the track that was pressed
                    if(!t.locked) {
                      Vibration.vibrate();
                    }

                    setTracks(prev =>
                      prev.map(tr => ({
                        ...tr,
                        locked: tr.id === t.id ? !t.locked : false,
                      }))
                    );
                  }}
                  hitSlop={8}
                  style={{
                    position: 'absolute',
                    left, top, width, height,
                    borderWidth: t.locked ? 3 : 2,
                    borderColor: t.locked ? '#ff3b30' : '#00e913',
                    borderStyle: 'solid',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.tagRow,
                    { position: 'absolute', left, top: top - 18, maxWidth: Math.max(0, sizeRef.current.w - left - 4) }
                  ]}
                >
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.tagText}>
                    {t.label} {(t.label_conf * 100).toFixed(0)}%
                  </Text>

                  {t.locked && (
                    <Image
                      source={require('./assets/lock.png')}
                      style={{ width: 15, height: 15, marginLeft: 4, resizeMode: 'contain' }}
                    />
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>
    </View>
    </>

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
  tagRow: {
    flexDirection: 'row',      // side by side
    alignItems: 'center',       // vertical centering
    paddingHorizontal: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    flexShrink: 1,             // allow truncation, keeps icon visible
    includeFontPadding: false, // nicer on Android
  },
})
