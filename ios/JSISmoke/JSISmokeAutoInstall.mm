// JSISmokeAutoInstall.mm
#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import "JSISmokeInstaller.h"

extern NSString *const RCTJavaScriptDidLoadNotification;
extern NSString *const RCTJavaScriptDidLoadNotificationBridgeKey;

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
  RCTBridge *bridge = note.userInfo[RCTJavaScriptDidLoadNotificationBridgeKey];
  if (bridge) {
    InstallJSISmoke(bridge);
  }
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:RCTJavaScriptDidLoadNotification
                                                object:nil];
}
@end
