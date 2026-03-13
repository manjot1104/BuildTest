"use client";
import { useSearchParams } from "next/navigation";

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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { BuildifyLogo } from "@/components/buildify-logo";
import {
  BrainCircuit,
  Copy,
  Check,
  Trash2,
  Loader2,
  Bot,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  Play,
  Star,
  Square,
  Terminal,
  Maximize2,
  Minimize2,
  ArrowUp,
  CircleStop,
  Sparkles,
  Code2,
  LayoutTemplate,
  Blocks,
  SlidersHorizontal,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


// ─── Models ──────────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: "arcee-ai/trinity-large-preview:free",
    name: "Trinity Large 400B",
    provider: "Arcee AI",
    description: "Massive 400B model, strong general-purpose performance",
    badge: "Primary",
    badgeVariant: "default" as const,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "LLaMA 3.3 70B",
    provider: "Meta",
    description: "Best for complex reasoning and long context",
    badge: "70B",
    badgeVariant: "default" as const,
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
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 24B",
    provider: "Mistral AI",
    description: "Fast and reliable for everyday tasks",
    badge: null,
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
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "Google",
    description: "Google's capable model with multilingual support",
    badge: "27B",
    badgeVariant: "secondary" as const,
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    provider: "Google",
    description: "Lightweight and quick",
    badge: null,
    badgeVariant: "secondary" as const,
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B",
    provider: "OpenAI",
    description: "OpenAI's powerful 120B model",
    badge: "120B",
    badgeVariant: "secondary" as const,
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    provider: "OpenAI",
    description: "OpenAI's lightweight model",
    badge: null,
    badgeVariant: "secondary" as const,
  },
] as const;

