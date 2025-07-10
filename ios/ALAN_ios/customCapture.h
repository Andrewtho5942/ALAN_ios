// ios/ALAN_ios/CustomCapture.h

#import <WebRTC/WebRTC.h>
#import <AVFoundation/AVFoundation.h>

/// A RTCVideoCapturer subclass that only processes incoming
/// CMSampleBufferRefs handed to it (instead of opening its own camera).
@interface CustomCapture : RTCVideoCapturer

/// Feed each VisionCamera / CMSampleBufferRef here.
- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer;

@end
