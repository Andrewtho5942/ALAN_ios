#import "MyCameraModule.h"
#import "CustomCapture.h"
#import "RCTBridge+WebRTC.h"          // from react-native-webrtc pod
#import <React/RCTCxxBridge.h>

@implementation MyCameraModule
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return NO; }

// JS: await start();
RCT_REMAP_METHOD(start,
  startResolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject)
{
  // a) install JSI hook
  RCTCxxBridge *cxx = (RCTCxxBridge *)self.bridge;
  RCTRegisterFrameStreamer(cxx.runtime);

  // b) get the factory
  RTCPeerConnectionFactory *factory = self.bridge.rtcPeerConnectionFactory;

  // c) register the capturer
  NSString *trackId = [factory registerVideoCapturer:CustomCapture.sharedInstance];
  if (trackId) resolve(trackId);
  else         reject(@"no_track", @"Failed to register capturer", nil);
}

RCT_EXPORT_METHOD(stop) { /* no-op */ }

@end
