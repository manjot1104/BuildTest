"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BrainCircuit,
  Send,
  Copy,
  Check,
  Trash2,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


// ─── Models ──────────────────────────────────────────────────────────────────

// All IDs verified against OpenRouter /api/v1/models (Feb 2026)
// const MODELS = [
//   {
//     id: "meta-llama/llama-3.3-70b-instruct:free",
//     name: "LLaMA 3.3 70B",
//     provider: "Meta",
//     description: "Best model for complex reasoning & long context",
//     badge: "Best",
//     badgeVariant: "default" as const,
//   },
//   {
//     id: "openai/gpt-oss-120b:free",
//     name: "GPT OSS 120B",
//     provider: "OpenAI",
//     description: "OpenAI's powerful 120B model",
//     badge: "New",
//     badgeVariant: "default" as const,
//   },
 
//   {
//     id: "mistralai/mistral-small-3.1-24b-instruct:free",
//     name: "Mistral Small 3.1 24B",
//     provider: "Mistral AI",
//     description: "Fast and reliable for everyday tasks",
//     badge: "Reliable",
//     badgeVariant: "secondary" as const,
//   },
  
  
// ] as const;


const MODELS = [
  //  Highest Priority – GPT Models
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B (Free)",
    provider: "OpenAI",
    description: "Primary GPT model",
    badge: "Primary",
    badgeVariant: "default" as const,
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B (Free)",
    provider: "OpenAI",
    description: "Larger GPT fallback",
    badge: "Large",
    badgeVariant: "secondary" as const,
  },

  //  Fallback Free Models
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 24B",
    provider: "Mistral AI",
    description: "Reliable fallback",
    badge: "Fallback",
    badgeVariant: "secondary" as const,
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    provider: "Google",
    description: "Lightweight fallback",
    badge: "Fallback",
    badgeVariant: "secondary" as const,
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "Google",
    description: "Google's capable model with multilingual support",
    badge: null,
    badgeVariant: "secondary" as const,
  },

  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder",
    provider: "Alibaba",
    description: "Specialised for coding tasks and technical questions",
    badge: "Code",
    badgeVariant: "secondary" as const,
  },
   {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    provider: "Nous Research",
    description: "Massive 405B model, excellent at instruction-following",
    badge: "405B",
    badgeVariant: "secondary" as const,
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];


// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelId?: ModelId | string;
  isFallback?: boolean;
  isError?: boolean;
  timestamp: Date;

  
  files?: {
    filename: string;
    language: string;
    code: string;
  }[];
};

// ─── Markdown Renderer ───────────────────────────────────────────────────────

type SegmentText = { type: "text"; content: string };
type SegmentCode = { type: "code"; lang: string; code: string };
type Segment = SegmentText | SegmentCode;

function splitCodeBlocks(raw: string): Segment[] {
  const segments: Segment[] = [];
  const parts = raw.split(/(```(?:\w+)?\n?[\s\S]*?```)/g);
  for (const part of parts) {
    const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (codeMatch) {
      segments.push({
        type: "code",
        lang: codeMatch[1] ?? "text",
        code: (codeMatch[2] ?? "").trimEnd(),
      });
    } else if (part) {
      segments.push({ type: "text", content: part });
    }
  }
  return segments;
}

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string };

function tokenizeInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(`[^`]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", value: line.slice(last, m.index) });
    const raw = m[0]!;
    if (raw.startsWith("`")) tokens.push({ kind: "code", value: raw.slice(1, -1) });
    else if (raw.startsWith("**")) tokens.push({ kind: "bold", value: raw.slice(2, -2) });
    else tokens.push({ kind: "italic", value: raw.slice(1, -1) });
    last = m.index + raw.length;
  }
  if (last < line.length) tokens.push({ kind: "text", value: line.slice(last) });
  return tokens;
}

