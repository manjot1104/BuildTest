import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import type { VideoJson } from './types';

// ============================================================
// DEFAULT PROPS (Matches LLM System Prompt v3)
// ============================================================
const defaultVideo: VideoJson = {
  duration: 10, // Fallback
  fps: 30,
  width: 1280,
  height: 720,
  globalColorScheme: {
    primary: "#ffffff",
    secondary: "#a5b4fc",
    accent: "#6366f1",
    background: "#111827",
    text: "#ffffff"
  },
  scenes: [
    {
      id: "scene-1",
      layout: "TITLE_SUBTITLE", // Crucial: Matches v3
      durationInFrames: 150,
      background: {
        type: "image",
        url: "https://picsum.photos/seed/build/1280/720.jpg",
        objectFit: "cover",
        kenBurns: "zoom-in"
      },
      overlay: "rgba(0,0,0,0.5)",
      elements: [
        {
          type: "text",
          slot: "title", // Crucial: Matches v3
          text: "Pipeline Integrated",
          fontSize: 80,
          fontWeight: "800",
          color: "#ffffff",
          animation: "spring-up",
          shadow: true
        },
        {
          type: "text",
          slot: "subtitle",
          text: "Layout System v3 Active",
          fontSize: 36,
          color: "rgba(255,255,255,0.8)",
          animation: "fade",
          shadow: true
        }
      ]
    },
    {
      id: "scene-2",
      layout: "STATEMENT",
      durationInFrames: 150,
      background: { 
        type: "gradient", 
        from: "#1e1b4b", 
        to: "#312e81", 
        angle: 135 
      },
      elements: [
        {
          type: "text",
          slot: "main",
          text: "No More X/Y Coordinates",
          fontSize: 72,
          fontWeight: "700",
          color: "#ffffff",
          animation: "spring-scale"
        }
      ]
    }
  ]
};

export const Root: React.FC = () => {
  // 1. Always calculate total duration from scenes to avoid the "0.15s" bug
  const totalFrames = defaultVideo.scenes.reduce(
    (sum, scene) => sum + (scene.durationInFrames || 0), 
    0
  );

  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      // Use the dynamic sum of frames
      durationInFrames={totalFrames || 300} 
      fps={defaultVideo.fps || 30}
      width={defaultVideo.width || 1280}
      height={defaultVideo.height || 720}
      // Pass the JSON to your components
      defaultProps={{ videoJson: defaultVideo }}
    />
  );
};