/** Friendly names for fallback models not in the main list */
const FALLBACK_MODEL_NAMES: Record<string, string> = {
  "upstage/solar-pro-3:free": "Solar Pro 3",
  "nvidia/nemotron-3-nano-30b-a3b:free": "Nemotron 30B",
  "stepfun/step-3.5-flash:free": "Step 3.5 Flash",
  "google/gemma-3-4b-it:free": "Gemma 3 4B",
  "qwen/qwen3-4b:free": "Qwen3 4B",
  "openrouter/free": "Auto (Free)",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelId?: string;
  isFallback?: boolean;
  isError?: boolean;
  timestamp: Date;
  starred?: boolean;
  conversationId?: string;
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
    const codeMatch = /^```(\w*)\n?([\s\S]*?)```$/.exec(part);
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
    const olMatch = /^(\d+)\.\s+(.+)$/.exec(line);
    if (olMatch) {
      if (listType !== "ol") flushList(`pre-ol-${i}`);
      listType = "ol";
      listBuffer.push(olMatch[2]!);
      return;
    }
    if (/^[-*]\s+/.test(line)) {
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
  if (langs.some((l) => ["html", "htm"].includes(l))) return true;
  if (langs.some((l) => JSX_LANGUAGES.has(l))) return true;
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
  var _suppress=['in-browser Babel transformer','babel.min.js','@babel/standalone'];
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
  window.onerror=function(m,s,l,c,e){
    // Suppress cross-origin script errors (no useful info anyway)
    if(!s || s===''){return true;}
    _log('error',['SCRIPT ERROR: '+m+' | file: '+s+' | line: '+l]);
    return false;
  };
  window.onunhandledrejection=function(e){_log('error',['Unhandled Promise: '+(e.reason&&e.reason.stack||e.reason)]);};

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
<\/script>`;

/**
 * Strips import/export module syntax from code.
 * TypeScript type-level syntax is left for Babel's typescript preset.
 */
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+type\s+.*?;?\s*$/gm, "")
    .replace(/^\s*import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, "")
    .replace(/^\s*import\s+['"].*?['"];?\s*$/gm, "")
    .replace(/export\s+default\s+function\s/g, "function ")
    .replace(/export\s+default\s+class\s/g, "class ")
    .replace(/export\s+function\s/g, "function ")
    .replace(/export\s+const\s/g, "const ")
    .replace(/export\s+let\s/g, "let ")
    .replace(/export\s+var\s/g, "var ")
    .replace(/^\s*export\s+default\s+/gm, "var _default = ")
    .replace(/^\s*export\s+type\s+\{[^}]*\};?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, "")
    .trim();
}

/**
 * Preprocesses TSX code to fix patterns that confuse Babel's TSX parser even
 * with the typescript preset enabled.
 *
 * PRIMARY FIX: Generic arrow functions like `<T extends object>(` are
 * ambiguous in TSX — Babel may parse `<T` as the start of a JSX element.
 * The standard fix is to add a trailing comma: `<T extends object,>(`.
 * We only apply this when the `>` is immediately followed by `(` (function params)
 * confirming it's a generic type parameter, not a JSX opening tag.
 */
function preprocessTsx(code: string): string {
  return code.replace(
    /<([A-Z][A-Za-z0-9]*(?:\s*,\s*[A-Z][A-Za-z0-9]*)*)\s+extends\s+([^>]*[^,\s])>/g,
    (match: string, typeParams: string, constraint: string, offset: number, str: string) => {
      const after = str.slice(offset + match.length);
      // Only transform when followed by ( — confirms generic function, not JSX element
      if (after.trimStart().startsWith("(") || after.trimStart().startsWith(">")) {
        return `<${typeParams} extends ${constraint},>`;
      }
      return match;
    },
  );
}

/**
 * Returns ALL CDN scripts + globals shim.
 *
 * Covers every library AI models commonly import:
 *  - React 18, ReactDOM, Babel (typescript+react presets)
 *  - Recharts (charts)
 *  - react-router-dom v6  → Router/BrowserRouter remapped to HashRouter (iframe-safe)
 *  - lucide-react         → all icons exposed as globals
 *  - Tailwind CSS play CDN
 *  - Polyfills: process, matchMedia, ResizeObserver, IntersectionObserver
 *  - axios mock           → resolves with empty data instead of crashing
 */
function buildCdnScripts(): string {
  return `<script src="https://cdn.tailwindcss.com"><\/script>
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.development.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/react-router-dom@6/umd/react-router-dom.production.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/recharts@2.12.7/umd/Recharts.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/lucide-react@0.263.1/dist/umd/lucide-react.min.js"><\/script>
<script>
(function() {
  /* ── Polyfills ── */
  if (typeof process === 'undefined') {
    window.process = { env: { NODE_ENV: 'development', PUBLIC_URL: '' }, browser: true, version: '' };
  }
  if (!window.matchMedia) {
    window.matchMedia = function(q) {
      return { matches: false, media: q, onchange: null,
        addListener: function(){}, removeListener: function(){},
        addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return false; } };
    };
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = function(cb) { return { observe: function(){}, unobserve: function(){}, disconnect: function(){} }; };
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = function(cb) { return { observe: function(){}, unobserve: function(){}, disconnect: function(){}, root: null, rootMargin: '', thresholds: [] }; };
  }

  /* ── axios mock (prevents crashes when AI generates data-fetching code) ── */
  var mockResp = function(data) { return Promise.resolve({ data: data || {}, status: 200, statusText: 'OK', headers: {}, config: {} }); };
  window.axios = {
    get: function(u, c) { return mockResp({}); },
    post: function(u, d, c) { return mockResp(d); },
    put: function(u, d, c) { return mockResp(d); },
    patch: function(u, d, c) { return mockResp(d); },
    delete: function(u, c) { return mockResp({}); },
    create: function() { return window.axios; },
    defaults: { baseURL: '', headers: { common: {}, get: {}, post: {} } },
    interceptors: { request: { use: function(){}, eject: function(){} }, response: { use: function(){}, eject: function(){} } },
  };

  /* ── React hooks + APIs as globals ── */
  if (typeof React !== 'undefined') {
    ['useState','useEffect','useRef','useCallback','useMemo','useContext','useReducer',
     'useId','useLayoutEffect','useImperativeHandle','useDebugValue','useDeferredValue',
     'useTransition','useSyncExternalStore','useInsertionEffect'
    ].forEach(function(h) { if (React[h]) window[h] = React[h]; });
    ['createElement','createContext','createRef','forwardRef','lazy','memo','Fragment',
     'Suspense','StrictMode','Children','cloneElement','isValidElement'
    ].forEach(function(k) { if (React[k]) window[k] = React[k]; });
  }
  if (typeof ReactDOM !== 'undefined') {
    window.createRoot = ReactDOM.createRoot;
    window.createPortal = ReactDOM.createPortal;
  }

  /* ── react-router-dom: expose all exports; remap BrowserRouter→HashRouter (iframe-safe) ── */
  if (typeof ReactRouterDOM !== 'undefined') {
    Object.keys(ReactRouterDOM).forEach(function(k) { window[k] = ReactRouterDOM[k]; });
    /* BrowserRouter requires a real URL history stack which iframes don't have.
       HashRouter works in any context. Silently remap so AI-generated router code just works. */
    window.BrowserRouter = ReactRouterDOM.HashRouter;
    window.Router        = ReactRouterDOM.HashRouter;
    window.MemoryRouter  = ReactRouterDOM.HashRouter;
  }

  /* ── Recharts globals ── */
  if (typeof Recharts !== 'undefined') {
    ['LineChart','BarChart','PieChart','AreaChart','ScatterChart','RadarChart',
     'XAxis','YAxis','ZAxis','CartesianGrid','Tooltip','Legend','ResponsiveContainer',
     'Line','Bar','Pie','Area','Cell','Scatter','Radar','RadialBarChart','RadialBar',
     'ComposedChart','Brush','ReferenceLine','ReferenceArea','Treemap','FunnelChart','Funnel','LabelList'
    ].forEach(function(k) { if (Recharts[k]) window[k] = Recharts[k]; });
  }

  /* ── lucide-react: expose every icon as a global ── */
  if (typeof LucideReact !== 'undefined') {
    Object.keys(LucideReact).forEach(function(k) {
      if (typeof LucideReact[k] === 'function') window[k] = LucideReact[k];
    });
  }
})();
<\/script>`;
}

/**
 * Builds the Babel runner <script> block that compiles and mounts user code.
 *
 * Handles ALL React/TSX prompt patterns safely:
 *
 *  ① User code is JSON.stringify-encoded in page.tsx, then JSON.parse-decoded in the
 *    injected script — zero escaping issues with backslashes, backticks, quotes, ${}.
 *
 *  ② preprocessTsx() adds trailing comma to <T extends X>( → <T extends X,>( so
 *    Babel's TSX parser doesn't mistake generic type params for JSX open tags.
 *
 *  ③ showError() uses only DOM methods (textContent + style.cssText), never
 *    innerHTML with style strings — avoids the "Unexpected identifier 'color'" crash.
 *
 *  ④ Smart auto-mount priority:
 *     App > Main > Page > Index > Home > Root > _default > last uppercase function
 *     This ensures reusable-component prompts (DataTable, Card, etc.) don't get
 *     mounted directly without props and crash with "Cannot read .slice of undefined".
 *     When a non-entry component is mounted as a last resort it gets an empty-props
 *     try/catch so the error is visible, not a blank page.
 */
function buildBabelRunnerScript(rawCode: string): string {
  const processed = preprocessTsx(stripModuleSyntax(rawCode));
  const jsonCode = JSON.stringify(processed); // safe encoding — handles ALL characters

  // mountCode is built as a string array (no template literals, no backtick nesting)
  const mountLines = [
    "(function() {",
    "  var rootEl = document.getElementById('root');",
    "  if (!rootEl) { rootEl = document.createElement('div'); rootEl.id = 'root'; document.body.appendChild(rootEl); }",
    // libs that must never be treated as app entry points
    "  var SKIP = ['React','ReactDOM','Babel','Recharts','ReactRouterDOM','LucideReact',",
    "    'Object','Array','String','Number','Boolean','Symbol','Map','Set','Promise',",
    "    'Error','Date','Math','JSON','RegExp','Function','WeakMap','WeakSet',",
    "    'URL','URLSearchParams','Headers','Request','Response','Event','CustomEvent',",
    "    'HTMLElement','SVGElement','Node','Element','Document','Window'];",
    // priority entry-point names — check these first
    "  var ENTRY = ['App','Main','Page','Index','Home','Root','Application','Dashboard'];",
    "  var component = null;",
    "  for (var i = 0; i < ENTRY.length; i++) {",
    "    if (typeof window[ENTRY[i]] === 'function') { component = window[ENTRY[i]]; break; }",
    "  }",
    // fall back to export-default capture
    "  if (!component && typeof _default !== 'undefined' && typeof _default === 'function') component = _default;",
    // last resort: last uppercase function on window
    "  if (!component) {",
    "    Object.keys(window).forEach(function(k) {",
    "      if (/^[A-Z]/.test(k) && typeof window[k] === 'function' && SKIP.indexOf(k) === -1) component = window[k];",
    "    });",
    "  }",
    "  if (component) {",
    "    try {",
    "      ReactDOM.createRoot(rootEl).render(React.createElement(component));",
    "    } catch(e) {",
    "      rootEl.textContent = 'Render error: ' + e.message;",
    "      rootEl.style.cssText = 'color:red;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap';",
    "    }",
    "  }",
    "})();",
  ];
  const mountCode = mountLines.join("\\n");

  return `<script>
(function() {
  /* ── Error display: DOM-only, no innerHTML with style strings ── */
  function showError(title, detail) {
    var root = document.getElementById('root') || document.body;
    root.style.cssText = 'background:#1e1e2e;min-height:100vh;padding:20px;box-sizing:border-box';
    var h = document.createElement('div');
    h.style.cssText = 'color:#f87171;font-family:ui-monospace,monospace;font-size:14px;font-weight:bold;margin-bottom:12px';
    h.textContent = title;
    var b = document.createElement('pre');
    b.style.cssText = 'color:#e4e4e7;font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;margin:0;line-height:1.6;overflow:auto';
    b.textContent = detail;
    root.innerHTML = '';
    root.appendChild(h);
    root.appendChild(b);
  }

  if (typeof Babel === 'undefined') { showError('CDN Error', 'Babel failed to load. Check your internet connection.'); return; }
  if (typeof React === 'undefined') { showError('CDN Error', 'React failed to load. Check your internet connection.'); return; }

  var userCode = ${jsonCode};

  var transformed;
  try {
    transformed = Babel.transform(userCode, {
      presets: [['typescript', { allExtensions: true, isTSX: true }], ['react']],
      filename: 'app.tsx',
    }).code;
  } catch (e) {
    showError('Compilation Error', e.message);
    return;
  }

  try {
    var s = document.createElement('script');
    s.textContent = transformed + '\\n' + ${JSON.stringify(mountLines.join("\n"))};
    document.body.appendChild(s);
  } catch (e) {
    showError('Runtime Error', e.stack || e.message);
  }
})();
<\/script>`;
}

/**
 * Builds a complete, self-contained HTML document for React/JSX/TSX apps.
 */
function buildReactHtmlDoc(jsxCode: string, cssCode: string, extraHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  #root { min-height: 100vh; }
  ${cssCode}
</style>
${buildCdnScripts()}
</head>
<body>
${CONSOLE_CAPTURE_SCRIPT}
<div id="root"></div>
${extraHtml}
${buildBabelRunnerScript(jsxCode)}
</body>
</html>`;
}

/** Combines all code blocks into a single runnable HTML document */
function buildHtmlApp(blocks: SegmentCode[]): string {
  const htmlBlocks: string[] = [];
  const cssBlocks: string[] = [];
  const jsBlocks: string[] = [];
  const jsxBlocks: string[] = [];

  // Treat ts/js as JSX too if it looks like React code
  const looksLikeJsx = (code: string) =>
    /<[A-Z][a-zA-Z]*[\s/>]/.test(code) ||
    /<[a-z]+[\s/>]/.test(code) ||
    code.includes("React.createElement") ||
    /from\s+['"]react['"]/.test(code) ||
    /useState|useEffect|useRef/.test(code);

  for (const block of blocks) {
    const lang = block.lang.toLowerCase();
    if (["html", "htm"].includes(lang)) htmlBlocks.push(block.code);
    else if (["css", "scss", "less"].includes(lang)) cssBlocks.push(block.code);
    else if (JSX_LANGUAGES.has(lang) || (SCRIPT_LANGUAGES.has(lang) && looksLikeJsx(block.code)))
      jsxBlocks.push(block.code);
    else if (SCRIPT_LANGUAGES.has(lang)) jsBlocks.push(stripModuleSyntax(block.code));
  }

  const hasJsx = jsxBlocks.length > 0;
  const combinedJsx = jsxBlocks.join("\n\n");
  const combinedCss = cssBlocks.join("\n");
  const mainHtml = htmlBlocks.join("\n");
  const hasFullDocument =
    mainHtml.toLowerCase().includes("<!doctype") || mainHtml.toLowerCase().includes("<html");

  // --- Pure React/JSX/TSX with no HTML template (most common AI output) ---
  if (hasJsx && !hasFullDocument) {
    return buildReactHtmlDoc(combinedJsx, combinedCss, mainHtml);
  }

  // --- Full HTML document that also has JSX: inject CDN + programmatic Babel runner ---
  if (hasFullDocument) {
    let doc = mainHtml;

    if (doc.includes("<body")) {
      doc = doc.replace(/<body[^>]*>/, `$&\n${CONSOLE_CAPTURE_SCRIPT}`);
    } else {
      doc = CONSOLE_CAPTURE_SCRIPT + doc;
    }

    if (cssBlocks.length > 0) {
      const cssTag = `<style>\n${combinedCss}\n</style>`;
      if (doc.includes("</head>")) doc = doc.replace("</head>", `${cssTag}\n</head>`);
      else if (doc.includes("</body>")) doc = doc.replace("</body>", `${cssTag}\n</body>`);
      else doc += `\n${cssTag}`;
    }

    // Inject CDN scripts if JSX is present and React isn't already in the doc
    if (hasJsx && !doc.toLowerCase().includes("cdn.jsdelivr.net/npm/react")) {
      const cdnBlock = buildCdnScripts();
      if (doc.includes("</head>")) doc = doc.replace("</head>", `${cdnBlock}\n</head>`);
      else if (doc.includes("<body")) doc = doc.replace(/<body[^>]*>/, `$&\n${cdnBlock}`);
    }

    if (jsBlocks.length > 0) {
      const jsTag = `<script>\n${jsBlocks.join("\n")}\n<\/script>`;
      if (doc.includes("</body>")) doc = doc.replace("</body>", `${jsTag}\n</body>`);
      else doc += `\n${jsTag}`;
    }

    if (hasJsx) {
      // Use the shared builder — same JSON encoding + preprocessTsx + DOM error display
      const jsxRunnerTag = buildBabelRunnerScript(combinedJsx);
      if (doc.includes("</body>")) doc = doc.replace("</body>", `${jsxRunnerTag}\n</body>`);
      else doc += `\n${jsxRunnerTag}`;
    }

    return doc;
  }

  // --- Pure HTML/CSS/JS (no JSX, no full document) ---
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${cssBlocks.length > 0 ? `<style>\n${combinedCss}\n</style>` : ""}
</head>
<body>
${CONSOLE_CAPTURE_SCRIPT}
${mainHtml}
${jsBlocks.length > 0 ? `<script>\n${jsBlocks.join("\n")}\n<\/script>` : ""}
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

function AppRunner({ content, files }: { content: string; files?: ChatMessage["files"] }) {
  const segments = splitCodeBlocks(content);
  let codeBlocks = segments.filter((s): s is SegmentCode => s.type === "code");

  // If we have explicit files (e.g. from structured output), prioritize them
  if (files && files.length > 0) {
    const fileBlocks: SegmentCode[] = files.map((f) => ({
      type: "code",
      lang: f.language,
      code: f.code,
    }));
    if (fileBlocks.length > 0) {
      codeBlocks = fileBlocks;
    }
  }

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
          variant={hasResult ? "outline" : "ghost"}
          size="sm"
          className={cn(
            "h-7 gap-1.5 text-xs",
            !hasResult && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
          )}
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
        <div className="mt-2 overflow-hidden rounded-xl border shadow-sm">
          {/* HTML preview */}
          {execution.htmlPreview && (
            <>
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-yellow-400" />
                    <span className="size-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">Live Preview</span>
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
              {/*
                CRITICAL FIX: Added allow-same-origin to sandbox so that CDN scripts
                (loaded from cdn.jsdelivr.net) can execute properly.
                Without allow-same-origin, cross-origin scripts are blocked and throw
                "Script error." with no useful stack trace.
                allow-scripts: allows JS execution
                allow-same-origin: allows CDN scripts to run without CORS block
                allow-forms: allows form submissions
                allow-popups: allows window.open / links
              */}
              <iframe
                srcDoc={execution.htmlPreview}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className={cn(
                  "w-full bg-white transition-all duration-300",
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

  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts: ReactNode[] = [];
    const remaining = line;
    let ki = 0;

    const push = (text: string, color?: string) => {
      parts.push(color ? <span key={ki++} style={{ color }}>{text}</span> : <span key={ki++}>{text}</span>);
    };

    const regex = isHtml
      ? /(<\/?[\w-]+|>|\/>|[\w-]+(?==)|"[^"]*"|'[^']*'|<!--[\s\S]*?-->|&\w+;)/g
      : isCss
        ? /(\/\*[\s\S]*?\*\/|[.#][\w-]+|@[\w-]+|:\s*[^;{]+|"[^"]*"|'[^']*'|\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?)/g
        : /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:import|export|from|default|return|const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|void|delete|throw|try|catch|finally|async|await|yield|of|in|extends|implements|interface|type|enum|namespace|declare|abstract|readonly|public|private|protected|static|get|set|def|self|print|True|False|None|elif|lambda|with|as|raise|pass|and|or|not|is)\b|\b(?:true|false|null|undefined|NaN|Infinity)\b|\b(?:console|document|window|Math|Array|Object|String|Number|Boolean|Promise|Map|Set|Date|JSON|Error|React|useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer|ReactDOM|Component|Fragment|createElement)\b|\b\d+\.?\d*\b|[(){}[\];,]|=>|\.\.\.)/gm;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
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
    <div className="my-3 overflow-hidden rounded-xl border border-[#30363d] shadow-sm" style={{ background: "#0d1117" }}>
      <div className="flex items-center justify-between border-b border-[#30363d] px-4 py-1.5" style={{ background: "#161b22" }}>
        <div className="flex items-center gap-1.5">
          <Code2 className="size-3" style={{ color: "#8b949e" }} />
          <span className="font-mono text-[11px]" style={{ color: "#8b949e" }}>{lang || "text"}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="hover:bg-[#30363d]" style={{ color: "#8b949e" }} onClick={handleCopy}>
              {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy code"}</TooltipContent>
        </Tooltip>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100" onClick={handleCopy}>
          {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy message"}</TooltipContent>
    </Tooltip>
  );
}

function MessageBubble({
  message,
  setMessages,
}: {
  message: ChatMessage;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const toggleStar = async () => {
    try {
      await fetch("/api/openrouter/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: message.conversationId,
          starred: !message.starred,
        }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, starred: !m.starred } : m
        )
      );
    } catch (error) {
      console.error("Failed to star message", error);
    }
  };

  const modelInfo = MODELS.find((m) => m.id === message.modelId);
  const modelLabel = modelInfo?.name
    ?? (message.modelId ? FALLBACK_MODEL_NAMES[message.modelId] : null)
    ?? "AI";

  if (message.role === "user") {
    return (
      <div className="group flex justify-end gap-2">
        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[75ch] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
          <div className="flex items-center gap-1">
            <CopyMessageButton content={message.content} />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleStar}
              className={cn(
                "opacity-0 transition-opacity group-hover:opacity-100",
                message.starred && "text-yellow-500 opacity-100"
              )}
            >
              <Star
                className="size-3"
                fill={message.starred ? "currentColor" : "none"}
              />
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <div className={cn(
        "mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg",
        message.isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
      )}>
        {message.isError ? <AlertTriangle className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{modelLabel}</span>
          {message.isFallback && (
            <Badge variant="outline" className="h-4 gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-2.5" />
              fallback
            </Badge>
          )}
        </div>
        <div className={cn(
          "max-w-[75ch] rounded-2xl rounded-tl-sm px-4 py-3",
          message.isError
            ? "border border-destructive/30 bg-destructive/5 text-destructive"
            : "border border-border/40 bg-muted/30",
        )}>
          <MarkdownMessage content={message.content} />
        </div>
        {!message.isError && <AppRunner content={message.content} files={message.files} />}
        <div className="flex items-center gap-1">
          <CopyMessageButton content={message.content} />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleStar}
            className={cn(
              "opacity-0 transition-opacity group-hover:opacity-100",
              message.starred && "text-yellow-500 opacity-100"
            )}
          >
            <Star
              className="size-3"
              fill={message.starred ? "currentColor" : "none"}
            />
          </Button>
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
    <div className="flex gap-3">
      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Bot className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-semibold text-muted-foreground">{modelName}</span>
        <div className="max-w-[75ch] rounded-2xl rounded-tl-sm border border-border/40 bg-muted/30 px-4 py-3">
          <span className="inline-flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-muted-foreground/30"
                style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </span>
          <style>{`@keyframes typing-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(1); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: LayoutTemplate,
    label: "Landing page",
    prompt: "Build a modern landing page with a hero section, features grid, and CTA",
  },
  {
    icon: Blocks,
    label: "Dashboard",
    prompt: "Create a dashboard layout with sidebar navigation, stats cards, and charts",
  },
  {
    icon: Code2,
    label: "REST API",
    prompt: "Write a REST API with CRUD endpoints, validation, and error handling",
  },
  {
    icon: Sparkles,
    label: "React component",
    prompt: "Build a reusable React data table component with sorting and pagination",
  },
];

function EmptyState({
  onSuggestion,
  selectedModel,
}: {
  onSuggestion: (text: string) => void;
  selectedModel: (typeof MODELS)[number];
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
      {/* Logo with glow */}
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
          <BuildifyLogo size="lg" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">What do you want to build?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Describe an app, component, or feature and let AI generate it for you.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="w-full max-w-lg">
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestion(s.prompt)}
              className="group/card flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover/card:bg-primary/10">
                <s.icon className="size-4 text-muted-foreground transition-colors group-hover/card:text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium">{s.label}</span>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Powered by footer */}
      <p className="text-[11px] text-muted-foreground/60">
        Powered by {selectedModel.name} via {selectedModel.provider}
      </p>
    </div>
  );
}

// ─── Generation Parameters ───────────────────────────────────────────────────

type GenerationParams = {
  maxTokens: number;
  temperature: number;
  topP: number;
};

const DEFAULT_PARAMS: GenerationParams = {
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
};

const TOKEN_PRESETS = [512, 1024, 2048, 4096, 8192, 16384] as const;

function GenerationSettings({
  params,
  onChange,
  disabled,
}: {
  params: GenerationParams;
  onChange: (params: GenerationParams) => void;
  disabled?: boolean;
}) {
  const isDefault =
    params.maxTokens === DEFAULT_PARAMS.maxTokens &&
    params.temperature === DEFAULT_PARAMS.temperature &&
    params.topP === DEFAULT_PARAMS.topP;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={disabled}
              className={cn(
                "rounded-lg border-border/60 hover:border-primary/30",
                !isDefault && "border-primary/40 bg-primary/5 text-primary",
              )}
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Generation settings</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-80">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Generation Settings</h4>
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => onChange(DEFAULT_PARAMS)}
            >
              <RotateCw className="size-3" />
              Reset
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-5">
          {/* Max Tokens */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Max Tokens</label>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
                {params.maxTokens.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[params.maxTokens]}
              onValueChange={([v]) => onChange({ ...params, maxTokens: v! })}
              min={128}
              max={32768}
              step={128}
            />
            <div className="flex flex-wrap gap-1">
              {TOKEN_PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => onChange({ ...params, maxTokens: v })}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                    params.maxTokens === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Temperature</label>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
                {params.temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[params.temperature]}
              onValueChange={([v]) => onChange({ ...params, temperature: Math.round(v! * 10) / 10 })}
              min={0}
              max={2}
              step={0.1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Top P */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Top P</label>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
                {params.topP.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[params.topP]}
              onValueChange={([v]) => onChange({ ...params, topP: Math.round(v! * 100) / 100 })}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Focused</span>
              <span>Diverse</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1.5 rounded-xl border-border/60 px-2.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-primary" />
          <span className="max-w-[130px] truncate">{selected.name}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-80">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Select a model
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 py-2.5",
              m.id === modelId && "bg-primary/5",
            )}
          >
            <div className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
              m.id === modelId
                ? "border-primary bg-primary"
                : "border-muted-foreground/30",
            )}>
              {m.id === modelId && (
                <div className="size-1.5 rounded-full bg-primary-foreground" />
              )}
            </div>
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
  const [panelWidth, setPanelWidth] = useState(420);
  const isResizing = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 320 && newWidth < 1000) {
      setPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "default";
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>(MODELS[0]!.id);
  const [isLoading, setIsLoading] = useState(false);
  const [genParams, setGenParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedModel = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;

  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (!chatId) return;
    setActiveConversationId(chatId);
    fetch(`/api/openrouter/messages?conversationId=${chatId}`)
      .then(res => res.json())
      .then(data => {
        const loaded = data.map((m: any) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          timestamp: new Date(m.created_at),
          modelId: m.model,
          starred: m.starred || false,
          conversationId: m.conversation_id,
          files: m.files || [],
        }));
        setMessages(loaded);
      })
      .catch(() => {
        console.error("Failed to load conversation");
      });
  }, [searchParams]);

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

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    toast.info("Generation stopped");
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleStopGeneration();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLoading, handleStopGeneration]);

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

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const assistantId = crypto.randomUUID();

      try {
        const res = await fetch("/api/openrouter/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            model: modelId,
            streaming: true,
            maxTokens: genParams.maxTokens,
            temperature: genParams.temperature,
            topP: genParams.topP,
            conversationId: activeConversationId,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMsg = `Request failed (${res.status})`;
          try {
            const data = (await res.json()) as { error?: string };
            errorMsg = data.error ?? errorMsg;
          } catch { /* ignore parse errors */ }
          throw new Error(errorMsg);
        }

        if (!res.body) throw new Error("No response body received");

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
        ]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let usedModel: string | undefined;
        let isFallback = false;
        let rafId = 0;
        let assistantFiles: ChatMessage["files"] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6);

              try {
                const event = JSON.parse(jsonStr) as
                  | { type: "meta"; model: string; fallback: boolean }
                  | { type: "delta"; content: string }
                  | {
                      type: "done";
                      cleanedText?: string;
                      files?: { filename: string; language: string; code: string }[];
                      usedModel?: string;
                      conversationId?: string;
                    }
                  | { type: "error"; message: string };

                switch (event.type) {
                  case "meta":
                    usedModel = event.model;
                    isFallback = event.fallback;
                    break;
                  case "delta":
                    fullContent += event.content;
                    cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(() => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: fullContent, modelId: usedModel, isFallback }
                            : m,
                        ),
                      );
                    });
                    break;
                  case "error":
                    throw new Error(event.message);
                  case "done":
                    if (!activeConversationId && event.conversationId) {
                      setActiveConversationId(event.conversationId);
                    }
                    if (event.files?.length) {
                      assistantFiles = event.files;
                      setActiveFiles(event.files);
                      setSelectedFileIndex(0);
                    }
                    break;
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }

        cancelAnimationFrame(rafId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent || "No response received.",
                  modelId: usedModel,
                  isFallback,
                  files: assistantFiles,
                }
              : m,
          ),
        );

        if (isFallback && usedModel) {
          const name =
            MODELS.find((m) => m.id === usedModel)?.name
            ?? (usedModel ? FALLBACK_MODEL_NAMES[usedModel] : null)
            ?? "another model";
          toast.info(`Auto-switched to ${name}`, {
            description: "The selected model was busy. Response may vary in quality.",
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        setMessages((prev) => {
          const hasAssistant = prev.some((m) => m.id === assistantId);
          if (hasAssistant) {
            return prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || (err instanceof Error ? err.message : "Something went wrong."),
                    isError: !m.content,
                  }
                : m,
            );
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
              isError: true,
              timestamp: new Date(),
            },
          ];
        });
        toast.error("Failed to get a response");
      } finally {
        abortControllerRef.current = null;
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, messages, modelId, genParams, activeConversationId],
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
      {/* RIGHT SIDE — CHAT UI */}
      <div className="flex-1 flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b bg-background/80 px-5 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <BrainCircuit className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Buildify AI Chat</span>
              <span className="text-[11px] text-muted-foreground">
                {hasMessages
                  ? `${messages.length} message${messages.length !== 1 ? "s" : ""} · ${selectedModel.name}`
                  : `${selectedModel.name} · ${selectedModel.provider}`}
              </span>
            </div>
          </div>
          {hasMessages && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={retryLast} disabled={isLoading}>
                    <RotateCcw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry last message</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={clearChat} disabled={isLoading} className="hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear chat</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* ── Messages ── */}
        <div className={cn("flex-1 overflow-y-auto", !hasMessages && "flex")}>
          <div className={cn(
            "mx-auto w-full max-w-3xl px-4",
            hasMessages ? "py-6" : "flex flex-1 flex-col",
          )}>
            {!hasMessages && (
              <EmptyState
                onSuggestion={(t) => void sendMessage(t)}
                selectedModel={selectedModel}
              />
            )}
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  setMessages={setMessages}
                />
              ))}
              {isLoading && !(messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content) && (
                <TypingIndicator modelName={selectedModel.name} />
              )}
              <div ref={scrollAnchorRef} />
            </div>
          </div>
        </div>

        {/* ── Input area ── */}
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col rounded-2xl border bg-card shadow-sm transition-all focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                className="min-h-[52px] max-h-44 resize-none rounded-t-2xl rounded-b-none border-0 px-4 pt-3.5 pb-1 text-sm shadow-none focus-visible:ring-0"
                disabled={isLoading}
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <ModelSelector modelId={modelId} onSelect={setModelId} disabled={isLoading} />
                  <GenerationSettings params={genParams} onChange={setGenParams} disabled={isLoading} />
                </div>
                <div className="flex items-center gap-2">
                  {input.trim() && (
                    <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground/60 sm:flex">
                      <Kbd>Enter</Kbd>
                      <span>send</span>
                      <Kbd>Shift+Enter</Kbd>
                      <span>newline</span>
                    </div>
                  )}
                  {isLoading ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopGeneration}
                      className="h-8 gap-1.5 rounded-xl px-3 text-xs"
                    >
                      <CircleStop className="size-3.5" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={() => void sendMessage()}
                      disabled={!input.trim()}
                      className="size-8 rounded-xl"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      {activeFiles.length > 0 && (
        <>
          {/* Resize Handle */}
          <div
            className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors"
            onMouseDown={handleMouseDown}
          />

          {/* Sidebar */}
          <div
            className="border-l bg-background/95 backdrop-blur-md flex flex-col shadow-2xl"
            style={{ width: `${panelWidth}px` }}
          >
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
  );
}
