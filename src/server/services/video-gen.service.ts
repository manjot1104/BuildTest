// server/services/video-gen.service.ts
//
// Self-contained LLM service for video JSON generation.
// Zero imports from other services in this codebase.
//
// ── TWO-STAGE PIPELINE ────────────────────────────────────────────────────────
// Stage 1 (LLM): Generate compact scene plan — layout, duration, narration text,
//   background seeds, element text. Output is small (~300–500 tokens), making
//   truncation and validation failures far less likely.
// Stage 2 (parallel): Enrich — TTS per scene, music, image URL resolution.
//   All enrichment runs in parallel via Promise.allSettled, so a single TTS
//   failure doesn't abort the whole video.
//
// ── VERCEL COMPATIBILITY ──────────────────────────────────────────────────────
// Each function is stateless and self-contained. No in-memory caches or
// long-lived connections. Safe for Vercel's serverless/edge runtime.
// For follow-up prompts: pass previousVideoJson as a string — the LLM gets
// stripped context (no audio URLs) to keep the request small.
//
// TO SWAP LLM PROVIDERS — change only:
//   1. OPENROUTER_API_URL  (if moving off OpenRouter)
//   2. VIDEO_MODELS        (model list + priority order)
//   3. buildRequestBody()  (if new provider has different request shape)
//   4. extractContent()    (if new provider has different response shape)

import { validateVideoJson } from "@/remotion-src/utils/validateVideoJson";
import {
  VIDEO_SYSTEM_PROMPT,
  buildVideoPrompt,
  buildFollowUpPrompt,
} from "@/remotion-src/utils/llmPrompt";
import type { VideoJson } from "@/remotion-src/types";

// Import engines
import { generateSmallestAITTS } from "../engines/video-gen-tts.engine";
import { getMusicTrack } from "../engines/video-gen-music.engine";
import {
  resolveAllImageUrls,
  type UserImage,
} from "../engines/video-gen-images.engine";

// ── Config ────────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Only used for 429 rate-limit responses — all other failures (404, empty, 402)
// are immediate and should not sleep before trying the next model.
const RATE_LIMIT_DELAY_MS = 500;

// Models ordered by JSON reliability and output quality.
// Larger context / instruction-tuned models first — they handle structured
// output more reliably. Free tier fallbacks at the end.
const VIDEO_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "qwen/qwen3-4b:free",
  "upstage/solar-pro-3:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-12b-it:free",
  "openrouter/free",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}

export interface GenerateVideoResult {
  success: true;
  videoJson: VideoJson;
}

export interface GenerateVideoError {
  success: false;
  error: string;
  details?: string;
}

export type GenerateVideoOptions = {
  useTTS?: boolean;
  useMusic?: boolean;
  voiceId?: string;
  musicGenre?: string;
  ttsVolume?: number;
  musicVolume?: number;
  userImages?: UserImage[];
  /**
   * For follow-up prompts: pass the previous VideoJson so the LLM can make
   * targeted edits. The service strips audio URLs before sending to save tokens.
   */
  previousVideoJson?: VideoJson;
  /**
   * The original prompt used to generate previousVideoJson.
   * Required when previousVideoJson is provided so the LLM has full context.
   */
  originalPrompt?: string;
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSON extraction helpers ───────────────────────────────────────────────────

function extractBareScenes(text: string): any[] {
  // Handles the case where a model emits bare scene objects instead of a root wrapper.
  const scenes: any[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const chunk = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(chunk);
          // Only treat as a scene if it has scene-like fields
          if (parsed.layout || parsed.elements || parsed.durationInFrames) {
            scenes.push(parsed);
          }
        } catch { /* skip */ }
        start = -1;
      }
    }
  }

  return scenes;
}

function extractJson(raw: string): string {
  const stripped = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) return stripped;

  const candidate = stripped.slice(start, end + 1);

  // Happy path: parses fine as-is
  try {
    JSON.parse(candidate);
    return candidate;
  } catch { /* fall through */ }

  // Detect bare concatenated scene objects (model skipped the root wrapper)
  const bareScenes = extractBareScenes(stripped);
  if (bareScenes.length > 0) {
    console.log(
      `[VideoService] Detected ${bareScenes.length} bare scene objects — wrapping into root`,
    );
    const totalFrames = bareScenes.reduce(
      (sum: number, s: any) => sum + (Number(s?.durationInFrames) || 150),
      0,
    );
    return JSON.stringify({ duration: totalFrames, fps: 30, scenes: bareScenes });
  }

  // Return candidate for truncation repair to attempt
  return candidate;
}

