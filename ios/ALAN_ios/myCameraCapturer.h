#import <WebRTC/WebRTC.h>

@interface MyCameraCapturer : RTCVideoCapturer

/// Singleton accessor for JSI bridge
+ (instancetype)shared;

/// Called from JS via JSI to forward each VisionCamera frame
- (void)processSampleBuffer:(CMSampleBufferRef)buffer;

@end