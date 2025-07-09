// react-native-webrtc.d.ts
import type { MediaStreamTrack, RTCRtpSender, RTCSessionDescriptionInit, RTCIceCandidateInit } from 'react-native-webrtc';

declare module 'react-native-webrtc' {
  /** The JSI video‐source class used by the native layer. */
  export class RTCVideoSource {
    constructor();
    /**
     * Push a single frame into that source.
     * `data` can be a Uint8Array or ArrayBuffer
     */
    onFrame(frame: {
      width: number;
      height: number;
      data: Uint8Array | ArrayBuffer;
      rotation?: number;
      timestamp?: number;
    }): void;

    /** Create the `MediaStreamTrack` you add to your RTCPeerConnection */
    createTrack(): MediaStreamTrack;
  }
}
