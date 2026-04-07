import { interpolate, useCurrentFrame } from "remotion";
import type { AnimationType } from "../types";

// ============================================================
// ANIMATION UTILITIES
// Call useAnimationStyle() in any element to get animated styles.
// ============================================================

export type AnimationStyle = {
  opacity: number;
  transform: string;
};

/**
 * Returns animated CSS style values based on animation type.
 * @param animation - the animation type from JSON
 * @param delay     - frames to wait before starting (default 0)
 * @param duration  - frames the animation takes (default 20)
 */
export const useAnimationStyle = (
  animation: AnimationType = "none",
  delay: number = 0,
  duration: number = 20,
): AnimationStyle => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Eased progress (ease-out cubic)
  const eased = 1 - Math.pow(1 - progress, 3);

  switch (animation) {
    case "fade":
      return {
        opacity: eased,
        transform: "none",
      };

    case "slide-up":
      return {
        opacity: eased,
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };

    case "slide-down":
      return {
        opacity: eased,
        transform: `translateY(${interpolate(progress, [0, 1], [-50, 0])}px)`,
      };

    case "slide-left":
      return {
        opacity: eased,
        transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`,
      };

    case "slide-right":
      return {
        opacity: eased,
        transform: `translateX(${interpolate(progress, [0, 1], [-60, 0])}px)`,
      };

    case "zoom-in":
      return {
        opacity: eased,
        transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
      };

    case "zoom-out":
      return {
        opacity: eased,
        transform: `scale(${interpolate(progress, [0, 1], [1.3, 1])})`,
      };

    case "bounce": {
      // Overshoot spring
      const bounceProgress =
        progress < 0.6
          ? interpolate(progress, [0, 0.6], [0, 1.15])
          : interpolate(progress, [0.6, 0.8, 1], [1.15, 0.95, 1]);
      return {
        opacity: Math.min(eased * 2, 1),
        transform: `scale(${bounceProgress})`,
      };
    }

    case "spring-up": {
      // spring physics: overshoot then settle
      const overshoot =
        progress < 0.7
          ? interpolate(progress, [0, 0.7], [0, 1.08])
          : interpolate(progress, [0.7, 0.85, 1], [1.08, 0.96, 1]);
      return {
        opacity: Math.min(eased * 1.5, 1),
        transform: `translateY(${interpolate(overshoot, [0, 1], [40, 0])}px)`,
      };
    }

    case "spring-scale": {
      const overshoot =
        progress < 0.7
          ? interpolate(progress, [0, 0.7], [0, 1.08])
          : interpolate(progress, [0.7, 0.85, 1], [1.08, 0.96, 1]);
      return {
        opacity: Math.min(eased * 1.5, 1),
        transform: `scale(${overshoot})`,
      };
    }

    case "none":
    default:
      return {
        opacity: 1,
        transform: "none",
      };
  }
};

/**
 * Typewriter effect — returns substring of text based on frame.
 */
export const useTypewriter = (
  text: string,
  delay: number = 0,
  duration: number = 60,
): string => {
  const frame = useCurrentFrame();
  const charCount = Math.floor(
    interpolate(frame, [delay, delay + duration], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return text.slice(0, charCount);
};
