import React from 'react';
import type { ShapeElementProps, DividerElementProps } from '../types';
import { useAnimationStyle } from '../animations/useAnimationStyle';

// ============================================================
// SHAPE ELEMENT
// ============================================================

export const ShapeElement: React.FC<ShapeElementProps> = ({
  shape = 'rectangle',
  x,
  y,
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

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: x ?? 'auto',
    top: y ?? 'auto',
    width,
    height,
    backgroundColor: shape === 'line' ? undefined : color,
    borderRadius: shape === 'circle' ? '50%' : borderRadius,
    opacity: animStyle.opacity * baseOpacity,
    transform: animStyle.transform,
    border: border || undefined,
  };

  if (shape === 'line') {
    return (
      <div
        style={{
          ...baseStyle,
          height: height || 2,
          backgroundColor: color,
        }}
      />
    );
  }

  if (shape === 'triangle') {
    const w = typeof width === 'number' ? width : 100;
    const h = typeof height === 'number' ? height : 100;
    return (
      <div
        style={{
          position: 'absolute',
          left: x ?? 'auto',
          top: y ?? 'auto',
          opacity: animStyle.opacity * baseOpacity,
          transform: animStyle.transform,
          width: 0,
          height: 0,
          borderLeft: `${w / 2}px solid transparent`,
          borderRight: `${w / 2}px solid transparent`,
          borderBottom: `${h}px solid ${color}`,
        }}
      />
    );
  }

  return <div style={baseStyle} />;
};


// ============================================================
// DIVIDER ELEMENT
// ============================================================

export const DividerElement: React.FC<DividerElementProps> = ({
  x,
  y,
  width = '80%',
  thickness = 2,
  color = 'rgba(255,255,255,0.3)',
  opacity: baseOpacity = 1,
  animation = 'none',
  animationDelay = 0,
}) => {
  const animStyle = useAnimationStyle(animation, animationDelay, 20);

  return (
    <div
      style={{
        position: 'absolute',
        left: x ?? '10%',
        top: y ?? '50%',
        width,
        height: thickness,
        backgroundColor: color,
        opacity: animStyle.opacity * baseOpacity,
        transform: animStyle.transform,
      }}
    />
  );
};