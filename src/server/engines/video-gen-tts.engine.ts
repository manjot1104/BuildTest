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
  voiceId: string = "devansh",
  // The chatId is used as the S3 directory prefix so scene-N.wav files are
  // overwritten in-place on follow-up generations instead of accumulating
  // under new prefixes. Falls back to a timestamp only in tests.
  chatId: string = `gen_${Date.now()}`,
): Promise<TTSResult> {
  const SMALLEST_API_KEY = process.env.SMALLEST_API_KEY;
  if (!SMALLEST_API_KEY) throw new Error("SMALLEST_API_KEY not set");

  const SAMPLE_RATE = 24000;

  const response = await fetch(
    "https://api.smallest.ai/waves/v1/lightning-v3.1/get_speech",
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
        output_format: "mp3", // ← MP3 output
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Smallest.ai API error ${response.status}: ${errBody}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = Buffer.from(buffer);

  const fileName = `scene-${index}.mp3`; // ← .mp3

  const s3Url = await uploadVideoAudio({
    buffer: bytes,
    generationId: chatId,
    filename: fileName,
  });

  let durationInSeconds = 0;
  try {
    const metadata = await mm.parseBuffer(bytes, { mimeType: "audio/mpeg" }); // ← audio/mpeg
    durationInSeconds = metadata.format.duration ?? 0;
  } catch (err) {
    console.warn(
      `[TTS Engine] music-metadata parse failed for scene ${index}:`,
      err,
    );
  }

  if (durationInSeconds <= 0) {
    console.warn(
      `[TTS Engine] scene ${index}: could not determine duration from MP3 metadata`,
    );
  }

  console.log(
    `[TTS Engine] scene ${index}: ${fileName} uploaded to S3, duration=${durationInSeconds.toFixed(2)}s`,
  );

  // Append cache-bust so Remotion always fetches the latest audio when a
  // scene is regenerated within the same generation run.
  return {
    url: `${s3Url}?t=${Date.now()}`,
    durationInSeconds,
  };
}