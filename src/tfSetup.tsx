import '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import 'react-native-url-polyfill/auto';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

console.log(cocoSsd)

let model: any = null;

async function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${name} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutHandle!);
  return result as T;
}

export async function initTF() {
  try {
    console.log('Registered backends:', Object.keys(tf.engine().registry));
    console.log('[TF] waiting for tf.ready()');
    await waitWithTimeout(tf.ready(), 5000, 'tf.ready()');

    console.log('[TF] setting backend to rn-webgl');
    const success = await waitWithTimeout(tf.setBackend('cpu'), 5000, 'tf.setBackend');
    if (!success) {
      console.warn('[TF] setBackend returned false, falling back to', tf.getBackend());
    }

    // ensure backend is ready
    await waitWithTimeout(tf.ready(), 5000, 'tf.ready() after setBackend');
    console.log('[TF] backend active:', tf.getBackend());

    console.log('[TF] loading coco-ssd model');
    model = await waitWithTimeout(cocoSsd.load({ base: 'lite_mobilenet_v2' }), 15000, 'model.load');

    console.log('[TF] warmup');
    const dummy = tf.zeros([1, 240, 320, 3]);
    if (model.detect) {
      await model.detect(dummy as any);
    } else if ((model as any).executeAsync) {
      await (model as any).executeAsync(dummy as any);
    }
    dummy.dispose();
    console.log('[TF] warmup done');
  } catch (e) {
    console.error('[TF] initialization failed:', e);
    throw e;
  }
}

export function getModel() {
    return model;
}
