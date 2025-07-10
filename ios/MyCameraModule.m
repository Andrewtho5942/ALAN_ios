#import "MyCameraModule.h"
#import "CustomCapture.h"
#import "RCTBridge+WebRTC.h"
#import <React/RCTCxxBridge.h>

@implementation MyCameraModule

// Expose this module to React Native
RCT_EXPORT_MODULE();

// We do not require main-thread setup here
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

// start(): installs JSI, registers your CustomCapture with WebRTC, returns trackId
RCT_REMAP_METHOD(start,
                 startWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  // 1) Hook up the JSI frameStreamer
  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  if ([cxxBridge respondsToSelector:@selector(runtime)]) {
    RCTRegisterFrameStreamer(cxxBridge.runtime);
  }

  // 2) Grab the shared PeerConnectionFactory from react-native-webrtc
  RTCPeerConnectionFactory *factory = self.bridge.rtcPeerConnectionFactory;

  // 3) Use your singleton capturer that processes VisionCamera frames
  CustomCapture *capturer = [CustomCapture sharedInstance];

  // 4) Register it and get a JS-usable trackId
  NSString *trackId = [factory registerVideoCapturer:capturer];
  if (trackId) {
    resolve(trackId);
  } else {
    reject(@"no_track", @"Failed to register video capturer", nil);
  }
}

// stop(): no teardown needed; VisionCamera controls capture flow
RCT_EXPORT_METHOD(stop)
{
  // no-op
}

@end
