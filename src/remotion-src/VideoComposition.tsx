import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { VideoJson } from './types';
import { SceneRenderer } from './scenes/SceneRenderer';

// ============================================================
// VIDEO COMPOSITION
// Root component. Receives the full VideoJson from the LLM.
// Maps scenes into Sequences with manual frame offsets.
// ============================================================

type Props = {
  videoJson: VideoJson;
};

export const VideoComposition: React.FC<Props> = ({ videoJson }) => {
  if (!videoJson?.scenes?.length) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 24,
          fontFamily: 'sans-serif',
        }}
      >
        No scenes to render.
      </AbsoluteFill>
    );
  }

  // Calculate the start frame for each scene manually
  const sceneOffsets: number[] = [];
  let offset = 0;
  for (const scene of videoJson.scenes) {
    sceneOffsets.push(offset);
    offset += scene.durationInFrames;
  }

  return (
    <AbsoluteFill
      style={{
        fontFamily: videoJson.globalFontFamily ?? 'sans-serif',
      }}
    >
      {videoJson.scenes.map((scene, i) => (
        <Sequence
          key={scene.id ?? i}
          from={sceneOffsets[i]}
          durationInFrames={scene.durationInFrames}
          name={scene.id ?? `Scene ${i + 1}`}
        >
            <SceneRenderer scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};