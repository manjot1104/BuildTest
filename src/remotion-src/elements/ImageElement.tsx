import React from 'react';
import { Img, useVideoConfig } from 'remotion';
import type { ImageElementProps } from '../types';
import { useAnimationStyle } from '../animations/useAnimationStyle';

// ============================================================
// IMAGE ELEMENT
// Remotion's <Img> is used (not <img>) so frames wait for load.
// ============================================================

export const ImageElement: React.FC<ImageElementProps> = ({
  url,
  objectFit = 'cover',
  borderRadius = 16,
  shadow = true,
  animation = 'fade',
  animationDelay = 0,
  animationDuration = 20,
  opacity: baseOpacity = 1,
}) => {
  const { width: compositionWidth, height: compositionHeight } = useVideoConfig();
  
  // Consistency: Scale coordinates/dimensions based on 1280px baseline
  const scaleFactor = compositionWidth / 1280;

  // Ensure the hook gets the actual values from the JSON
  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);

  return (
    <div style={{ 
      width: '100%', 
      height: 'auto', 
      maxWidth: '100%', 
      // Ensure image never taller than a large portion of the screen
      maxHeight: `${compositionHeight * 0.8}px`, 
      
      // Scale visual stylings
      borderRadius: `${borderRadius * scaleFactor}px`,
      overflow: 'hidden',
      
      // Multi-layer shadow for "Depth"
      // This makes the foreground image look like it's floating far above the background
      boxShadow: shadow 
        ? `0 ${10 * scaleFactor}px ${30 * scaleFactor}px rgba(0,0,0,0.5), 
           0 ${20 * scaleFactor}px ${60 * scaleFactor}px rgba(0,0,0,0.3)` 
        : 'none',
      
      // Combine animations with base opacity
      opacity: animStyle.opacity * baseOpacity,
      transform: animStyle.transform,
      
      // Optimization
      willChange: 'transform, opacity',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Img 
        src={url} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit 
        }} 
        // Remotion best practice: Error handling to prevent render crashes
        onError={() => console.error("Failed to load element image:", url)}
      />
    </div>
  );
};