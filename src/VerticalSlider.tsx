import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import throttle from 'lodash/throttle';

export type VerticalSliderProps = {
  height?: number;
  width?: number;
  thumbSize?: number;
  onMove: (value: number) => void;
  style?: ViewStyle;
};


export default function VerticalSlider({
  height = 200,
  width = 40,
  thumbSize = 30,
  onMove,
  style,
}: VerticalSliderProps) {
  const debounceThreshold = 2;
  const maxRange = height - thumbSize;

  const translateY = useSharedValue(maxRange);
  const gestureStartY = useSharedValue(translateY.value);
  const lastServoCommand = useSharedValue(maxRange);

  const throttledRef = useRef(throttle(onMove, 50));
  const jsThrottled = (newY: number) => {
    const normalized = Math.round((1 - newY / maxRange) * 100);
    throttledRef.current(normalized);
  };

  useEffect(() => {
    throttledRef.current = throttle(onMove, 50);
  }, [onMove]);
const drag = Gesture.Pan()
  .hitSlop(20)
  .onStart(() => {
    gestureStartY.value = translateY.value;
  })
  .onUpdate((e) => {
    let newY = gestureStartY.value + e.translationY;

    if (newY < 0) newY = 0;
    if (newY > maxRange) newY = maxRange;

    translateY.value = newY;

    if (Math.abs(newY - lastServoCommand.value) > debounceThreshold) {
      runOnJS(jsThrottled)(newY);
      lastServoCommand.value = newY;
    }
  })
  .onEnd(() => {
    runOnJS(jsThrottled)(translateY.value);
  });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureHandlerRootView style={[{ width, height }, style]}>
      <View
        style={[
          styles.rail,
          {
            width: width / 6,
            height: height - thumbSize + 6,
            top: thumbSize / 2,
          },
        ]}
      />
      <GestureDetector gesture={drag}>
        <Animated.View
          style={[
            styles.thumb,
            animatedThumbStyle,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              left: (width - thumbSize + 2) / 2,
            },
          ]}
        />
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    backgroundColor: '#888',
    borderRadius: 2,
    left: '50%',
    marginLeft: -2,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: '#2080ee',
  },
});
