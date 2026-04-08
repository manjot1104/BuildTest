import React from 'react';
import { AbsoluteFill } from 'remotion';
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
};

export const SceneRenderer: React.FC<Props> = ({ scene }) => {
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
    </AbsoluteFill>
  );
};