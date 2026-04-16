"use client";

// src/app/video-gen/page.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import { Player } from "@remotion/player";
import { toast } from "sonner";
import {
  Clapperboard, Loader2, RotateCcw, Sparkles,
  ChevronDown, ChevronUp, Clock, Layers, Film,
  Mic, Music, Volume2, ImagePlus, X, Upload,
  CheckCircle2, AlertCircle, History, Download,
  SendHorizonal, MessageSquarePlus, RefreshCw,
  AlertTriangle, Pencil, Trash2, User, Bot, Zap,
} from "lucide-react";
import {
  useGenerateVideo,
  useUploadUserImages,
  useDownloadVideo,
  useVideoChats,
  useVideoChat,
  useRenameVideoChat,
  proxyS3Urls,
  type VideoMeta,
  type GenerateVideoOptions,
  type UserImageEntry,
  type UploadedUserImage,
  type VideoChatSummary,
} from "@/client-api/query-hooks/use-video-hooks";

import { VideoComposition } from "@/remotion-src/VideoComposition";
import type { VideoJson } from "@/remotion-src/types";
import { SubscriptionModal } from "@/components/payments/subscription-modal";
import { useUserCredits } from "@/hooks/use-user-credits";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_RANGES = [
  { label: "0–10s", value: 10, seconds: 7 },
  { label: "10–20s", value: 20, seconds: 16 },
  { label: "20–30s", value: 30, seconds: 25 },
] as const;

type DurationRange = typeof DURATION_RANGES[number];

const MUSIC_GENRES = [
  { label: "Corporate", value: "corporate" },
  { label: "Cinematic", value: "cinematic" },
  { label: "Upbeat", value: "upbeat" },
  { label: "Lo-fi", value: "lofi" },
] as const;

const EXAMPLE_PROMPTS = [
  "Explain photosynthesis in 3 scenes with a clean educational style",
  "A bold product launch for a new AI startup",
  "The water cycle with dark gradients and smooth animations",
  "A motivational quote video with gold accents on black",
] as const;

const MAX_USER_IMAGES = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserImageEntryWithPreview extends UserImageEntry {
  id: string;
  previewUrl: string;
}

// Chat message types for the conversation view
interface PromptMessage {
  type: "prompt";
  text: string;
  sentAt: string;
}

// Only ONE video message exists at a time — it's always the latest rendered video.
// This is stored separately in `latestVideoData`, not in chatMessages.
interface ErrorMessage {
  type: "error";
  text: string;
  promptText: string; // the prompt that failed, for retry
  sentAt: string;
}

type ChatMessage = PromptMessage | ErrorMessage;

// The single source of truth for the current rendered video
interface LatestVideoData {
  videoJson: VideoJson;
  meta: VideoMeta;
  uploadedImages: UploadedUserImage[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the server responded with INSUFFICIENT_CREDITS */
function isInsufficientCreditsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // The mutation throws with the server's error message which contains the code
  // via the fetch wrapper in use-video-hooks. We also check for the HTTP 402 text
  // that some wrappers surface.
  return (
    err.message.includes("INSUFFICIENT_CREDITS") ||
    err.message.toLowerCase().includes("enough credits") ||
    err.message.includes("402")
  );
}

// ─── Credit limit banner ──────────────────────────────────────────────────────

function CreditLimitBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <p className="text-[11px] font-mono text-amber-500/80">
          Not enough credits to generate a video
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-amber-500/30 text-[10px] font-mono text-amber-500 hover:bg-amber-500/10 transition-all shrink-0 font-semibold"
      >
        Upgrade ↗
      </button>
    </div>
  );
}

// ─── Credits pill ─────────────────────────────────────────────────────────────

