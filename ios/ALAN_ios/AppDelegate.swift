import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var bridge: RCTBridge!

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // 1) React Native bridge setup
    let jsCodeLocation: URL? = {
      #if DEBUG
      return URL(string: "http://localhost:8081/index.bundle?platform=ios&dev=true")
      #else
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
      #endif
    }()

    self.bridge = RCTBridge(bundleURL: jsCodeLocation,
                            moduleProvider: nil,
                            launchOptions: launchOptions)

    // 2) Install JSI frame streamer into C++ runtime
    if let cxxBridge = bridge as? RCTCxxBridge {
      let rt = cxxBridge.jsiRuntime
      installFrameStreamer(rt)
    }

    // 3) Start React Native UI
    let rootView = RCTRootView(bridge: bridge,
                               moduleName: "ALAN_ios",
                               initialProperties: nil)
    rootView.backgroundColor = UIColor.black

    self.window = UIWindow(frame: UIScreen.main.bounds)
    let rootVC = UIViewController()
    rootVC.view = rootView
    self.window?.rootViewController = rootVC
    self.window?.makeKeyAndVisible()

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    #if DEBUG
    return URL(string: "http://localhost:8081/index.bundle?platform=ios&dev=true")
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

// MARK: - JSI Installer
import jsi

func installFrameStreamer(_ runtime: jsi.JSIRuntime) {
  let pushFrame = jsi.JSIFunction.createFromHostFunction(
    runtime,
    name: "pushFrame",
    argsCount: 1
  ) { (rt, this, args) in
    let bufferPointer = args[0].asObject(rt).getProperty(rt, "nativeFrame").asNumber()
    let buffer = UnsafeRawPointer(bitPattern: Int(bufferPointer))!.assumingMemoryBound(to: CMSampleBuffer.self).pointee
    MyCameraCapturer.shared().processSampleBuffer(buffer)
    return jsi.JSIValueUndefined()
  }
  runtime.global.setProperty(runtime, "pushFrame", pushFrame)
}