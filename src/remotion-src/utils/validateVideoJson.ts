import { z } from 'zod';

// ============================================================
// ZOD SCHEMA — validates LLM-generated JSON before rendering
// ============================================================

const AnimationTypeSchema = z.enum([
  'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'zoom-in', 'zoom-out', 'bounce', 'typewriter', 'none',
]);

const TransitionTypeSchema = z.enum([
  'fade', 'slide-left', 'slide-right', 'slide-up', 'zoom', 'none',
]);

const BackgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), value: z.string() }),
  z.object({ type: z.literal('gradient'), from: z.string(), to: z.string(), angle: z.number().optional() }),
  z.object({ type: z.literal('image'), url: z.string().url(), objectFit: z.enum(['cover', 'contain', 'fill']).optional() }),
  z.object({ type: z.literal('video'), url: z.string().url() }),
]);

const BaseElementProps = {
  animation: AnimationTypeSchema.optional(),
  animationDelay: z.number().optional(),
  animationDuration: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
};

const TextElementSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  color: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  maxWidth: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  shadow: z.boolean().optional(),
  background: z.string().optional(),
  padding: z.number().optional(),
  borderRadius: z.number().optional(),
  ...BaseElementProps,
});

const ImageElementSchema = z.object({
  type: z.literal('image'),
  url: z.string(),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']).optional(),
  borderRadius: z.number().optional(),
  shadow: z.boolean().optional(),
  border: z.string().optional(),
  ...BaseElementProps,
});

const ShapeElementSchema = z.object({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'circle', 'line', 'triangle']),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  color: z.string().optional(),
  borderRadius: z.number().optional(),
  border: z.string().optional(),
  ...BaseElementProps,
});

const DividerElementSchema = z.object({
  type: z.literal('divider'),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  thickness: z.number().optional(),
  color: z.string().optional(),
  ...BaseElementProps,
});

// Forward reference for group (recursive)
const SceneElementSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    TextElementSchema,
    ImageElementSchema,
    ShapeElementSchema,
    DividerElementSchema,
    z.object({
      type: z.literal('group'),
      x: z.union([z.number(), z.string()]).optional(),
      y: z.union([z.number(), z.string()]).optional(),
      width: z.union([z.number(), z.string()]).optional(),
      height: z.union([z.number(), z.string()]).optional(),
      elements: z.array(SceneElementSchema),
      ...BaseElementProps,
    }),
  ])
);

const SceneSchema = z.object({
  id: z.string().optional(),
  durationInFrames: z.number().min(1),
  background: BackgroundSchema,
  elements: z.array(SceneElementSchema),
  transition: TransitionTypeSchema.optional(),
  transitionDuration: z.number().optional(),
  overlay: z.string().optional(),
  overlayOpacity: z.number().optional(),
  padding: z.number().optional(),
  layout: z.enum(['free', 'centered', 'split-left', 'split-right']).optional(),
});

export const VideoJsonSchema = z.object({
  duration: z.number().min(1),
  fps: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  scenes: z.array(SceneSchema).min(1),
  globalFontFamily: z.string().optional(),
  globalColorScheme: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
  }).optional(),
});

/**
 * Validates and parses LLM-generated JSON.
 * Returns { success, data } or { success: false, error }.
 */
export const validateVideoJson = (raw: unknown) => {
  const result = VideoJsonSchema.safeParse(raw);
  return result;
};