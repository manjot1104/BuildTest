import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { TransitionType } from '../types';

// ============================================================
// TRANSITION OVERLAY
// Rendered on top of a scene to create a transition effect.
// Place at the END of the outgoing scene or START of incoming.
// ============================================================

type Props = {
  type: TransitionType;
  duration: number; // total frames for transition
  direction: 'in' | 'out'; // 'out' = fade out, 'in' = fade in
};

export const TransitionOverlay: React.FC<Props> = ({ type, duration, direction }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = direction === 'out' ? progress : 1 - progress;

  if (type === 'none') return null;

  if (type === 'fade') {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: 'black',
          opacity,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    );
  }

  if (type === 'zoom') {
    const scale = direction === 'out'
      ? interpolate(progress, [0, 1], [1, 1.15])
      : interpolate(progress, [0, 1], [1.15, 1]);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: 'black',
          opacity,
          transform: `scale(${scale})`,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    );
  }

  if (type === 'slide-left' || type === 'slide-right') {
    const translateX = type === 'slide-left'
      ? interpolate(progress, [0, 1], [0, -100])
      : interpolate(progress, [0, 1], [0, 100]);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: 'black',
          opacity,
          transform: `translateX(${translateX}%)`,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    );
  }

  if (type === 'slide-up') {
    const translateY = interpolate(progress, [0, 1], [0, -100]);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: 'black',
          opacity,
          transform: `translateY(${translateY}%)`,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    );
  }

  return null;
};