// ============================================================
// CORE VIDEO JSON TYPES
// The LLM generates a VideoJson object. Everything flows from this.
// ============================================================

export type AnimationType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'bounce'
  | 'typewriter'
  | 'none';

export type TransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'zoom'
  | 'none';

export type BackgroundType =
  | { type: 'color'; value: string }
  | { type: 'gradient'; from: string; to: string; angle?: number }
  | { type: 'image'; url: string; objectFit?: 'cover' | 'contain' | 'fill' }
  | { type: 'video'; url: string };

export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

// ── Elements ──────────────────────────────────────────────

export type TextElementProps = {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  x?: number | string;   // px or "50%" style
  y?: number | string;
  width?: number | string;
  maxWidth?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  animation?: AnimationType;
  animationDelay?: number;   // frames
  animationDuration?: number; // frames
  opacity?: number;
  shadow?: boolean;
  background?: string;       // text background/highlight
  padding?: number;
  borderRadius?: number;
};

export type ImageElementProps = {
  type: 'image';
  url: string;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
  shadow?: boolean;
  border?: string;
};

export type ShapeElementProps = {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'line' | 'triangle';
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  color?: string;
  borderRadius?: number;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
  border?: string;
};

export type DividerElementProps = {
  type: 'divider';
  x?: number | string;
  y?: number | string;
  width?: number | string;
  thickness?: number;
  color?: string;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
};

export type GroupElementProps = {
  type: 'group';
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  elements: SceneElement[];
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
};

export type SceneElement =
  | TextElementProps
  | ImageElementProps
  | ShapeElementProps
  | DividerElementProps
  | GroupElementProps;

// ── Scene ─────────────────────────────────────────────────

export type Scene = {
  id?: string;
  durationInFrames: number;
  background: BackgroundType;
  elements: SceneElement[];
  transition?: TransitionType;   // transition INTO this scene
  transitionDuration?: number;   // frames for transition
  overlay?: string;              // rgba color overlay on top of background
  overlayOpacity?: number;
  padding?: number;
  layout?: 'free' | 'centered' | 'split-left' | 'split-right'; // layout hint
};

// ── Root Video JSON ────────────────────────────────────────

export type VideoJson = {
  duration: number;       // total frames
  fps?: number;           // default 30
  width?: number;         // default 1280
  height?: number;        // default 720
  scenes: Scene[];
  globalFontFamily?: string;
  globalColorScheme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
};