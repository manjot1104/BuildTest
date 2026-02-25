import OpenAI from "openai";
import { NextResponse } from "next/server";

const BASE_URL = "https://openrouter.ai/api/v1";

// Ordered fallback chain — all IDs verified against the OpenRouter /api/v1/models endpoint.
// Smaller models are placed later; they rarely get rate-limited and act as a reliable last resort.
const FALLBACK_CHAIN = [
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen3-4b:free",
  "arcee-ai/trinity-mini:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "stepfun/step-3.5-flash:free",
];

const DEFAULT_SYSTEM_PROMPT =
  "You are a concise, helpful AI assistant. Keep answers brief and direct. " +
  "Use markdown: fenced code blocks (with language tag) for code, " +
  "bold for key terms, bullet points for lists.";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

async function tryModel(
  openai: OpenAI,
  modelId: string,
  messages: ChatMessage[],
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set in .env — restart the dev server after adding it." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      messages?: ChatMessage[];
      message?: string;
      model?: string;
      systemPrompt?: string;
    };

    const { model, systemPrompt } = body;

    let userMessages: ChatMessage[];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      userMessages = body.messages;
    } else if (body.message) {
      userMessages = [{ role: "user", content: body.message }];
    } else {
      return NextResponse.json(
        { error: "Provide either a 'messages' array or a 'message' string." },
        { status: 400 },
      );
    }

    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
      ...userMessages,
    ];

    const openai = new OpenAI({ baseURL: BASE_URL, apiKey });

    // Build the ordered list to try: requested model first, then fallbacks
    const requested = model ?? FALLBACK_CHAIN[0]!;
    const chain = [requested, ...FALLBACK_CHAIN.filter((m) => m !== requested)];

    let lastError: string = "All models are currently rate-limited. Try again in a moment.";

    for (const modelId of chain) {
      try {
        const reply = await tryModel(openai, modelId, apiMessages);
        return NextResponse.json({
          reply,
          usedModel: modelId,
          fallback: modelId !== requested,
          originalModel: requested,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[OpenRouter] "${modelId}" failed: ${msg}`);
        lastError = msg;
        // Continue to next model
      }
    }

    // All models failed
    return NextResponse.json({ error: lastError }, { status: 503 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[OpenRouter] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
