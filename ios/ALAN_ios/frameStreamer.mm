#include <jsi/jsi.h>
#include <React/RCTCxxBridge.h>
#include "MyCameraCapturer.h"

using namespace facebook;

static void installFrameStreamer(jsi::Runtime &rt) {
  auto pushFrame = jsi::Function::createFromHostFunction(
    rt,
    jsi::PropNameID::forAscii(rt, "pushFrame"),
    1,
    [](jsi::Runtime &rt, const jsi::Value&, const jsi::Value *args, size_t) {
      int64_t ptr = (int64_t)args[0].asObject(rt).getProperty(rt, "nativeFrame").asNumber();
      CMSampleBufferRef buffer = reinterpret_cast<CMSampleBufferRef>(ptr);
      [[MyCameraCapturer shared] processSampleBuffer:buffer];
      return jsi::Value::undefined();
    });
  rt.global().setProperty(rt, "pushFrame", std::move(pushFrame));
}