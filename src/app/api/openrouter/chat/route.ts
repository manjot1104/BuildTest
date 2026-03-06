import OpenAI from "openai";
import { NextResponse } from "next/server";
import { user_chats } from "@/server/db/schema";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { conversations, conversation_messages } from "@/server/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const BASE_URL = "https://openrouter.ai/api/v1";

const FALLBACK_CHAIN = [
  "google/gemma-3-12b-it:free",
  "arcee-ai/trinity-large-preview:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
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
  const apiKey = env.OPENROUTER_API_KEY;
  logger.info("POST /api/openrouter/chat - started");
  logger.debug("API key present:", !!apiKey);

  if (!apiKey) {
    logger.error("OPENROUTER_API_KEY is missing");
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY missing" },
      { status: 503 },
    );
  }

  try {
    const session = await getSession();
    logger.debug("Session:", session?.user?.id ? `user=${session.user.id}` : "none");

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { messages, model, conversationId } = body;
    logger.info("Request payload:", { model, conversationId, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      logger.error("Invalid messages payload");
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 },
      );
    }

    const latestUserMessage = messages[messages.length - 1]?.content ?? "";
    logger.debug("Latest user message:", latestUserMessage.slice(0, 100));

    const enhancedSystemPrompt = buildEnhancedSystemPrompt(
      DEFAULT_SYSTEM_PROMPT,
      latestUserMessage,
    );

    const apiMessages: ChatMessage[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
    ];

    const openai = new OpenAI({
      baseURL: BASE_URL,
      apiKey,
    });

    const requested = model ?? FALLBACK_CHAIN[0];
    const chain = [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)];
    logger.info("Model chain:", chain);

    let selectedModel: string | null = null;

    // ---------------------------
    //  PHASE 1: Select Working Model (lightweight probe)
    // ---------------------------
    for (const modelId of chain) {
      logger.info(`Probing model: ${modelId}`);
      try {
        const probeResult = await openai.chat.completions.create({
          model: modelId,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
          temperature: 0,
        });
        logger.info(`Probe SUCCESS for ${modelId}`, {
          id: probeResult.id,
          model: probeResult.model,
          choices: probeResult.choices?.length,
        });

        selectedModel = modelId;
        break;
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode;
        const msg = err?.message ?? "";
        const errBody = err?.error ?? err?.response?.data ?? null;
        logger.warn(`Probe FAILED for ${modelId}`, {
          status,
          message: msg.slice(0, 200),
          errorBody: errBody,
          errorType: err?.type,
          errorCode: err?.code,
          constructor: err?.constructor?.name,
        });
        continue;
      }
    }

    if (!selectedModel) {
      logger.error("All models in fallback chain failed");
      return NextResponse.json(
        { error: "All models are currently unavailable. Please try again later." },
        { status: 503 },
      );
    }

    logger.info(`Selected model: ${selectedModel}`);

    let activeConversationId = conversationId ?? nanoid();

    // create conversation if new
    if (!conversationId) {
      logger.info("Creating new conversation:", activeConversationId);
      await db.insert(conversations).values({
        id: activeConversationId,
        user_id: userId,
        model_name: selectedModel,
        title: latestUserMessage.slice(0, 40),
      });
    }

    // ensure user_chats entry exists
    if (activeConversationId) {
      await db
        .insert(user_chats)
        .values({
          id: nanoid(),
          user_id: userId,
          conversation_id: activeConversationId,
          title: latestUserMessage.slice(0, 50).replace(/\n/g, " "),
          chat_type: "OPENROUTER",
          is_starred: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflictDoNothing();
    }

    logger.info("Conversation ready:", activeConversationId);

    // Save USER message
    await db.insert(conversation_messages).values({
      id: nanoid(),
      conversation_id: activeConversationId,
      role: "USER",
      content: latestUserMessage,
    });

    // If conversation was newly created, update model name
    if (!conversationId) {
      await db
        .update(conversations)
        .set({ model_name: selectedModel })
        .where(eq(conversations.id, activeConversationId));
    }

    // ---------------------------
    //  PHASE 2: Real Streaming
    // ---------------------------
    logger.info(`Starting stream with model: ${selectedModel}`);

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

            await new Promise((r) => setTimeout(r, 15));
            fullText += token;

            controller.enqueue(
              `data: ${JSON.stringify({
                type: "delta",
                content: token,
              })}\n\n`,
            );
          }

          // -----------------------
          // AFTER STREAM COMPLETE
          // -----------------------
          const { cleanedText, files } = parseAIResponse(fullText);
          logger.info("Stream complete", {
            fullTextLength: fullText.length,
            filesCount: files.length,
          });

          await db.insert(conversation_messages).values({
            id: nanoid(),
            conversation_id: activeConversationId,
            role: "ASSISTANT",
            content: fullText,
          });

          controller.enqueue(
            `data: ${JSON.stringify({
              type: "done",
              cleanedText,
              files,
              usedModel: selectedModel,
              conversationId: activeConversationId,
            })}\n\n`,
          );

          controller.close();
        } catch (err: any) {
          logger.error("Stream error:", {
            message: err?.message,
            status: err?.status,
            code: err?.code,
          });
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    logger.error("Unhandled error in POST /api/openrouter/chat:", {
      message: err?.message,
      status: err?.status,
      stack: err?.stack?.slice(0, 300),
    });
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}