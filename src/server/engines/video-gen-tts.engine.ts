// server/engines/video-gen-tts.engine.ts
import * as mm from "music-metadata";
import fs from "node:fs/promises";
import path from "node:path";

export interface TTSResult {
  url: string;
  durationInSeconds: number;
}

export async function generateSmallestAITTS(
  text: string,
  index: number,
  voiceId: string = "aarush"
): Promise<TTSResult> {
  const SMALLEST_API_KEY = process.env.SMALLEST_API_KEY;
  if (!SMALLEST_API_KEY) throw new Error("SMALLEST_API_KEY not set");

  const audioDir = path.join(process.cwd(), "public", "audio");

  if (index === 0) {
    try {
      await fs.rm(audioDir, { recursive: true, force: true });
      await fs.mkdir(audioDir, { recursive: true });
      console.log("[TTS Engine] Fresh start: Audio directory cleared.");
    } catch (err) {
      console.error("[TTS Engine] Cleanup failed:", err);
    }
  }

  const SAMPLE_RATE = 24000;

  const response = await fetch(
    "https://waves-api.smallest.ai/api/v1/lightning/get_speech",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SMALLEST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text,
        speed: 1,
        sample_rate: SAMPLE_RATE,
        add_wav_header: true,   // ← critical: wraps PCM in a proper WAV container
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Smallest.ai API error ${response.status}: ${errBody}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = Buffer.from(buffer);

  // Sanity check — a valid WAV always starts with "RIFF"
  const magic = bytes.slice(0, 4).toString("ascii");
  if (magic !== "RIFF") {
    throw new Error(
      `[TTS Engine] Unexpected response format — expected WAV/RIFF, got: ${magic} (first 4 bytes)`
    );
  }

  // Save as .wav (not .mp3 — the API returns WAV)
  const fileName = `scene-${index}.wav`;
  const filePath = path.join(audioDir, fileName);
  await fs.writeFile(filePath, bytes);

  // Primary: let music-metadata read the WAV header
  let durationInSeconds = 0;
  try {
    const metadata = await mm.parseFile(filePath);
    durationInSeconds = metadata.format.duration ?? 0;
  } catch (err) {
    console.warn(`[TTS Engine] music-metadata parse failed for scene ${index}:`, err);
  }

  // Fallback: compute from PCM byte count if metadata failed or returned 0
  // WAV header is 44 bytes; remaining bytes are 16-bit mono PCM → bytes / 2 / sampleRate
  if (durationInSeconds <= 0) {
    const pcmBytes = Math.max(0, bytes.byteLength - 44);
    durationInSeconds = pcmBytes / 2 / SAMPLE_RATE;
    console.warn(
      `[TTS Engine] scene ${index}: metadata returned 0, computed duration from PCM = ${durationInSeconds.toFixed(2)}s`
    );
  }

  console.log(
    `[TTS Engine] scene ${index}: ${fileName} saved, duration=${durationInSeconds.toFixed(2)}s`
  );

  return {
    url: `/audio/${fileName}?t=${Date.now()}`,
    durationInSeconds,
  };
}