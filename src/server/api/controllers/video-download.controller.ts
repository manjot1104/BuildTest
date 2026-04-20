// server/controllers/video-download.controller.ts

import { getSession } from "@/server/better-auth/server";
import { getRenderJobById } from "@/server/db/queries";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";

const AWS_S3_BUCKET = env.AWS_S3_BUCKET ?? "buildify-screenshots";
const AWS_S3_REGION = env.AWS_S3_REGION ?? "us-east-1";

function getS3Client() {
  return new S3Client({
    region: AWS_S3_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function extractS3Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1);
  } catch {
    return null;
  }
}

// Collect an AWS SDK readable stream into a Buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadRenderedVideoHandler({
  jobId,
}: {
  jobId: string;
}): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!jobId?.trim()) {
    return new Response("jobId is required", { status: 400 });
  }

  const job = await getRenderJobById(jobId, session.user.id);
  if (!job) {
    return new Response("Render job not found", { status: 404 });
  }

  if (job.status !== "done" || !job.output_url) {
    return new Response("Render not complete", { status: 400 });
  }

  const key = extractS3Key(job.output_url);
  if (!key) {
    return new Response("Invalid output URL", { status: 500 });
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });

    const s3Response = await client.send(command);

    if (!s3Response.Body) {
      return new Response("Empty response from S3", { status: 500 });
    }

    // ── Collect stream into buffer ─────────────────────────────────────────
    // transformToWebStream() is unreliable across environments.
    // Reading into a buffer ensures the response is complete and valid.
    const buffer = await streamToBuffer(s3Response.Body);

    return new Response(new Uint8Array(buffer).buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="generated-video.mp4"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[DownloadController] S3 stream error:", err);
    return new Response("Failed to download video", { status: 500 });
  }
}