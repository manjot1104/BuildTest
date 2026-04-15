'use client'
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { SeoAuditResults } from '@/components/chat/seo-audit-results'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ModeSelection } from "./components/mode-selection"
import { KeyRound, SearchCheckIcon, Maximize2, Minimize2, Layout,
    CheckSquare,
    BarChart3,
    FileText,
    ShoppingCart,
    AlertCircle,
    RotateCw,
    Box,
    Sparkles,
    Globe,
    Layers,
    Zap,
    RefreshCw,
    Code,
    Maximize,
    Minimize,
    Download,
    Store,
    Music,
    Gamepad2,
    Palette,
    Briefcase,
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { EnvVariablesPanel } from '@/components/chat/env-variables-panel'
import { useEnvVariables } from '@/hooks/use-env-variables'
import { useSearchParams } from 'next/navigation'
import { useRouter } from "next/navigation"
import {
    PromptInput,
    PromptInputImageButton,
    PromptInputImagePreview,
    PromptInputMicButton,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputToolbar,
    PromptInputTools,
    createImageAttachment,
    createImageAttachmentFromStored,
    savePromptToStorage,
    loadPromptFromStorage,
    clearPromptFromStorage,
    type ImageAttachment,
} from '@/components/ai-elements/prompt-input'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { CommunityBuildsGrid } from '@/components/chat/community-builds-grid'
import { ForkBanner } from '@/components/chat/fork-banner'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { useChat } from '@/hooks/use-chat'
import { ChatActionsProvider } from '@/context/chat-actions'
import { SubscriptionModal } from '@/components/payments/subscription-modal'
import { useUserCredits } from '@/hooks/use-user-credits'
import { useForkChat } from '@/client-api/query-hooks'
import { useStateMachine } from '@/context/state-machine'
import type { MessageBinaryFormat } from '@v0-sdk/react'

import { cn } from '@/lib/utils'
import { BuildifyLogo } from '@/components/buildify-logo'
import { ChatExportMenu } from '@/components/chat/chat-export-menu'

// ─── 3D Templates ─────────────────────────────────────────────────────────────
const threeDTemplates = [
  {
    label: 'Creative Portfolio',
    icon: Palette,
    prompt: `3D creative portfolio with floating glass sphere, soft lighting, minimal typography, elegant premium feel`,
  },
  {
    label: 'Tech Launch',
    icon: Store,
    prompt: `futuristic 3D tech product launch with metallic object, dark theme, neon rim lighting, cinematic depth`,
  },
  {
    label: 'Digital Agency',
    icon: Briefcase,
    prompt: `bold 3D digital agency hero with animated wave surface, dark aesthetic, smooth motion, premium look`,
  },
  {
    label: 'SaaS Hero',
    icon: Globe,
    prompt: `clean SaaS 3D hero with floating geometric shapes, white theme, soft shadows, modern minimal UI`,
  },
  {
    label: 'Art Gallery',
    icon: Palette,
    prompt: `minimal 3D art gallery with sculptural object, soft warm lighting, fog depth, luxury aesthetic`,
  },
]

// ─── Draggable SEO Panel ──────────────────────────────────────────────────────
function DraggableSeoPanel({
    loading, result, mobileData, desktopData, onClose,
}: {
    loading: boolean; result: string | null; mobileData: any; desktopData: any; onClose: () => void
}) {
    const [width, setWidth] = useState(460)
    const [isFull, setIsFull] = useState(false)
    const isResizingRef = useRef(false)

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return
            const newWidth = window.innerWidth - e.clientX
            setWidth(Math.max(360, Math.min(newWidth, window.innerWidth * 0.75)))
        }
        const stopResize = () => { isResizingRef.current = false }
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", stopResize)
        return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", stopResize) }
    }, [])

    return (
        <div
            style={isFull ? {} : { width }}
            className={cn("fixed z-50 flex flex-col bg-card border border-border/50 shadow-2xl shadow-black/30",
                isFull ? "inset-0 w-screen h-screen rounded-none" : "bottom-0 right-0 top-12 rounded-l-2xl overflow-hidden")}
        >
            {!isFull && (
                <div onMouseDown={() => { isResizingRef.current = true }} className="absolute left-0 top-0 h-full w-1 cursor-ew-resize z-10 group">
                    <div className="w-full h-full group-hover:bg-primary/20 transition-colors" />
                </div>
            )}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 shrink-0 bg-muted/20 select-none">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                    <SearchCheckIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-foreground">SEO Audit</span>
                {loading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent ml-0.5" />}
                <div className="flex items-center gap-0.5 ml-auto">
                    <button onClick={() => setIsFull(!isFull)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-xs font-medium">✕</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40">
                <SeoAuditResults result={result} mobileData={mobileData} desktopData={desktopData} loading={loading} isFull={isFull} />
            </div>
            {result && !loading && (
                <div className="px-4 py-2 border-t border-border/30 shrink-0 bg-muted/10">
                    <p className="text-[10px] text-muted-foreground/30 text-center font-medium">Powered by Google PageSpeed + AI Analysis</p>
                </div>
            )}
        </div>
    )
}

// ─── 3D Preview Toolbar Button ────────────────────────────────────────────────
function ThreeDToolbarBtn({ tooltip, onClick, disabled, children, active }: {
    tooltip: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean
}) {
    return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        disabled={disabled}
                        className={cn(
                            'h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground transition-colors',
                            'hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none',
                            active && 'bg-muted text-foreground',
                        )}
                    >
                        {children}
                    </button>
                </TooltipTrigger>
                <TooltipContent><p>{tooltip}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

// ─── ThreeDPreview ────────────────────────────────────────────────────────────
function ThreeDPreview({ html, loading, isFullscreen, setIsFullscreen, sceneId, onSeoAudit }: {
    html: string; loading: boolean; isFullscreen: boolean; setIsFullscreen: (v: boolean) => void; sceneId: string; onSeoAudit: (prompt: string, chatId: string, mode?: string) => void
}) {
    const loadingSteps = [
  'Initializing 3D engine...',
  'Crafting geometry...',
  'Setting up lighting...',
  'Adding depth & fog...',
  'Animating the scene...',
  'Almost ready...',
]
const [loadingStep, setLoadingStep] = useState(0)


    const iframeRef = useRef<HTMLIFrameElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [codeOpen, setCodeOpen] = useState(false)
    const [urlBarFocused, setUrlBarFocused] = useState(false)
    const scrollProgressRef = useRef(0)
    const iframeReadyRef = useRef(false)
    const pendingScrollRef = useRef<number | null>(null)

    // Post message to iframe — queues if not ready yet
    const postToIframe = useCallback((msg: object) => {
        const win = iframeRef.current?.contentWindow
        if (win) {
            try { win.postMessage(msg, '*') } catch { }
        }
    }, [])

    // Wheel → send SCROLL message into the iframe (always attached, no html dep)
    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            const container = containerRef.current
            if (!container) return
            // Only intercept when mouse is over the preview container
            if (!container.contains(e.target as Node)) return
            e.preventDefault()
            e.stopPropagation()
            scrollProgressRef.current = Math.max(0, Math.min(1,
                scrollProgressRef.current + e.deltaY * 0.001
            ))
            postToIframe({ type: 'SCROLL', progress: scrollProgressRef.current })
        }
        // Attach to window so it always fires even when iframe steals pointer
        window.addEventListener('wheel', onWheel, { passive: false })
        return () => window.removeEventListener('wheel', onWheel)
    }, [postToIframe])

    // Mouse move → relay to iframe for parallax
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const container = containerRef.current
            if (!container) return
            if (!container.contains(e.target as Node) && !iframeRef.current?.contains(e.target as Node)) return
            const rect = container.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width   // 0-1
            const y = (e.clientY - rect.top) / rect.height    // 0-1
            postToIframe({ type: 'MOUSEMOVE', x, y, nx: x * 2 - 1, ny: -(y * 2 - 1) })
        }
        window.addEventListener('mousemove', onMouseMove)
        return () => window.removeEventListener('mousemove', onMouseMove)
    }, [postToIframe])
