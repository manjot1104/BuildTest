import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame } from 'remotion';
import type { Scene } from '../types';
import { BackgroundRenderer } from './BackgroundRenderer';
import { ElementRenderer } from './ElementRenderer';
import { TransitionOverlay } from '../transitions/TransitionOverlay';

// ============================================================
// SCENE RENDERER
// Renders one scene: background → elements → transition overlay.
// ============================================================

type Props = {
  scene: Scene;
};

export const SceneRenderer: React.FC<Props> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const transitionDuration = scene.transitionDuration ?? 15;
  const transition = scene.transition ?? 'none';

  // Fade out at the end of this scene if it has a transition
  const isNearEnd = frame > durationInFrames - transitionDuration;

  return (
    <AbsoluteFill>
      {/* Background */}
      <BackgroundRenderer
        background={scene.background}
        overlay={scene.overlay}
        overlayOpacity={scene.overlayOpacity}
      />

      {/* Elements */}
      <AbsoluteFill
        style={{
          padding: scene.padding ?? 0,
          position: 'relative',
        }}
      >
        {scene.elements.map((element, i) => (
          <ElementRenderer key={i} element={element} />
        ))}
      </AbsoluteFill>

      {/* Transition out — applied at the end of the scene */}
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