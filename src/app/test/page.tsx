"use client";
import { useState } from "react";

export default function TestPage() {
  const [html, setHtml] = useState("");

  const generate = async () => {
    const systemPrompt = `
You are a Three.js expert. Generate ONLY a complete HTML file.

Rules:
- Use Three.js CDN (r128)
- Must include scene, camera, renderer
- Add animation loop
- Dark background
- Include hero text + button overlay
- Return ONLY HTML (no markdown, no explanation)
`;

    const userPrompt = `Create a 3D hero section website with futuristic design`;

    const res = await fetch("/api/blackbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: systemPrompt + "\n" + userPrompt,
      }),
    });

    const data = await res.json();
    console.log(data);

    let output = data?.choices?.[0]?.message?.content || "no output";

    // clean markdown if present
    output = output
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    setHtml(output);
  };

  return (
    <div>
      <button onClick={generate}>Generate 3D</button>

      <iframe
        srcDoc={html}
        style={{ width: "100%", height: "600px", border: "1px solid black" }}
      />
    </div>
  );
}