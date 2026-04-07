import React from "react";
import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundType } from "../types";

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
  overlayOpacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const renderBackground = () => {
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
        if (kenBurns === "zoom-in")
          kbTransform = `scale(${interpolate(progress, [0, 1], [1, 1.1])})`;
        if (kenBurns === "zoom-out")
          kbTransform = `scale(${interpolate(progress, [0, 1], [1.1, 1])})`;
        if (kenBurns === "pan-left")
          kbTransform = `translateX(${interpolate(progress, [0, 1], [0, -5])}%) scale(1.1)`;
        if (kenBurns === "pan-right")
          kbTransform = `translateX(${interpolate(progress, [0, 1], [0, 5])}%) scale(1.1)`;

        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <Img
              src={background.url}
              style={{
                width: '100%',
                height: '100%',
                objectFit: background.objectFit ?? 'cover',
                transform: kbTransform,
                willChange: 'transform',
                // Add a slight blur to background images to separate them from foreground elements
                filter: 'blur(2px)', 
              }}
              onError={() => console.warn('[BackgroundRenderer] Image failed:', background.url)}
            />
          </AbsoluteFill>
        );
      }
      
      case "video":
        return (
          <AbsoluteFill>
            <Video
              src={background.url}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: 'blur(2px)',
              }}
              muted // Background videos should usually be muted
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

      {/* 1. SAFETY SCRIM: Subtle darkening so text always pops */}
      <AbsoluteFill 
        style={{ 
          backgroundColor: 'black', 
          opacity: 0.3 // Constant baseline darkness
        }} 
      />

      {/* 2. DYNAMIC OVERLAY: LLM's requested color/opacity */}
      {overlay && (
        <AbsoluteFill
          style={{
            backgroundColor: overlay,
            opacity: overlayOpacity,
            mixBlendMode: 'multiply', // Better color integration than flat opacity
          }}
        />
      )}

      {/* 3. VIGNETTE: Soft dark edges to draw eye to center/foreground */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.5) 150%)',
        }}
      />
    </>
  );
};
