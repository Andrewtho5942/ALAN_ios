#import "JSISmokeInstaller.h"

// For New Architecture compatibility and jsi::Runtime
#import <React/RCTCxxBridge.h>
#import <jsi/jsi.h>

// For NSNotificationCenter auto-installation
#import <Foundation/Foundation.h>

using facebook::jsi::Runtime;
using facebook::jsi::PropNameID;
using facebook::jsi::Function;
using facebook::jsi::Value;
using facebook::jsi::String;
using facebook::jsi::HostFunctionType;

// JSI function installation logic
static void install(Runtime& rt) {
  if (rt.global().hasProperty(rt, "jsi_hello")) {
    return;
  }
  
  auto defineFn = [&](const char* name, int argc, HostFunctionType impl) {
    auto fn = Function::createFromHostFunction(
      rt, PropNameID::forAscii(rt, name), argc, std::move(impl)
    );
    rt.global().setProperty(rt, name, std::move(fn));
  };
  
  defineFn("jsi_hello", 0, [](Runtime& rt, const Value&, const Value*, size_t) -> Value {
    return String::createFromAscii(rt, "hello from JSI");
  });
  
  defineFn("jsi_add", 2, [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
    if (n < 2 || !a[0].isNumber() || !a[1].isNumber()) {
      throw facebook::jsi::JSError(rt, "jsi_add(a,b) expects two numbers");
    }
    return Value(a[0].asNumber() + a[1].asNumber());
  });
  
  defineFn("jsi_bufLen", 1, [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
    if (n < 1 || !a[0].isObject() || !a[0].asObject(rt).isArrayBuffer(rt)) {
      throw facebook::jsi::JSError(rt, "jsi_bufLen(buffer) expects an ArrayBuffer");
    }
    auto ab = a[0].asObject(rt).getArrayBuffer(rt);
    return Value((double)ab.size(rt));
  });
}

// Public installer function
void InstallJSISmoke(RCTBridge *bridge) {
  if (!bridge) {
    return;
  }
  
  RCTCxxBridge* cxxBridge = (RCTCxxBridge*)bridge;
  if (!cxxBridge.runtime) {
    return;
  }

  jsi::Runtime& runtime = *cxxBridge.runtime;
  install(runtime);
}

#pragma mark - Auto-Installation Logic

// This interface and implementation is now inside the same file.
@interface JSISmokeAutoInstall : NSObject
@end

@implementation JSISmokeAutoInstall

// This +load method is called automatically by the Objective-C runtime when the app starts.
+ (void)load {
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(onJSLoaded:)
                                               name:RCTJavaScriptDidLoadNotification
                                             object:nil];
}

// This method is called when the React Native bridge is ready.
+ (void)onJSLoaded:(NSNotification *)note {
  RCTBridge *bridge = note.userInfo[@"bridge"];
  if (bridge) {
    InstallJSISmoke(bridge);
  }
}
@end