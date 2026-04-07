import React from 'react';
import { useVideoConfig } from 'remotion';
import type { TextElementProps } from '../types';
import { useAnimationStyle, useTypewriter } from '../animations/useAnimationStyle';

// ============================================================
// TEXT ELEMENT
// Renders a text block inside its layout slot.
// Position is handled entirely by the layout — this component
// only controls typography and animation.
//
// Font sizes are canvas-relative: a fontSize of 80 is designed
// for a 1280px canvas. On a different canvas size it scales
// automatically so the video looks identical at any resolution.
// ============================================================

export const TextElement: React.FC<TextElementProps> = ({
  text,
  fontSize = 60,
  fontFamily,
  fontWeight = 'bold',
  color = '#ffffff',
  textAlign = 'center',
  lineHeight = 1.25,
  letterSpacing = 0,
  animation = 'fade',
  animationDelay = 0,
  animationDuration = 25,
  opacity: baseOpacity = 1,
  shadow = false,
  background,
  padding,
  borderRadius = 0,
}) => {
  const { width: compositionWidth } = useVideoConfig();

  // Scale font size relative to canvas width.
  // fontSize values in the JSON are authored for 1280px canvas.
  const scaleFactor = compositionWidth / 1280;
  const effectiveFontSize = Math.round(fontSize * scaleFactor);

  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);

  // Typewriter uses a hook — must be called unconditionally
  const typewriterText = useTypewriter(
    text,
    animationDelay,
    animationDuration,
  );
  const displayText = animation === 'typewriter' ? typewriterText : text;

  const style: React.CSSProperties = {
    fontSize: effectiveFontSize,
    // Fall back to system sans-serif — globalFontFamily from VideoComposition
    // is set on the root wrapper so it cascades automatically
    fontFamily: fontFamily ?? 'inherit',
    fontWeight,
    color,
    textAlign,
    lineHeight,
    letterSpacing: letterSpacing * scaleFactor,
    opacity: animStyle.opacity * baseOpacity,
    transform: animStyle.transform,
    background: background ?? undefined,
    // Scale padding with canvas so spacing stays proportional
    padding: padding != null ? `${padding * scaleFactor}px` : undefined,
    borderRadius: borderRadius ? `${borderRadius * scaleFactor}px` : undefined,
    // Hard cap: text never wider than 80% of the canvas
    maxWidth: `${compositionWidth * 0.8}px`,
    width: '100%',
    textShadow: shadow
      ? `0 ${2 * scaleFactor}px ${12 * scaleFactor}px rgba(0,0,0,0.6)`
      : undefined,
    // Prevent overflow — wraps gracefully at word boundaries
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };

  return <div style={style}>{displayText}</div>;
};