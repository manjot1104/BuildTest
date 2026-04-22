import React, { useState } from 'react';
import { Img, useVideoConfig } from 'remotion';
import type { ImageElementProps } from '../types';
import { useAnimationStyle } from '../animations/useAnimationStyle';

export const ImageElement: React.FC<ImageElementProps> = ({
  url,
  objectFit = 'cover',
  borderRadius = 16,
  shadow = true,
  animation = 'fade',
  animationDelay = 0,
  animationDuration = 20,
  opacity: baseOpacity = 1,
  alt = "Image Content", // Ensure this exists in your ImageElementProps type
}) => {
  const [hasError, setHasError] = useState(false);
  const { width: compositionWidth, height: compositionHeight } = useVideoConfig();
  const scaleFactor = compositionWidth / 1280;

  const animStyle = useAnimationStyle(animation, animationDelay, animationDuration);

  return (
    <div style={{ 
      width: '100%', 
      height: 'auto', 
      maxWidth: '100%', 
      maxHeight: `${compositionHeight * 0.8}px`, 
      borderRadius: `${borderRadius * scaleFactor}px`,
      overflow: 'hidden',
      boxShadow: shadow 
        ? `0 ${10 * scaleFactor}px ${30 * scaleFactor}px rgba(0,0,0,0.5), 
           0 ${20 * scaleFactor}px ${60 * scaleFactor}px rgba(0,0,0,0.3)` 
        : 'none',
      opacity: animStyle.opacity * baseOpacity,
      transform: animStyle.transform,
      willChange: 'transform, opacity',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1a1a1a', // Fallback background color
    }}>
      {hasError ? (
        <div style={{
          padding: `${40 * scaleFactor}px`,
          color: 'rgba(255,255,255,0.5)',
          fontSize: `${22 * scaleFactor}px`,
          textAlign: 'center',
          fontStyle: 'italic',
          border: `${2 * scaleFactor}px dashed rgba(255,255,255,0.1)`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {alt}
        </div>
      ) : (
        <Img 
          src={url} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit 
          }} 
          onError={() => {
            console.error("Failed to load element image:", url);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
};