import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition, getTotalDuration } from './VideoComposition';
import type { VideoJson } from './types';

// ============================================================
// ROOT
// Registers the Remotion composition.
//
// IMPORTANT: durationInFrames must use getTotalDuration() — NOT a
// raw sum of scene frames — because TransitionSeries overlaps
// adjacent scenes by each scene's transitionDuration. Using a raw
// sum produces a composition that is longer than the actual output,
// leaving dead black frames at the end.
// ============================================================

const defaultVideo: VideoJson = {
  // duration is informational; Remotion uses the Composition prop, not this field.
  // We set it here so the schema stays consistent with LLM output.
  duration: 0, // will be overridden by getTotalDuration below
  fps: 30,
  width: 1280,
  height: 720,
  globalColorScheme: {
    primary: '#ffffff',
    secondary: '#a5b4fc',
    accent: '#6366f1',
    background: '#111827',
    text: '#ffffff',
  },
  scenes: [
    {
      id: 'scene-1',
      layout: 'TITLE_SUBTITLE',
      durationInFrames: 150,
      transition: 'slide-left',
      transitionDuration: 20,
      background: {
        type: 'image',
        url: 'https://picsum.photos/seed/build-dark-abstract/1280/720.jpg',
        objectFit: 'cover',
        kenBurns: 'zoom-in',
      },
      overlay: 'rgba(0,0,0,0.5)',
      overlayOpacity: 1,
      elements: [
        {
          type: 'text',
          slot: 'title',
          text: 'Pipeline Integrated',
          fontSize: 80,
          fontWeight: '800',
          color: '#ffffff',
          animation: 'spring-up',
          shadow: true,
        },
        {
          type: 'text',
          slot: 'subtitle',
          text: 'Layout System v4 Active',
          fontSize: 36,
          color: 'rgba(255,255,255,0.8)',
          animation: 'fade',
          shadow: true,
        },
      ],
    },
    {
      id: 'scene-2',
      layout: 'STATEMENT',
      durationInFrames: 150,
      transition: 'fade',
      transitionDuration: 20,
      background: {
        type: 'gradient',
        from: '#1e1b4b',
        to: '#312e81',
        angle: 135,
      },
      elements: [
        {
          type: 'text',
          slot: 'text',
          text: 'Transitions Sync With Audio',
          fontSize: 72,
          fontWeight: '700',
          color: '#ffffff',
          animation: 'spring-scale',
        },
      ],
    },
    {
      id: 'scene-3',
      layout: 'BULLET_POINTS',
      durationInFrames: 180,
      // No transition on last scene — VideoComposition ignores it automatically
      background: {
        type: 'color',
        value: '#111827',
      },
      elements: [
        {
          type: 'text',
          slot: 'heading',
          text: 'How Audio Sync Works',
          fontSize: 52,
          fontWeight: '700',
          color: '#ffffff',
          animation: 'spring-up',
        },
        {
          type: 'bullet-list',
          slot: 'bullet',
          items: [
            'getTotalDuration() returns the real timeline length',
            'getAudioOffsets() gives per-scene audio start frames',
            'transitionDuration controls the overlap window',
          ],
          fontSize: 28,
          color: '#a5b4fc',
          animation: 'slide-up',
        },
      ],
    },
  ],
};

// Patch duration to match actual rendered length
defaultVideo.duration = getTotalDuration(defaultVideo.scenes);

export const Root: React.FC = () => {
  // getTotalDuration accounts for transition frame overlaps.
  // This is the value Remotion needs — NOT a raw sum of durationInFrames.
  const totalFrames = getTotalDuration(defaultVideo.scenes);

  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={totalFrames || 300}
      fps={defaultVideo.fps ?? 30}
      width={defaultVideo.width ?? 1280}
      height={defaultVideo.height ?? 720}
      defaultProps={{ videoJson: defaultVideo }}
    />
  );
};