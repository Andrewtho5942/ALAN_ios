import UIKit
import RCTAppDelegate
import React

@main
class AppDelegate: RCTAppDelegate {

  private let RNModuleName = "ALAN_ios"

  override init() {
    super.init()
    // Force classic (legacy) UIManager / bridge behavior
    // This ensures older native modules and view managers register as expected.
    self.moduleName = RNModuleName
    self.initialProps = nil
    self.fabricEnabled = false
    self.concurrentRootEnabled = false
  }

  // Keep the standard delegate behavior from RCTAppDelegate.
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return URL(string: "http://100.68.78.107:8081/index.bundle?platform=ios&dev=true")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
