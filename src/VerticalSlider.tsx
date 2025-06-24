import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet, ViewStyle } from 'react-native';

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
  // Range the thumb can move
  const maxRange = height;

  // Animated value for Y translation
  const translateY = useRef(new Animated.Value(maxRange / 2)).current;
  // Keep track of the last offset
  const lastOffset = useRef(maxRange / 2);

  // PanResponder to handle touch gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Prepare the Animated Value for dragging
        translateY.setOffset(lastOffset.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Compute new position clamped within [0, maxRange]
        let newY = lastOffset.current + gestureState.dy;
        if (newY < 0) newY = 0;
        if (newY > maxRange) newY = maxRange;
        // Apply translation
        translateY.setValue(newY - lastOffset.current);
        // Call back with normalized value (invert so top=1)
        onMove(1 - newY / maxRange);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Final clamped position
        let newY = lastOffset.current + gestureState.dy;
        if (newY < 0) newY = 0;
        if (newY > maxRange) newY = maxRange;
        // Flatten offset into the animated value
        translateY.flattenOffset();
        // Store for next gesture
        lastOffset.current = newY;
        // Ensure final onValueChange
        onMove(1 - newY / maxRange);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Animated style for the thumb
  const animatedThumbStyle = {
    transform: [{ translateY }],
  };

  return (
    <View style={[{ width, height }, style]}>  
      {/* Rail */}
      <View style={[styles.rail, { width: width / 6, height }]} />
      {/* Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          animatedThumbStyle,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            left: (width - thumbSize) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    backgroundColor: '#ccc',
    borderRadius: 2,
    left: '50%',
    marginLeft: -2,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: '#2080ee',
  },
});
