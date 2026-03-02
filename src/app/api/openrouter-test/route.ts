import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";

const BASE_URL = "https://openrouter.ai/api/v1";

// Ordered fallback chain — larger, more capable models first.
// "openrouter/free" is a meta-router that picks the best available free model automatically.
const FALLBACK_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "google/gemma-3-12b-it:free",
  "qwen/qwen3-4b:free",
  "openrouter/free",
];

const DEFAULT_SYSTEM_PROMPT = `You are Buildify AI, an expert full-stack developer assistant.
When the user asks you to build an app or write code:
- Generate COMPLETE, WORKING code — never use placeholders or "// TODO" comments.
- Use fenced code blocks with the correct language tag (html, css, javascript, tsx, python, etc.).
- For web apps: always provide the full HTML file with embedded CSS and JS so it runs standalone.
- For React components: provide complete JSX/TSX code with all imports and a default App component.
- Keep explanations brief; let the code speak for itself.
- Use modern best practices (semantic HTML, CSS flexbox/grid, ES6+, React hooks).
When answering general questions: be concise, use markdown formatting.`;

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
    max_tokens: 4096,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function POST(req: Request) {
  // Require authentication to prevent unauthorized API key abuse
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI chat service is currently unavailable" },
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
        // Skip empty or near-empty replies — try next model
        if (!reply || reply.trim().length < 20) {
          lastError = "Model returned an empty response";
          continue;
        }
        return NextResponse.json({
          reply,
          usedModel: modelId,
          fallback: modelId !== requested,
          originalModel: requested,
        });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json(
      { error: "All models are currently unavailable. Please try again later." },
      { status: 503 },
    );
  } catch (_err: unknown) {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