useEffect(() => {
  if (!loading) { setLoadingStep(0); return }
  const interval = setInterval(() => {
    setLoadingStep(prev => (prev + 1) % loadingSteps.length)
  }, 4000)
  return () => clearInterval(interval)
}, [loading])
    // Reset scroll progress when new scene loads
    useEffect(() => { 
        scrollProgressRef.current = 0
        iframeReadyRef.current = false
    }, [html])

    // Download the generated HTML as a file
    const handleDownload = () => {
        if (!html) return
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '3d-scene.html'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Fullscreen keyboard shortcut
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
            if (e.key.toLowerCase() === 'f') setIsFullscreen(!isFullscreen)
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isFullscreen, setIsFullscreen])

    const displayUrl = html
        ? `https://buildify.sh/apps/${sceneId}`
        : ''

    return (
        <div className={cn(
            'flex flex-col h-full min-h-0 bg-card transition-all duration-300',
            isFullscreen && 'fixed inset-0 z-50',
        )}>
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-1.5 border-b px-2 h-14 min-w-0 overflow-hidden shrink-0">
                {/* URL bar — selectable input, matches 2D preview bar text size */}
                <input
                    readOnly
                    value={displayUrl}
                    placeholder="Your 3D scene will appear here..."
                    className={cn(
                        'flex-1 min-w-0 h-9 px-3 rounded-md border text-sm truncate transition-all duration-150',
                        'bg-muted/30 cursor-text select-text font-mono',
                        html
                            ? 'text-foreground border-input'
                            : 'text-muted-foreground opacity-50 border-input',
                        urlBarFocused && html
                            ? 'ring-2 ring-primary border-primary outline-none'
                            : 'outline-none',
                    )}
                    onFocus={() => setUrlBarFocused(true)}
                    onBlur={() => setUrlBarFocused(false)}
                    onClick={e => { if (html) (e.target as HTMLInputElement).select() }}
                    title={displayUrl || undefined}
                    style={{ caretColor: 'transparent' }}
                />

                <div className="flex items-center gap-0.5 shrink-0">
                    <ThreeDToolbarBtn
  tooltip="Run SEO Audit"
  onClick={() => {
    if (!sceneId) return
    onSeoAudit?.("seo-audit", sceneId, "3d")
  }}
>
  <SearchCheckIcon className="h-4 w-4" />
</ThreeDToolbarBtn>
                    <ThreeDToolbarBtn tooltip="View source HTML" disabled={!html} onClick={() => setCodeOpen(true)}>
                        <Code className="h-4 w-4" />
                    </ThreeDToolbarBtn>

                    <ThreeDToolbarBtn
                        tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        disabled={!html}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </ThreeDToolbarBtn>
                </div>
            </div>

            {/* ── Preview area ── */}
            <div ref={containerRef} className="relative flex-1 min-h-0 bg-[#0a0f1e] overflow-hidden">
  {loading && (
  <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#0a0f1e]">
<div className="flex flex-col items-center gap-2">
  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />

  <p className="text-sm text-muted-foreground">
    {loadingSteps[loadingStep]}
  </p>

 <div className="animate-pulse text-xs text-muted-foreground">
  Rendering 3D scene...
</div>
  <p className="text-[11px] text-muted-foreground/50">
    This may take a few seconds
  </p>
</div>
  </div>
)}

              {html && !loading && (
  <iframe
   key={sceneId}
                        ref={iframeRef}
                        srcDoc={(() => {
                            // Bootstrap script injected into every generated scene:
                            // 1. Sends READY ping to parent so host knows iframe is live
                            // 2. Re-registers MOUSEMOVE/SCROLL listeners inside iframe
                            //    as a fallback (in case AI forgot or used wrong syntax)
                            const bootstrap = `<script>
(function() {
  // Notify parent that iframe is loaded and ready
  window.parent.postMessage({ type: 'IFRAME_READY' }, '*');

  // Internal mouse tracker for parallax (fallback if AI used window.onmousemove)
  var _nx = 0, _ny = 0;
  document.addEventListener('mousemove', function(e) {
    _nx = (e.clientX / window.innerWidth)  * 2 - 1;
    _ny = -((e.clientY / window.innerHeight) * 2 - 1);
    // Dispatch to any listeners that used the normalized form
    window._mouseNX = _nx; window._mouseNY = _ny;
  });

  // Relay SCROLL and MOUSEMOVE from parent
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'MOUSEMOVE') {
      window._mouseNX = e.data.nx;
      window._mouseNY = e.data.ny;
      // Fire a synthetic mousemove so Three.js listeners inside also fire
      var me = new MouseEvent('mousemove', {
        clientX: e.data.x * window.innerWidth,
        clientY: e.data.y * window.innerHeight,
        bubbles: true
      });
      document.dispatchEvent(me);
    }
    // SCROLL is handled by AI's own listener; this just ensures it exists
  });
})();
<\/script>`;
                            const injected = html.includes('</body>') 
                                ? html.replace('</body>', bootstrap + `<script>
                                document.addEventListener('click', function(e) {
                                    var a = e.target.closest('a');
                                    if (a) {
                                        var href = a.getAttribute('href');
                                        if (href && (href === '#' || href === '/' || href.startsWith('#'))) {
                                            e.preventDefault();
                                            if (href.startsWith('#') && href.length > 1) {
                                                var el = document.querySelector(href);
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }
                                    }
                                });
                            <\/script></body>`)
                                : bootstrap + html;
                            return injected;
                            
                        })()}
                        className="absolute inset-0 w-full h-full border-none"
                   sandbox="allow-scripts allow-pointer-lock"
                        style={{ pointerEvents: 'auto', willChange: 'transform' }}
                        onLoad={() => {
    iframeReadyRef.current = true
    // Small delay so Three.js initializes, then send scroll
    setTimeout(() => {
        postToIframe({ type: 'SCROLL', progress: scrollProgressRef.current })
    }, 100)
}}
                    />
                )}

                {!html && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Box className="w-6 h-6 text-primary/30" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground/50">Your 3D website appears here</p>
                            <p className="text-[11px] text-muted-foreground/30 mt-1">Pick a template or type your own prompt</p>
                        </div>
                    </div>
                )}

                {html && !loading && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                        <p className="text-[10px] text-white/20 select-none">Scroll to zoom · Move mouse to rotate</p>
                    </div>
                )}
            </div>

            {/* ── HTML source viewer dialog — download button stays here ── */}
            {codeOpen && html && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCodeOpen(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-[min(900px,90vw)] h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                            <div className="flex items-center gap-2">
                                <Code className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold">Source HTML</span>
                                <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">3d-scene.html</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Download className="w-3 h-3" /> Download
                                </button>
                                <button onClick={() => setCodeOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs">✕</button>
                            </div>
                        </div>
                      <div className="flex-1 overflow-auto bg-black">
  <SyntaxHighlighter
    language="html"
    wrapLines={false}
    style={{
      ...oneDark,
      'pre[class*="language-"]': {
        ...oneDark['pre[class*="language-"]'],
        background: '#000000',
      },
      'code[class*="language-"]': {
        ...oneDark['code[class*="language-"]'],
        background: '#000000',
      }
    }}
    customStyle={{
      margin: 0,
      padding: '16px',
      background: '#000000',
      fontSize: '11px',
    }}
  >
    {html}
  </SyntaxHighlighter>
</div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── 3D Chat History ──────────────────────────────────────────────────────────
function ThreeDChatHistory({
    messages, onRegenerate, loading,
}: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    onRegenerate: () => void
    loading: boolean
}) {
    const bottomRef = useRef<HTMLDivElement>(null)
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    return (
        <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2">
            {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center px-6">
                        <div className="w-9 h-9 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-3">
                            <Sparkles className="w-4 h-4 text-primary/40" />
                        </div>
                        <p className="text-xs text-muted-foreground/50 leading-relaxed">
                            Describe the 3D website you want — or pick a template below
                        </p>
                    </div>
                </div>
            )}
        {messages.map((m, i) => {
    if (m.content === '__service_down__') {
        return (
            <div key={i} className="self-start max-w-[88%] rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                    <span className="font-medium text-orange-400">Our systems are currently down</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    Our 3D generation service is temporarily unavailable. We'll get back to you shortly.
                </p>
            </div>
        )
    }
    return (
        <div key={i} className={cn(
            'rounded-xl px-3 py-2 text-xs max-w-[88%] leading-relaxed',
            m.role === 'user'
                ? 'bg-primary/10 border border-primary/20 text-foreground self-end'
                : 'bg-muted/30 border border-border/20 text-muted-foreground self-start'
        )}>
            {m.content}
        </div>
    )
})}
            {messages.length > 0 && !loading && (
                <div className="self-start mt-1">
                    <button
                        onClick={onRegenerate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-border/20 hover:border-border/40 transition-all"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                    </button>
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    )
}

// ─── SearchParamsHandler ──────────────────────────────────────────────────────
function SearchParamsHandler({ onReset, onChatIdChange, onAutoPrompt }: {
    onReset: () => void
    onChatIdChange: (chatId: string | null, mode?: string | null) => void  
    onAutoPrompt?: (prompt: string, chatId: string) => void
}) {
    const searchParams = useSearchParams()
    useEffect(() => {
        const reset = searchParams.get('reset')
        if (reset === 'true') {
            onReset()
            const u = new URL(window.location.href); u.searchParams.delete('reset'); window.history.replaceState({}, '', u.pathname)
        }
    }, [searchParams])
  const lastHandledRef = useRef<string>('')
useEffect(() => { 
    const chatId = searchParams.get('chatId')
    const mode = searchParams.get('mode')
    const key = `${chatId}-${mode}`
    if (chatId !== null && key !== lastHandledRef.current) {
        lastHandledRef.current = key
        onChatIdChange(chatId, mode)
    }
}, [searchParams])
    const hasHandledRef = useRef(false)
    useEffect(() => {
        if (hasHandledRef.current) return
        const prompt = searchParams.get('prompt'); const chatId = searchParams.get('chatId')
        if (prompt && chatId && onAutoPrompt) {
            hasHandledRef.current = true
            const u = new URL(window.location.href); u.searchParams.delete('prompt'); window.history.replaceState({}, '', u.toString())
            onAutoPrompt(prompt, chatId)
        }
    }, [searchParams])
    return null
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const router = useRouter()
    const [chatMode, setChatMode] = useState<'BUILDER' | 'AI_CHAT' | null>(null)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showChatInterface, setShowChatInterface] = useState(false)

    const [buildMode, setBuildMode] = useState<'2D' | '3D'>('2D')
    const [threeDHtml, setThreeDHtml] = useState<string>('')
    const [threeDLoading, setThreeDLoading] = useState(false)
    const [threeDMessages, setThreeDMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
    const [threeDFullscreen, setThreeDFullscreen] = useState(false)
    const [threeDSceneId, setThreeDSceneId] = useState<string>('')
    const lastUserPromptRef = useRef<string>('')
const [selectedTemplateVideo, setSelectedTemplateVideo] = useState<string | null>(null)
    const [envPanelOpen, setEnvPanelOpen] = useState(false)
    const { variables } = useEnvVariables()
    const [attachments, setAttachments] = useState<ImageAttachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat')
    const [micError, setMicError] = useState<string | null>(null)
    const [urlChatId, setUrlChatId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('chatId')
        return null
    })

    useEffect(() => { if (chatMode === 'AI_CHAT' && !showChatInterface) setShowChatInterface(true) }, [chatMode])
useEffect(() => { 
    if (urlChatId && chatMode === null) { 
        const params = new URLSearchParams(window.location.search)
        const mode = params.get('mode')

        setChatMode('BUILDER')
        setShowChatInterface(true)

        if (mode === '3d') {
            setBuildMode('3D')   
        }
    } 
}, [urlChatId, chatMode])

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const {
        currentChat: hookCurrentChat, chatHistory, isLoading: hookIsLoading, isStreaming,
        isLoadingChat, chatError, handleSendMessage: hookHandleSendMessage,
        handleStreamingComplete: hookHandleStreamingComplete, handleChatData: hookHandleChatData,
        showSubscriptionModal, setShowSubscriptionModal,
    } = useChat(urlChatId ?? undefined)

    const { credits, subscription, hasActiveSubscription } = useUserCredits()
    const { session } = useStateMachine()
    const forkChat = useForkChat()
    const isViewingOthersChat = !!urlChatId && !!hookCurrentChat?.id && hookCurrentChat.isOwner === false

    const handleFork = async () => {
        if (!urlChatId) return
        try {
            const result = await forkChat.mutateAsync(urlChatId)
            if (result.newChatId) {
                const u = new URL(window.location.href); u.searchParams.set('chatId', result.newChatId)
                window.location.href = u.pathname + u.search
            }
        } catch { }
    }

    const shouldShowPreview = !!hookCurrentChat?.id && !isStreaming
    useEffect(() => { setIsLoading(hookIsLoading) }, [hookIsLoading])

    const autoPromptFiredRef = useRef(false)
    const handleReset = useCallback(() => {
        autoPromptFiredRef.current = false
        handledChatIdRef.current = null
        setShowChatInterface(false); setChatMode(null); setMessage(''); setAttachments([])
        setIsLoading(false); setIsFullscreen(false); setUrlChatId(null)
        setThreeDHtml(''); setThreeDMessages([]); setThreeDLoading(false); setThreeDFullscreen(false); setThreeDSceneId('')
        lastUserPromptRef.current = ''
          setSelectedTemplateVideo(null)
        const u = new URL(window.location.href); u.searchParams.delete('chatId')
        window.history.replaceState({}, '', u.pathname)
        clearPromptFromStorage()
        setTimeout(() => { if (textareaRef.current) textareaRef.current.focus() }, 0)
    }, [])

  const handledChatIdRef = useRef<string | null>(null)

const handleChatIdChange = useCallback((chatId: string | null, mode?: string | null) => {
    
    setUrlChatId(chatId)
    if ((mode === '3d' || window.location.search.includes('mode=3d')) && chatId) {
        setThreeDLoading(false)
        if (handledChatIdRef.current === chatId) return
        handledChatIdRef.current = chatId

        setChatMode('BUILDER')
        setShowChatInterface(true)
        setBuildMode('3D')
     
        fetch(`/api/chats/${chatId}`)
            .then(r => r.json())
            .then(data => {
                console.log('📦 API RESPONSE', data)
                if (data?.prompt) {
                    setThreeDMessages([
                        { role: 'user', content: data.prompt },
                        { role: 'assistant', content: '✓ Scene was generated. Hit Regenerate to rebuild it.' }
                    ])
                    lastUserPromptRef.current = data.prompt
                    setThreeDSceneId(chatId)
                   const hasHtml =
  typeof data.demo_html === 'string' &&
  data.demo_html.trim().length > 20
console.log('🧠 HTML CHECK', {
  hasHtml,
  length: data?.demo_html?.length,
  preview: data?.demo_html?.slice(0, 30)
})
if (hasHtml) {
    setThreeDHtml(data.demo_html)
    setThreeDLoading(false)  
    return                    
}
// No auto-generate , user can click Regenerate manually if needed
                }
            })
            .catch(() => {})
    }
}, [])

    const [seoAuditResult, setSeoAuditResult] = useState<string | null>(null)
    const [seoAuditLoading, setSeoAuditLoading] = useState(false)
    const [mobileData, setMobileData] = useState<any>(null)
    const [desktopData, setDesktopData] = useState<any>(null)

  const handleAutoPrompt = useCallback((prompt: string, chatId: string, mode?: string) => {
        if (autoPromptFiredRef.current) return
        autoPromptFiredRef.current = true
       if (prompt.startsWith('seo-audit')) {
            const appUrl = `${window.location.origin}/apps/${chatId}`
            setSeoAuditLoading(true); setSeoAuditResult(null)
            fetch('/api/seo-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
  appUrl,
  mode 
}) })
                .then(r => r.json())
                .then(data => { setSeoAuditResult(data.result ?? 'No result received'); setMobileData(data.mobileData ?? null); setDesktopData(data.desktopData ?? null); setSeoAuditLoading(false) })
                .catch(() => { setSeoAuditResult('SEO audit failed. Please try again.'); setSeoAuditLoading(false) })
        }
    }, [])

    useEffect(() => {
        if (textareaRef.current) textareaRef.current.focus()
        const storedData = loadPromptFromStorage()
        if (storedData) {
            setMessage(storedData.message)
            if (storedData.attachments.length > 0) setAttachments(storedData.attachments.map(createImageAttachmentFromStored))
        }
    }, [])

    useEffect(() => {
        if (message.trim() || attachments.length > 0) savePromptToStorage(message, attachments)
        else clearPromptFromStorage()
    }, [message, attachments])

    const handleImageFiles = async (files: File[]) => {
        try {
            const na = await Promise.all(files.map(f => createImageAttachment(f)))
            setAttachments(p => [...p, ...na])
        } catch { }
    }

    const handleRemoveAttachment = (id: string) => setAttachments(p => p.filter(a => a.id !== id))

    // ── 3D scene generation ───────────────────────────────────────────────────
const generate3DScene = async (userMessage: string, existingHtml?: string): Promise<string> => {
    console.log('🔥 GENERATE CALLED', {
  userMessage,
  existingHtml,
  hasHtmlAlready: !!threeDHtml
})
    if (threeDLoading) return '' 
    setThreeDLoading(true)
     
        setShowChatInterface(true)
        setActivePanel('preview')
        lastUserPromptRef.current = userMessage

      let localSceneId = threeDSceneId

if (!localSceneId) {
    localSceneId = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
    setThreeDSceneId(localSceneId)
    } else {
        const newId = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
    localSceneId = newId
    setThreeDSceneId(newId)
}
     

        const isFollowUp = !!existingHtml

        // System prompt passed to blackbox route — will be overridden by the expert prompt there for 3D
      const systemPrompt = `You are an elite creative 3D web designer.

Output ONLY production-ready HTML (Three.js r128).
Focus on cinematic depth, lighting, and composition.

Avoid basic or generic scenes.
Prioritize mood, realism, and spatial depth.

No explanations. Only HTML.
`

   const cleanInput = userMessage.split('\n')[0] 

const userPrompt = `
Create a premium cinematic 3D website for: "${cleanInput}"

Cinematic, minimal, high-end.
Strong depth, smooth motion, realistic lighting.

No clutter.
`

        try {
            const res = await fetch('/api/blackbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
  prompt: userPrompt, 
  systemPrompt,
  isFollowUp 
}),
            })
            const data = await res.json()
           
