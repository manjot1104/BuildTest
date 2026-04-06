import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import type { VideoJson } from './types';

// ============================================================
// ROOT
// Registers compositions with Remotion Studio / CLI.
// defaultProps are used in Remotion Studio for previewing.
// ============================================================

const defaultVideo: VideoJson = {
  duration: 390,
  fps: 30,
  width: 1280,
  height: 720,
  scenes: [
    {
      id: "scene-1",
      durationInFrames: 150,
      background: { type: "gradient", from: "#0f0c29", to: "#302b63", angle: 135 },
      transition: "fade",
      transitionDuration: 15,
      elements: [
        {
          type: "text",
          text: "Hello World",
          fontSize: 96,
          fontWeight: "800",
          color: "#ffffff",
          animation: "slide-up",
          animationDelay: 5,
          animationDuration: 25,
          shadow: true,
        },
        {
          type: "text",
          text: "Testing the pipeline",
          fontSize: 32,
          fontWeight: "300",
          color: "rgba(255,255,255,0.7)",
          animation: "fade",
          animationDelay: 25,
          animationDuration: 20,
          y: "62%",
        },
      ],
    },
    {
      id: "scene-2",
      durationInFrames: 120,
      background: { type: "color", value: "#111827" },
      transition: "fade",
      transitionDuration: 15,
      elements: [
        {
          type: "shape",
          shape: "rectangle",
          x: "10%",
          y: "40%",
          width: "80%",
          height: 4,
          color: "#6366f1",
          animation: "slide-left",
          animationDelay: 0,
          animationDuration: 20,
        },
        {
          type: "text",
          text: "Scene Two",
          fontSize: 72,
          fontWeight: "700",
          color: "#f9fafb",
          animation: "zoom-in",
          animationDelay: 10,
          animationDuration: 20,
        },
        {
          type: "text",
          text: "Shapes and transitions working",
          fontSize: 28,
          color: "#9ca3af",
          animation: "fade",
          animationDelay: 25,
          animationDuration: 20,
          y: "65%",
        },
      ],
    },
    {
      id: "scene-3",
      durationInFrames: 120,
      background: { type: "gradient", from: "#134e4a", to: "#065f46", angle: 160 },
      elements: [
        {
          type: "text",
          text: "It works! 🎉",
          fontSize: 88,
          fontWeight: "800",
          color: "#ffffff",
          animation: "bounce",
          animationDelay: 5,
          animationDuration: 30,
          shadow: true,
        },
      ],
    },
  ],
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={defaultVideo.duration}
      fps={defaultVideo.fps ?? 30}
      width={defaultVideo.width ?? 1280}
      height={defaultVideo.height ?? 720}
      defaultProps={{ videoJson: defaultVideo }}
    />
  );
};