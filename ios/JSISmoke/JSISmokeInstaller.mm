// JSISmokeInstaller.mm
#import "JSISmokeInstaller.h"

// Needed for -[RCTBridge runtimeExecutor]
#import <React/RCTBridge+Private.h>
// Brings the RuntimeExecutor type into headers (even though we use `auto`)
#import <ReactCommon/RuntimeExecutor.h>

#import <jsi/jsi.h>

using facebook::jsi::Runtime;
using facebook::jsi::PropNameID;
using facebook::jsi::Function;
using facebook::jsi::Value;
using facebook::jsi::String;
using facebook::jsi::HostFunctionType;

// Define a host function on globalThis
static void defineFn(Runtime& rt, const char* name, int argc, HostFunctionType impl) {
  auto fn = Function::createFromHostFunction(
      rt,
      PropNameID::forAscii(rt, name),
      static_cast<unsigned int>(argc),
      std::move(impl));
  rt.global().setProperty(rt, name, std::move(fn));
}

// Install three smoke-test functions
static void install(Runtime& rt) {
  // Idempotent install
  if (rt.global().hasProperty(rt, "jsi_hello")) {
    return;
  }

  defineFn(rt, "jsi_hello", 0,
    [](Runtime& rt, const Value&, const Value*, size_t) -> Value {
      return String::createFromAscii(rt, "hello from JSI");
    });

  defineFn(rt, "jsi_add", 2,
    [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
      if (n < 2 || !a[0].isNumber() || !a[1].isNumber()) {
        throw facebook::jsi::JSError(rt, "jsi_add(a,b) expects two numbers");
      }
      return Value(a[0].asNumber() + a[1].asNumber());
    });

  defineFn(rt, "jsi_bufLen", 1,
    [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
      if (n < 1 || !a[0].isObject() || !a[0].asObject(rt).isArrayBuffer(rt)) {
        throw facebook::jsi::JSError(rt, "jsi_bufLen(buffer) expects an ArrayBuffer");
      }
      auto ab = a[0].asObject(rt).getArrayBuffer(rt);
      return Value((double)ab.size(rt));
    });
}

void InstallJSISmoke(RCTBridge *bridge) {
  if (!bridge) return;

  // Use method call + type-deduction to avoid namespace/type drift.
  if ([bridge respondsToSelector:@selector(runtimeExecutor)]) {
    auto executor = [bridge runtimeExecutor];
    executor([&](Runtime& rt) {
      install(rt);
    });
  }
}
