import React from 'react';
import { Img, AbsoluteFill } from 'remotion';
import type { ImageElementProps } from '../types';
import { useAnimationStyle } from '../animations/useAnimationStyle';

// ============================================================
// IMAGE ELEMENT
// Remotion's <Img> is used (not <img>) so frames wait for load.
// ============================================================

export const ImageElement: React.FC<ImageElementProps> = ({
  url,
  x,
  y,
  width = '100%',
  height = '100%',
  objectFit = 'cover',
  borderRadius = 0,
  opacity: baseOpacity = 1,
  animation = 'fade',
  animationDelay = 0,
  animationDuration = 20,
  shadow = false,
  border,
}) => {
  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);
  const isPositioned = x !== undefined || y !== undefined;

  const imgStyle: React.CSSProperties = {
    width,
    height,
    objectFit,
    borderRadius,
    opacity: animStyle.opacity * baseOpacity,
    transform: animStyle.transform,
    boxShadow: shadow ? '0 8px 32px rgba(0,0,0,0.4)' : undefined,
    border: border || undefined,
    display: 'block',
  };

  if (isPositioned) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x ?? 'auto',
          top: y ?? 'auto',
          width,
          height,
          overflow: 'hidden',
          borderRadius,
        }}
      >
        <Img src={url} style={{ width: '100%', height: '100%', objectFit, opacity: animStyle.opacity * baseOpacity, transform: animStyle.transform }} />
      </div>
    );
  }

  return (
    <AbsoluteFill>
      <Img src={url} style={imgStyle} />
    </AbsoluteFill>
  );
};