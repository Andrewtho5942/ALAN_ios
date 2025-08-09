import UIKit
import RCTAppDelegate
import React

@main
class AppDelegate: RCTAppDelegate {
  override init() {
    super.init()
    self.moduleName = "ALAN_ios"
    self.initialProps = [:]

    // New Architecture runtime features
    self.fabricEnabled = true
    self.concurrentRootEnabled = true
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return URL(string: "http://100.68.78.107:8081/index.bundle?platform=ios&dev=true")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
