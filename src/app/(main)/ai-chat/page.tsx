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
  Play,
  Square,
  Terminal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Models ──────────────────────────────────────────────────────────────────

// All IDs verified against OpenRouter /api/v1/models (Feb 2026)
const MODELS = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "LLaMA 3.3 70B",
    provider: "Meta",
    description: "Best model for complex reasoning & long context",
    badge: "Best",
    badgeVariant: "default" as const,
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B",
    provider: "OpenAI",
    description: "OpenAI's powerful 120B model",
    badge: "New",
    badgeVariant: "default" as const,
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    provider: "Nous Research",
    description: "Massive 405B model, excellent at instruction-following",
    badge: "405B",
    badgeVariant: "secondary" as const,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1 24B",
    provider: "Mistral AI",
    description: "Fast and reliable for everyday tasks",
    badge: "Reliable",
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
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "Google",
    description: "Google's capable model with multilingual support",
    badge: null,
    badgeVariant: "secondary" as const,
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    provider: "Google",
    description: "Lighter Google model, faster responses",
    badge: "Fast",
    badgeVariant: "secondary" as const,
  },
] as const;

/** Friendly names for fallback models not in the main list */
const FALLBACK_MODEL_NAMES: Record<string, string> = {
  "arcee-ai/trinity-large-preview:free": "Trinity Large 400B",
  "upstage/solar-pro-3:free": "Solar Pro 3",
  "nvidia/nemotron-3-nano-30b-a3b:free": "Nemotron 30B",
  "stepfun/step-3.5-flash:free": "Step 3.5 Flash",
  "google/gemma-3-4b-it:free": "Gemma 3 4B",
  "qwen/qwen3-4b:free": "Qwen3 4B",
  "openrouter/free": "Auto (Free)",
};

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

// ─── Sandbox Types & Helpers ─────────────────────────────────────────────────

type AppExecution = {
  isRunning: boolean;
  htmlPreview: string | null;
  consoleOutput: string | null;
  error: string | null;
  exitCode: number | null;
  executionTimeMs: number | null;
  status: "completed" | "failed" | "timeout" | null;
};

const WEB_LANGUAGES = new Set(["html", "htm", "css", "scss", "less", "svg", "xml"]);
const SCRIPT_LANGUAGES = new Set([
  "js", "javascript", "jsx", "ts", "typescript", "tsx",
  "mjs", "cjs", "node",
]);
const JSX_LANGUAGES = new Set(["jsx", "tsx"]);
const SERVER_ONLY_LANGUAGES = new Set(["py", "python", "sh", "bash", "shell"]);

/** Checks if code blocks can be rendered client-side in a browser */
function isWebApp(blocks: SegmentCode[]): boolean {
  const langs = blocks.map((b) => b.lang.toLowerCase());
  // Has HTML → definitely a web app
  if (langs.some((l) => ["html", "htm"].includes(l))) return true;
  // Has JSX/TSX → React code, render client-side with React CDN
  if (langs.some((l) => JSX_LANGUAGES.has(l))) return true;
  // Has JS/TS/CSS only (no server-only languages) → can render in browser
  const hasScript = langs.some((l) => SCRIPT_LANGUAGES.has(l));
  const hasCss = langs.some((l) => WEB_LANGUAGES.has(l));
  const hasServerOnly = langs.some((l) => SERVER_ONLY_LANGUAGES.has(l));
  if ((hasScript || hasCss) && !hasServerOnly) return true;
  return false;
}

/**
 * Console capture script — intercepts console.log/warn/error and renders output
 * visually in the page. Also catches uncaught errors and promise rejections.
 * Only shows the output panel when there's no other visible DOM content.
 */
