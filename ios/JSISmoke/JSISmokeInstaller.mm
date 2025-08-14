#import "JSISmokeInstaller.h"
#import <React/RCTBridge+Private.h>
#import <jsi/jsi.h>

using namespace facebook;

static jsi::Value hello(jsi::Runtime& rt, const jsi::Value*, size_t) {
  return jsi::String::createFromAscii(rt, "hello from JSI");
}
static jsi::Value add(jsi::Runtime& rt, const jsi::Value* a, size_t n) {
  if (n < 2 || !a[0].isNumber() || !a[1].isNumber())
    throw jsi::JSError(rt, "jsi_add(a,b) expects two numbers");
  return jsi::Value(a[0].asNumber() + a[1].asNumber());
}
static jsi::Value bufLen(jsi::Runtime& rt, const jsi::Value* a, size_t n) {
  if (n < 1 || !a[0].isObject() || !a[0].asObject(rt).isArrayBuffer(rt))
    throw jsi::JSError(rt, "jsi_bufLen(buffer) expects an ArrayBuffer");
  auto ab = a[0].asObject(rt).getArrayBuffer(rt);
  return jsi::Value((double)ab.size(rt));
}

static void install(jsi::Runtime& rt) {
  auto def = [&](const char* name, auto fn, int argc) {
    auto f = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, name), argc,
      [fn](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* a, size_t n) -> jsi::Value {
        return fn(rt, a, n);
      });
    rt.global().setProperty(rt, name, std::move(f));
  };
  def("jsi_hello",  hello,  0);
  def("jsi_add",    add,    2);
  def("jsi_bufLen", bufLen, 1);
}

void InstallJSISmoke(RCTBridge *bridge) {
  if (!bridge) return;
  bridge.runtimeExecutor(^ (jsi::Runtime &rt) {
    install(rt);
  });
}
