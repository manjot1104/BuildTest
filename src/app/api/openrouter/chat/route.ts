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
  "arcee-ai/trinity-large-preview:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
];

/** Models that don't support system role messages */
const NO_SYSTEM_PROMPT_MODELS = new Set([
  "google/gemma-3-12b-it:free",
  "google/gemma-3-27b-it:free",
]);

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

    // Save conversation & user message before streaming
    let activeConversationId = conversationId ?? nanoid();

    if (!conversationId) {
      logger.info("Creating new conversation:", activeConversationId);
      await db.insert(conversations).values({
        id: activeConversationId,
        user_id: userId,
        model_name: requested,
        title: latestUserMessage.slice(0, 40),
      });
    }

    // ensure user_chats entry exists
    if (activeConversationId) {
      await db
        .insert(user_chats)
        .values({
          id: nanoid(),
          v0_chat_id: `or_${activeConversationId}`,
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

    // ---------------------------
    //  Try each model in chain until one streams successfully
    // ---------------------------
    let selectedModel: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stream: any = null;

    for (const modelId of chain) {
      logger.info(`Trying model: ${modelId}`);
      try {
        // For models that don't support system prompts, merge into first user message
        let messagesForModel = apiMessages;
        if (NO_SYSTEM_PROMPT_MODELS.has(modelId)) {
          const systemMsg = apiMessages.find((m) => m.role === "system");
          messagesForModel = apiMessages
            .filter((m) => m.role !== "system")
            .map((m, i) =>
              i === 0 && systemMsg
                ? { ...m, content: `${systemMsg.content}\n\n${m.content}` }
                : m,
            );
        }

        stream = await openai.chat.completions.create({
          model: modelId,
          messages: messagesForModel,
          max_tokens: 2048,
          temperature: 0.7,
          stream: true,
        });
        selectedModel = modelId;
        logger.info(`Stream started with model: ${modelId}`);
        break;
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode;
        const msg = err?.message ?? "";
        logger.warn(`Model ${modelId} failed`, {
          status,
          message: msg.slice(0, 200),
          errorBody: err?.error,
          errorCode: err?.code,
        });
        continue;
      }
    }

    if (!selectedModel || !stream) {
      logger.error("All models in fallback chain failed");
      return NextResponse.json(
        { error: "All models are currently unavailable. Please try again later." },
        { status: 503 },
      );
    }

    // Update conversation with the model that actually worked
    if (!conversationId) {
      await db
        .update(conversations)
        .set({ model_name: selectedModel })
        .where(eq(conversations.id, activeConversationId));
    }

    let fullText = "";

    const isFallback = selectedModel !== requested;
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send meta event so UI knows which model is responding
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "meta",
              model: selectedModel,
              fallback: isFallback,
            })}\n\n`,
          );

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
            model: selectedModel,
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