import React, { useState } from "react";
import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundType } from "../types";

type Props = {
  background: BackgroundType;
  overlay?: string;
  overlayOpacity?: number;
};

export const BackgroundRenderer: React.FC<Props> = ({
  background,
  overlay,
  overlayOpacity = 1,
}) => {
  const [hasError, setHasError] = useState(false);
  const frame = useCurrentFrame();
  const { durationInFrames, width: compositionWidth } = useVideoConfig();
  const scale = compositionWidth / 1280;

  const renderBackground = () => {
    // Technical Fallback UI
    if (hasError) {
      return (
        <AbsoluteFill style={{ background: '#0a0a0a' }}>
           <div style={{ 
             position: 'absolute', width: '100%', height: '100%', 
             backgroundImage: `radial-gradient(rgba(255,255,255,0.07) ${1 * scale}px, transparent 0)`,
             backgroundSize: `${40 * scale}px ${40 * scale}px` 
           }} />
           <div style={{
             position: 'absolute', width: '100%', height: '100%',
             background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))'
           }} />
        </AbsoluteFill>
      );
    }

    switch (background.type) {
      case "color":
        return <AbsoluteFill style={{ backgroundColor: background.value }} />;

      case "gradient": {
        const angle = background.angle ?? 135;
        return (
          <AbsoluteFill
            style={{
              background: `linear-gradient(${angle}deg, ${background.from}, ${background.to})`,
            }}
          />
        );
      }

      case "image": {
        const kenBurns = background.kenBurns ?? "none";
        const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        let kbTransform = "none";
        if (kenBurns === "zoom-in") kbTransform = `scale(${interpolate(progress, [0, 1], [1, 1.1])})`;
        if (kenBurns === "zoom-out") kbTransform = `scale(${interpolate(progress, [0, 1], [1.1, 1])})`;
        if (kenBurns === "pan-left") kbTransform = `translateX(${interpolate(progress, [0, 1], [0, -5])}%) scale(1.1)`;
        if (kenBurns === "pan-right") kbTransform = `translateX(${interpolate(progress, [0, 1], [0, 5])}%) scale(1.1)`;

        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <Img
              src={background.url}
              style={{
                width: '100%', height: '100%',
                objectFit: background.objectFit ?? 'cover',
                transform: kbTransform,
                filter: 'blur(3px)', 
              }}
              onError={() => setHasError(true)}
            />
          </AbsoluteFill>
        );
      }
      
      case "video":
        return (
          <AbsoluteFill>
            <Video
              src={background.url}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: 'blur(3px)' }}
              muted
              onError={() => setHasError(true)}
            />
          </AbsoluteFill>
        );

      default:
        return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
    }
  };

  return (
    <>
      {renderBackground()}

      {/* Safety Layers */}
      <AbsoluteFill style={{ backgroundColor: 'black', opacity: 0.3 }} />

      {overlay && (
        <AbsoluteFill
          style={{
            backgroundColor: overlay,
            opacity: overlayOpacity,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.5) 150%)',
        }}
      />
    </>
  );
};