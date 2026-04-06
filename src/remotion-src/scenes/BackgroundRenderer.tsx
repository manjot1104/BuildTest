import React from 'react';
import { AbsoluteFill, Img, Video } from 'remotion';
import type { BackgroundType } from '../types';

// ============================================================
// BACKGROUND RENDERER
// Handles all background types from the JSON schema.
// ============================================================

type Props = {
  background: BackgroundType;
  overlay?: string;
  overlayOpacity?: number;
};

export const BackgroundRenderer: React.FC<Props> = ({
  background,
  overlay,
  overlayOpacity = 0.4,
}) => {
  const renderBackground = () => {
    switch (background.type) {
      case 'color':
        return (
          <AbsoluteFill style={{ backgroundColor: background.value }} />
        );

      case 'gradient': {
        const angle = background.angle ?? 135;
        return (
          <AbsoluteFill
            style={{
              background: `linear-gradient(${angle}deg, ${background.from}, ${background.to})`,
            }}
          />
        );
      }

      case 'image':
        return (
          <AbsoluteFill>
            <Img
              src={background.url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: background.objectFit ?? 'cover',
              }}
            />
          </AbsoluteFill>
        );

      case 'video':
        return (
          <AbsoluteFill>
            <Video
              src={background.url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </AbsoluteFill>
        );

      default:
        return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
    }
  };

  return (
    <>
      {renderBackground()}
      {overlay && (
        <AbsoluteFill
          style={{
            backgroundColor: overlay,
            opacity: overlayOpacity,
          }}
        />
      )}
    </>
  );
};