#import "FrameStreamer.h"
#import <React/RCTCxxBridge.h>
#import "CustomCapture.h"
using namespace facebook;

static std::once_flag onceFlag;
void installFrameStreamer(jsi::Runtime &rt) {
  std::call_once(onceFlag, [&]() {
    auto push = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "pushFrame"), 1,
      [&](jsi::Runtime &rt, const jsi::Value&, const jsi::Value *args, size_t) {
        auto bufPtr = (CMSampleBufferRef)(int64_t)args[0].asNumber();
        [[CustomCapture sharedInstance] processSampleBuffer:bufPtr];
        return jsi::Value::undefined();
      });
    rt.global().setProperty(rt, "pushFrame", std::move(push));
  });
}

extern "C" void RCTRegisterFrameStreamer(jsi::Runtime &rt) {
  installFrameStreamer(rt);
}
