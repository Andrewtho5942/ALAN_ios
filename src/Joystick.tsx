// Joystick.tsx
import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import throttle from 'lodash/throttle'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring
} from 'react-native-reanimated';

type JoystickProps = {
  size?: number;                // diameter of the joystick base
  stickSize?: number;           // diameter of the draggable knob
  onMove: (pos: { x: number; y: number }) => void;
  style?: ViewStyle;            // to reposition the joystick
};
type GestureContext = { startX: number; startY: number };

export default function Joystick({
  size = 150,
  stickSize = 50,
  onMove,
  style,
}: JoystickProps) {
const maxRadius = (size - stickSize) / 2;

const transX = useSharedValue(0);
const transY = useSharedValue(0);
const lastX = useSharedValue(0);
const lastY = useSharedValue(0);
const debounceThreshold = 3;

const throttledRef = useRef(throttle(onMove, 50));
const jsThrottled = (pos: { x: number; y: number }) => {
     throttledRef.current(pos);
};

  useEffect(() => {
    throttledRef.current = throttle(onMove, 50);
  }, [onMove]);

  const pan = useMemo(() => {
    const context: GestureContext = { startX: 0, startY: 0 };
    return Gesture.Pan()
      .onStart((_) => {
        context.startX = transX.value;
        context.startY = transY.value;
      })
      .onUpdate((e) => {
        let newX = context.startX + e.translationX;
        let newY = context.startY + e.translationY;
        // clamp to circle
        const dist = Math.hypot(newX, newY);
        if (dist > maxRadius) {
          const scale = maxRadius / dist;
          newX *= scale;
          newY *= scale;
        }
        transX.value = newX;
        transY.value = newY;

        let debounce_dist = Math.hypot(Math.abs(lastX.value - newX), Math.abs(lastY.value - newY));
        // console.log('dist: ',debounce_dist, '  lastX: ', lastX.value, '  lastY: ', lastY.value)
        // console.log('newX: ',newX, '  newY: ', newY)

        if(debounce_dist > debounceThreshold) {
          runOnJS(jsThrottled)({
            x: Math.round((newX / maxRadius) * 1000) / 1000,
            y: Math.round((newY / maxRadius) * 1000) / 1000,
          })
          lastX.value = newX;
          lastY.value = newY;
        // console.log('newX: ',newX, '  newY: ', newY)
        }

      })
      // return to the center when released
      .onEnd(() => {
        transX.value = withSpring(0, {
          stiffness: 200,  // higher = faster
          damping:   15,   // lower = more bouncy
          mass:      0.5,  // smaller = snappier
        })
        transY.value = withSpring(0, {
          stiffness: 200,
          damping:   15,
          mass:      0.5,
        })
        runOnJS(onMove)({ x: 0, y: 0 })
      })
  }, [maxRadius, onMove, transX, transY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
    ],
  }));


  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.stick,
            animatedStyle,
            {
              width: stickSize,
              height: stickSize,
              borderRadius: stickSize / 2,
            },
          ]}
        />
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11111128',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stick: {
    backgroundColor: '#2080ee',
    position: 'absolute',
  },
});