function CreditsPill({
  totalCredits,
  onUpgrade,
}: {
  totalCredits: number;
  onUpgrade: () => void;
}) {
  const isLow = totalCredits <= 2;
  return (
    <button
      onClick={onUpgrade}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-mono transition-all ${
        isLow
          ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title="Manage credits"
    >
      <Zap className="h-3.5 w-3.5" />
      <span className="tabular-nums">{totalCredits}</span>
    </button>
  );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────

function ExportModal({
  open,
  progress,
  onClose,
  isComplete,
}: {
  open: boolean;
  progress: number | null;
  onClose: () => void;
  isComplete: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={isComplete ? onClose : undefined}
      />
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-sans font-semibold text-foreground">
                {isComplete ? "Export complete!" : "Exporting video…"}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/60">
                {isComplete ? "Your MP4 download has started" : "Rendering in your browser"}
              </p>
            </div>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isComplete && (
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground/50">
                Rendering frames…
              </span>
              <span className="text-[10px] font-mono text-primary tabular-nums font-bold">
                {Math.round((progress ?? 0) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Warning / success message */}
        {!isComplete ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-amber-500/80 leading-relaxed">
              <strong className="text-amber-500">Do not close this tab</strong> until the export
              completes. Closing the tab will cancel the render and you'll need to start over.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-emerald-500/80 leading-relaxed">
              Your video has been saved to your downloads folder.
            </p>
          </div>
        )}

        {isComplete && (
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 transition-all"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ImageManager ─────────────────────────────────────────────────────────────

function ImageManager({
  existingImages,
  newEntries,
  onExistingChange,
  onNewEntriesChange,
  disabled,
}: {
  existingImages: UploadedUserImage[];
  newEntries: UserImageEntryWithPreview[];
  onExistingChange: (images: UploadedUserImage[]) => void;
  onNewEntriesChange: (entries: UserImageEntryWithPreview[]) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalSlots = existingImages.length + newEntries.length;
  const canAddMore = totalSlots < MAX_USER_IMAGES;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = MAX_USER_IMAGES - totalSlots;
      const toAdd = Array.from(files).slice(0, remaining);
      const newItems: UserImageEntryWithPreview[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        description: "",
        previewUrl: URL.createObjectURL(file),
      }));
      onNewEntriesChange([...newEntries, ...newItems]);
    },
    [totalSlots, newEntries, onNewEntriesChange],
  );

  const handleDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      handleFiles(ev.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeExisting = (url: string) => {
    onExistingChange(existingImages.filter((img) => img.url !== url));
  };

  const removeNew = (id: string) => {
    const entry = newEntries.find((e) => e.id === id);
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    onNewEntriesChange(newEntries.filter((e) => e.id !== id));
  };

  const updateExistingDescription = (url: string, desc: string) => {
    onExistingChange(
      existingImages.map((img) =>
        img.url === url ? { ...img, description: desc } : img,
      ),
    );
  };

  const updateNewDescription = (id: string, desc: string) => {
    onNewEntriesChange(
      newEntries.map((e) => (e.id === id ? { ...e, description: desc } : e)),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[11px] font-mono text-muted-foreground">
            Images
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/40 border border-border rounded-full px-1.5 py-0.5">
            {totalSlots}/{MAX_USER_IMAGES}
          </span>
        </div>
      </div>

      {/* Existing images */}
      {existingImages.map((img, i) => (
        <div
          key={img.url}
          className="flex items-start gap-2.5 p-2 rounded-lg border border-border bg-muted/20"
        >
          <div className="shrink-0 w-14 h-10 rounded-md overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.description || `Image ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono text-muted-foreground/40 mb-1">
              Existing · #{img.index + 1}
            </p>
            {editingId === img.url ? (
              <input
                type="text"
                value={img.description}
                onChange={(e) => updateExistingDescription(img.url, e.target.value)}
                onBlur={() => setEditingId(null)}
                autoFocus
                maxLength={120}
                disabled={disabled}
                className="w-full h-7 px-2 rounded-md border border-primary/50 bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
              />
            ) : (
              <p className="text-[11px] font-mono text-foreground/70 truncate">
                {img.description || <span className="text-muted-foreground/30 italic">No description</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditingId(editingId === img.url ? null : img.url)}
              disabled={disabled}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
              aria-label="Edit description"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => removeExisting(img.url)}
              disabled={disabled}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-40"
              aria-label="Remove image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      {/* New entries */}
      {newEntries.map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 p-2 rounded-lg border border-primary/20 bg-primary/5"
        >
          <div className="shrink-0 w-14 h-10 rounded-md overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.previewUrl}
              alt={entry.description || `New ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono text-primary/50 mb-1">New</p>
            <input
              type="text"
              value={entry.description}
              onChange={(e) => updateNewDescription(entry.id, e.target.value)}
              placeholder={`e.g. "Our product on a wooden desk"`}
              maxLength={120}
              disabled={disabled}
              className="w-full h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/50 disabled:opacity-40"
            />
          </div>
          <button
            type="button"
            onClick={() => removeNew(entry.id)}
            disabled={disabled}
            className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-40"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Drop zone */}
      {canAddMore && (
        <div
          className={`relative border border-dashed border-border rounded-lg p-4 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[10px] font-mono text-muted-foreground/50">
            Drop images here or{" "}
            <span className="text-primary/70 underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-[9px] font-mono text-muted-foreground/30 mt-0.5">
            JPEG, PNG, WebP · max 5 MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled}
          />
        </div>
      )}

      {!canAddMore && (
        <p className="text-[9px] font-mono text-muted-foreground/40 leading-relaxed">
          Maximum {MAX_USER_IMAGES} images reached. Remove an image to add a new one.
        </p>
      )}
    </div>
  );
}

// ─── VideoHistoryPanel ────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function HistoryChatRow({
  chat,
  isActive,
  onClick,
  onRename,
}: {
  chat: VideoChatSummary;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title ?? "");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-0.5 border group ${
        isActive
          ? "bg-primary/10 border-primary/20"
          : "hover:bg-muted/50 border-transparent hover:border-border/50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        {editing ? (
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { onRename(chat.id, draft); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(chat.id, draft); setEditing(false); }
              if (e.key === "Escape") { setDraft(chat.title ?? ""); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] font-mono rounded-full px-2 py-0.5 border border-primary/50 bg-background text-primary focus:outline-none w-full max-w-[130px]"
          />
        ) : (
          <>
            <span className={`text-[9px] font-mono rounded-full px-2 py-0.5 border truncate max-w-[120px] ${isActive ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground/60 bg-muted border-border"}`}>
              {chat.title ?? "Untitled"}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDraft(chat.title ?? ""); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-all shrink-0 ml-1"
              aria-label="Rename"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </>
        )}
        <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums shrink-0 ml-1">
          {formatRelativeTime(chat.updatedAt)}
        </span>
      </div>
      {chat.lastPrompt && (
        <p
          className={`text-[11px] font-mono leading-relaxed line-clamp-2 ${
            isActive ? "text-primary/80" : "text-muted-foreground"
          }`}
        >
          {chat.lastPrompt}
        </p>
      )}
    </button>
  );
}

function VideoHistoryPanel({
  open,
  onClose,
  activeChatId,
  onSelectChat,
}: {
  open: boolean;
  onClose: () => void;
  activeChatId: string | null;
  onSelectChat: (chat: VideoChatSummary) => void;
}) {
  const { data: chats, isLoading, isError } = useVideoChats();
  const { mutate: renameChat } = useRenameVideoChat();
  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const panelContent = (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            Video history
          </span>
          {chats && chats.length > 0 && (
            <span className="text-[9px] font-mono text-muted-foreground/40 border border-border rounded-full px-1.5 py-0.5 tabular-nums">
              {chats.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
          aria-label="Close history panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-muted-foreground/40 animate-spin" />
          </div>
        )}
        {isError && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground/40">Failed to load history</p>
          </div>
        )}
        {!isLoading && !isError && chats?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Film className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/40 text-center leading-relaxed">
              No videos yet.<br />Generate your first one!
            </p>
          </div>
        )}
        {!isLoading && chats && chats.length > 0 && (
          <div>
            {chats.map((chat) => (
              <HistoryChatRow
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                onClick={() => { onSelectChat(chat); onClose(); }}
                onRename={(id, title) => renameChat({ id, title })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden sm:block fixed inset-0 z-40 transition-all duration-200 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-background border-r border-border shadow-lg transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          {panelContent}
        </div>
      </div>

      {/* Mobile bottom drawer */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-all duration-200 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-background/70 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-x border-border transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
          style={{ maxHeight: "72vh" }}
        >
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          {panelContent}
        </div>
      </div>
    </>
  );
}

// ─── VideoPanel ───────────────────────────────────────────────────────────────
// The single rendered video shown at the bottom of the chat thread.

function VideoPanel({
  data,
  onExport,
  isDownloading,
  downloadProgress,
  ttsVolume,
  musicVolume,
  onTtsVolumeChange,
  onMusicVolumeChange,
}: {
  data: LatestVideoData;
  onExport: () => void;
  isDownloading: boolean;
  downloadProgress: number | null;
  ttsVolume: number;
  musicVolume: number;
  onTtsVolumeChange: (v: number) => void;
  onMusicVolumeChange: (v: number) => void;
}) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const { videoJson, meta, uploadedImages } = data;

  return (
    <div className="space-y-3">
      {/* Meta row */}
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { icon: Layers, label: "scenes", value: meta.scenes },
            { icon: Clock, label: "sec", value: meta.durationSeconds.toFixed(1) },
            { icon: Film, label: "frames", value: meta.totalFrames },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-xs font-mono font-bold text-foreground tabular-nums">{value}</span>
              <span className="text-[9px] font-mono text-muted-foreground/50">{label}</span>
            </div>
          ))}
          <div className="flex gap-1 ml-auto flex-wrap justify-end">
            {uploadedImages.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <ImagePlus className="h-2.5 w-2.5" /> {uploadedImages.length}
              </span>
            )}
            {videoJson.scenes?.some((s: any) => s.ttsUrl) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <Mic className="h-2.5 w-2.5" /> TTS
              </span>
            )}
            {videoJson.bgmUrl && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <Music className="h-2.5 w-2.5" /> BGM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remotion Player */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <Player
          component={VideoComposition}
          inputProps={{ videoJson }}
          durationInFrames={videoJson.duration}
          fps={videoJson.fps ?? 30}
          compositionWidth={videoJson.width ?? 1280}
          compositionHeight={videoJson.height ?? 720}
          style={{ width: "100%", aspectRatio: "16/9" }}
          controls
          autoPlay
          loop
        />
      </div>

      {/* Volume controls */}
      {(videoJson.scenes?.some((s: any) => s.ttsUrl) || videoJson.bgmUrl) && (
        <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
          <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            Adjust volumes
          </p>
          {videoJson.scenes?.some((s: any) => s.ttsUrl) && (
            <div className="flex items-center gap-3">
              <Mic className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">Narration</span>
              <input
                type="range" min="0" max="1" step="0.05" value={ttsVolume}
                onChange={(e) => onTtsVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                {Math.round(ttsVolume * 100)}%
              </span>
            </div>
          )}
          {videoJson.bgmUrl && (
            <div className="flex items-center gap-3">
              <Music className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">Music</span>
              <input
                type="range" min="0" max="1" step="0.05" value={musicVolume}
                onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Export button */}
      <button
        type="button"
        onClick={onExport}
        disabled={isDownloading}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-border bg-muted/20 text-[11px] font-mono text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting…</>
        ) : (
          <><Download className="h-3.5 w-3.5" /> Export MP4</>
        )}
      </button>

      {/* JSON debug panel */}
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setJsonOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            Generated JSON
          </span>
          {jsonOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
        </button>
        {jsonOpen && (
          <pre className="border-t border-border px-4 py-4 text-[10px] font-mono text-muted-foreground/50 overflow-auto max-h-48 leading-relaxed bg-background/50">
            {JSON.stringify(videoJson, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── FollowUpInput ────────────────────────────────────────────────────────────

function FollowUpInput({
  isBusy,
  isOutOfCredits,
  uploadedImages,
  selectedRange,
  onRangeChange,
  onSubmit,
  lastFailedPrompt,
  onRetry,
  onUpgrade,
}: {
  isBusy: boolean;
  isOutOfCredits: boolean;
  uploadedImages: UploadedUserImage[];
  selectedRange: DurationRange;
  onRangeChange: (range: DurationRange) => void;
  onSubmit: (params: {
    followUpPrompt: string;
    editedExistingImages: UploadedUserImage[];
    newImageEntries: UserImageEntryWithPreview[];
    options: GenerateVideoOptions;
    duration: number;
  }) => Promise<void>;
  lastFailedPrompt: string | null;
  onRetry: () => void;
  onUpgrade: () => void;
}) {
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  // Audio state
  const [useTTS, setUseTTS] = useState(true);
  const [useMusic, setUseMusic] = useState(true);
  const [musicGenre, setMusicGenre] = useState("corporate");
  const [voiceId, setVoiceId] = useState("devansh");
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);

  // Image state — mirror of existing images that user can edit/remove
  const [editedExistingImages, setEditedExistingImages] = useState<UploadedUserImage[]>(uploadedImages);
  const [newImageEntries, setNewImageEntries] = useState<UserImageEntryWithPreview[]>([]);

  // Keep edited images in sync when uploadedImages prop changes (e.g. on new generation)
  useEffect(() => {
    setEditedExistingImages(uploadedImages);
  }, [uploadedImages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpPrompt.trim() || isBusy || isOutOfCredits) return;

    const options: GenerateVideoOptions = {
      useTTS, useMusic, ttsVolume, musicVolume,
      ...(useTTS && { voiceId }),
      ...(useMusic && { musicGenre }),
    };
    await onSubmit({
      followUpPrompt,
      editedExistingImages,
      newImageEntries,
      options,
      duration: selectedRange.seconds,
    });
    setFollowUpPrompt("");
    setNewImageEntries([]);
    setOptionsOpen(false);
    setImagesOpen(false);
  }

  const hasImageChanges =
    newImageEntries.length > 0 ||
    editedExistingImages.length !== uploadedImages.length ||
    editedExistingImages.some((img, i) => img.description !== uploadedImages[i]?.description);

  return (
    <div className="space-y-3">
      {/* Credit limit banner — shown above the follow-up input when out of credits */}
      {isOutOfCredits && (
        <CreditLimitBanner onUpgrade={onUpgrade} />
      )}

      {/* Retry banner */}
      {lastFailedPrompt && !isBusy && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-[11px] font-mono text-red-500/80 truncate">
              Last generation failed
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-red-500/30 text-[10px] font-mono text-red-500 hover:bg-red-500/10 transition-all shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Input card */}
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <MessageSquarePlus className="h-3.5 w-3.5 text-primary/60" />
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
            Follow-up
          </span>
        </div>

        {/* Textarea */}
        <form onSubmit={handleSubmit}>
          <div className="relative px-4">
            <textarea
              ref={textareaRef}
              value={followUpPrompt}
              onChange={(e) => setFollowUpPrompt(e.target.value)}
              placeholder="e.g. Make the second scene darker, add a voiceover about climate…"
              rows={3}
              disabled={isBusy || isOutOfCredits}
              className="w-full px-0 pt-1 pb-6 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none disabled:opacity-40 border-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
              }}
            />
            <span className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground/25 tabular-nums">
              {followUpPrompt.length}/2000
            </span>
          </div>

          {/* Duration + submit row */}
          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest shrink-0 hidden sm:block">
                Duration
              </span>
              <div className="flex gap-1" role="group">
                {DURATION_RANGES.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => onRangeChange(range)}
                    aria-pressed={selectedRange.value === range.value}
                    className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all touch-manipulation ${
                      selectedRange.value === range.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={!followUpPrompt.trim() || isBusy || isOutOfCredits}
              className="inline-flex items-center justify-center gap-2 px-4 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0"
            >
              {isBusy ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Updating…</span></>
              ) : (
                <><SendHorizonal className="h-3.5 w-3.5" /><span className="hidden sm:inline">Update</span></>
              )}
            </button>
          </div>
        </form>

        {/* Images panel */}
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setImagesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImagePlus className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Images
              </span>
              {(editedExistingImages.length > 0 || newImageEntries.length > 0) && (
                <span className={`text-[9px] font-mono rounded-full px-1.5 py-0.5 border ${
                  hasImageChanges
                    ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-primary bg-primary/10 border-primary/20"
                }`}>
                  {editedExistingImages.length + newImageEntries.length}
                  {hasImageChanges && " · edited"}
                </span>
              )}
            </div>
            {imagesOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </button>
          {imagesOpen && (
            <div className="px-4 pb-4 border-t border-border bg-muted/10">
              <div className="pt-3">
                <ImageManager
                  existingImages={editedExistingImages}
                  newEntries={newImageEntries}
                  onExistingChange={setEditedExistingImages}
                  onNewEntriesChange={setNewImageEntries}
                  disabled={isBusy}
                />
              </div>
            </div>
          )}
        </div>

        {/* Audio options panel */}
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Audio
              </span>
              <div className="flex gap-1">
                {useTTS && (
                  <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">TTS</span>
                )}
                {useMusic && (
                  <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">Music</span>
                )}
              </div>
            </div>
            {optionsOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </button>

          {optionsOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/10">
              {/* TTS */}
              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[11px] font-mono text-muted-foreground">Narration (TTS)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseTTS((v) => !v)}
                    className={`relative h-5 w-9 rounded-full border transition-all ${useTTS ? "bg-primary border-primary" : "bg-muted border-border"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${useTTS ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                {useTTS && (
                  <>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Voice</span>
                      <input type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="devansh" className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50" />
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                      <input type="range" min="0" max="1" step="0.05" value={ttsVolume} onChange={(e) => setTtsVolume(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">{Math.round(ttsVolume * 100)}%</span>
                    </div>
                  </>
                )}
              </div>
              {/* Music */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-[11px] font-mono text-muted-foreground">Background music</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseMusic((v) => !v)}
                    className={`relative h-5 w-9 rounded-full border transition-all ${useMusic ? "bg-primary border-primary" : "bg-muted border-border"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${useMusic ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                {useMusic && (
                  <>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Genre</span>
                      <div className="flex gap-1 flex-wrap">
                        {MUSIC_GENRES.map((g) => (
                          <button key={g.value} type="button" onClick={() => setMusicGenre(g.value)} className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${musicGenre === g.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{g.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                      <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">{Math.round(musicVolume * 100)}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedRange, setSelectedRange] = useState<DurationRange>(DURATION_RANGES[1]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  // Chat messages — only prompt and error messages. Video is stored separately.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  // The single latest rendered video — replaced on every successful generation.
  // null = no video yet. On follow-up failure this is NOT changed.
  const [latestVideoData, setLatestVideoData] = useState<LatestVideoData | null>(null);
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);

  // Image upload state (for initial prompt)
  const [userImageEntries, setUserImageEntries] = useState<UserImageEntryWithPreview[]>([]);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedImages, setUploadedImages] = useState<UploadedUserImage[]>([]);
  const [imageSessionId, setImageSessionId] = useState<string | undefined>();

  // Audio options (initial prompt)
  const [useTTS, setUseTTS] = useState(true);
  const [useMusic, setUseMusic] = useState(true);
  const [musicGenre, setMusicGenre] = useState("corporate");
  const [voiceId, setVoiceId] = useState("devansh");
  const [ttsVolume0, setTtsVolume0] = useState(0.8);
  const [musicVolume0, setMusicVolume0] = useState(0.3);

  // Export modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false);

  // Last failed prompt for retry
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [lastFailedOptions, setLastFailedOptions] = useState<GenerateVideoOptions | null>(null);

  // History loading
  const [loadingHistoryChatId, setLoadingHistoryChatId] = useState<string | null>(null);
  const appliedHistoryChatIdRef = useRef<string | null>(null);

  // ── Subscription modal ─────────────────────────────────────────────────────
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  // useUserCredits returns { credits, subscription, hasActiveSubscription, isLoading, error, refetch }
  // where credits is UserCredits | null (with subscriptionCredits, additionalCredits, totalCredits)
  const { credits: userCredits, hasActiveSubscription, subscription } = useUserCredits();

  // Derived credit state — credits is null while loading or unauthenticated
  const isOutOfCredits = userCredits !== null && userCredits.totalCredits <= 0;

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: generate, isPending: isGenerating } = useGenerateVideo();
  const { mutateAsync: uploadImages, isPending: isUploading } = useUploadUserImages();
  const { mutate: downloadVideo, isPending: isDownloading } = useDownloadVideo();

  const { data: historyChatDetail, isLoading: isLoadingHistoryChat, isError: isHistoryChatError } =
    useVideoChat(loadingHistoryChatId);

  const isBusy = isGenerating || isUploading;
  const hasResult = latestVideoData !== null;

  // Scroll to bottom when messages change or video appears
  useEffect(() => {
    if (chatMessages.length > 0 || latestVideoData) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatMessages.length, latestVideoData]);

  // Apply history chat detail
  if (
    historyChatDetail &&
    loadingHistoryChatId &&
    appliedHistoryChatIdRef.current !== loadingHistoryChatId
  ) {
    appliedHistoryChatIdRef.current = loadingHistoryChatId;
    const vj = historyChatDetail.videoJson;
    const fps = vj.fps ?? 30;
    const meta: VideoMeta = {
      scenes: vj.scenes.length,
      totalFrames: vj.duration,
      durationSeconds: parseFloat((vj.duration / fps).toFixed(1)),
    };

    // Reconstruct chat messages (prompts only) from prompt history
    const msgs: ChatMessage[] = [];
    const prompts = historyChatDetail.prompts ?? [];
    for (const p of prompts) {
      if (!p) continue;
      msgs.push({
        type: "prompt",
        text: p.prompt ?? "",
        sentAt: p.sentAt ?? new Date().toISOString(),
      });
    }

    setChatMessages(msgs);

    // Set the single latest video
    setLatestVideoData({
      videoJson: vj,
      meta,
      uploadedImages: historyChatDetail.userImages ?? [],
    });

    setUploadedImages(historyChatDetail.userImages ?? []);

    if (historyChatDetail.options) {
      const opts = historyChatDetail.options;
      if (typeof opts.ttsVolume === "number") setTtsVolume(opts.ttsVolume as number);
      if (typeof opts.musicVolume === "number") setMusicVolume(opts.musicVolume as number);
    }

    setLoadingHistoryChatId(null);
  }

  // ── Shared credit-error handler ────────────────────────────────────────────
  // Called from both initial and follow-up generation error paths.
  function handleGenerationError(err: unknown, promptText: string) {
    if (isInsufficientCreditsError(err)) {
      // Don't add an error bubble — open the subscription modal directly.
      setSubscriptionModalOpen(true);
      toast.error("Not enough credits — please top up to continue.");
      return;
    }
    const errMsg = err instanceof Error ? (err.message ?? "Failed to generate video") : "Failed to generate video";
    toast.error(errMsg);
    setChatMessages((prev) => [
      ...prev,
      { type: "error", text: errMsg, promptText, sentAt: new Date().toISOString() },
    ]);
    setLastFailedPrompt(promptText);
    setLastFailedOptions(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isBusy || isOutOfCredits) return;

    const promptText = prompt.trim();
    const options: GenerateVideoOptions = {
      useTTS, useMusic, ttsVolume: ttsVolume0, musicVolume: musicVolume0,
      ...(useTTS && { voiceId }),
      ...(useMusic && { musicGenre }),
    };

    // Add user message immediately
    const sentAt = new Date().toISOString();
    setChatMessages((prev) => [...prev, { type: "prompt", text: promptText, sentAt }]);
    setPrompt("");

    let resolvedUserImages = uploadedImages;
    let resolvedSessionId = imageSessionId;

    if (userImageEntries.length > 0 && uploadStep !== "done") {
      setUploadStep("uploading");
      try {
        const result = await uploadImages(userImageEntries);
        setUploadedImages(result.images);
        setImageSessionId(result.sessionId);
        setUploadStep("done");
        resolvedUserImages = result.images;
        resolvedSessionId = result.sessionId;
        toast.success(`Uploaded ${result.images.length} image${result.images.length !== 1 ? "s" : ""}`);
      } catch (err) {
        setUploadStep("error");
        const errMsg = err instanceof Error ? err.message : "Image upload failed";
        toast.error(errMsg);
        setChatMessages((prev) => [
          ...prev,
          { type: "error", text: errMsg, promptText, sentAt: new Date().toISOString() },
        ]);
        setLastFailedPrompt(promptText);
        setLastFailedOptions(options);
        return;
      }
    }

    setLastFailedPrompt(null);

    generate(
      {
        prompt: promptText,
        duration: selectedRange.seconds,
        options,
        chatId: chatId ?? null,
        userImages: resolvedUserImages.length > 0 ? resolvedUserImages : undefined,
        imageSessionId: resolvedSessionId,
      },
      {
        onSuccess: (data) => {
          setChatId(data.chatId);
          const fps = data.videoJson.fps ?? 30;
          setLatestVideoData({
            videoJson: proxyS3Urls(data.videoJson),
            meta: data.meta,
            uploadedImages: resolvedUserImages,
          });
          setTtsVolume(options.ttsVolume ?? 0.8);
          setMusicVolume(options.musicVolume ?? 0.3);
          toast.success(`Generated ${data.meta.scenes} scenes`);
        },
        onError: (err) => {
          handleGenerationError(err, promptText);
        },
      },
    );
  }

  async function handleFollowUp({
    followUpPrompt,
    editedExistingImages,
    newImageEntries,
    options,
    duration,
  }: {
    followUpPrompt: string;
    editedExistingImages: UploadedUserImage[];
    newImageEntries: UserImageEntryWithPreview[];
    options: GenerateVideoOptions;
    duration: number;
  }) {
    // Guard: follow-ups require an existing chat
    if (!chatId) return;

    const sentAt = new Date().toISOString();
    setChatMessages((prev) => [...prev, { type: "prompt", text: followUpPrompt, sentAt }]);
    setLastFailedPrompt(null);

    let resolvedNewImages: UploadedUserImage[] = [];
    let resolvedNewSessionId: string | undefined;

    if (newImageEntries.length > 0) {
      try {
        const result = await uploadImages(newImageEntries);
        resolvedNewImages = result.images;
        resolvedNewSessionId = result.sessionId;
        toast.success(`Uploaded ${result.images.length} image${result.images.length !== 1 ? "s" : ""}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Image upload failed";
        toast.error(errMsg);
        // Add error message but do NOT clear or replace the existing video
        setChatMessages((prev) => [
          ...prev,
          { type: "error", text: errMsg, promptText: followUpPrompt, sentAt: new Date().toISOString() },
        ]);
        setLastFailedPrompt(followUpPrompt);
        setLastFailedOptions(options);
        return;
      }
    }

    const mergedImages: UploadedUserImage[] = [...editedExistingImages, ...resolvedNewImages];

    generate(
      {
        prompt: followUpPrompt.trim(),
        duration,
        options,
        // Always pass the existing chatId — server will append to existing chat
        chatId,
        userImages: mergedImages.length > 0 ? mergedImages : undefined,
        imageSessionId: resolvedNewSessionId ?? imageSessionId,
      },
      {
        onSuccess: (data) => {
          // Replace the single video — same chatId, no new chat created
          setLatestVideoData({
            videoJson: proxyS3Urls(data.videoJson),
            meta: data.meta,
            uploadedImages: mergedImages,
          });
          setTtsVolume(options.ttsVolume ?? 0.8);
          setMusicVolume(options.musicVolume ?? 0.3);
          if (mergedImages.length > 0) setUploadedImages(mergedImages);
          if (resolvedNewSessionId) setImageSessionId(resolvedNewSessionId);
          toast.success(`Updated — ${data.meta.scenes} scenes`);
        },
        onError: (err) => {
          handleGenerationError(err, followUpPrompt);
        },
      },
    );
  }

  function handleRetry() {
    if (!lastFailedPrompt) return;
    setPrompt(lastFailedPrompt);
    setLastFailedPrompt(null);
    textareaRef.current?.focus();
  }

  function handleReset() {
    userImageEntries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setChatMessages([]);
    setChatId(null);
    setLatestVideoData(null);
    setPrompt("");
    setSelectedRange(DURATION_RANGES[1]);
    setOptionsOpen(false);
    setImagesOpen(false);
    setTtsVolume0(0.8);
    setMusicVolume0(0.3);
    setTtsVolume(0.8);
    setMusicVolume(0.3);
    setUserImageEntries([]);
    setUploadStep("idle");
    setUploadedImages([]);
    setImageSessionId(undefined);
    setLoadingHistoryChatId(null);
    appliedHistoryChatIdRef.current = null;
    setDownloadProgress(null);
    setExportModalOpen(false);
    setExportComplete(false);
    setLastFailedPrompt(null);
    setLastFailedOptions(null);
  }

  function handleSelectHistoryChat(chat: VideoChatSummary) {
    handleReset();
    setChatId(chat.id);
    if (chat.lastPrompt) setPrompt(chat.lastPrompt);
    setLoadingHistoryChatId(chat.id);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleExport() {
    if (!latestVideoData || isDownloading) return;
    setExportModalOpen(true);
    setExportComplete(false);
    setDownloadProgress(0);
    downloadVideo(
      {
        videoJson: latestVideoData.videoJson,
        onProgress: (p) => setDownloadProgress(p),
      },
      {
        onSuccess: () => {
          setExportComplete(true);
          setDownloadProgress(null);
        },
        onError: (err) => {
          toast.error(err.message ?? "Export failed");
          setExportModalOpen(false);
          setDownloadProgress(null);
        },
      },
    );
  }

  function handleTtsVolumeChange(v: number) {
    setTtsVolume(v);
    setLatestVideoData((prev) => prev ? { ...prev, videoJson: { ...prev.videoJson, ttsVolume: v } } : null);
  }

  function handleMusicVolumeChange(v: number) {
    setMusicVolume(v);
    setLatestVideoData((prev) => prev ? { ...prev, videoJson: { ...prev.videoJson, musicVolume: v } } : null);
  }

  const renderUploadStepBadge = () => {
    if (uploadStep === "idle" || userImageEntries.length === 0) return null;
    if (uploadStep === "uploading") return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Uploading…
      </span>
    );
    if (uploadStep === "done") return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
        <CheckCircle2 className="h-2.5 w-2.5" /> Uploaded
      </span>
    );
    if (uploadStep === "error") return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
        <AlertCircle className="h-2.5 w-2.5" /> Upload failed
      </span>
    );
  };

  return (
    <div className="relative -m-4 w-[calc(100%+2rem)] min-h-screen bg-sidebar">
      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Clapperboard className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-sans font-semibold text-foreground">Video Generator</span>
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5 shrink-0">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Credits pill — tapping opens the subscription modal */}
            {userCredits !== null && (
              <CreditsPill
                totalCredits={userCredits.totalCredits}
                onUpgrade={() => setSubscriptionModalOpen(true)}
              />
            )}
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            {hasResult && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New video</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading history */}
        {isLoadingHistoryChat && chatMessages.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm font-sans font-semibold text-foreground">Loading video…</p>
          </div>
        )}

        {isHistoryChatError && chatMessages.length === 0 && !isLoadingHistoryChat && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
            <p className="text-[11px] font-mono text-muted-foreground/60">Failed to load video. Please try again.</p>
          </div>
        )}

        {/* ── INITIAL INPUT (no messages yet) ── */}
        {!hasResult && chatMessages.length === 0 && !isLoadingHistoryChat && (
          <div className="space-y-3">
            {/* Hero */}
            <div className="text-center space-y-2.5 py-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                prompt to video · remotion powered
              </div>
              <h1 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-foreground">
                Describe your video.{" "}
                <span className="text-muted-foreground/35">We'll build it.</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Type a prompt · AI generates the composition · Preview it instantly
              </p>
            </div>

            {/* Credit limit banner — shown above the input when out of credits */}
            {isOutOfCredits && (
              <CreditLimitBanner onUpgrade={() => setSubscriptionModalOpen(true)} />
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Explain photosynthesis in 3 scenes with a clean educational style"
                    rows={4}
                    disabled={isBusy || isOutOfCredits}
                    className="w-full px-4 pt-4 pb-8 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none disabled:opacity-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
                    }}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground/25 tabular-nums">
                    {prompt.length}/2000
                  </span>
                </div>

                {/* Duration + submit */}
                <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest shrink-0 hidden sm:block">
                      Duration
                    </span>
                    <div className="flex gap-1" role="group">
                      {DURATION_RANGES.map((range) => (
                        <button
                          key={range.value}
                          type="button"
                          onClick={() => setSelectedRange(range)}
                          aria-pressed={selectedRange.value === range.value}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-md border transition-all touch-manipulation ${selectedRange.value === range.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isBusy || isOutOfCredits}
                    className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0"
                  >
                    {isUploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Uploading…</span></>
                    ) : isGenerating ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">Generating…</span></>
                    ) : (
                      <><Film className="h-3.5 w-3.5" /><span className="hidden sm:inline">Generate</span></>
                    )}
                  </button>
                </div>

                {/* Images */}
                <div className="border-t border-border">
                  <button type="button" onClick={() => setImagesOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Your images</span>
                      {userImageEntries.length > 0 && (
                        <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">{userImageEntries.length}</span>
                      )}
                      {renderUploadStepBadge()}
                    </div>
                    {imagesOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </button>
                  {imagesOpen && (
                    <div className="px-4 pb-4 border-t border-border bg-muted/10">
                      <div className="pt-3">
                        <ImageManager
                          existingImages={[]}
                          newEntries={userImageEntries}
                          onExistingChange={() => {}}
                          onNewEntriesChange={setUserImageEntries}
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio options */}
                <div className="border-t border-border">
                  <button type="button" onClick={() => setOptionsOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Audio options</span>
                      <div className="flex gap-1">
                        {useTTS && <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">TTS</span>}
                        {useMusic && <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">Music</span>}
                      </div>
                    </div>
                    {optionsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </button>
                  {optionsOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/10">
                      <div className="space-y-2 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mic className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] font-mono text-muted-foreground">Narration (TTS)</span>
                          </div>
                          <button type="button" onClick={() => setUseTTS((v) => !v)} className={`relative h-5 w-9 rounded-full border transition-all ${useTTS ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${useTTS ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>
                        {useTTS && (
                          <>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Voice</span>
                              <input type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="devansh" className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50" />
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                              <input type="range" min="0" max="1" step="0.05" value={ttsVolume0} onChange={(e) => setTtsVolume0(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer" />
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">{Math.round(ttsVolume0 * 100)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Music className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] font-mono text-muted-foreground">Background music</span>
                          </div>
                          <button type="button" onClick={() => setUseMusic((v) => !v)} className={`relative h-5 w-9 rounded-full border transition-all ${useMusic ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${useMusic ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>
                        {useMusic && (
                          <>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Genre</span>
                              <div className="flex gap-1 flex-wrap">
                                {MUSIC_GENRES.map((g) => (
                                  <button key={g.value} type="button" onClick={() => setMusicGenre(g.value)} className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${musicGenre === g.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{g.label}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                              <input type="range" min="0" max="1" step="0.05" value={musicVolume0} onChange={(e) => setMusicVolume0(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer" />
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">{Math.round(musicVolume0 * 100)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Generating state */}
            {isBusy && (
              <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-sans font-semibold text-foreground">
                    {isUploading ? "Uploading your images…" : "Generating your video…"}
                  </p>
                </div>
              </div>
            )}

            {/* Example prompts */}
            {!isBusy && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">Try an example</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                      className="text-[10px] font-mono text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:border-border/60 hover:text-foreground hover:bg-muted/50 transition-all text-left"
                    >
                      {ex.length > 50 ? ex.slice(0, 50) + "…" : ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT THREAD ── */}
        {chatMessages.length > 0 && (
          <div className="space-y-4">
            {/* Render prompt and error messages chronologically */}
            {chatMessages.map((msg, idx) => {
              if (msg.type === "prompt") {
                return (
                  <div key={idx} className="flex items-start gap-3 justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
                      <p className="text-sm font-mono text-primary-foreground leading-relaxed break-words">
                        {msg.text}
                      </p>
                      <p className="text-[9px] font-mono text-primary-foreground/40 mt-1.5 text-right">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mt-1">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                );
              }

              if (msg.type === "error") {
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="shrink-0 h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center mt-1">
                      <Bot className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-[11px] font-mono text-red-500/80 leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono text-red-500/70 hover:text-red-500 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Generating indicator — shown while waiting for a response */}
            {isBusy && (
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground/60">
                      {isUploading ? "Uploading images…" : "Generating video…"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* The single rendered video — always at the bottom of the thread */}
            {latestVideoData && !isBusy && (
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <VideoPanel
                    data={latestVideoData}
                    onExport={handleExport}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                    ttsVolume={ttsVolume}
                    musicVolume={musicVolume}
                    onTtsVolumeChange={handleTtsVolumeChange}
                    onMusicVolumeChange={handleMusicVolumeChange}
                  />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />

            {/* Follow-up input (shown after first video, when not busy) */}
            {hasResult && !isLoadingHistoryChat && (
              <div className="pt-2">
                <FollowUpInput
                  isBusy={isBusy}
                  isOutOfCredits={isOutOfCredits}
                  uploadedImages={uploadedImages}
                  selectedRange={selectedRange}
                  onRangeChange={setSelectedRange}
                  onSubmit={handleFollowUp}
                  lastFailedPrompt={lastFailedPrompt}
                  onRetry={handleRetry}
                  onUpgrade={() => setSubscriptionModalOpen(true)}
                />
              </div>
            )}

            {/* New video footer */}
            <div className="flex justify-center pb-6">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 h-8 px-4 rounded-lg text-muted-foreground/40 text-xs font-mono hover:text-muted-foreground border border-transparent hover:border-border transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start new video
              </button>
            </div>
          </div>
        )}
      </main>

      {/* History panel */}
      <VideoHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeChatId={chatId}
        onSelectChat={handleSelectHistoryChat}
      />

      {/* Export modal */}
      <ExportModal
        open={exportModalOpen}
        progress={downloadProgress}
        onClose={() => { setExportModalOpen(false); setExportComplete(false); }}
        isComplete={exportComplete}
      />

      {/* Subscription modal — opened automatically on INSUFFICIENT_CREDITS error or credit pill click */}
      <SubscriptionModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
        hasActiveSubscription={hasActiveSubscription}
        currentCredits={userCredits?.totalCredits ?? 0}
        currentPlanId={subscription?.plan_id ?? null}
      />
    </div>
  );
}