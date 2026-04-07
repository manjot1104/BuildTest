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
  shadow = true,
  background,
  padding,
  borderRadius = 0,
}) => {
  const { width: compositionWidth } = useVideoConfig();
  const scaleFactor = compositionWidth / 1280;
  const effectiveFontSize = Math.round(fontSize * scaleFactor);

  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);
  const typewriterText = useTypewriter(text, animationDelay, animationDuration);
  const displayText = animation === 'typewriter' ? typewriterText : text;

  const style: React.CSSProperties = {
    fontSize: effectiveFontSize,
    fontFamily: fontFamily ?? 'inherit',
    fontWeight,
    color,
    textAlign,
    lineHeight,
    letterSpacing: letterSpacing * scaleFactor,
    opacity: animStyle.opacity * baseOpacity,
    transform: animStyle.transform,
    background: background ?? undefined,
    padding: padding != null ? `${padding * scaleFactor}px` : undefined,
    borderRadius: borderRadius ? `${borderRadius * scaleFactor}px` : undefined,
    
    // --- LEGIBILITY & BOUNDARY UPDATES ---
    
    // 1. Boundary Stroke: Creates a thin dark outline around letters
    // This is the "boundary color" you mentioned.
    WebkitTextStroke: `${1 * scaleFactor}px rgba(0,0,0,0.15)`,
    paintOrder: 'stroke fill',

    // 2. Multi-Layer Shadow: 
    // Layer 1: Tight dark shadow for immediate contrast.
    // Layer 2: Softer, larger shadow to create "depth" from the background.
    textShadow: shadow
      ? `0 ${2 * scaleFactor}px ${4 * scaleFactor}px rgba(0,0,0,0.7), 
         0 ${4 * scaleFactor}px ${15 * scaleFactor}px rgba(0,0,0,0.3)`
      : undefined,

    // --- CONTAINMENT UPDATES ---
    maxWidth: '100%', // Let the Layout Slot handle the outer width
    width: 'fit-content', // Don't take up 100% if the text is short
    margin: '0 auto', // Center within the slot
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };

  return <div style={style}>{displayText}</div>;
};