function repairTruncatedJson(raw: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch {}

  let text = raw.trim();
  // Strip trailing incomplete key or value
  text = text.replace(/,\s*"[^"]*$/, "");
  text = text.replace(/,\s*"[^"]+"\s*:\s*[^,\}\]]*$/, "");
  text = text.replace(/,\s*$/, "");
  // Remove any dangling open quote left after the above strips
  text = text.replace(/"\s*$/, "");
  text = text.trim();

  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }

  text += "]".repeat(Math.max(0, brackets));
  text += "}".repeat(Math.max(0, braces));
  return text;
}

// ── Deep debug: walk the object and report null/undefined leaves ─────────────

function findUndefinedFields(obj: any, path = ""): string[] {
  const problems: string[] = [];
  if (obj === null || obj === undefined) {
    problems.push(`${path} = ${obj}`);
    return problems;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) =>
      problems.push(...findUndefinedFields(item, `${path}[${i}]`)),
    );
    return problems;
  }
  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (val === undefined || val === null) {
        problems.push(`${fullPath} = ${val}`);
      } else {
        problems.push(...findUndefinedFields(val, fullPath));
      }
    }
  }
  return problems;
}

// ── Request / response adapters ───────────────────────────────────────────────

function buildRequestBody(model: string, messages: OpenRouterMessage[]): object {
  return {
    model,
    // Reduced from 8192 — the leaner prompt needs far fewer output tokens.
    // 3000 is enough for 6 scenes with full element detail, with headroom.
    // Keeping it lower reduces cost and latency on free-tier models.
    max_tokens: 3500,
    temperature: 0.15, // Slightly lower than before for more deterministic structure
    messages,
  };
}

function extractContent(data: OpenRouterResponse): string | null {
  return data?.choices?.[0]?.message?.content ?? null;
}

// ── Core OpenRouter call ──────────────────────────────────────────────────────

