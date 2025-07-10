#import <AVFoundation/AVFoundation.h>
#import <WebRTC/WebRTC.h>

/// A simple RTCVideoCapturer subclass that turns every incoming
/// CMSampleBufferRef into an RTCVideoFrame and pushes it into WebRTC.
@interface CustomCapture : RTCVideoCapturer <AVCaptureVideoDataOutputSampleBufferDelegate>

/// Start capturing from the camera.
- (void)startCapture;

/// Stop capturing.
- (void)stopCapture;

@end
