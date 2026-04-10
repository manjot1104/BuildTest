// ============================================================
// LLM SYSTEM PROMPT
// ============================================================

import type { UserImage } from "@/server/engines/video-gen-images.engine";

export const VIDEO_SYSTEM_PROMPT = `
You are a cinematic video generation AI. Convert a user prompt into a structured JSON object.
Return ONLY valid JSON. No explanation, no markdown, no code fences.

=== BACKGROUNDS (REQUIRED on every scene) ===
Every scene MUST have a "background" object. Use image backgrounds often for visual richness.

Color:    { "type": "color", "value": "#111827" }
Gradient: { "type": "gradient", "from": "#0f0c29", "to": "#302b63", "angle": 135 }
Image:    { "type": "image", "url": "seed:SEED-WORDS-HERE" }

IMAGE SEEDS: Use 3-5 descriptive hyphenated words matching the scene topic.
BAD:  "seed:image1", "seed:nature", "seed:blue"
GOOD: "seed:dense-forest-river-mist", "seed:desert-sand-dunes-sunset", "seed:city-skyline-night-lights"

CRITICAL: Always use the "seed:words-here" format for all non-user images.
NEVER output full URLs like "https://picsum.photos/..." or any other image CDN URL.
The system will automatically find the best photo from Pexels, or fall back to a placeholder.

When background is "image", you MUST also add: "overlay": "rgba(0,0,0,0.55)", "overlayOpacity": 1

=== USER-PROVIDED IMAGES (HIGHEST PRIORITY) ===
When the user has provided their own images, you MUST use them wherever they are relevant.
User images are referenced as: "user://image-0", "user://image-1", etc.
These can be used as BOTH scene backgrounds AND element images (type: "image").
ALWAYS prefer user images over seed URLs when a user image matches the scene topic.
Only fall back to seed URLs for scenes where no user image is relevant.

=== LAYOUTS AND THEIR REQUIRED SLOTS ===

TITLE          → one text element with slot "title"
TITLE_SUBTITLE → text slot "title" + text slot "subtitle"
STATEMENT      → one text element with slot "text". NO other elements.
BULLET_POINTS  → text slot "heading" + bullet-list slot "bullet"
SPLIT_LEFT     → text slot "text" + image slot "visual"
SPLIT_RIGHT    → text slot "text" + image slot "visual"
LOWER_THIRD    → text slot "main" + text slot "lower"
FULLSCREEN     → image slot "main"

CRITICAL SLOT RULES:
- STATEMENT only accepts slot "text". Never add "visual" to STATEMENT.
- SPLIT_LEFT / SPLIT_RIGHT require BOTH "text" AND "visual" elements.
- BULLET_POINTS requires BOTH "heading" AND "bullet" elements.
- LOWER_THIRD requires BOTH "main" AND "lower" elements.

=== ELEMENT TYPES ===
Text:        { "type": "text", "text": "...", "slot": "SLOT", "fontSize": 48, "shadow": true, "animation": "spring-up" }
Image:       { "type": "image", "url": "seed:WORDS", "slot": "SLOT", "borderRadius": 16, "animation": "spring-scale" }
Bullet list: { "type": "bullet-list", "items": ["point 1", "point 2", "point 3"], "slot": "bullet" }

For image elements, user images can also be used: { "type": "image", "url": "user://image-0", "slot": "visual", ... }
For image elements using seeds: { "type": "image", "url": "seed:tall-pine-forest-fog", "slot": "visual", ... }

Animations: "fade" | "spring-up" | "spring-scale" | "typewriter" | "slide-up" | "zoom-in"

=== TRANSITIONS ===
Every scene except the LAST must have a "transition" field.
Options: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "wipe"
Default "transitionDuration": 20. Vary transitions — do not repeat the same one back-to-back.

=== NARRATION (REQUIRED on every scene) ===
Every scene MUST have a "text" field — a 1-2 sentence spoken narration for that scene.
This is what gets converted to voice audio. Write it as natural speech, not a title.

BAD: "Photosynthesis"
GOOD: "Photosynthesis is the process plants use to convert sunlight into food, producing oxygen as a byproduct."
`;