if (data?.error === 'service_unavailable') {
  setThreeDMessages(prev => [...prev, {
    role: 'assistant',
    content: '__service_down__'
  }])
  setThreeDLoading(false)
  return ''
}

const finishReason = data?.choices?.[0]?.finish_reason
let output = data?.choices?.[0]?.message?.content || ''

            // Strip any markdown wrapping
          output = output
    .replace(/^```html[\r\n]*/i, '')
    .replace(/^```[\r\n]*/i, '')
    .replace(/[\r\n]*```\s*$/i, '')
    .trim()

            // Graceful recovery if truncated at token limit
            if (finishReason === 'length' && output) {
                if (!output.includes('</body>')) output += '\n</body>'
                if (!output.includes('</html>')) output += '\n</html>'
            }

          
setThreeDHtml(output)
            
            const sceneIdToSave = localSceneId
try {
const savedHtml = output

const res = await fetch('/api/chat/ownership', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    chatId: sceneIdToSave, 
    prompt: userMessage,
    demoUrl: `threed://${sceneIdToSave}`,
    demo_html: savedHtml
  }),
})

const result = await res.json()
console.log('💾 SAVE RESPONSE', result)
const currentUrl = new URL(window.location.href)
if (currentUrl.searchParams.get('chatId') !== sceneIdToSave) {
    window.history.replaceState({}, '', `/chat?chatId=${sceneIdToSave}&mode=3d`)
    handledChatIdRef.current = sceneIdToSave 
}
} catch { }
            setThreeDMessages(prev => [...prev, {
                role: 'assistant',
                content: finishReason === 'length'
                    ? '⚠️ Scene generated but hit the token limit — some elements may be cut off. Try a more focused prompt or hit Regenerate.'
                    : isFollowUp
                        ? '✓ Changes applied to the scene.'
                        : '✓ Scene ready — move your mouse to rotate, scroll to zoom.',
            }])
            setThreeDLoading(false) 
            return output
        } catch (e) {
            console.error('3D generation failed', e)
            setThreeDMessages(prev => [...prev, { role: 'assistant', content: 'Generation failed. Please try again.' }])
        }
        setThreeDLoading(false)
        return '' 
    }
   const generate3DSceneRef = useRef(generate3DScene)

