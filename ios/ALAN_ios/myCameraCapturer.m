#import "MyCameraCapturer.h"
#import <AVFoundation/AVFoundation.h>

@implementation MyCameraCapturer

+ (instancetype)shared {
  static MyCameraCapturer *s;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    s = [[MyCameraCapturer alloc] init];
  });
  return s;
}

- (void)processSampleBuffer:(CMSampleBufferRef)buffer {
  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(buffer);
  CMTime timestamp = CMSampleBufferGetPresentationTimeStamp(buffer);
  int64_t timeNs = CMTimeGetSeconds(timestamp) * 1e9;

  RTCCVPixelBuffer *rtcBuffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pixelBuffer];
  RTCVideoFrame *frame = [[RTCVideoFrame alloc] initWithBuffer:rtcBuffer
                                                       rotation:RTCVideoRotation_0
                                                    timeStampNs:timeNs];
  [self.source capturer:self didCaptureVideoFrame:frame];
}

@end