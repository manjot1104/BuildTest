// ============================================================
// LLM SYSTEM PROMPT
// ============================================================

import type { UserImage } from "@/server/engines/video-gen-images.engine";

// ── Stage 1: Scene Plan ───────────────────────────────────────────────────────
// Asks the LLM for a compact plan only — layout, duration, narration, background seed, element text.
// Intentionally omits audio URLs, resolved image URLs, and verbose element configs.
// This keeps LLM output small (~300–500 tokens vs 1500+), reducing truncation risk.
// Stage 2 (service layer) enriches in parallel: TTS, music, image resolution.

export const VIDEO_SYSTEM_PROMPT = `
You are a video scene planner. Convert a user prompt into a compact JSON scene plan.
Return ONLY valid JSON. No explanation, no markdown, no code fences.

=== BACKGROUNDS ===
Every scene MUST have a "background" object.

Color:    { "type": "color", "value": "#111827" }
Gradient: { "type": "gradient", "from": "#0f0c29", "to": "#302b63", "angle": 135 }
Image:    { "type": "image", "url": "seed:WORDS" }

IMAGE SEEDS: 3-5 descriptive hyphenated words matching the scene topic.
GOOD: "seed:dense-forest-river-mist", "seed:city-skyline-night-lights"
BAD:  "seed:nature", "seed:image1"

Use image backgrounds on MOST scenes.
When background type is "image", always add: "overlay": "rgba(0,0,0,0.55)", "overlayOpacity": 1

=== USER IMAGES ===
When user images are provided, reference them as "user://image-0", "user://image-1", etc.
Use them as background.url OR as element url. Prefer user images over seeds when relevant.

=== LAYOUTS & REQUIRED SLOTS ===
TITLE          → text slot "title"
TITLE_SUBTITLE → text "title" + text "subtitle"
STATEMENT      → text slot "text" only — no other elements
BULLET_POINTS  → text "heading" + bullet-list "bullet"
SPLIT_LEFT     → text "text" + image "visual"
SPLIT_RIGHT    → text "text" + image "visual"
LOWER_THIRD    → text "main" + text "lower"
FULLSCREEN     → image "main"

=== ELEMENT TYPES ===
Text:   { "type": "text", "text": "...", "slot": "SLOT", "fontSize": 48, "shadow": true, "animation": "spring-up" }
Image:  { "type": "image", "url": "seed:WORDS", "slot": "SLOT", "borderRadius": 16, "animation": "spring-scale" }
Bullet: { "type": "bullet-list", "items": ["point 1", "point 2", "point 3"], "slot": "bullet" }

Animations: "fade" | "spring-up" | "spring-scale" | "typewriter" | "slide-up" | "zoom-in"

=== TRANSITIONS ===
Every scene except the LAST must have "transition".
Options: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "wipe"
"transitionDuration": 20 (default). Vary transitions.

=== NARRATION ===
Every scene MUST have a "text" field — 1-2 sentence spoken narration. Natural speech, not a title.
BAD: "Photosynthesis"
GOOD: "Photosynthesis is the process plants use to convert sunlight into food."

=== OUTPUT FORMAT ===
Single root object:
{
  "duration": <total_frames>,
  "fps": 30,
  "scenes": [ ...scenes ]
}
Each scene: { "layout", "durationInFrames", "text", "background", "elements", "transition"?, "transitionDuration"?, "overlay"?, "overlayOpacity"? }
`;

// ── Build user images block for prompt injection ──────────────────────────────

function buildUserImagesBlock(userImages: UserImage[]): string {
  if (!userImages.length) return "";

  const lines = userImages.map(
    (img) => `  - user://image-${img.index}: "${img.description}"`,
  );

  return `
=== USER IMAGES (use these wherever relevant — prefer over seeds) ===
${lines.join("\n")}
Reference exactly as shown in background.url or element.url.
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

  // Over-provision frames to account for transition overlaps being subtracted at render time
  const estimatedScenes = Math.round((minScenes + maxScenes) / 2);
  const estimatedTransitionFrames = (estimatedScenes - 1) * 20;
  const provisionalFrames = targetFrames + estimatedTransitionFrames;

  const userImagesBlock = buildUserImagesBlock(userImages);

  return `Create a ${durationSeconds}-second video about: "${userPrompt}"
${userImagesBlock}
REQUIREMENTS:
- ${minScenes}–${maxScenes} scenes
- Sum of durationInFrames ≈ ${provisionalFrames} total (accounts for ~20-frame transition overlaps per scene)
- Each scene: 90–180 durationInFrames
- At least 3 different layouts
- Image backgrounds on most scenes (add overlay + overlayOpacity)
- Seeds format: "seed:3-to-5-word-phrase" — NEVER full URLs
- Vary transitions across scenes${userImages.length > 0 ? `\n- Use the ${userImages.length} user image(s) wherever relevant` : ""}

Output raw JSON only — root object with "scenes" array and "duration": ${targetFrames}, "fps": 30.`;
};

// ── Follow-up prompt builder ──────────────────────────────────────────────────
// Used when the user sends a second prompt to refine an existing video.
// Passes the previous scene plan as context so the LLM can make targeted edits.

export const buildFollowUpPrompt = (
  originalPrompt: string,
  followUpPrompt: string,
  previousVideoJson: string, // JSON.stringify of previous VideoJson
  durationSeconds = 15,
  userImages: UserImage[] = [],
): string => {
  const fps = 30;
  const targetFrames = durationSeconds * fps;
  const minScenes = Math.floor(durationSeconds / 5);
  const maxScenes = Math.ceil(durationSeconds / 3);
  const estimatedScenes = Math.round((minScenes + maxScenes) / 2);
  const provisionalFrames = targetFrames + (estimatedScenes - 1) * 20;

  const userImagesBlock = buildUserImagesBlock(userImages);

  // Strip audio URLs from the previous JSON to reduce context size —
  // they'll be regenerated by stage 2 anyway
  let strippedPrev = previousVideoJson;
  try {
    const prev = JSON.parse(previousVideoJson);
    if (prev?.scenes) {
      prev.scenes = prev.scenes.map((s: any) => {
        const { ttsUrl, ...rest } = s;
        return rest;
      });
      delete prev.bgmUrl;
      strippedPrev = JSON.stringify(prev);
    }
  } catch {
    // If parse fails just use original
  }

  return `The user originally asked for: "${originalPrompt}"

Here is the current video scene plan (JSON):
${strippedPrev}

The user now wants to change it: "${followUpPrompt}"
${userImagesBlock}
Apply the requested changes and return the FULL updated scene plan as raw JSON.
Keep scenes that don't need to change. Update only what the user asked for.
REQUIREMENTS: same as before — ${minScenes}–${maxScenes} scenes, durationInFrames sum ≈ ${provisionalFrames}, "duration": ${targetFrames}, "fps": 30.
Output raw JSON only.`;
};