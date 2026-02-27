import OpenAI from "openai";
import { NextResponse } from "next/server";

const BASE_URL = "https://openrouter.ai/api/v1";

const FALLBACK_CHAIN = [
  "openai/gpt-oss-20b:free",
  "openai/gpt-oss-120b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "qwen/qwen3-coder:free",
];

const DEFAULT_SYSTEM_PROMPT =
  "You are a concise, helpful AI assistant. Keep answers brief and direct. " +
  "Use markdown: fenced code blocks (with language tag) for code, " +
  "bold for key terms, bullet points for lists.";

/* ---------------------- STEP 1: PROMPT ENHANCEMENT ---------------------- */

function isTechRequest(text: string): boolean {
  const keywords = [
    "code",
    "build",
    "create",
    "write",
    "implement",
    "react",
    "next",
    "node",
    "express",
    "java",
    "python",
    "html",
    "css",
    "javascript",
    "typescript",
    "api",
    "component",
  ];

  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function buildEnhancedSystemPrompt(basePrompt: string, userContent: string): string {
  if (!isTechRequest(userContent)) {
    return basePrompt;
  }

  return `
${basePrompt}

You are generating TECHNICAL CODE output.

STRICT RESPONSE RULES:

1. If generating code, ALWAYS wrap each file like this:

<FILE name="filename.ext" language="language">
\`\`\`language
// full working code
\`\`\`
</FILE>

2. The "name" must match the correct file type:
   - React → .tsx or .jsx
   - JavaScript → .js
   - TypeScript → .ts
   - Python → .py
   - Java → .java
   - HTML → .html
   - CSS → .css

3. If multiple files are needed, output multiple <FILE> blocks.

4. Do NOT explain inside code blocks.

5. Generate minimal runnable code.
6. Do not add unnecessary boilerplate.

7. Never mix explanation inside the <FILE> tags.

Respond ONLY using the defined structure when generating code.
`;
}

/* ------------------------------------------------------------------------ */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

async function tryModel(
  openai: OpenAI,
  modelId: string,
  messages: ChatMessage[],
) {
  const stream = await openai.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: 1,
    temperature: 0,
    stream: true,
  });

  return stream;
}
type ParsedFile = {
  filename: string;
  language: string;
  code: string;
};

function parseAIResponse(raw: string): {
  cleanedText: string;
  files: ParsedFile[];
} {
  const fileRegex =
    /<FILE\s+name="([^"]+)"\s+language="([^"]+)"\s*>([\s\S]*?)<\/FILE>/g;

  const files: ParsedFile[] = [];
  let cleanedText = raw;

  let match;

  while ((match = fileRegex.exec(raw)) !== null) {
    const filename = match[1]?.trim();
    const language = match[2]?.trim();
    const innerContent = match[3]?.trim();

    if (!filename || !language || !innerContent) continue;

    // Extract code inside fenced block
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
    const codeMatch = innerContent.match(codeBlockRegex);

   const extracted = codeMatch?.[1];
const code = extracted ? extracted.trim() : innerContent;
    files.push({
      filename,
      language,
      code,
    });

    // Remove file block from cleaned text
    cleanedText = cleanedText.replace(match[0], "").trim();
  }

  return {
    cleanedText,
    files,
  };
}
export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY missing" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { messages, model } = body;
    const latestUserMessage =
  messages[messages.length - 1]?.content ?? "";

const enhancedSystemPrompt = buildEnhancedSystemPrompt(
  DEFAULT_SYSTEM_PROMPT,
  latestUserMessage
);

const apiMessages: ChatMessage[] = [
  { role: "system", content: enhancedSystemPrompt },
  ...messages,
];

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      baseURL: BASE_URL,
      apiKey,
    });

    const requested = model ?? FALLBACK_CHAIN[0];
    const chain = [requested, ...FALLBACK_CHAIN.filter(m => m !== requested)];

    let selectedModel: string | null = null;

    // ---------------------------
    //  PHASE 1: Select Working Model
    // ---------------------------
    for (const modelId of chain) {
      try {
       await openai.chat.completions.create({
  model: modelId,
  messages: apiMessages,
  max_tokens: 1,
  temperature: 0,
});

        selectedModel = modelId;
        break;
      } catch (err: any) {
        if (err?.message?.includes("429")) continue;
      }
    }

    if (!selectedModel) {
      return NextResponse.json(
        { error: "All models rate limited" },
        { status: 503 }
      );
    }

    // ---------------------------
    //  PHASE 2: Real Streaming
    // ---------------------------

    const stream = await openai.chat.completions.create({
  model: selectedModel,
  messages: apiMessages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
    });

    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
  const token = chunk.choices?.[0]?.delta?.content;
  if (!token) continue;

  await new Promise(r => setTimeout(r, 15)); // 👈 10–20ms delay

  fullText += token;

  controller.enqueue(
    JSON.stringify({
      type: "token",
      content: token,
    }) + "\n"
  );
}

          // -----------------------
          // AFTER STREAM COMPLETE
          // -----------------------

          const { cleanedText, files } = parseAIResponse(fullText);

          controller.enqueue(
            JSON.stringify({
              type: "done",
              cleanedText,
              files,
              usedModel: selectedModel,
            }) + "\n"
          );

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}