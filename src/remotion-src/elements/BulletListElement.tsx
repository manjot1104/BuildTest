import React from "react";
import { useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import type { BulletListElementProps } from "../types";

// ============================================================
// BULLET LIST ELEMENT
// Renders a list of bullet items that reveal one by one.
// Each item animates in after the previous one, with configurable
// delay between items. No overlap possible — items stack in a
// flex column with consistent gap managed by the layout.
// ============================================================

export const BulletListElement: React.FC<BulletListElementProps> = ({
  items,
  fontSize = 36,
  fontFamily,
  fontWeight = "500",
  color = "#ffffff",
  bulletColor,
  lineHeight = 1.4,
  animation = "slide-left",
  itemDelay = 12, // frames between each item appearing
  animationDelay = 0, // frames before the first item appears
  animationDuration = 20,
  shadow = false,
}) => {
  const { width: compositionWidth } = useVideoConfig();
  const frame = useCurrentFrame();
  const scale = compositionWidth / 1280;
  const effectiveFontSize = Math.round(fontSize * scale);
  const effectiveBulletColor = bulletColor ?? color;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${18 * scale}px`,
        width: "100%",
      }}
    >
      {items.map((item, index) => {
        const itemStart = animationDelay + index * itemDelay;
        const itemEnd = itemStart + animationDuration;

        // Each item fades + slides independently
        const progress = interpolate(frame, [itemStart, itemEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        const translateX =
          animation === "slide-left"
            ? interpolate(progress, [0, 1], [40 * scale, 0])
            : 0;
        const translateY =
          animation === "slide-up"
            ? interpolate(progress, [0, 1], [20 * scale, 0])
            : 0;

        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: `${14 * scale}px`,
              opacity: eased,
              transform: `translateX(${translateX}px) translateY(${translateY}px)`,
            }}
          >
            {/* Bullet indicator */}
            <div
              style={{
                width: `${10 * scale}px`, // Slightly larger bullet
                height: `${10 * scale}px`,
                borderRadius: "50%",
                backgroundColor: effectiveBulletColor,
                flexShrink: 0,
                marginTop: `${effectiveFontSize * 0.4}px`, // Reliable centering for various font sizes
                boxShadow: shadow
                  ? `0 0 ${4 * scale}px rgba(0,0,0,0.5)`
                  : "none",
              }}
            />
            {/* Bullet text */}
            <span
              style={{
                fontSize: effectiveFontSize,
                fontFamily: fontFamily ?? "inherit",
                fontWeight,
                color,
                lineHeight,
                textShadow: shadow
                  ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.5)`
                  : undefined,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                flex: 1,
              }}
            >
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
};
