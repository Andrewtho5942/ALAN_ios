#import "MyCameraModule.h"
#import "MyCameraCapturer.h"
#import <WebRTC/WebRTC.h>

@interface MyCameraModule ()
@property (nonatomic, strong) MyCameraCapturer *capturer;
@end

@implementation MyCameraModule

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
  return @[];
}

RCT_EXPORT_METHOD(start:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (!self.capturer) {
    self.capturer = [MyCameraCapturer shared];
  }
  RTCVideoSource *source = self.capturer.source;
  RTCVideoTrack *track = [self.bridge.rtcPeerConnectionFactory videoTrackWithSource:source trackId:@"ARDVO0"];
  resolve(track.trackId);
}

RCT_EXPORT_METHOD(stop) {
  self.capturer = nil;
}

@end