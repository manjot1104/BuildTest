// server/services/video.service.ts
//
// Self-contained LLM service for video JSON generation.
// Zero imports from other services in this codebase.
//
// TO SWAP LLM PROVIDERS — change only:
//   1. OPENROUTER_API_URL  (if moving off OpenRouter entirely)
//   2. VIDEO_MODELS        (model list)
//   3. buildRequestBody()  (if new provider has a different request shape)
//   4. extractContent()    (if new provider has a different response shape)
// Nothing in video.controller.ts or elysia.ts needs to change.

import { validateVideoJson } from "@/remotion-src/utils/validateVideoJson";
import {
  VIDEO_SYSTEM_PROMPT,
  buildVideoPrompt,
} from "@/remotion-src/utils/llmPrompt";
import type { VideoJson } from "@/remotion-src/types";
// Import your engines
import { generateSmallestAITTS } from "../engines/video-gen-tts.engine";
import { getMusicTrack } from "../engines/video-gen-music.engine";

// ── Config ────────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const RETRY_DELAY_MS = 2_000;

// Free models ordered by JSON reliability for structured output tasks.
const VIDEO_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "upstage/solar-pro-3:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "google/gemma-3-12b-it:free",
  "qwen/qwen3-4b:free",
  "arcee-ai/trinity-large-preview:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
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

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Parse top-level JSON objects from a string, depth-aware ──────────────────
// Handles the case where a model emits bare scene objects instead of a root wrapper.

function extractBareScenes(text: string): any[] {
  const scenes: any[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
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
        } catch {
          /* skip unparseable chunks */
        }
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
  } catch {
    /* fall through */
  }

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
    const wrapped = {
      duration: totalFrames, // Keep it as total frames
      fps: 30,
      scenes: bareScenes,
    };
    return JSON.stringify(wrapped);
  }

  // Return candidate for truncation repair to attempt
  return candidate;
}

