import React from 'react';
import type { ShapeElementProps, DividerElementProps } from '../types';
import { useAnimationStyle } from '../animations/useAnimationStyle';

// ============================================================
// SHAPE ELEMENT
// ============================================================

export const ShapeElement: React.FC<ShapeElementProps> = ({
  shape = 'rectangle',
  width = 100,
  height = 100,
  color = '#ffffff',
  borderRadius = 0,
  opacity: baseOpacity = 1,
  animation = 'none',
  animationDelay = 0,
  animationDuration = 20,
  border,
}) => {
  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);

  if (shape === 'triangle') {
    const w = typeof width === 'number' ? width : 100;
    const h = typeof height === 'number' ? height : 100;
    return (
      <div style={{
        width: 0,
        height: 0,
        flexShrink: 0,
        borderLeft: `${w / 2}px solid transparent`,
        borderRight: `${w / 2}px solid transparent`,
        borderBottom: `${h}px solid ${color}`,
        opacity: animStyle.opacity * baseOpacity,
        transform: animStyle.transform,
      }} />
    );
  }

  return (
    <div style={{
      width,
      height: shape === 'line' ? 2 : height,
      flexShrink: 0,
      backgroundColor: color,
      borderRadius: shape === 'circle' ? '50%' : borderRadius,
      opacity: animStyle.opacity * baseOpacity,
      transform: animStyle.transform,
      border: border || undefined,
    }} />
  );
};

export const DividerElement: React.FC<DividerElementProps> = ({
  width = '80%',
  thickness = 2,
  color = 'rgba(255,255,255,0.3)',
  opacity: baseOpacity = 1,
  animation = 'none',
  animationDelay = 0,
}) => {
  const animStyle = useAnimationStyle(animation, animationDelay, 20);

  return (
    <div style={{
      width,
      height: thickness,
      flexShrink: 0,
      backgroundColor: color,
      opacity: animStyle.opacity * baseOpacity,
      transform: animStyle.transform,
    }} />
  );
};