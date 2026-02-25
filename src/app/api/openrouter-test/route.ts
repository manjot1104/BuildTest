import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const FALLBACK_MODEL = "arcee-ai/trinity-mini:free";

export async function POST(req: Request) {
  try {
    const { message, model } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    try {
      // First attempt → selected model
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message },
        ],
      });

      return NextResponse.json({
        reply: completion.choices[0]?.message?.content,
        usedModel: model,
      });

    } catch (primaryError) {

      console.log("Primary model failed. Trying fallback...");

      // Fallback attempt
      const fallbackCompletion = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message },
        ],
      });

      return NextResponse.json({
        reply: fallbackCompletion.choices[0]?.message?.content,
        usedModel: FALLBACK_MODEL,
        fallback: true,
      });
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}