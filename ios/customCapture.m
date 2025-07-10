#import "CustomCapture.h"

@implementation CustomCapture {
  AVCaptureSession      *_captureSession;
  dispatch_queue_t       _captureQueue;
}

- (instancetype)init {
  if (self = [super init]) {
    _captureQueue = dispatch_queue_create("custom_capture_queue", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (void)startCapture {
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:nil];
  AVCaptureVideoDataOutput *output = [[AVCaptureVideoDataOutput alloc] init];
  [output setSampleBufferDelegate:self queue:_captureQueue];

  _captureSession = [[AVCaptureSession alloc] init];
  [_captureSession addInput:input];
  [_captureSession addOutput:output];
  [_captureSession startRunning];
}

- (void)stopCapture {
  [_captureSession stopRunning];
  _captureSession = nil;
}

// AVCaptureVideoDataOutputSampleBufferDelegate
- (void)captureOutput:(AVCaptureOutput *)output
 didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
        fromConnection:(AVCaptureConnection *)connection {
  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  CMTime timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer);
  int64_t timeNs = CMTimeGetSeconds(timestamp) * 1e9;

  // Wrap it in WebRTC's pixel buffer and frame objects
  RTCCVPixelBuffer *rtcBuffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pixelBuffer];
  RTCVideoFrame *frame = [[RTCVideoFrame alloc]
    initWithBuffer:rtcBuffer
         rotation:RTCVideoRotation_0
      timeStampNs:timeNs];

  // Push into WebRTC
  [self.source capturer:self didCaptureVideoFrame:frame];
}

@end
