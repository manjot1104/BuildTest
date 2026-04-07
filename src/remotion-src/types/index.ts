// ============================================================
// CORE VIDEO JSON TYPES
// The LLM generates a VideoJson object. Everything flows from this.
//
// Elements do not use x/y coordinates.
// Instead, scenes declare a `layout` which places elements into
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
  | 'zoom'
  | 'none';

export type BackgroundType =
  | { type: 'color'; value: string }
  | { type: 'gradient'; from: string; to: string; angle?: number }
  | {
      type: 'image';
      url: string;
      objectFit?: 'cover' | 'contain' | 'fill';
      // Ken Burns motion applied when type is image
      kenBurns?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'none';
    }
  | { type: 'video'; url: string };

export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

// ── Layout system ──────────────────────────────────────────
//
// Each layout defines a set of named slots. Elements are placed
// into slots — not positioned with x/y. The layout component
// handles all spacing, padding, and stacking automatically.
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
// Each layout has specific named slots. Elements declare which
// slot they belong to. Unrecognised slots fall back to 'main'.
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
//
// NOTE: x/y/width/height are intentionally NOT in the LLM-facing
// element types anymore. Position is determined by the layout slot.
// These props are only used internally by layout components.

export type TextElementProps = {
  type: 'text';
  slot?: SlotName;           // which layout slot this belongs to
  text: string;
  fontSize?: number;         // in px at 1280px canvas width; auto-scaled
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  animation?: AnimationType;
  animationDelay?: number;   // frames
  animationDuration?: number; // frames
  opacity?: number;
  shadow?: boolean;
  background?: string;       // text highlight/background color
  padding?: number;
  borderRadius?: number;
};

export type BulletListElementProps = {
  type: 'bullet-list';
  slot?: SlotName;
  items: string[];           // each bullet item as a plain string
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  color?: string;
  bulletColor?: string;      // color of the bullet dot/dash
  lineHeight?: number;
  animation?: AnimationType;
  itemDelay?: number;        // extra frames between each item appearing
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
  // Width/height for shapes are kept as they describe the shape itself,
  // not its position. Layout slot controls where it sits.
  width?: number | string;
  height?: number | string;
};

export type DividerElementProps = {
  type: 'divider';
  slot?: SlotName;
  thickness?: number;
  color?: string;
  width?: number | string;   // width of the line, e.g. "60%"
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
  layout: LayoutType;        // REQUIRED — controls element placement
  background: BackgroundType;
  elements: SceneElement[];
  transition?: TransitionType;
  transitionDuration?: number;
  overlay?: string;          // rgba color overlay on top of background
  overlayOpacity?: number;
};

// ── Root Video JSON ────────────────────────────────────────

export type VideoJson = {
  duration: number;          // total frames
  fps?: number;              // default 30
  width?: number;            // default 1280
  height?: number;           // default 720
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