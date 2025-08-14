// JSISmokeInstaller.mm
#import "JSISmokeInstaller.h"
#import <React/RCTBridge+Private.h> 
#import <jsi/jsi.h>

using namespace facebook::jsi;

// Helper to define a host function on globalThis
static void defineFn(Runtime& rt,
                     const char* name,
                     Function::HostFunctionType impl,
                     int argc) {
  auto fn = Function::createFromHostFunction(
      rt, PropNameID::forAscii(rt, name), argc,
      [impl](Runtime& rt, const Value& thisVal, const Value* args, size_t count) -> Value {
        return impl(rt, thisVal, args, count);
      });
  rt.global().setProperty(rt, name, std::move(fn));
}

// Actual installation: add functions to the JS global object
static void install(Runtime& rt) {
  // Idempotency guard
  if (rt.global().hasProperty(rt, "jsi_hello")) {
    return;
  }

  defineFn(rt, "jsi_hello",
           [](Runtime& rt, const Value&, const Value*, size_t) -> Value {
             return String::createFromAscii(rt, "hello from JSI");
           },
           /*argc*/ 0);

  defineFn(rt, "jsi_add",
           [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
             if (n < 2 || !a[0].isNumber() || !a[1].isNumber()) {
               throw JSError(rt, "jsi_add(a,b) expects two numbers");
             }
             return Value(a[0].asNumber() + a[1].asNumber());
           },
           /*argc*/ 2);

  defineFn(rt, "jsi_bufLen",
           [](Runtime& rt, const Value&, const Value* a, size_t n) -> Value {
             if (n < 1 || !a[0].isObject() || !a[0].asObject(rt).isArrayBuffer(rt)) {
               throw JSError(rt, "jsi_bufLen(buffer) expects an ArrayBuffer");
             }
             auto ab = a[0].asObject(rt).getArrayBuffer(rt);
             return Value((double)ab.size(rt));
           },
           /*argc*/ 1);
}

void InstallJSISmoke(RCTBridge *bridge) {
  if (!bridge) return;

  facebook::react::RuntimeExecutor executor = [bridge runtimeExecutor];
  executor([&](Runtime& rt) {
    install(rt);
  });
}
