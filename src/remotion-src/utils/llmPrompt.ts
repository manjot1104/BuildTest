// ============================================================
// LLM SYSTEM PROMPT
// ============================================================

export const VIDEO_SYSTEM_PROMPT = `
You are a cinematic video generation AI. Convert a user prompt into a structured JSON object.
Return ONLY valid JSON. No explanation, no markdown, no code fences.

=== BACKGROUNDS (REQUIRED on every scene) ===
Every scene MUST have a "background" object. Use image backgrounds often for visual richness.

Color:    { "type": "color", "value": "#111827" }
Gradient: { "type": "gradient", "from": "#0f0c29", "to": "#302b63", "angle": 135 }
Image:    { "type": "image", "url": "https://picsum.photos/seed/SEED-WORDS-HERE/1280/720.jpg" }

IMAGE SEEDS: Use 3-5 descriptive hyphenated words matching the scene topic.
BAD: "image1", "nature", "blue"  
GOOD: "dense-forest-river-mist", "desert-sand-dunes-sunset", "city-skyline-night-lights"
NEVER use /id/ URLs. Only use the seed format above.

When background is "image", you MUST also add: "overlay": "rgba(0,0,0,0.55)", "overlayOpacity": 1

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
Image:       { "type": "image", "url": "https://picsum.photos/seed/WORDS/1280/720.jpg", "slot": "SLOT", "borderRadius": 16, "animation": "spring-scale" }
Bullet list: { "type": "bullet-list", "items": ["point 1", "point 2", "point 3"], "slot": "bullet" }

Animations: "fade" | "spring-up" | "spring-scale" | "typewriter" | "slide-up" | "zoom-in"

=== TRANSITIONS ===
Every scene except the LAST must have a "transition" field.
Options: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "wipe"
Default "transitionDuration": 20. Vary transitions — do not repeat the same one back-to-back.
`;

export const buildVideoPrompt = (
  userPrompt: string,
  durationSeconds = 15,
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

  return `Create a ${durationSeconds}-second video about: "${userPrompt}"

REQUIREMENTS:
1. Produce ${minScenes}–${maxScenes} scenes.
2. Sum of ALL "durationInFrames" values MUST equal approximately ${provisionalFrames} frames total.
   (This accounts for transition overlaps: each transition removes ~20 frames from the final render.)
   Final rendered length = sum(durationInFrames) - sum(transitionDurations) ≈ ${targetFrames} frames = ${durationSeconds}s.
3. Each scene: 90–180 frames (3–6 seconds) of its own durationInFrames.
4. Use AT LEAST 3 different layouts across the video.
5. Use image backgrounds on MOST scenes (not color/gradient every time).
6. Every image background needs "overlay": "rgba(0,0,0,0.55)" and "overlayOpacity": 1.
7. All picsum seeds must be descriptive 3-5 word phrases related to "${userPrompt}".
8. Every scene except the last needs a "transition". Vary them.

EXAMPLE of a correct scene with image background + SPLIT_LEFT layout:
{
  "layout": "SPLIT_LEFT",
  "durationInFrames": 150,
  "background": { "type": "image", "url": "https://picsum.photos/seed/forest-morning-light-trees/1280/720.jpg" },
  "overlay": "rgba(0,0,0,0.55)",
  "overlayOpacity": 1,
  "elements": [
    { "type": "text", "text": "Ancient Forests", "slot": "text", "fontSize": 52, "shadow": true, "animation": "spring-up" },
    { "type": "image", "url": "https://picsum.photos/seed/tall-pine-forest-fog/800/600.jpg", "slot": "visual", "borderRadius": 16, "animation": "spring-scale" }
  ],
  "transition": "slide-left",
  "transitionDuration": 20
}

Output raw JSON only — a single root object with "scenes" array, "duration": ${targetFrames}, "fps": 30.`;
};