useEffect(() => {
    generate3DSceneRef.current = generate3DScene
}, [generate3DScene])   

   const handle3DGenerate = async (userMessage: string) => {
    console.log('👤 USER TRIGGERED GENERATE')
    setThreeDMessages(prev => [...prev, { role: 'user', content: userMessage }])
    await generate3DScene(userMessage) 
}
    const handleRegenerate = async () => {
        console.log('🔁 REGENERATE CLICKED')
        if (!lastUserPromptRef.current || threeDLoading) return
        setThreeDMessages(prev => [...prev, { role: 'user', content: 'Regenerate' }])
        await generate3DScene(lastUserPromptRef.current)
    }

    // ── Main send handler ─────────────────────────────────────────────────────
    const handleSendMessage = async (
        e: React.FormEvent<HTMLFormElement>,
        attachmentUrls?: Array<{ url: string }>,
    ) => {
        e.preventDefault()
        if (!message.trim() || (buildMode === '3D' ? threeDLoading : isLoading)) return
        const userMessage = message.trim()

        if (buildMode === '3D') {
            clearPromptFromStorage(); setMessage(''); setAttachments([])
            await handle3DGenerate(userMessage)
           
            return
        }

        const currentAttachments = attachmentUrls ?? attachments.map(a => ({ url: a.dataUrl }))
        clearPromptFromStorage(); setMessage(''); setAttachments([])
        setShowChatInterface(true); setIsLoading(true)
        await hookHandleSendMessage(userMessage, currentAttachments)
    }

    const handleChatData = async (chatData: { id?: string }) => {
        if (chatData.id) {
            void hookHandleChatData(chatData)
            try { await fetch('/api/chat/ownership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: chatData.id }) }) } catch { }
        }
    }
const getVideoFromPrompt = (prompt?: string) => {
  if (!prompt) return null
  const p = prompt.toLowerCase()
  if (p.includes('landing')) return 'landing-page.mp4'
  if (p.includes('task')) return 'task-management.mp4'
  if (p.includes('dashboard')) return 'dashboard.mp4'
  if (p.includes('blog')) return 'blog.mp4'
  if (p.includes('shop') || p.includes('e-commerce') || p.includes('store')) return 'shop.mp4'
  return null
}
    const handleStreamingComplete = async (finalContent: string | MessageBinaryFormat) => {
        await hookHandleStreamingComplete(finalContent)
    }

    useEffect(() => { if (shouldShowPreview && window.innerWidth < 768) setActivePanel('preview') }, [shouldShowPreview])

    // ── AI_CHAT mode ──────────────────────────────────────────────────────────
    if (chatMode === 'AI_CHAT') {
        return (
            <ChatActionsProvider onSendMessage={msg => hookHandleSendMessage(msg)}>
                <SubscriptionModal open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal} hasActiveSubscription={hasActiveSubscription} currentCredits={credits?.totalCredits ?? 0} currentPlanId={subscription?.plan_id ?? null} />
                <div className="bg-background h-[calc(100vh-48px)] flex flex-col overflow-hidden">
                    <Suspense fallback={null}><SearchParamsHandler onReset={handleReset} onChatIdChange={handleChatIdChange} onAutoPrompt={handleAutoPrompt} /></Suspense>
                    <div className="flex flex-col flex-1 min-h-0">
                        <ResizableLayout className="flex-1 min-h-0" singlePanelMode={!shouldShowPreview} activePanel={activePanel === 'chat' ? 'left' : 'right'}
                            leftPanel={
                                <div className="flex flex-col h-full">
                                    {chatError && chatHistory.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center px-4">
                                            <div className="text-center max-w-sm">
                                                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                                                <h3 className="text-base font-medium text-foreground mb-1">Failed to load chat</h3>
                                                <p className="text-sm text-muted-foreground mb-4">{chatError instanceof Error ? chatError.message : 'Something went wrong.'}</p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => window.location.reload()} className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors')}><RotateCw className="w-3.5 h-3.5" /> Retry</button>
                                                    <button onClick={handleReset} className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors')}>New chat</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : isLoadingChat && chatHistory.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                                <p className="text-sm text-muted-foreground">Loading chat...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {chatHistory.length > 0 && (
                                                <div className="flex items-center justify-end px-3 py-1.5 border-b bg-background/80">
                                                    <ChatExportMenu chatId={urlChatId ?? hookCurrentChat?.id ?? ''} chatType="BUILDER" title={chatHistory.find(m => m.type === 'user')?.content?.toString().slice(0, 60)} messages={chatHistory.filter(m => typeof m.content === 'string').map(m => ({ role: m.type, content: m.content as string }))} disabled={isLoading || isStreaming} />
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-y-auto">
                                                <ChatMessages chatHistory={chatHistory} isLoading={isLoading} isStreaming={isStreaming} currentChat={hookCurrentChat} onStreamingComplete={handleStreamingComplete} onChatData={handleChatData} onStreamingStarted={() => setIsLoading(false)} />
                                            </div>
                                            {isViewingOthersChat ? (
                                                <ForkBanner isAuthenticated={!!session?.user} isForking={forkChat.isPending} onFork={handleFork} onSignIn={() => (window.location.href = '/login')} />
                                            ) : (
                                                <ChatInput message={message} setMessage={setMessage} onSubmit={handleSendMessage} isLoading={isLoading} showSuggestions={false} attachments={attachments} onAttachmentsChange={setAttachments} textareaRef={textareaRef} />
                                            )}
                                        </>
                                    )}
                                </div>
                            }
                            rightPanel={shouldShowPreview ? <PreviewPanel currentChat={hookCurrentChat} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} isBuilding={isLoading || isStreaming} /> : null}
                        />
                        <div className="md:hidden"><BottomToolbar activePanel={activePanel} onPanelChange={setActivePanel} hasPreview={!!hookCurrentChat?.demo} /></div>
                    </div>
                </div>
            </ChatActionsProvider>
        )
    }

    // ── Mode selection ────────────────────────────────────────────────────────
    if (!chatMode) {
        return (
            <div className="bg-background h-[calc(100vh-48px)] flex items-center justify-center">
                <Suspense fallback={null}><SearchParamsHandler onReset={handleReset} onChatIdChange={handleChatIdChange} onAutoPrompt={handleAutoPrompt} /></Suspense>
                <ModeSelection onSelect={mode => { if (mode === 'AI_CHAT') router.push('/ai-chat'); if (mode === 'BUILDER') setChatMode('BUILDER') }} />
            </div>
        )
    }

    // ── 2D Suggestions ────────────────────────────────────────────────────────
    const suggestions = [
      { label: 'Landing Page', text: `Create a modern SaaS landing page.\n\nSections:\n- Hero section with headline, subtext and primary CTA\n- Product screenshot or illustration\n- Features grid (3–6 cards with icons)\n- Pricing section with highlighted recommended plan\n- Testimonials section\n- Conversion-focused footer with links and CTA\n\nDesign Requirements:\n- Clean modern UI\n- Generous whitespace\n- Smooth hover and scroll animations\n- Mobile-first responsive layout`, icon: Layout , videoFile: 'landing-page.mp4' },
        { label: 'Task Management', text: `Build a task management web application with a Kanban-style interface.\n\nFeatures:\n- Sidebar with projects and filters\n- Columns: Todo, In Progress, Done\n- Draggable task cards between columns\n- Task details with title, description and due date\n- Ability to add, edit and delete tasks\n\nUI Requirements:\n- Clean dashboard layout\n- Card based design\n- Responsive interface`, icon: CheckSquare , videoFile: 'task-management.mp4' },
        { label: 'Dashboard', text: `Create an analytics dashboard.\n\nLayout:\n- Left sidebar navigation\n- Top header with search and profile\n\nMain Content:\n- KPI stats cards (Users, Revenue, Growth)\n- Line chart for trends\n- Bar chart for category performance\n- Table for recent activity\n\nDesign:\n- Dark modern UI\n- Clear visual hierarchy\n- Responsive layout`, icon: BarChart3 , videoFile: 'dashboard.mp4' },
        { label: 'Blog', text: `Create a modern blog platform.\n\nPages:\n- Homepage with article cards\n- Article detail page\n- Author profile page\n\nFeatures:\n- Category and tag filtering\n- Search functionality\n- Reading progress indicator\n- Pagination for posts\n\nDesign:\n- Typography-focused layout\n- Clean reading experience\n- Responsive design`, icon: FileText , videoFile: 'blog.mp4' },
        { label: 'Shop', text: `Create an e-commerce store.\n\nPages:\n- Product listing page\n- Product detail page\n- Shopping cart\n- Checkout page\n\nFeatures:\n- Product cards with image, price and rating\n- Add to cart functionality\n- Product variants and quantity selector\n- Order summary and checkout flow\n\nDesign:\n- Clean product grid\n- Mobile responsive layout\n- High-conversion UI patterns`, icon: ShoppingCart , videoFile: 'shop.mp4' },
    ]

    // ── BUILDER mode ──────────────────────────────────────────────────────────
    return (
        <ChatActionsProvider onSendMessage={msg => hookHandleSendMessage(msg)}>
            <EnvVariablesPanel open={envPanelOpen} onOpenChange={setEnvPanelOpen} />
            <div className={cn('bg-background flex flex-col', showChatInterface ? 'h-[calc(100vh-48px)] overflow-hidden' : 'min-h-[calc(100vh-48px)]')}>
                <SubscriptionModal open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal} hasActiveSubscription={hasActiveSubscription} currentCredits={credits?.totalCredits ?? 0} />
                <Suspense fallback={null}><SearchParamsHandler onReset={handleReset} onChatIdChange={handleChatIdChange} onAutoPrompt={handleAutoPrompt} /></Suspense>

                {showChatInterface ? (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <ResizableLayout
                            className="flex-1 min-h-0"
                            singlePanelMode={buildMode === '3D' ? false : !shouldShowPreview}
                            activePanel={activePanel === 'chat' ? 'left' : 'right'}
                            leftPanel={
                                <div className="flex flex-col h-full">
                                    {buildMode === '3D' ? (
                                        <>
                                            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 shrink-0 bg-muted/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                                                        <Box className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-foreground">3D Builder</span>
                                                </div>
                                              
                                            </div>
                                            <ThreeDChatHistory messages={threeDMessages} onRegenerate={handleRegenerate} loading={threeDLoading} />
                                            <div className="border-t border-border/40 shrink-0">
                                                <ChatInput message={message} setMessage={setMessage} onSubmit={handleSendMessage} isLoading={threeDLoading} showSuggestions={false} attachments={attachments} onAttachmentsChange={setAttachments} textareaRef={textareaRef} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 overflow-y-auto min-h-0">
                                                <ChatMessages chatHistory={chatHistory} isLoading={isLoading} isStreaming={isStreaming} currentChat={hookCurrentChat} onStreamingComplete={handleStreamingComplete} onChatData={handleChatData} onStreamingStarted={() => setIsLoading(false)} />
                                            </div>
                                            {isViewingOthersChat ? (
                                                <ForkBanner isAuthenticated={!!session?.user} isForking={forkChat.isPending} onFork={handleFork} onSignIn={() => (window.location.href = '/login')} />
                                            ) : (
                                                <ChatInput message={message} setMessage={setMessage} onSubmit={handleSendMessage} isLoading={isLoading} isStreaming={isStreaming} showSuggestions={false} attachments={attachments} onAttachmentsChange={setAttachments} textareaRef={textareaRef} />
                                            )}
                                        </>
                                    )}
                                </div>
                            }
                            rightPanel={
                                buildMode === '3D' ? (
                                   <ThreeDPreview
  html={threeDHtml}
  loading={threeDLoading}
  isFullscreen={threeDFullscreen}
  setIsFullscreen={setThreeDFullscreen}
  sceneId={threeDSceneId}
  onSeoAudit={handleAutoPrompt}
/>
                                ) : shouldShowPreview ? (
                                                                       <PreviewPanel currentChat={hookCurrentChat} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} isBuilding={false} onSeoAudit={handleAutoPrompt}  
                                 templateVideoFile={
  selectedTemplateVideo ??
  getVideoFromPrompt(
    chatHistory?.find(m => m.type === 'user')?.content?.toString()
  )
} 
onExploreTemplates={() => {  setShowChatInterface(false) }}/>
                                ) : null
                            }
                        />
                        <div className="md:hidden">
                            <BottomToolbar activePanel={activePanel} onPanelChange={setActivePanel} hasPreview={buildMode === '3D' ? true : !!hookCurrentChat?.demo} />
                        </div>
                    </div>
                ) : (
                    // ── Landing / prompt screen ───────────────────────────────
                    <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/10 flex items-center justify-center">
                                <BuildifyLogo size="lg" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Buildify</h1>
                        </div>
                        <p className="text-sm text-muted-foreground/60 text-center mb-10">Describe what you want to build</p>

                        <div className="w-full">
                            <PromptInput onSubmit={handleSendMessage} className="w-full" onImageDrop={handleImageFiles} isDragOver={isDragOver} onDragOver={() => setIsDragOver(true)} onDragLeave={() => setIsDragOver(false)} onDrop={() => setIsDragOver(false)}>
                                <PromptInputImagePreview attachments={attachments} onRemove={handleRemoveAttachment} />
                                <PromptInputTextarea
                                    ref={textareaRef}
                                    onChange={e => setMessage(e.target.value)}
                                    value={message}
                                    placeholder={buildMode === '3D' ? 'Describe the 3D website you want to create...' : 'Describe what you want to build...'}
                                    className="min-h-[100px] text-sm"
                                    disabled={isLoading}
                                />
                                <PromptInputToolbar>
                                    <PromptInputTools>
                                        {buildMode === '2D' && <PromptInputImageButton onImageSelect={handleImageFiles} disabled={isLoading} />}
                                        {buildMode === '2D' && (
                                            <button type="button" onClick={() => setEnvPanelOpen(true)} title="Environment variables" className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                                                <KeyRound className="size-4" />
                                                {variables.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">{variables.length}</span>}
                                            </button>
                                        )}
                                        <div
                                            className="flex items-center rounded-lg border border-border/40 bg-muted/20 ml-1"
                                            style={{ padding: '2px', gap: '1px' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setBuildMode('2D')}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200',
                                                    buildMode === '2D'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <Layout className="w-3 h-3" />
                                                2D UI
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBuildMode('3D')}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200',
                                                    buildMode === '3D'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <Box className="w-3 h-3" />
                                                3D Scene
                                            </button>
                                        </div>
                                    </PromptInputTools>
                                    <PromptInputTools>
                                        <PromptInputMicButton onTranscript={t => { setMicError(null); setMessage(p => p + (p ? ' ' : '') + t) }} onError={err => { setMicError(err); setTimeout(() => setMicError(null), 5000) }} disabled={isLoading} />
                                        <PromptInputSubmit disabled={!message.trim() || (buildMode === '3D' ? threeDLoading : isLoading)} status={(buildMode === '3D' ? threeDLoading : isLoading) ? 'streaming' : 'ready'} />
                                    </PromptInputTools>
                                </PromptInputToolbar>
                            </PromptInput>
                            {micError && <p className="mt-2 text-xs text-destructive animate-in fade-in">{micError}</p>}
                        </div>

                        <div className="mt-3 w-full">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {buildMode === '2D'
                                    ? suggestions.map(s => {
                                        const Icon = s.icon
                                        return (
                                            <button key={s.label} onClick={() => { setMessage(s.text); setSelectedTemplateVideo(s.videoFile ?? null) }} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted/60 border border-border/40 hover:border-border/60 text-xs text-muted-foreground hover:text-foreground transition-all duration-200')}>
                                                <Icon className="size-3 shrink-0" />
                                                {s.label}
                                            </button>
                                        )
                                    })
                                    : threeDTemplates.map(t => {
                                        const Icon = t.icon
                                        return (
                                            <button key={t.label} onClick={() => setMessage(t.prompt)} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted/60 border border-border/40 hover:border-border/60 text-xs text-muted-foreground hover:text-foreground transition-all duration-200')}>
                                                <Icon className="size-3 shrink-0" />
                                                {t.label}
                                            </button>
                                        )
                                    })
                                }
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground/40 text-center mt-5">
                            Press <kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 text-[10px] font-mono">Enter</kbd> to send
                        </p>
                    </div>
                )}

                {!showChatInterface && (
                    <div className="px-4 sm:px-6 lg:px-8 pb-12">
                        <div className="max-w-5xl w-full mx-auto">
                            <CommunityBuildsGrid />
                        </div>
                    </div>
                )}
            </div>

            {(seoAuditLoading || seoAuditResult) && (
                <DraggableSeoPanel loading={seoAuditLoading} result={seoAuditResult} mobileData={mobileData} desktopData={desktopData}
                    onClose={() => { setSeoAuditResult(null); setSeoAuditLoading(false); setMobileData(null); setDesktopData(null); autoPromptFiredRef.current = false }}
                />
            )}
        </ChatActionsProvider>
    )
}
