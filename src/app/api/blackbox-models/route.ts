// app/api/blackbox-models/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.blackbox.ai/v1/models", {
    headers: { "Authorization": `Bearer ${process.env.BLACKBOX_API_KEY}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}