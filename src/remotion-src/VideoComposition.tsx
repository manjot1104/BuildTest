import React from "react";
import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  springTiming,
  linearTiming,
} from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import type { VideoJson } from "./types";
import { SceneRenderer } from "./scenes/SceneRenderer";

// ============================================================
// VIDEO COMPOSITION
// Root component. Receives the full VideoJson from the LLM.
//
// TRANSITION + AUDIO SYNC NOTES:
// - TransitionSeries overlaps adjacent scenes by `transitionDuration` frames.
// - This means total rendered duration = sum(durationInFrames) - sum(transitionDurations).
// - For audio sync: offset your audio tracks by the same overlap amounts.
//   e.g. Scene 1 = 150 frames, transition = 20 frames → Scene 2 audio starts at frame 130.
// - Use `getAudioOffset(scenes, sceneIndex)` (exported below) to compute per-scene offsets.
// ============================================================

type Props = {
  videoJson: VideoJson;
};

// Destructure immediately so Webpack resolves them at module level
const { Sequence: TSSequence, Transition: TSTransition } = TransitionSeries;

/**
 * Returns the frame at which each scene's *content* starts in the final timeline,
 * accounting for transition overlaps. Use this to sync per-scene audio tracks.
 *
 * Example:
 *   scenes = [{ durationInFrames: 150, transitionDuration: 20 }, { durationInFrames: 120 }]
 *   getAudioOffsets(scenes) → [0, 130]  // scene 2 audio starts at frame 130
 */
export function getAudioOffsets(scenes: VideoJson["scenes"]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    offsets.push(cursor);
    const transitionDuration = scene.transitionDuration ?? 20;
    cursor +=
      scene.durationInFrames - (i < scenes.length - 1 ? transitionDuration : 0);
  }
  return offsets;
}

/**
 * Returns the total rendered duration in frames (accounting for transition overlaps).
 * Use this as `durationInFrames` on your <Composition>.
 */
export function getTotalDuration(scenes: VideoJson["scenes"]): number {
  if (!scenes?.length) return 0;
  return scenes.reduce((sum, scene, i) => {
    const transitionDuration = scene.transitionDuration ?? 20;
    const isLast = i === scenes.length - 1;
    return sum + scene.durationInFrames - (isLast ? 0 : transitionDuration);
  }, 0);
}

function getPresentation(
  type: string | undefined,
): TransitionPresentation<any> {
  switch (type) {
    case "slide-left":
      return slide({ direction: "from-right" });
    case "slide-right":
      return slide({ direction: "from-left" });
    case "slide-up":
      return slide({ direction: "from-bottom" });
    case "slide-down":
      return slide({ direction: "from-top" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "none":
      return fade(); // silent fade as fallback for 'none'
    case "fade":
    default:
      return fade();
  }
}

export const VideoComposition: React.FC<Props> = ({ videoJson }) => {
  if (!videoJson?.scenes?.length) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#0f0f0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 24,
          fontFamily: 'sans-serif',
        }}
      >
        No scenes to render.
      </AbsoluteFill>
    );
  }

  const { scenes } = videoJson;

  return (
    <AbsoluteFill
      style={{ fontFamily: videoJson.globalFontFamily ?? "sans-serif" }}
    >
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const isLast = i === scenes.length - 1;
          const transitionDuration = scene.transitionDuration ?? 20;
          const transitionType = scene.transition ?? "fade";

          return (
            // React.Fragment with key is correct here — TransitionSeries
            // reads its children array and handles ordering internally.
            <React.Fragment key={scene.id ?? `scene-${i}`}>
              <TSSequence
                durationInFrames={scene.durationInFrames}
              >
                <SceneRenderer scene={scene} />
              </TSSequence>

              {/* Transition goes AFTER its scene, BEFORE the next scene */}
              {!isLast && (
                <TSTransition
                  presentation={getPresentation(transitionType)}
                  timing={
                    transitionType === "none"
                      ? // Zero-duration linear timing acts as a hard cut
                        linearTiming({ durationInFrames: 1 })
                      : springTiming({
                          config: { damping: 200 },
                          durationInFrames: transitionDuration,
                        })
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
