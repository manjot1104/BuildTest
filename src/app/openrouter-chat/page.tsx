"use client";

import { useState, useRef, useEffect } from "react";

const MODELS = [
  {
    label: "Trinity Mini (Arcee)",
    value: "arcee-ai/trinity-large-preview:free",
  },
  {
    label: "Mistral Small 24B",
    value: "mistralai/mistral-small-3.1-24b-instruct:free",
  },
  {
    label: "LLaMA 3.3 70B",
    value: "meta-llama/llama-3.3-70b-instruct:free",
  },
];

export default function AskPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(MODELS[0]!.value);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/openrouter-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          model: model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error: Unable to fetch response." },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* Top Bar */}
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <h1 className="font-semibold text-lg tracking-tight">
          Chat
        </h1>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Model
          </span>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">

        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <h2 className="text-xl font-semibold mb-2">
              Start chatting
            </h2>
            <p>Select a model and ask anything.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex w-full mb-6 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="flex flex-col max-w-[70%]">
              <span
                className={`text-xs mb-1 ${
                  msg.role === "user"
                    ? "text-right text-muted-foreground"
                    : "text-left text-muted-foreground"
                }`}
              >
                {msg.role === "user" ? "You" : "AI"}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-sm text-muted-foreground">
            AI is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask anything..."
            className="flex-1 border rounded-lg px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}