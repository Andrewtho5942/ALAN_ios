import { useEffect, useRef } from 'react';
import {
  RTCPeerConnection,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import TcpSocket from 'react-native-tcp-socket';

const CONTROLLER_IP = '100.69.173.60';
const CONTROLLER_PORT = 12345;

export default function useEmitterRTC() {
  const peer = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<TcpSocket.Socket | null>(null);

  // send JSON over TCP
  const sendSignal = (data: any) => {
    const msg = JSON.stringify(data);
    socket.current?.write(msg + '\n');
  };

  // parse JSON chunks from TCP
  const buffer = useRef('');
  const handleData = (chunk: string) => {
    buffer.current += chunk;
    const parts = buffer.current.split('\n');
    buffer.current = parts.pop() || '';
    parts.forEach((raw) => {
      try {
        const msg = JSON.parse(raw);
        handleSignal(msg);
      } catch (e) {
        console.warn('Bad JSON:', raw);
      }
    });
  };

  const handleSignal = async (msg: any) => {
    if (!peer.current) return;
    if (msg.type === 'answer') {
      await peer.current.setRemoteDescription(
        new RTCSessionDescription(msg)
      );
    } else if (msg.candidate) {
      await peer.current.addIceCandidate(new RTCIceCandidate(msg));
    }
  };

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [], // LAN only
    });
    peer.current = pc;

    // TCP connect to controller
    const client = TcpSocket.createConnection(
      { host: CONTROLLER_IP, port: CONTROLLER_PORT },
      async () => {
        console.log('Connected to controller via TCP');

        // get camera stream
        const stream = await mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // send tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // ICE gathering
        (pc as any).addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            sendSignal(event.candidate);
          }
        });


        // Create offer and send
        const offer = await pc.createOffer('options');
        await pc.setLocalDescription(offer);
        sendSignal(offer);
      }
    );

    client.on('data', (data: string | Buffer) => {
      handleData(data.toString());
    });

    client.on('error', (err) => {
      console.error('TCP error:', err);
    });

    client.on('close', () => {
      console.log('TCP connection closed');
    });

    socket.current = client;

    return () => {
      socket.current?.destroy();
      peer.current?.close();
    };
  }, []);
}