// ── Build user images block for prompt injection ──────────────────────────────

function buildUserImagesBlock(userImages: UserImage[]): string {
  if (!userImages.length) return "";

  const lines = userImages.map(
    (img) =>
      `  - user://image-${img.index}: "${img.description}"`,
  );

  return `
=== YOUR AVAILABLE USER IMAGES ===
The user has uploaded the following images. Use them wherever they fit the scene content.
ALWAYS prefer these over seed URLs for matching scenes.
Reference them exactly as shown (e.g. "user://image-0") in background.url or element.url fields.

${lines.join("\n")}

USAGE RULES:
- For a scene that matches a user image description, use that image as the background OR as a visual element.
- You may use the same user image in multiple scenes if it fits.
- For scenes where no user image fits, use seed URLs (e.g. "seed:mountain-sunrise-mist") as normal.
- In SPLIT_LEFT / SPLIT_RIGHT layouts, user images work great as the "visual" slot element.
- In FULLSCREEN layout, use the user image as the "main" slot element.
- As a background: { "type": "image", "url": "user://image-0" } (still add overlay + overlayOpacity).
`;
}

export const buildVideoPrompt = (
  userPrompt: string,
  durationSeconds = 15,
  userImages: UserImage[] = [],
): string => {
  const fps = 30;
  const targetFrames = durationSeconds * fps;
  const minScenes = Math.floor(durationSeconds / 5);
  const maxScenes = Math.ceil(durationSeconds / 3);

  // Each scene (except last) loses ~20 frames to transition overlap.
  // We need to over-provision so after subtraction we hit the target.
  // estimatedScenes ≈ midpoint of range, transitions = scenes - 1
  const estimatedScenes = Math.round((minScenes + maxScenes) / 2);
  const estimatedTransitionFrames = (estimatedScenes - 1) * 20;
  const provisionalFrames = targetFrames + estimatedTransitionFrames;

  const userImagesBlock = buildUserImagesBlock(userImages);

  return `Create a ${durationSeconds}-second video about: "${userPrompt}"
${userImagesBlock}
REQUIREMENTS:
1. Produce ${minScenes}–${maxScenes} scenes.
2. Sum of ALL "durationInFrames" values MUST equal approximately ${provisionalFrames} frames total.
   (This accounts for transition overlaps: each transition removes ~20 frames from the final render.)
   Final rendered length = sum(durationInFrames) - sum(transitionDurations) ≈ ${targetFrames} frames = ${durationSeconds}s.
3. Each scene: 90–180 frames (3–6 seconds) of its own durationInFrames.
4. Use AT LEAST 3 different layouts across the video.
5. Use image backgrounds on MOST scenes (not color/gradient every time).
6. Every image background needs "overlay": "rgba(0,0,0,0.55)" and "overlayOpacity": 1.
7. All image seeds must use the format "seed:descriptive-3-to-5-word-phrase" related to "${userPrompt}".
   NEVER output full URLs. ONLY use "seed:words-here" or "user://image-N" for image urls.
8. Every scene except the last needs a "transition". Vary them.
${userImages.length > 0 ? `9. You have ${userImages.length} user image(s) available — use them in scenes where they are relevant. Prioritize user images over seed URLs.` : ""}

EXAMPLE of a correct scene with image background + SPLIT_LEFT layout:
{
  "layout": "SPLIT_LEFT",
  "durationInFrames": 150,
  "background": { "type": "image", "url": "seed:forest-morning-light-trees" },
  "overlay": "rgba(0,0,0,0.55)",
  "overlayOpacity": 1,
  "text": "The ancient forests are home to countless species and have stood for millennia.",
  "elements": [
    { "type": "text", "text": "Ancient Forests", "slot": "text", "fontSize": 52, "shadow": true, "animation": "spring-up" },
    { "type": "image", "url": "seed:tall-pine-forest-fog", "slot": "visual", "borderRadius": 16, "animation": "spring-scale" }
  ],
  "transition": "slide-left",
  "transitionDuration": 20
}

Output raw JSON only — a single root object with "scenes" array, "duration": ${targetFrames}, "fps": 30.`;
};