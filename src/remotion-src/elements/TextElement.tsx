import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TextElementProps } from '../types';
import { useAnimationStyle, useTypewriter } from '../animations/useAnimationStyle';

// ============================================================
// TEXT ELEMENT
// Renders a text block. Supports all animation types including
// typewriter. Position is either absolute (x/y) or centered.
// ============================================================

export const TextElement: React.FC<TextElementProps> = ({
  text,
  fontSize = 60,
  fontFamily = 'sans-serif',
  fontWeight = 'bold',
  color = '#ffffff',
  textAlign = 'center',
  x,
  y,
  width,
  maxWidth,
  lineHeight = 1.3,
  letterSpacing = 0,
  animation = 'fade',
  animationDelay = 0,
  animationDuration = 20,
  opacity: baseOpacity = 1,
  shadow = false,
  background,
  padding = 0,
  borderRadius = 0,
}) => {
  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);

  const displayText = animation === 'typewriter'
    ? useTypewriter(text, animationDelay, animationDuration)
    : text;

  const isPositioned = x !== undefined || y !== undefined;

  const style: React.CSSProperties = {
    fontSize,
    fontFamily,
    fontWeight,
    color,
    textAlign,
    lineHeight,
    letterSpacing,
    opacity: animStyle.opacity * baseOpacity,
    transform: animStyle.transform,
    background: background || undefined,
    padding: padding || undefined,
    borderRadius: borderRadius || undefined,
    maxWidth: maxWidth || undefined,
    width: width || undefined,
    textShadow: shadow ? '0 2px 8px rgba(0,0,0,0.5)' : undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  // If x/y provided → absolutely positioned
  if (isPositioned) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x ?? 'auto',
          top: y ?? 'auto',
          ...style,
        }}
      >
        {displayText}
      </div>
    );
  }

  // Default → centered in the scene
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
        padding: '0 80px',
        pointerEvents: 'none',
      }}
    >
      <div style={style}>{displayText}</div>
    </AbsoluteFill>
  );
};