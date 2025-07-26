#ifdef __cplusplus
#import <jsi/jsi.h>
extern "C" void RCTRegisterFrameStreamer(jsi::Runtime &rt);
#else
extern void RCTRegisterFrameStreamer(void *rt);
#endif
