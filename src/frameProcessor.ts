// frameProcessor.ts

import { Frame } from 'react-native-vision-camera';

export default function frameProcessor(frame: Frame) {
  'worklet';
  // Forward the raw CMSampleBufferRef pointer into your native capturer via JSI
  (global as any).pushFrame((frame as any).nativeFrame);
}
