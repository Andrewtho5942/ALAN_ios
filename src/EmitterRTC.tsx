import { useEffect, useRef, useMemo } from 'react';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStreamTrack,
  MediaStream,
} from 'react-native-webrtc';

import TcpSocket from 'react-native-tcp-socket';

const LISTEN_PORT = 12345;

export default function useEmitterRTC(
  // stream?: MediaStream, 
  onCommand?: (cmd: string, value?: any) => void
) {
  const peer = useRef<RTCPeerConnection | null>(null);
  const server = useRef<TcpSocket.Server | null>(null);
  const clientSocket = useRef<TcpSocket.Socket | null>(null);
  const buffer = useRef('');
  // const videoSource   = useMemo(() => new RTCVideoSource(), []);
  // const localTrackRef = useRef<MediaStreamTrack>(videoSource.createTrack());

  useEffect(() => {
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [], // LAN only
    });
    peer.current = pc;

    // pc.addTrack(localTrackRef.current);

    const sendSignal = (data: any) => {
      const msg = JSON.stringify(data);
      clientSocket.current?.write(msg + '\n');
    };

    const handleSignal = async (msg: any) => {
      if (!peer.current) return;
      if (msg.type === 'answer') {
        await peer.current.setRemoteDescription(new RTCSessionDescription(msg));
      } else if (msg.candidate) {
        await peer.current.addIceCandidate(new RTCIceCandidate(msg));
      }
    };

    const handleData = (chunk: string) => {
      buffer.current += chunk;
      const parts = buffer.current.split('\n');
      buffer.current = parts.pop() || '';
      parts.forEach((raw) => {
        try {
          const msg = JSON.parse(raw);

          // Handle any commands first
          if (msg.command && onCommand) {
            onCommand(msg.command, msg.value);
            return;
          }

          //otherwise, its a webRTC signal
          handleSignal(msg);
        } catch (e) {
          console.warn('Bad JSON:', raw);
        }
      });
    };

    // Start the TCP server
    const srv = TcpSocket.createServer((socket) => {
      console.log('Controller connected!');

      clientSocket.current = socket;

      socket.on('data', (data: string | Buffer) => {
        handleData(data.toString());
      });

      socket.on('error', (err) => {
        console.error('TCP error:', err);
      });

      socket.on('close', () => {
        console.log('Controller connection closed.');
      });

      // Send ICE candidates
      (pc as any).addEventListener('icecandidate', (event:any) => {
        if (event.candidate) {
          sendSignal({
            type: 'candidate',
            candidate: event.candidate.toJSON(),
          });
        }
      });

      // Send initial offer
      (async () => {
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);
        sendSignal(offer);
      })();
    });

    srv.listen({ port: LISTEN_PORT, host: '0.0.0.0' }, () => {
      console.log(`TCP server listening on port ${LISTEN_PORT}`);
    });

    server.current = srv;

    return () => {
      console.log('Cleaning up TCP server');
      peer.current?.close();
      clientSocket.current?.destroy();
      server.current?.close();
    };
  }, []);


  // useEffect(() => {
  //   if (!peer.current) return;
  //   const pc = peer.current;

  //   const newVideoTrack = stream.getVideoTracks()[0];
  //   const sender = pc.getSenders().find(s => s.track?.kind === 'video');

  //   if (sender) {
  //     sender.replaceTrack(newVideoTrack);
  //   } else {
  //     pc.addTrack(newVideoTrack, stream);
  //   }
  // }, [stream]);


  // const onFrame = (frame: {
  //   width: number;
  //   height: number;
  //   data: Uint8Array;
  //   rotation: number;
  //   timestamp: number;
  // }) => {
  //   videoSource.onFrame(frame);
  // };

  const sendCommand = (command: string, value?:any) => {
    const sock = clientSocket.current;
    if (!sock) {
      console.warn('No signaling socket yet—cannot send command');
      return;
    }
    sock.write(JSON.stringify({ command, value }) + '\n');
  };

  return {sendCommand};//onFrame, 
}
