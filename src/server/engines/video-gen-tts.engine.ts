// server/engines/video-gen-tts.engine.ts
import * as mm from "music-metadata";
import { uploadVideoAudio } from "@/server/services/s3.service";

export interface TTSResult {
  url: string;
  durationInSeconds: number;
}

export async function generateSmallestAITTS(
  text: string,
  index: number,
  voiceId: string = "aarush",
  // The chatId is used as the S3 directory prefix so scene-N.wav files are
  // overwritten in-place on follow-up generations instead of accumulating
  // under new prefixes. Falls back to a timestamp only in tests.
  chatId: string = `gen_${Date.now()}`,
): Promise<TTSResult> {
  const SMALLEST_API_KEY = process.env.SMALLEST_API_KEY;
  if (!SMALLEST_API_KEY) throw new Error("SMALLEST_API_KEY not set");

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

  // Upload to S3; key: video-audio/{chatId}/{fileName}
  // scene-N.wav is overwritten in-place on follow-up generations —
  // no orphaned files accumulate under old prefixes.
  const s3Url = await uploadVideoAudio({
    buffer: bytes,
    generationId: chatId, // s3.service.ts field name unchanged
    filename: fileName,
  });

  // Derive duration from WAV header via music-metadata.
  // We parse the in-memory buffer directly — no temp file needed now that
  // we're no longer writing to disk.
  let durationInSeconds = 0;
  try {
    const metadata = await mm.parseBuffer(bytes, { mimeType: "audio/wav" });
    durationInSeconds = metadata.format.duration ?? 0;
  } catch (err) {
    console.warn(`[TTS Engine] music-metadata parse failed for scene ${index}:`, err);
  }

  // Fallback: compute from PCM byte count if metadata failed or returned 0.
  // WAV header is 44 bytes; remaining bytes are 16-bit mono PCM → bytes / 2 / sampleRate
  if (durationInSeconds <= 0) {
    const pcmBytes = Math.max(0, bytes.byteLength - 44);
    durationInSeconds = pcmBytes / 2 / SAMPLE_RATE;
    console.warn(
      `[TTS Engine] scene ${index}: metadata returned 0, computed duration from PCM = ${durationInSeconds.toFixed(2)}s`
    );
  }

  console.log(
    `[TTS Engine] scene ${index}: ${fileName} uploaded to S3, duration=${durationInSeconds.toFixed(2)}s`
  );

  // Append cache-bust so Remotion always fetches the latest audio when a
  // scene is regenerated within the same generation run.
  return {
    url: `${s3Url}?t=${Date.now()}`,
    durationInSeconds,
  };
}