import React from 'react';
import {NativeModules} from 'react-native'
console.log('NativeModules: ', NativeModules)

console.log('typeof jsi_hello:', typeof globalThis.jsi_hello);
console.log('typeof jsi_add:', typeof globalThis.jsi_add);
console.log('typeof jsi_bufLen:', typeof globalThis.jsi_bufLen);

if (typeof globalThis.jsi_hello === 'function') {
  console.log(globalThis.jsi_hello());           // "hello from JSI"
  console.log(globalThis.jsi_add(2, 40));        // 42
  const u8 = new Uint8Array(1234);
  console.log(globalThis.jsi_bufLen(u8.buffer)); // 1234
} else {
  throw new Error('JSI smoke installer did not run');
}


function App(): React.JSX.Element {
  return (
    <>
    </>
  );
}
export default App;
