import React, { useRef, useEffect } from 'react';
import { View, Animated, PanResponder, StyleSheet, ViewStyle } from 'react-native';
import throttle from 'lodash/throttle'

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
  const maxRange = height-thumbSize;
  const translateY = useRef(new Animated.Value(maxRange)).current;
  const lastOffset = useRef(maxRange);
  const lastServoCommand = useRef(lastOffset.current);
  onMove(normalizePos(lastOffset.current, maxRange));
  const throttledRef = useRef(throttle(onMove, 50));
  const jsThrottled = (pos:number) => {
    throttledRef.current(pos);
  };

  useEffect(() => {
    throttledRef.current = throttle(onMove, 50);
  }, [onMove]);

  // normalize the sliderPos to (0-100)
  function normalizePos(pos:number, maxRange:number) {
    return Math.round((1 - (pos / maxRange)) * 100)
  }

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
        if ((Math.abs(newY - lastServoCommand.current) > debounceThreshold)) {
          jsThrottled(normalizePos(newY, maxRange));
          lastServoCommand.current = newY;
        }
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
        onMove(normalizePos(newY, maxRange));
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
      <View style={[styles.rail, { 
          width: width / 6, 
          height : height-thumbSize+6,
          top: (thumbSize/2)
       }]} />
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
            left: (width - thumbSize + 2) / 2,
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
