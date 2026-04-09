import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import type { Scene } from '../types';
import { BackgroundRenderer } from './BackgroundRenderer';
import { LayoutRenderer } from './LayoutRenderer';

// ============================================================
// SCENE RENDERER
// Renders one scene: background → overlay → layout (with elements).
// Transitions are handled at the Composition level by TransitionSeries.
// ============================================================

type Props = {
  scene: Scene;
  ttsVolume?: number;
};

export const SceneRenderer: React.FC<Props> = ({ scene, ttsVolume = 1 }) => {
  const layout = scene.layout ?? 'TITLE';

  return (
    <AbsoluteFill>
      {/* Layer 1: Background (color / gradient / image with Ken Burns / video) */}
      <BackgroundRenderer
        background={scene.background}
        overlay={scene.overlay}
        // Default to 1 so overlays are fully opaque when specified
        overlayOpacity={scene.overlayOpacity ?? 1}
      />

      {/* Layer 2: Elements, positioned by the layout system */}
      <LayoutRenderer
        layout={layout}
        elements={scene.elements}
      />

      {/* TTS audio for this scene — starts at frame 0 of this scene's Sequence */}
      {scene.ttsUrl && (
        <Audio
          src={scene.ttsUrl}
          volume={ttsVolume}
          // Strip the ?t= cache-buster — Remotion needs a clean path
          // If your ttsUrl already has ?t=..., pass it through staticFile or strip it:
        />
      )}
    </AbsoluteFill>
  );
};