function repairTruncatedJson(raw: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch { }

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
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
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

function buildRequestBody(
  model: string,
  messages: OpenRouterMessage[],
): object {
  return {
    model,
    max_tokens: 8192,
    temperature: 0.1,
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
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Video Generator",
        },
        body: JSON.stringify(buildRequestBody(model, messages)),
      });

      if (response.status === 429) {
        console.warn(
          `[VideoService] ${model} rate-limited (429) — waiting ${RETRY_DELAY_MS}ms`,
        );
        lastError = new Error(`Rate limited: ${await response.text()}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (response.status === 402) {
        console.error(`[VideoService] ${model} spend limit (402)`);
        lastError = new Error(`Spend limit reached: ${await response.text()}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (response.status === 404) {
        const body = await response.text();
        console.warn(
          `[VideoService] ${model} not found (404) — skipping: ${body}`,
        );
        lastError = new Error(`Model not found: ${body}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = extractContent(data);

      if (!content) {
        console.warn(
          `[VideoService] ${model} returned empty content — trying next model`,
        );
        lastError = new Error("Empty response");
        continue;
      }

      console.log(`[VideoService] ✓ model=${model} chars=${content.length}`);
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[VideoService] ${model} failed: ${lastError.message}`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(`All video models failed. Last error: ${lastError?.message}`);
}

async function enrichVideoWithAudio(
  videoJson: VideoJson,
  options: {
    useTTS?: boolean;
    useMusic?: boolean;
    voiceId?: string;
    musicGenre?: string;
    ttsVolume?: number;
    musicVolume?: number;
  },
): Promise<VideoJson> {
  // 1. Handle Music (Global)
  if (options.useMusic) {
    const track = getMusicTrack(options.musicGenre || "corporate");
    if (track) {
      videoJson.bgmUrl = track.url;
      // Use user-provided volume or fall back to track default
      videoJson.musicVolume = options.musicVolume ?? track.defaultVolume;
    }
  } else {
    videoJson.musicVolume = 0;
  }
  // 2. Handle TTS (Per Scene)
  if (options.useTTS) {
    // FIX: Extract index 'i' using .entries()
    for (const [i, scene] of videoJson.scenes.entries()) {
      const originalFrames = scene.durationInFrames; // preserve before overwriting
      try {
        const { url, durationInSeconds } = await generateSmallestAITTS(
          scene.text,
          i,
          options.voiceId,
        );

        scene.ttsUrl = url;

        if (durationInSeconds > 0) {
          // Audio is valid — let it drive the scene duration
          scene.durationInFrames = Math.ceil(durationInSeconds * 30) + 5;
        } else {
          // TTS returned but duration is unusable — keep original LLM-assigned frames
          console.warn(
            `[VideoService] scene ${i}: TTS duration=0, keeping original durationInFrames=${originalFrames}`,
          );
          scene.durationInFrames = originalFrames;
        }
      } catch (err) {
        console.error(`[VideoService] TTS failed for scene ${i}:`, err);
        scene.durationInFrames = originalFrames; // same fallback on hard error
      }
    }
  }

  // Set TTS volume (default to 0.8 if not provided)
  videoJson.ttsVolume = options.ttsVolume ?? 0.8;
  // musicVolume already set above in the music block

  // 3. Recalculate Root Duration
  videoJson.duration = videoJson.scenes.reduce((acc, s, i) => {
    const isLast = i === videoJson.scenes.length - 1;
    const overlap = s.transitionDuration ?? 20;
    return acc + s.durationInFrames - (isLast ? 0 : overlap);
  }, 0);

  return videoJson;
}

// ── Public service API ────────────────────────────────────────────────────────

export async function generateVideoJson(
  prompt: string,
  durationSeconds = 15,
  options: {
    useTTS?: boolean;
    useMusic?: boolean;
    voiceId?: string;
    musicGenre?: string;
    ttsVolume?: number;      
    musicVolume?: number; 
  } = {},
): Promise<GenerateVideoResult | GenerateVideoError> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: VIDEO_SYSTEM_PROMPT },
    { role: "user", content: buildVideoPrompt(prompt, durationSeconds) },
  ];

  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[VideoService] generateVideoJson attempt ${attempt}/2`);

      const attemptMessages: OpenRouterMessage[] =
        attempt === 1
          ? messages
          : [
            ...messages,
            {
              role: "assistant",
              content:
                lastError || "Previous attempt failed with invalid JSON.",
            },
            {
              role: "user",
              content:
                'The JSON you returned was invalid. Please return ONLY valid JSON matching the schema — a single root object with a "scenes" array. No markdown, no explanation.',
            },
          ];

      const raw = await callOpenRouter(attemptMessages);

      // Debug: show what the model actually ended with
      console.log(`[VideoService] raw tail: ...${raw.trimEnd().slice(-120)}`);

      const jsonString = extractJson(raw);

      // Debug: show what extractJson produced
      console.log(
        `[VideoService] extracted tail: ...${jsonString.trimEnd().slice(-120)}`,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        const repaired = repairTruncatedJson(jsonString);
        console.warn(
          `[VideoService] JSON parse failed on attempt ${attempt} — trying repair ` +
          `(${jsonString.length} chars → ${repaired.length} chars)`,
        );
        try {
          parsed = JSON.parse(repaired);
          console.log(
            `[VideoService] ✓ Truncation repair succeeded on attempt ${attempt}`,
          );
        } catch {
          lastError = `Attempt ${attempt}: invalid JSON — ${jsonString}`;
          console.warn(`[VideoService] ${lastError}`);
          if (attempt < 2) await sleep(RETRY_DELAY_MS);
          continue;
        }
      }

      // ── DEBUG: dump the full parsed object so we can see exactly what came back
      console.log(
        `[VideoService] DEBUG parsed JSON (attempt ${attempt}):\n` +
        JSON.stringify(parsed, null, 2),
      );

      // ── DEBUG: surface any null/undefined fields before Zod sees them
      const undefinedFields = findUndefinedFields(parsed);
      if (undefinedFields.length > 0) {
        console.warn(
          `[VideoService] DEBUG null/undefined fields:\n` +
          undefinedFields.map((f) => `  ${f}`).join("\n"),
        );
      }

      const validation = validateVideoJson(parsed);
      if (!validation.success) {
        const issueDetails = validation.error.issues
          .map(
            (i) =>
              `  path=${JSON.stringify(i.path)} code=${i.code} msg="${i.message}"`,
          )
          .join("\n");
        lastError =
          `Attempt ${attempt}: schema validation failed — ` +
          validation.error.issues.map((i) => i.message).join(", ");
        console.warn(
          `[VideoService] ${lastError}\nZod issue detail:\n${issueDetails}`,
        );
        if (attempt < 2) await sleep(RETRY_DELAY_MS);
        continue;
      }

      // TTS/Music ENRICHMENT PHASE ---
      const enrichedJson = await enrichVideoWithAudio(
        validation.data as VideoJson,
        options,
      );

      const totalFrames = enrichedJson.duration;
      const calculatedSeconds = totalFrames / (enrichedJson.fps || 30);

      console.log(
        `[VideoService] ✓ Generated ${validation.data.scenes.length} scenes, ` +
        `${totalFrames} frames (~${calculatedSeconds.toFixed(1)}s) [Target: ${durationSeconds}s]`,
      );

      return { success: true, videoJson: enrichedJson as VideoJson };
    } catch (err) {
      lastError = `Attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[VideoService] ${lastError}`);
      if (attempt < 2) await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    success: false,
    error: "Failed to generate valid video JSON after retries",
    details: lastError,
  };
}

export async function renderVideo(
  videoJson: VideoJson,
): Promise<
  { success: true; status: "queued"; jobId: string } | GenerateVideoError
> {
  console.log(
    `[VideoService] renderVideo stub — ${videoJson.scenes.length} scenes`,
  );
  return { success: true, status: "queued", jobId: `stub_${Date.now()}` };
}
