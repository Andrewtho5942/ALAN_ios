// Joystick.tsx
import React, { useMemo } from 'react';
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

// We'll use this to store gesture state
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

  // 1) create a simple, plain‐JS wrapper around onMove
const throttled = useMemo(() => throttle(onMove, 16), [onMove]);
 const jsOnMove = (pos: { x: number; y: number }) => {
    throttled(pos);
  };

  // 2) create the pan gesture with our context
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
          // normalized [-1..1] -> call our plain wrapper
+        runOnJS(jsOnMove)({
          x: newX / maxRadius,
          y: newY / maxRadius,
        })
      })
      // return the center when released
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
        runOnJS(jsOnMove)({ x: 0, y: 0 })
      })
  }, [maxRadius, jsOnMove, transX, transY]);

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