const CONSOLE_CAPTURE_SCRIPT = `<script>
(function(){
  var _out = document.createElement('div');
  _out.id = '__console_output__';
  _out.style.cssText = 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;padding:12px 16px;margin:0;white-space:pre-wrap;word-wrap:break-word;color:#e4e4e7;background:#18181b;min-height:100vh;box-sizing:border-box;';
  document.body.appendChild(_out);

  function _fmt(a){
    if(a===null) return 'null';
    if(a===undefined) return 'undefined';
    if(typeof a==='object'){try{return JSON.stringify(a,null,2)}catch(e){return String(a)}}
    return String(a);
  }
  function _log(type,args){
    var line=document.createElement('div');
    line.style.cssText='padding:2px 0;border-bottom:1px solid #27272a;';
    var prefix='';
    if(type==='error'){line.style.color='#f87171';prefix='Error: ';}
    else if(type==='warn'){line.style.color='#fbbf24';prefix='Warning: ';}
    else if(type==='info'){line.style.color='#60a5fa';}
    else{line.style.color='#e4e4e7';}
    line.textContent=prefix+Array.from(args).map(_fmt).join(' ');
    _out.appendChild(line);
  }
  // Messages to suppress from display (e.g. Babel transformer warning)
  var _suppress=['in-browser Babel transformer','babel.min.js'];
  function _isSuppressed(args){
    var s=Array.from(args).join(' ');
    for(var i=0;i<_suppress.length;i++){if(s.indexOf(_suppress[i])!==-1)return true;}
    return false;
  }
  var _orig={log:console.log,warn:console.warn,error:console.error,info:console.info};
  console.log=function(){_orig.log.apply(console,arguments);if(!_isSuppressed(arguments))_log('log',arguments);};
  console.warn=function(){_orig.warn.apply(console,arguments);if(!_isSuppressed(arguments))_log('warn',arguments);};
  console.error=function(){_orig.error.apply(console,arguments);if(!_isSuppressed(arguments))_log('error',arguments);};
  console.info=function(){_orig.info.apply(console,arguments);if(!_isSuppressed(arguments))_log('info',arguments);};
  window.onerror=function(m,s,l,c,e){_log('error',[e?e.stack||e.message:m]);};
  window.onunhandledrejection=function(e){_log('error',['Unhandled Promise: '+(e.reason&&e.reason.stack||e.reason)]);};

  // After DOM loads, hide console panel if there's visible content in body
  window.addEventListener('DOMContentLoaded', function(){
    var children = document.body.children;
    var hasVisibleContent = false;
    for(var i=0;i<children.length;i++){
      if(children[i].id!=='__console_output__' && children[i].tagName!=='SCRIPT'){
        hasVisibleContent=true; break;
      }
    }
    if(hasVisibleContent && _out.childNodes.length===0){
      _out.style.display='none';
    } else if(hasVisibleContent && _out.childNodes.length>0){
      _out.style.minHeight='auto';
      _out.style.maxHeight='200px';
      _out.style.overflowY='auto';
      _out.style.borderTop='2px solid #3f3f46';
      _out.style.position='fixed';
      _out.style.bottom='0';
      _out.style.left='0';
      _out.style.right='0';
    }
  });
})();
</script>`;

