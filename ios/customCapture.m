#import "CustomCapture.h"

@implementation CustomCapture {
  AVCaptureSession      *_captureSession;
  dispatch_queue_t       _captureQueue;
}

+ (instancetype)sharedInstance {
  static CustomCapture *inst; static dispatch_once_t once;
  dispatch_once(&once, ^{ inst = [[CustomCapture alloc] init]; });
  return inst;
}

- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer {
  CVImageBufferRef pix = CMSampleBufferGetImageBuffer(sampleBuffer);
  int64_t tsNs = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1e9;
  RTCCVPixelBuffer *rtcBuf = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pix];
  RTCVideoFrame *frame = [[RTCVideoFrame alloc] initWithBuffer:rtcBuf
                                                     rotation:RTCVideoRotation_0
                                                  timeStampNs:tsNs];
  [self.source capturer:self didCaptureVideoFrame:frame];
}
@end