async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");

  let lastError: Error | null = null;

  for (const model of VIDEO_MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Video Generator",
        },
        body: JSON.stringify(buildRequestBody(model, messages)),
      });

      if (response.status === 429) {
        // Rate-limited — the only status worth waiting on before trying the next model
        console.warn(`[VideoService] ${model} rate-limited (429) — waiting ${RATE_LIMIT_DELAY_MS}ms`);
        lastError = new Error(`Rate limited: ${await response.text()}`);
        await sleep(RATE_LIMIT_DELAY_MS);
        continue;
      }

      if (response.status === 402) {
        // Spend limit — response is immediate, no sleep needed
        console.error(`[VideoService] ${model} spend limit (402)`);
        lastError = new Error("Spend limit reached");
        continue;
      }

      if (response.status === 404) {
        // Model not found — response is immediate, skip silently
        console.warn(`[VideoService] ${model} not found (404) — skipping`);
        lastError = new Error("Model not found");
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = extractContent(data);

      if (!content) {
        // Empty response — immediate, try next model without waiting
        console.warn(`[VideoService] ${model} returned empty content — trying next model`);
        lastError = new Error("Empty response");
        continue;
      }

      console.log(`[VideoService] ✓ model=${model} chars=${content.length}`);
      return content;
    } catch (err) {
      // Network / unexpected errors — small delay before next model
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[VideoService] ${model} failed: ${lastError.message}`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  throw new Error(`All video models failed. Last error: ${lastError?.message}`);
}

// ── Stage 1: LLM scene plan generation ───────────────────────────────────────
// Returns a validated VideoJson with only the structural data from the LLM.
// No audio URLs — those are added in stage 2.

async function generateScenePlan(
  prompt: string,
  durationSeconds: number,
  userImages: UserImage[],
  previousVideoJson?: VideoJson,
  originalPrompt?: string,
): Promise<VideoJson> {
  const isFollowUp = !!previousVideoJson && !!originalPrompt;

  const userMessage = isFollowUp
    ? buildFollowUpPrompt(
        originalPrompt!,
        prompt,
        JSON.stringify(previousVideoJson),
        durationSeconds,
        userImages,
      )
    : buildVideoPrompt(prompt, durationSeconds, userImages);

  const messages: OpenRouterMessage[] = [
    { role: "system", content: VIDEO_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let lastError = "";

  // 3 attempts: first two are fresh calls; third adds error context to guide the model
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[VideoService] Stage 1 attempt ${attempt}/3 (followUp=${isFollowUp})`);

      const attemptMessages: OpenRouterMessage[] =
        attempt <= 2
          ? messages
          : [
              ...messages,
              { role: "assistant", content: lastError || "Previous attempt produced invalid JSON." },
              {
                role: "user",
                content:
                  'The JSON was invalid or truncated. Return ONLY a valid JSON object with a "scenes" array. No markdown, no explanation. Keep it concise.',
              },
            ];

      const raw = await callOpenRouter(attemptMessages);
      console.log(`[VideoService] Stage 1 raw tail: ...${raw.trimEnd().slice(-80)}`);

      const jsonString = extractJson(raw);

      console.log(
        `[VideoService] extracted tail: ...${jsonString.trimEnd().slice(-120)}`,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        const repaired = repairTruncatedJson(jsonString);
        console.warn(
          `[VideoService] JSON parse failed (attempt ${attempt}) — trying repair ` +
            `(${jsonString.length} → ${repaired.length} chars)`,
        );
        try {
          parsed = JSON.parse(repaired);
          console.log(`[VideoService] ✓ Repair succeeded (attempt ${attempt})`);
        } catch {
          lastError = `Attempt ${attempt}: invalid JSON`;
          // No sleep — move straight to next attempt; callOpenRouter picks a fresh model
          continue;
        }
      }

      const undefinedFields = findUndefinedFields(parsed);
      if (undefinedFields.length > 0) {
        console.warn(
          `[VideoService] Null/undefined fields:\n` +
            undefinedFields.map((f) => `  ${f}`).join("\n"),
        );
      }

      const validation = validateVideoJson(parsed);
      if (!validation.success) {
        const issueDetails = validation.error.issues
          .map((i) => `  path=${JSON.stringify(i.path)} msg="${i.message}"`)
          .join("\n");
        lastError =
          `Attempt ${attempt}: schema validation failed — ` +
          validation.error.issues.map((i) => i.message).join(", ");
        console.warn(`[VideoService] ${lastError}\n${issueDetails}`);
        // No sleep — schema failures are deterministic for this response; retry immediately
        continue;
      }

      console.log(
        `[VideoService] ✓ Stage 1 complete — ${validation.data.scenes.length} scenes`,
      );
      return validation.data as VideoJson;
    } catch (err) {
      lastError = `Attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[VideoService] Stage 1 error: ${lastError}`);
    }
  }

  throw new Error(`Stage 1 failed after 3 attempts. Last error: ${lastError}`);
}

// ── Stage 2: Parallel enrichment ─────────────────────────────────────────────
// Image resolution and TTS are both network-bound and fully independent.
// Firing them concurrently cuts stage 2 time to max(imageTime, ttsTime)
// instead of their sum. Promise.allSettled on TTS means a single scene
// failure doesn't abort the rest.

