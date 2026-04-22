// ============================================================
// CORE VIDEO JSON TYPES
// The LLM generates a VideoJson object. Everything flows from this.
//
// Scenes declare a `layout` which places elements into
// named slots. This eliminates text collision entirely.
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
  | 'spring-up'
  | 'spring-scale'
  | 'typewriter'
  | 'none';

export type TransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'wipe'
  | 'none';

export type BackgroundType =
  | { type: 'color'; value: string }
  | { type: 'gradient'; from: string; to: string; angle?: number }
  | {
      type: 'image';
      url: string;
      objectFit?: 'cover' | 'contain' | 'fill';
      kenBurns?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none';
    }
  | { type: 'video'; url: string };

export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight =
  | 'normal'
  | 'bold'
  | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

// ── Layout system ──────────────────────────────────────────
//
// TITLE          — one large heading, centered, full canvas
// TITLE_SUBTITLE — heading + subheading, vertically centered
// STATEMENT      — single powerful sentence, large, centered
// BULLET_POINTS  — heading + 2–4 bullet items stacked below
// IMAGE_CAPTION  — fullscreen image bg + caption text at bottom
// SPLIT_LEFT     — text on left half, image/shape on right
// SPLIT_RIGHT    — image/shape on left, text on right
// THIRDS         — three equal columns, one element each
// LOWER_THIRD    — text anchored to bottom, like a broadcast chyron
// FULLSCREEN     — single element fills entire canvas (e.g. big number)

export type LayoutType =
  | 'TITLE'
  | 'TITLE_SUBTITLE'
  | 'STATEMENT'
  | 'BULLET_POINTS'
  | 'IMAGE_CAPTION'
  | 'SPLIT_LEFT'
  | 'SPLIT_RIGHT'
  | 'THIRDS'
  | 'LOWER_THIRD'
  | 'FULLSCREEN';

// ── Slot names per layout ──────────────────────────────────
//
// TITLE:           main
// TITLE_SUBTITLE:  title, subtitle
// STATEMENT:       main
// BULLET_POINTS:   heading, bullet (multiple allowed)
// IMAGE_CAPTION:   caption
// SPLIT_LEFT:      text, visual
// SPLIT_RIGHT:     visual, text
// THIRDS:          col1, col2, col3
// LOWER_THIRD:     main, lower
// FULLSCREEN:      main

export type SlotName =
  | 'main'
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'bullet'
  | 'caption'
  | 'text'
  | 'visual'
  | 'col1'
  | 'col2'
  | 'col3'
  | 'lower';

// ── Elements ──────────────────────────────────────────────

export type TextElementProps = {
  type: 'text';
  slot?: SlotName;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
  opacity?: number;
  shadow?: boolean;
  background?: string;
  padding?: number;
  borderRadius?: number;
};

export type BulletListElementProps = {
  type: 'bullet-list';
  slot?: SlotName;
  items: string[];
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  bulletColor?: string;
  lineHeight?: number;
  animation?: AnimationType;
  itemDelay?: number;
  animationDelay?: number;
  animationDuration?: number;
  shadow?: boolean;
};

export type ImageElementProps = {
  type: 'image';
  slot?: SlotName;
  url: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
  shadow?: boolean;
  border?: string;
  alt?: string;
};

export type ShapeElementProps = {
  type: 'shape';
  slot?: SlotName;
  shape: 'rectangle' | 'circle' | 'line' | 'triangle';
  color?: string;
  borderRadius?: number;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
  animationDuration?: number;
  border?: string;
  width?: number | string;
  height?: number | string;
};

export type DividerElementProps = {
  type: 'divider';
  slot?: SlotName;
  thickness?: number;
  color?: string;
  width?: number | string;
  opacity?: number;
  animation?: AnimationType;
  animationDelay?: number;
};

export type SceneElement =
  | TextElementProps
  | BulletListElementProps
  | ImageElementProps
  | ShapeElementProps
  | DividerElementProps;

// ── Scene ─────────────────────────────────────────────────

export type Scene = {
  id?: string;
  durationInFrames: number;
  layout: LayoutType;
  background: BackgroundType;
  elements: SceneElement[];

  /**
   * The actual text that will be spoken by TTS. 
   * Having this at the scene level makes it easy for the TTS Engine to process.
   */
  text: string;

  /**
   * The URL to the generated MP3 from Smallest.ai.
   * This is populated by the VideoService after the LLM generates the text.
   */
  ttsUrl?: string;

  /**
   * Transition OUT of this scene (into the next).
   * Ignored on the last scene.
   */
  transition?: TransitionType;

  /**
   * Duration of the transition in frames (default: 20).
   * TransitionSeries overlaps this scene and the next by this many frames.
   * AUDIO SYNC: subtract this from the cumulative offset when placing
   * the next scene's audio track. Use getAudioOffsets() from VideoComposition.
   */
  transitionDuration?: number;

  overlay?: string;          // rgba color overlay on top of background
  overlayOpacity?: number;   // 0–1, default 1
};

// ── Root Video JSON ────────────────────────────────────────

export type VideoJson = {
  /**
   * Total rendered frames. Should equal getTotalDuration(scenes).
   * Do NOT set this to the raw sum of durationInFrames — that ignores
   * transition overlaps and causes dead frames at the end.
   */
  duration: number;
  fps?: number;              // default 30
  width?: number;            // default 1280
  height?: number;           // default 720
  scenes: Scene[];

  bgmUrl?: string; // URL to the background music track.

  // This is passed as a prop to Remotion for instant UI updates.
  ttsVolume?: number; // Global volume for narration (0 to 1).
  musicVolume?: number; // Global volume for background music (0 to 1).

  globalFontFamily?: string;
  globalColorScheme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
};