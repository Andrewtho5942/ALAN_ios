import React, { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import TcpSocket from 'react-native-tcp-socket';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';

import Joystick from './Joystick'
import VerticalSlider from './VerticalSlider'
import { RootStackParamList } from './types';
import { useESP } from './ESPContext';

const EMITTER_IP = '100.67.160.5';
const EMITTER_PORT = 12345;

type Props = NativeStackScreenProps<RootStackParamList, 'Controller'>


export default function ControllerScreen({ navigation }: Props) {
  const [camSide, setCamSide] = useState<'back' | 'front'>('back');
  const [reconnectUpdater, setReconnectUpdater] = useState<any>(0);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const { sendToESP } = useESP();
  const pcRef     = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<TcpSocket.Socket | null>(null);
  const bufferRef = useRef<string>('');
  const retryTimer  = useRef<NodeJS.Timeout | null>(null);

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

  const handleReceiverCommand = (cmd: string, value?: any) => {
    if(cmd == 'switchCam') {
      if(value) {
        setCamSide(value);
      } else {
        setCamSide(s => s === 'back' ? 'front' : 'back');
      }
    } else {
      console.error('ERROR in ReceiverScreen: Unrecognized controller command!')
    }
  }

  // only schedule one retry at a time
  const scheduleRetry = () => {
    if (retryTimer.current !== null) return;      // already scheduled
    console.log('Scheduling reconnect in 2s...');
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      connect();  
    }, 2000);
  };

  const cleanup = () => {
    console.log('### CLEANING REFS ###')
    socketRef.current?.destroy();
    pcRef.current?.close();
    socketRef.current = null;
    pcRef.current = null;
    bufferRef.current = '';
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    setRemoteStream(null);
  };

  const connect = () => {
    cleanup();

    // 1) create the peer connection
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;

    // 2) handle incoming tracks (audio and video)
     (pc as any).ontrack = (event:any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // 3) monitor ICE state
    (pc as any).oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('ICE state changed to ', state)
      if (['disconnected','failed'].includes(state)) {
        console.warn('ICE', state, '→ reconnecting');
        setRemoteStream(null);
        scheduleRetry();
      }
    };

    // 4) send ICE candidates to the client
    (pc as any).onicecandidate = (candidate:any) => {
      if (candidate && socketRef.current) {
        socketRef.current.write(
          JSON.stringify({ type:'candidate', candidate }) + '\n'
        );
      }
    };

    // 5) open TCP connection to the emitter
    const socket = TcpSocket.createConnection(
      { host: EMITTER_IP, port: EMITTER_PORT },
      () => {
        console.log('TCP: connected to emitter')
         if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
      }
    );
    socketRef.current = socket;

    socket.on('data', (data:string | Buffer) => {
      bufferRef.current += data.toString();
      const parts = bufferRef.current.split('\n');
      bufferRef.current = parts.pop() || '';
      for (const line of parts) {
        if (!line) continue;
        const msg = JSON.parse(line);

        if(msg.command) {
          handleReceiverCommand(msg.command, msg.value)
        }

        if (msg.type === 'offer') {
          // remote offered → answer
          pc.setRemoteDescription(new RTCSessionDescription(msg))
            .then(async () => {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              socket.write(
                JSON.stringify({ type:'answer', sdp:answer.sdp })+'\n'
              );

            });
        }
        else if (msg.type === 'candidate') {
          pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      }
    });

    socket.on('error', (err) => {
      console.error('TCP error:', err);
      if (String(err) == 'Connection refused') {
        scheduleRetry();
      }
    });

    socket.on('close', () => {
      console.log('TCP closed');
    });
  };

  useEffect(() => {
    connect();
    return cleanup;
  }, []);


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
          onPress={() => {
            let newCamSide : ('front' | 'back') = (camSide === 'back' ? 'front' : 'back');
            setCamSide(newCamSide)
            if (socketRef.current) {
              socketRef.current.write(JSON.stringify({command:'switchCam', value:newCamSide}) + '\n')
            }
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
      ),
    });
  }, [navigation, camSide]);


  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.rtcView}
          objectFit="cover"
        />
      ) : (
        <Text style={styles.loadingText}>
          Waiting for video…
        </Text>
      )}

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
  rtcView: { flex: 1 },
  loadingText: { color: 'white', fontSize: 18, textAlign: "center", marginTop:100 },
})