/**
 * Strips import/export statements from code so it can run in a browser <script> tag.
 * - Removes `import ... from '...'` lines
 * - Converts `export default function X` → `function X`
 * - Converts `export default class X` → `class X`
 * - Converts `export function X` → `function X`
 * - Converts `export const/let/var X` → `const/let/var X`
 * - Removes bare `export default` at end
 */
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, "")
    .replace(/^\s*import\s+['"].*?['"];?\s*$/gm, "")
    .replace(/^\s*import\s*\{[^}]*\}\s*from\s*['"].*?['"];?\s*$/gm, "")
    .replace(/export\s+default\s+function\s/g, "function ")
    .replace(/export\s+default\s+class\s/g, "class ")
    .replace(/export\s+function\s/g, "function ")
    .replace(/export\s+const\s/g, "const ")
    .replace(/export\s+let\s/g, "let ")
    .replace(/export\s+var\s/g, "var ")
    .replace(/^\s*export\s+default\s+/gm, "var _default = ")
    .trim();
}

/**
 * Exposes React hooks & common APIs as globals so code that had
 * `import { useState } from 'react'` stripped still works.
 * Must be placed AFTER React/ReactDOM CDN scripts load.
 */
const REACT_GLOBALS_SHIM = `<script>
(function(){
  if(typeof React==='undefined') return;
  // Hooks
  var hooks=['useState','useEffect','useRef','useCallback','useMemo','useContext',
    'useReducer','useId','useLayoutEffect','useImperativeHandle','useDebugValue',
    'useDeferredValue','useTransition','useSyncExternalStore','useInsertionEffect'];
  hooks.forEach(function(h){if(React[h])window[h]=React[h];});
  // Common APIs
  ['createElement','createContext','createRef','forwardRef','lazy','memo',
   'Fragment','Suspense','StrictMode','Children','cloneElement','isValidElement'
  ].forEach(function(k){if(React[k])window[k]=React[k];});
  // ReactDOM
  if(typeof ReactDOM!=='undefined'){
    window.createRoot=ReactDOM.createRoot;
    window.createPortal=ReactDOM.createPortal;
  }
})();
</script>`;

/** Combines all code blocks into a single runnable HTML document */
function buildHtmlApp(blocks: SegmentCode[]): string {
  const htmlBlocks: string[] = [];
  const cssBlocks: string[] = [];
  const jsBlocks: string[] = [];
  const jsxBlocks: string[] = [];

  // Detect if code contains JSX syntax (even if tagged as js/ts)
  const looksLikeJsx = (code: string) =>
    /<[A-Z][a-zA-Z]*[\s/>]/.test(code) || /React\.createElement/.test(code) || /from\s+['"]react['"]/.test(code);

  for (const block of blocks) {
    const lang = block.lang.toLowerCase();
    if (["html", "htm"].includes(lang)) htmlBlocks.push(block.code);
    else if (["css", "scss", "less"].includes(lang)) cssBlocks.push(block.code);
    else if (JSX_LANGUAGES.has(lang) || (SCRIPT_LANGUAGES.has(lang) && looksLikeJsx(block.code)))
      jsxBlocks.push(stripModuleSyntax(block.code));
    else if (SCRIPT_LANGUAGES.has(lang)) jsBlocks.push(stripModuleSyntax(block.code));
  }

  const needsReact = jsxBlocks.length > 0;
  const mainHtml = htmlBlocks.join("\n");
  const hasFullDocument = mainHtml.toLowerCase().includes("<!doctype") || mainHtml.toLowerCase().includes("<html");

  // If the HTML already looks like a full document, inject CSS/JS/console into it
  if (hasFullDocument) {
    let doc = mainHtml;
    // Inject console capture right after <body>
    if (doc.includes("<body")) {
      doc = doc.replace(/<body[^>]*>/, `$&\n${CONSOLE_CAPTURE_SCRIPT}`);
    } else {
      doc = CONSOLE_CAPTURE_SCRIPT + doc;
    }
    if (cssBlocks.length > 0) {
      const cssTag = `<style>\n${cssBlocks.join("\n")}\n</style>`;
      if (doc.includes("</head>")) {
        doc = doc.replace("</head>", `${cssTag}\n</head>`);
      } else if (doc.includes("</body>")) {
        doc = doc.replace("</body>", `${cssTag}\n</body>`);
      } else {
        doc += `\n${cssTag}`;
      }
    }
    if (needsReact && !doc.includes("react")) {
      const reactCdn = `<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>\n<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>\n<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>\n${REACT_GLOBALS_SHIM}`;
      if (doc.includes("</head>")) {
        doc = doc.replace("</head>", `${reactCdn}\n</head>`);
      } else if (doc.includes("<body")) {
        doc = doc.replace(/<body[^>]*>/, `$&\n${reactCdn}`);
      }
    }
    if (jsBlocks.length > 0) {
      const jsTag = `<script>\n${jsBlocks.join("\n")}\n<\/script>`;
      if (doc.includes("</body>")) {
        doc = doc.replace("</body>", `${jsTag}\n</body>`);
      } else {
        doc += `\n${jsTag}`;
      }
    }
    if (jsxBlocks.length > 0) {
      const jsxTag = `<script type="text/babel" data-presets="react">\n${jsxBlocks.join("\n")}\n<\/script>`;
      if (doc.includes("</body>")) {
        doc = doc.replace("</body>", `${jsxTag}\n</body>`);
      } else {
        doc += `\n${jsxTag}`;
      }
    }
    return doc;
  }

  // Build a minimal HTML document
  const reactCdn = needsReact
    ? `<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
${REACT_GLOBALS_SHIM}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${cssBlocks.length > 0 ? `<style>\n${cssBlocks.join("\n")}\n</style>` : ""}
${reactCdn}
</head>
<body>
${CONSOLE_CAPTURE_SCRIPT}
${mainHtml || (needsReact ? '<div id="root"></div>' : "")}
${jsBlocks.length > 0 ? `<script>\n${jsBlocks.join("\n")}\n<\/script>` : ""}
${jsxBlocks.length > 0 ? `<script type="text/babel" data-presets="react">
${jsxBlocks.join("\n\n")}
${!mainHtml ? `
// Auto-mount: render App component to #root
if (typeof App !== 'undefined') {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}` : ""}
<\/script>` : ""}
</body>
</html>`;
}

/** Daytona-supported server-only language map */
const SERVER_LANG_MAP: Record<string, string> = {
  py: "python", python: "python",
};

/** Combines backend-only code blocks for Daytona execution (Python only) */
function buildBackendCode(blocks: SegmentCode[]): { code: string; language: string } | null {
  const serverBlocks = blocks.filter((b) => SERVER_LANG_MAP[b.lang.toLowerCase()]);
  if (serverBlocks.length === 0) return null;

  const primaryLang = serverBlocks[0]!.lang.toLowerCase();
  const daytonaLang = SERVER_LANG_MAP[primaryLang] ?? primaryLang;
  const combinedCode = serverBlocks.map((b) => b.code).join("\n\n");
  return { code: combinedCode, language: daytonaLang };
}

// ─── App Runner Component ───────────────────────────────────────────────────

function AppRunner({ content }: { content: string }) {
  const segments = splitCodeBlocks(content);
  const codeBlocks = segments.filter((s): s is SegmentCode => s.type === "code");

  const [execution, setExecution] = useState<AppExecution>({
    isRunning: false, htmlPreview: null, consoleOutput: null,
    error: null, exitCode: null, executionTimeMs: null, status: null,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  if (codeBlocks.length === 0) return null;

  const webApp = isWebApp(codeBlocks);

  const handleRun = async () => {
    if (execution.isRunning) return;

    if (webApp) {
      // Build and render client-side — instant, no server call
      const html = buildHtmlApp(codeBlocks);
      setExecution({
        isRunning: false, htmlPreview: html, consoleOutput: null,
        error: null, exitCode: 0, executionTimeMs: 0, status: "completed",
      });
      toast.success("App rendered");
      return;
    }

    // Backend code — send to Daytona
    const backend = buildBackendCode(codeBlocks);
    if (!backend) {
      toast.error("No executable code found in this message");
      return;
    }

    setExecution({
      isRunning: true, htmlPreview: null, consoleOutput: null,
      error: null, exitCode: null, executionTimeMs: null, status: null,
    });

    try {
      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backend),
      });

      const data = (await res.json()) as {
        output?: string;
        error?: string | null;
        exitCode?: number;
        executionTimeMs?: number;
        status?: "completed" | "failed" | "timeout";
        message?: string;
      };

      if (!res.ok) {
        const errorMsg = data.message ?? data.error ?? `Execution failed (${res.status})`;
        setExecution({
          isRunning: false, htmlPreview: null, consoleOutput: null,
          error: errorMsg, exitCode: -1, executionTimeMs: null, status: "failed",
        });
        toast.error("Sandbox execution failed", { description: errorMsg });
        return;
      }

      setExecution({
        isRunning: false,
        htmlPreview: null,
        consoleOutput: data.output ?? "",
        error: data.error ?? null,
        exitCode: data.exitCode ?? 0,
        executionTimeMs: data.executionTimeMs ?? null,
        status: data.status ?? "completed",
      });

      if (data.status === "completed") toast.success("Code executed successfully");
      else if (data.status === "timeout") toast.warning("Execution timed out");
      else toast.error("Execution failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setExecution({
        isRunning: false, htmlPreview: null, consoleOutput: null,
        error: errorMsg, exitCode: -1, executionTimeMs: null, status: "failed",
      });
      toast.error("Failed to run code", { description: errorMsg });
    }
  };

  const handleStop = () => {
    setExecution({
      isRunning: false, htmlPreview: null, consoleOutput: null,
      error: null, exitCode: null, executionTimeMs: null, status: null,
    });
  };

  const hasResult = execution.htmlPreview !== null || execution.consoleOutput !== null || execution.error !== null;

  const statusConfig = {
    completed: { color: "text-green-600 dark:text-green-400", label: "Success" },
    failed: { color: "text-destructive", label: "Failed" },
    timeout: { color: "text-yellow-600 dark:text-yellow-400", label: "Timed Out" },
  };

  return (
    <div className="mt-2">
      {/* Run App button */}
      <div className="flex items-center gap-2">
        <Button
          variant={hasResult ? "outline" : "default"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={hasResult ? handleStop : handleRun}
          disabled={execution.isRunning}
        >
          {execution.isRunning ? (
            <><Loader2 className="size-3 animate-spin" />Running...</>
          ) : hasResult ? (
            <><Square className="size-3" />Close Preview</>
          ) : (
            <><Play className="size-3" />Run App</>
          )}
        </Button>
        {hasResult && !execution.htmlPreview && execution.status && (
          <span className={cn("text-[11px] font-medium", statusConfig[execution.status]?.color)}>
            {statusConfig[execution.status]?.label}
          </span>
        )}
        {hasResult && execution.executionTimeMs !== null && execution.executionTimeMs > 0 && !execution.htmlPreview && (
          <span className="text-[10px] text-muted-foreground">{execution.executionTimeMs}ms</span>
        )}
      </div>

      {/* Result panel */}
      {hasResult && (
        <div className="mt-2 overflow-hidden rounded-lg border bg-muted/40">
          {/* HTML preview */}
          {execution.htmlPreview && (
            <>
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">App Preview</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Live</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Minimize" : "Expand"}
                  >
                    {isExpanded ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={execution.htmlPreview}
                sandbox="allow-scripts allow-forms"
                className={cn(
                  "w-full bg-white transition-all",
                  isExpanded ? "h-[500px]" : "h-72",
                )}
                title="App Preview"
              />
            </>
          )}

          {/* Console output (backend code) */}
          {(execution.consoleOutput !== null || execution.error !== null) && !execution.htmlPreview && (
            <>
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Console Output</span>
                </div>
              </div>
              <pre className="max-h-48 overflow-auto p-4 text-xs leading-relaxed">
                {execution.error ? (
                  <code className="text-destructive">{execution.error}</code>
                ) : (
                  <code>{execution.consoleOutput ?? ""}</code>
                )}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Code Block (display only) ──────────────────────────────────────────────

/** Basic syntax highlighting — returns spans with GitHub Dark colors */
function highlightCode(code: string, lang: string): ReactNode[] {
  const l = lang.toLowerCase();
  const isHtml = ["html", "htm", "xml", "svg"].includes(l);
  const isCss = ["css", "scss", "less"].includes(l);
  const isPython = ["py", "python"].includes(l);

  // Tokenize line-by-line for performance
  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let ki = 0;

    const push = (text: string, color?: string) => {
      parts.push(color ? <span key={ki++} style={{ color }}>{text}</span> : <span key={ki++}>{text}</span>);
    };

    // Process the line with regex matching
    const regex = isHtml
      ? /(<\/?[\w-]+|>|\/>|[\w-]+(?==)|"[^"]*"|'[^']*'|<!--[\s\S]*?-->|&\w+;)/g
      : isCss
        ? /(\/\*[\s\S]*?\*\/|[.#][\w-]+|@[\w-]+|:\s*[^;{]+|"[^"]*"|'[^']*'|\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?)/g
        : /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:import|export|from|default|return|const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|void|delete|throw|try|catch|finally|async|await|yield|of|in|extends|implements|interface|type|enum|namespace|declare|abstract|readonly|public|private|protected|static|get|set|def|self|print|True|False|None|elif|lambda|with|as|raise|pass|and|or|not|is)\b|\b(?:true|false|null|undefined|NaN|Infinity)\b|\b(?:console|document|window|Math|Array|Object|String|Number|Boolean|Promise|Map|Set|Date|JSON|Error|React|useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer|ReactDOM|Component|Fragment|createElement)\b|\b\d+\.?\d*\b|[(){}[\];,]|=>|\.\.\.)/gm;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        push(remaining.slice(lastIndex, match.index));
      }
      const token = match[0]!;

      if (isHtml) {
        if (token.startsWith("<!--")) push(token, "#8b949e");
        else if (token.startsWith("<") || token === ">" || token === "/>") push(token, "#7ee787");
        else if (token.includes("=")) push(token, "#79c0ff");
        else if (token.startsWith('"') || token.startsWith("'")) push(token, "#a5d6ff");
        else if (token.startsWith("&")) push(token, "#d2a8ff");
        else push(token);
      } else if (isCss) {
        if (token.startsWith("/*")) push(token, "#8b949e");
        else if (token.startsWith(".") || token.startsWith("#")) push(token, "#7ee787");
        else if (token.startsWith("@")) push(token, "#d2a8ff");
        else if (token.startsWith(":")) push(token, "#79c0ff");
        else if (token.startsWith('"') || token.startsWith("'")) push(token, "#a5d6ff");
        else if (/\d/.test(token)) push(token, "#79c0ff");
        else push(token);
      } else {
        // JS/TS/Python
        if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) push(token, "#8b949e");
        else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) push(token, "#a5d6ff");
        else if (/^(import|export|from|default|return|const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|void|delete|throw|try|catch|finally|async|await|yield|of|in|extends|implements|interface|type|enum|namespace|declare|abstract|readonly|public|private|protected|static|get|set|def|self|print|True|False|None|elif|lambda|with|as|raise|pass|and|or|not|is)$/.test(token)) push(token, "#ff7b72");
        else if (/^(true|false|null|undefined|NaN|Infinity)$/.test(token)) push(token, "#79c0ff");
        else if (/^(console|document|window|Math|Array|Object|String|Number|Boolean|Promise|Map|Set|Date|JSON|Error|React|useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer|ReactDOM|Component|Fragment|createElement)$/.test(token)) push(token, "#d2a8ff");
        else if (/^\d/.test(token)) push(token, "#79c0ff");
        else if (token === "=>" || token === "...") push(token, "#ff7b72");
        else if (/^[(){}[\];,]$/.test(token)) push(token, "#e6edf3");
        else push(token);
      }

      lastIndex = match.index + token.length;
    }
    // Remaining text after last match
    if (lastIndex < remaining.length) {
      push(remaining.slice(lastIndex));
    }

    return (
      <span key={li}>
        {parts}
        {li < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[#30363d]" style={{ background: "#0d1117" }}>
      <div className="flex items-center justify-between border-b border-[#30363d] px-4 py-1.5" style={{ background: "#161b22" }}>
        <span className="font-mono text-[11px]" style={{ color: "#8b949e" }}>{lang || "text"}</span>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] hover:bg-[#30363d]" style={{ color: "#8b949e" }} onClick={handleCopy}>
          {copied ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed" style={{ color: "#e6edf3" }}>
        <code>{highlightCode(code, lang)}</code>
      </pre>
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
  const modelLabel = modelInfo?.name
    ?? (message.modelId ? FALLBACK_MODEL_NAMES[message.modelId] : null)
    ?? "AI";

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
        {!message.isError && <AppRunner content={message.content} />}
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<string>(MODELS[0]!.id);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;

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
          }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            res.status === 503
              ? "Service unavailable — check that OPENROUTER_API_KEY is set in .env"
              : `Server error (${res.status}). Check the terminal for details.`,
          );
        }

        const data = (await res.json()) as {
          reply?: string;
          usedModel?: string;
          fallback?: boolean;
          originalModel?: string;
          error?: string;
        };

        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply ?? "No response received.",
            modelId: data.usedModel as ModelId | undefined,
            isFallback: data.fallback,
            timestamp: new Date(),
          },
        ]);

        if (data.fallback) {
          const name = MODELS.find((m) => m.id === data.usedModel)?.name
            ?? (data.usedModel ? FALLBACK_MODEL_NAMES[data.usedModel] : null)
            ?? "another model";
          toast.info(`Auto-switched to ${name}`, {
            description: "The selected model was busy. Response may vary in quality.",
          });
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
            isError: true,
            timestamp: new Date(),
          },
        ]);
        toast.error("Failed to get a response");
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
    <div className="flex h-[calc(100svh-4rem)] flex-col -m-4">

      {/* ── Minimal header ── */}
      <div className="flex shrink-0 items-center justify-between border-b bg-background/95 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          <span className="text-sm font-semibold">Buildify AI Chat</span>
        </div>
        {hasMessages && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={retryLast} disabled={isLoading}
              className="h-7 gap-1.5 text-xs text-muted-foreground" title="Retry last">
              <RotateCcw className="size-3" /> Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat} disabled={isLoading}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive" title="Clear chat">
              <Trash2 className="size-3" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {!hasMessages && <EmptyState onSuggestion={(t) => void sendMessage(t)} />}
          <div className="space-y-6">
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            {isLoading && <TypingIndicator modelName={selectedModel.name} />}
            <div ref={scrollAnchorRef} />
          </div>
        </div>
      </div>

      {/* ── Input with inline model selector (t3.chat style) ── */}
      <div className="shrink-0 border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col rounded-2xl border bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/25">
            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything…"
              className="min-h-[52px] max-h-44 resize-none rounded-t-2xl rounded-b-none border-0 px-4 pt-3.5 pb-1 text-sm shadow-none focus-visible:ring-0"
              disabled={isLoading}
              autoFocus
            />

            {/* Toolbar row — model selector left, send right */}
            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
              {/* Model selector button */}
              <ModelSelector modelId={modelId} onSelect={setModelId} disabled={isLoading} />

              {/* Send button */}
              <Button
                size="sm"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-8 gap-1.5 rounded-xl px-3 text-xs"
              >
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send
              </Button>
            </div>
          </div>

          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Buildify AI Chat · AI responses may be inaccurate. Verify important information.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