function InlineParts({ line }: { line: string }) {
  const tokens = tokenizeInline(line);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold") return <strong key={i}>{t.value}</strong>;
        if (t.kind === "italic") return <em key={i}>{t.value}</em>;
        if (t.kind === "code")
          return (
            <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {t.value}
            </code>
          );
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

function TextSegment({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  const listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag
        key={key}
        className={cn("my-1 space-y-0.5 pl-4", listType === "ol" ? "list-decimal" : "list-disc")}
      >
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
            <InlineParts line={item} />
          </li>
        ))}
      </Tag>,
    );
    listBuffer.length = 0;
    listType = null;
  };

  lines.forEach((line, i) => {
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") flushList(`pre-ol-${i}`);
      listType = "ol";
      listBuffer.push(olMatch[2]!);
      return;
    }
    if (line.match(/^[-*]\s+/)) {
      if (listType !== "ul") flushList(`pre-ul-${i}`);
      listType = "ul";
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList(`list-${i}`);
    if (line.startsWith("### "))
      elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-semibold"><InlineParts line={line.slice(4)} /></h3>);
    else if (line.startsWith("## "))
      elements.push(<h2 key={i} className="mt-5 mb-1 text-lg font-semibold"><InlineParts line={line.slice(3)} /></h2>);
    else if (line.startsWith("# "))
      elements.push(<h1 key={i} className="mt-5 mb-2 text-xl font-bold"><InlineParts line={line.slice(2)} /></h1>);
    else if (line === "")
      elements.push(<div key={i} className="h-2" />);
    else
      elements.push(<p key={i} className="text-sm leading-relaxed"><InlineParts line={line} /></p>);
  });
  flushList("final");
  return <div>{elements}</div>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-3 overflow-hidden rounded-lg border bg-muted/40">
      <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{lang || "text"}</span>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={handleCopy}>
          {copied ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  const segments = splitCodeBlocks(content);
  return (
    <div className="space-y-1">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} code={seg.code} />
        ) : (
          <TextSegment key={i} content={seg.content} />
        ),
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);
  return (
    <Button variant="ghost" size="icon" className="size-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={handleCopy} title="Copy">
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const modelInfo = MODELS.find((m) => m.id === message.modelId);
  const modelLabel = modelInfo?.name ?? message.modelId ?? "AI";

  if (message.role === "user") {
    return (
      <div className="group flex justify-end gap-2">
        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[75ch] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
          <div className="flex items-center gap-1">
            <CopyMessageButton content={message.content} />
            <span className="text-[11px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="size-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <div className={cn(
        "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full",
        message.isError ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
      )}>
        {message.isError ? <AlertTriangle className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{modelLabel}</span>
          {message.isFallback && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">fallback</Badge>
          )}
        </div>
        <div className={cn(
          "max-w-[75ch] rounded-2xl rounded-tl-sm px-4 py-3",
          message.isError
            ? "border border-destructive/30 bg-destructive/5 text-destructive"
            : "bg-muted/50",
        )}>
          <MarkdownMessage content={message.content} />
        </div>
        <div className="flex items-center gap-1">
          <CopyMessageButton content={message.content} />
          <span className="text-[11px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ modelName }: { modelName: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-7 items-center justify-center rounded-full bg-muted">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">{modelName}</span>
        <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-muted/50 px-4 py-3">
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-muted-foreground/60"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Explain how React Server Components work",
  "Write a Python function to parse JSON and handle errors",
  "What are the differences between SQL and NoSQL databases?",
  "Summarise the SOLID principles with examples",
];

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <BrainCircuit className="size-7 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Buildify AI Chat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a model and start chatting.
        </p>
      </div>
      <div className="w-full max-w-lg">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => onSuggestion(s)}
              className="rounded-lg border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Model Selector (inside input) ───────────────────────────────────────────

function ModelSelector({
  modelId,
  onSelect,
  disabled,
}: {
  modelId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const selected = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <BrainCircuit className="size-3.5 text-primary" />
          <span className="max-w-[130px] truncate">{selected.name}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Select a model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="flex cursor-pointer items-start gap-2.5 py-2.5"
          >
            <Check className={cn("mt-0.5 size-3.5 shrink-0", m.id === modelId ? "opacity-100 text-primary" : "opacity-0")} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{m.name}</span>
                {m.badge && (
                  <Badge variant={m.badgeVariant} className="h-4 px-1 text-[10px]">
                    {m.badge}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {m.provider} — {m.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpenRouterChatPage() {
  const [activeFiles, setActiveFiles] = useState<
  { filename: string; language: string; code: string }[]
>([]);

const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<string>(MODELS[0]!.id);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;
useEffect(() => {
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.files && m.files.length > 0);

  if (lastAssistant?.files) {
    setActiveFiles(lastAssistant.files);
    setSelectedFileIndex(0);
  }
}, [messages]);
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

     try {
  const res = await fetch("/api/openrouter-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      model: modelId,
      stream: true,   // important
    }),
  });

  if (!res.body) {
    throw new Error("No response body");
  }

  //  1. Insert empty assistant message first
  const assistantId = crypto.randomUUID();

  setMessages((prev) => [
    ...prev,
    {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    },
  ]);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // keep incomplete JSON

  for (const line of lines) {
    if (!line.trim()) continue;

    const parsed = JSON.parse(line);

    if (parsed.type === "token") {
      fullText += parsed.content;
    }

    if (parsed.type === "done") {
      if (parsed.files?.length > 0) {
        setActiveFiles(parsed.files);
        setSelectedFileIndex(0);
      }
    }
  }

  // update assistant message once per chunk
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === assistantId
        ? { ...msg, content: fullText }
        : msg
    )
  );
}

} catch (err) {
  setMessages((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      isError: true,
      timestamp: new Date(),
    },
  ]);

  toast.error("Failed to get response");
} finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, messages, modelId],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    textareaRef.current?.focus();
  }, []);

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const withoutLast = messages.at(-1)?.role === "assistant" ? messages.slice(0, -1) : messages;
    setMessages(withoutLast);
    void sendMessage(lastUser.content);
  }, [messages, sendMessage]);

  const hasMessages = messages.length > 0;

 return (
  <div className="flex h-[calc(100svh-4rem)] -m-4">

    {/* CHAT COLUMN */}
    <div className="flex flex-1 flex-col">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <span className="text-sm font-semibold">Buildify AI Chat</span>
        </div>
        {hasMessages && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={retryLast} disabled={isLoading}>
              <RotateCcw className="size-3" /> Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat} disabled={isLoading}>
              <Trash2 className="size-3" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {!hasMessages && <EmptyState onSuggestion={(t) => void sendMessage(t)} />}
          <div className="space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator modelName={selectedModel.name} />}
            <div ref={scrollAnchorRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col rounded-2xl border bg-background shadow-sm">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything…"
              className="min-h-[52px] max-h-44 resize-none rounded-t-2xl rounded-b-none border-0 px-4 pt-3.5 pb-1 text-sm"
              disabled={isLoading}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
              <ModelSelector modelId={modelId} onSelect={setModelId} disabled={isLoading} />
              <Button
                size="sm"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-8 gap-1.5 rounded-xl px-3 text-xs"
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>

  {/* SIDEBAR */}
{activeFiles.length > 0 && (
  <>
    {/* Resize Handle */}
    <div className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors" />

    {/* Sidebar */}
    <div className="w-[420px] border-l bg-background/95 backdrop-blur-md flex flex-col shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3 bg-muted/40">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            Generated Code
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setActiveFiles([])}
        >
          ✕
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b">
        {activeFiles.map((file, index) => (
          <button
            key={file.filename}
            onClick={() => setSelectedFileIndex(index)}
            className={cn(
              "px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
              index === selectedFileIndex
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {file.filename}
          </button>
        ))}
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b px-4 py-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">
            {activeFiles[selectedFileIndex]?.language}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() =>
              navigator.clipboard.writeText(
                activeFiles[selectedFileIndex]?.code ?? ""
              )
            }
          >
            Copy
          </Button>
        </div>

        <pre className="p-5 text-sm leading-relaxed overflow-x-auto font-mono bg-muted/30">
          <code>
            {activeFiles[selectedFileIndex]?.code}
          </code>
        </pre>
      </div>

    </div>
  </>
)}

  </div>
);}
