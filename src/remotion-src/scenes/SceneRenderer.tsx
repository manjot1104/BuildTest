import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame } from 'remotion';
import type { Scene } from '../types';
import { BackgroundRenderer } from './BackgroundRenderer';
import { LayoutRenderer } from './LayoutRenderer';
import { TransitionOverlay } from '../transitions/TransitionOverlay';

// ============================================================
// SCENE RENDERER
// Renders one scene: background → layout (with elements) → transition.
// Layout is now required — it controls how elements are positioned.
// ============================================================

type Props = {
  scene: Scene;
};

export const SceneRenderer: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const transitionDuration = scene.transitionDuration ?? 15;
  const transition = scene.transition ?? 'none';
  const isNearEnd = frame > durationInFrames - transitionDuration;

  // Default to TITLE if layout somehow missing (defensive)
  const layout = scene.layout ?? 'TITLE';

  return (
    <AbsoluteFill>
      {/* Layer 1: Background (color / gradient / image with Ken Burns / video) */}
      <BackgroundRenderer
        background={scene.background}
        overlay={scene.overlay}
        overlayOpacity={scene.overlayOpacity}
      />

      {/* Layer 2: Elements, positioned by the layout system */}
      <LayoutRenderer layout={layout} elements={scene.elements} />

      {/* Layer 3: Transition overlay, rendered last so it sits on top */}
      {isNearEnd && transition !== 'none' && (
        <TransitionOverlay
          type={transition}
          duration={transitionDuration}
          direction="out"
        />
      )}
    </AbsoluteFill>
  );
};