// ios/ALAN_ios/FrameStreamer.mm
#import "FrameStreamer.h"
#import <jsi/jsi.h>
#import <React/RCTCxxBridge.h>
#import "CustomCapture.h"


using namespace facebook;

static std::once_flag kOnce;
static jsi::Function pushFrameFn;

void installFrameStreamer(jsi::Runtime &rt) {
  std::call_once(kOnce, [&]() {
    auto global = rt.global();

    pushFrameFn = jsi::Function::createFromHostFunction(
      rt,
      jsi::PropNameID::forAscii(rt, "pushFrame"),
      1, // one argument: the native pointer
      [&](jsi::Runtime &rt,
          const jsi::Value &,
          const jsi::Value *args,
          size_t) -> jsi::Value {
        // arg0 is the native CMSampleBufferRef cast to a number
        auto bufPtr = (CMSampleBufferRef)(int64_t)args[0].asNumber();
        [[CustomCapture sharedInstance] processSampleBuffer:bufPtr];
        return jsi::Value::undefined();
      });

    global.setProperty(rt,
      jsi::PropNameID::forAscii(rt, "pushFrame"),
      pushFrameFn);
  });
}

// Called by AppDelegate when the RN bridge is set up
extern "C" void RCTRegisterFrameStreamer(jsi::Runtime &rt) {
  installFrameStreamer(rt);
}
