#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import "JSISmokeInstaller.h"

// RN posts this when the JS runtime is ready; userInfo[@"bridge"] is the RCTBridge
extern NSString *const RCTJavaScriptDidLoadNotification;

@interface JSISmokeAutoInstall : NSObject
@end

@implementation JSISmokeAutoInstall
+ (void)load {
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(onJSLoaded:)
                                               name:RCTJavaScriptDidLoadNotification
                                             object:nil];
}
+ (void)onJSLoaded:(NSNotification *)note {
  RCTBridge *bridge = note.userInfo[@"bridge"];
  if (bridge) {
    InstallJSISmoke(bridge);
  }
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:RCTJavaScriptDidLoadNotification
                                                object:nil];
}
@end
