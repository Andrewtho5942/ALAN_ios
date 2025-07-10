// ios/ALAN_ios/CustomCapture.m

#import "CustomCapture.h"

@implementation CustomCapture

- (instancetype)init {
  if (self = [super init]) {
    // nothing special to do here
  }
  return self;
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer {
  // pull out the CVPixelBuffer
  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  CMTime timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer);
  int64_t timeNs = (int64_t)(CMTimeGetSeconds(timestamp) * 1e9);

  // wrap it in WebRTC's buffer & frame types
  RTCCVPixelBuffer *rtcBuffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pixelBuffer];
  RTCVideoFrame *frame = [[RTCVideoFrame alloc]
    initWithBuffer:rtcBuffer
         rotation:RTCVideoRotation_0
      timeStampNs:timeNs];

  // push into the WebRTC source
  [self.source capturer:self didCaptureVideoFrame:frame];
}

+ (instancetype)sharedInstance {
  static CustomCapture *s;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    s = [[CustomCapture alloc] init];
  });
  return s;
}
@end
