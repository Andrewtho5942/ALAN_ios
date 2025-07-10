// FrameStreamer.h

#import <jsi/jsi.h>

/**  
 * Called from AppDelegate (Swift or Obj-C++) to register the  
 * pushFrame(ptr) API on your JS runtime.  
 */
#ifdef __cplusplus
extern "C" void RCTRegisterFrameStreamer(jsi::Runtime &rt);
#else
extern void RCTRegisterFrameStreamer(void *rt);
#endif
