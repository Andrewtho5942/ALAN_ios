#import <WebRTC/WebRTC.h>
#import <AVFoundation/AVFoundation.h>

@interface CustomCapture : RTCVideoCapturer
+ (instancetype)sharedInstance;
- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer;
@end