async function enrichScenePlan(
  videoJson: VideoJson,
  options: {
    useTTS?: boolean;
    useMusic?: boolean;
    voiceId?: string;
    musicGenre?: string;
    ttsVolume?: number;
    musicVolume?: number;
    userImages?: UserImage[];
  },
): Promise<VideoJson> {
  const { userImages = [], ...audioOptions } = options;

  // ── 2a. Music (sync lookup — no network call, zero latency) ──────────────
  if (audioOptions.useMusic) {
    const track = getMusicTrack(audioOptions.musicGenre || "corporate");
    if (track) {
      videoJson.bgmUrl = track.url;
      videoJson.musicVolume = audioOptions.musicVolume ?? track.defaultVolume;
    }
  } else {
    videoJson.musicVolume = 0;
  }
  videoJson.ttsVolume = audioOptions.ttsVolume ?? 0.8;

  // ── 2b. Image resolution + TTS fired in parallel ──────────────────────────
  console.log(
    `[VideoService] Stage 2: image resolution + TTS in parallel (${videoJson.scenes.length} scenes)…`,
  );

  const [imageResolvedJson, ttsResults] = await Promise.all([
    resolveAllImageUrls(videoJson, userImages),
    audioOptions.useTTS
      ? Promise.allSettled(
          videoJson.scenes.map((scene, i) =>
            generateSmallestAITTS(scene.text, i, audioOptions.voiceId),
          ),
        )
      : Promise.resolve(null),
  ]);

  // ── 2c. Apply TTS results onto the image-resolved JSON ────────────────────
  if (ttsResults) {
    ttsResults.forEach((result, i) => {
      const scene = imageResolvedJson.scenes[i]!;
      if (result.status === "fulfilled") {
        const { url, durationInSeconds } = result.value;
        scene.ttsUrl = url;
        if (durationInSeconds > 0) {
          scene.durationInFrames = Math.ceil(durationInSeconds * 30) + 5;
        } else {
          console.warn(
            `[VideoService] Scene ${i}: TTS duration=0, keeping original durationInFrames=${scene.durationInFrames}`,
          );
        }
      } else {
        // TTS failure is non-fatal — scene plays without narration audio
        console.error(`[VideoService] TTS failed for scene ${i}:`, result.reason);
      }
    });
  }

  // ── 2d. Recalculate root duration after TTS may have changed scene lengths ─
  imageResolvedJson.duration = imageResolvedJson.scenes.reduce((acc, s, i) => {
    const isLast = i === imageResolvedJson.scenes.length - 1;
    const overlap = s.transitionDuration ?? 20;
    return acc + s.durationInFrames - (isLast ? 0 : overlap);
  }, 0);

  return imageResolvedJson;
}

// ── Public service API ────────────────────────────────────────────────────────

/**
 * generateVideoJson
 *
 * Two-stage pipeline:
 *   1. LLM generates a compact scene plan (structure only)
 *   2. Parallel enrichment: image resolution + TTS run concurrently
 *
 * For follow-up prompts, pass `options.previousVideoJson` and `options.originalPrompt`.
 * The previous JSON is stripped of audio URLs before being sent to the LLM.
 */
export async function generateVideoJson(
  prompt: string,
  durationSeconds = 15,
  options: GenerateVideoOptions = {},
): Promise<GenerateVideoResult | GenerateVideoError> {
  const {
    userImages = [],
    previousVideoJson,
    originalPrompt,
    ...audioOptions
  } = options;

  try {
    // ── Stage 1: scene plan ───────────────────────────────────────────────────
    const scenePlan = await generateScenePlan(
      prompt,
      durationSeconds,
      userImages,
      previousVideoJson,
      originalPrompt,
    );

    // ── Stage 2: enrich ───────────────────────────────────────────────────────
    const enrichedJson = await enrichScenePlan(scenePlan, {
      ...audioOptions,
      userImages,
    });

    const totalFrames = enrichedJson.duration;
    const calculatedSeconds = totalFrames / (enrichedJson.fps || 30);

    console.log(
      `[VideoService] ✓ Done — ${enrichedJson.scenes.length} scenes, ` +
        `${totalFrames} frames (~${calculatedSeconds.toFixed(1)}s) [target: ${durationSeconds}s]`,
    );

    return { success: true, videoJson: enrichedJson as VideoJson };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[VideoService] generateVideoJson failed: ${msg}`);
    return {
      success: false,
      error: "Failed to generate valid video JSON after retries",
      details: msg,
    };
  }
}

export async function renderVideo(
  videoJson: VideoJson,
): Promise<{ success: true; status: "queued"; jobId: string } | GenerateVideoError> {
  console.log(
    `[VideoService] renderVideo stub — ${videoJson.scenes.length} scenes`,
  );
  return { success: true, status: "queued", jobId: `stub_${Date.now()}` };
}