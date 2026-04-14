"use client";

// src/app/video-gen/page.tsx

import { useState, useRef, useCallback } from "react";
import { Player } from "@remotion/player";
import { toast } from "sonner";
import {
  Clapperboard, Loader2, RotateCcw, Sparkles,
  ChevronDown, ChevronUp, Clock, Layers, Film,
  Mic, Music, Volume2, ImagePlus, X, Upload,
  CheckCircle2, AlertCircle, History, Download,
  SendHorizonal, MessageSquarePlus,
} from "lucide-react";
import {
  useGenerateVideo,
  useUploadUserImages,
  useDownloadVideo,
  useVideoChats,
  useVideoChat,
  type VideoMeta,
  type GenerateVideoOptions,
  type UserImageEntry,
  type UploadedUserImage,
  type VideoChatSummary,
} from "@/client-api/query-hooks/use-video-hooks";
import { VideoComposition } from "@/remotion-src/VideoComposition";
import type { VideoJson } from "@/remotion-src/types";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface UserImageEntryWithPreview extends UserImageEntry {
  id: string;
  previewUrl: string;
}

function UserImageUploader({
  entries,
  onChange,
  disabled,
}: {
  entries: UserImageEntryWithPreview[];
  onChange: (entries: UserImageEntryWithPreview[]) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = MAX_USER_IMAGES - entries.length;
      const toAdd = Array.from(files).slice(0, remaining);

      const newEntries: UserImageEntryWithPreview[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        description: "",
        previewUrl: URL.createObjectURL(file),
      }));

      onChange([...entries, ...newEntries]);
    },
    [entries, onChange],
  );

  const updateDescription = (id: string, description: string) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, description } : e)));
  };

  const removeEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    onChange(entries.filter((e) => e.id !== id));
  };

  const handleDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      handleFiles(ev.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-2 pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[11px] font-mono text-muted-foreground">
            Your images
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/40 border border-border rounded-full px-1.5 py-0.5">
            {entries.length}/{MAX_USER_IMAGES}
          </span>
        </div>
      </div>

      {/* Drop zone — only shown when there's room */}
      {entries.length < MAX_USER_IMAGES && (
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

      {/* Image list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 p-2 rounded-lg border border-border bg-muted/20"
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-14 h-10 rounded-md overflow-hidden border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.previewUrl}
                  alt={entry.description || `Image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Description input */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono text-muted-foreground/40 mb-1">
                  Describe this image for the AI
                </p>
                <input
                  type="text"
                  value={entry.description}
                  onChange={(e) => updateDescription(entry.id, e.target.value)}
                  placeholder={`e.g. "Our product on a wooden desk"`}
                  maxLength={120}
                  disabled={disabled}
                  className="w-full h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/50 disabled:opacity-40"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled}
                className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-[9px] font-mono text-muted-foreground/35 leading-relaxed">
          The AI will use these images in scenes where the description matches the content.
          Add a clear description so the AI knows when to use each one.
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
}: {
  chat: VideoChatSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-0.5 border ${
        isActive
          ? "bg-primary/10 border-primary/20"
          : "hover:bg-muted/50 border-transparent hover:border-border/50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[9px] font-mono rounded-full px-2 py-0.5 border truncate max-w-[140px] ${
            isActive
              ? "text-primary bg-primary/10 border-primary/20"
              : "text-muted-foreground/60 bg-muted border-border"
          }`}
        >
          {chat.title ?? "Untitled"}
        </span>
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

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const panelContent = (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Panel header */}
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

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-muted-foreground/40 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground/40">
              Failed to load history
            </p>
          </div>
        )}

        {!isLoading && !isError && chats?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Film className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/40 text-center leading-relaxed">
              No videos yet.
              <br />
              Generate your first one!
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
                onClick={() => {
                  onSelectChat(chat);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: left sidebar overlay (sm and up) ──────────────────────── */}
      <div
        className={`hidden sm:block fixed inset-0 z-40 transition-all duration-200 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Sliding panel */}
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-background border-r border-border shadow-lg transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {panelContent}
        </div>
      </div>

      {/* ── Mobile: bottom drawer (below sm) ──────────────────────────────── */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-all duration-200 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-background/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Drawer sliding up from bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-x border-border transition-transform duration-300 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "72vh" }}
        >
          {/* Pull handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          {panelContent}
        </div>
      </div>
    </>
  );
}

// ─── FollowUpBlock ────────────────────────────────────────────────────────────
// Rendered below the video result. Lets the user send follow-up prompts,
// swap images, or tweak audio options — all within the same chat.

function FollowUpBlock({
  isBusy,
  uploadedImages,
  onSubmit,
}: {
  isBusy: boolean;
  /** Currently persisted images for this chat — shown as starting state */
  uploadedImages: UploadedUserImage[];
  onSubmit: (params: {
    followUpPrompt: string;
    newImageEntries: UserImageEntryWithPreview[];
    options: GenerateVideoOptions;
  }) => Promise<void>;
}) {
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [followUpOptionsOpen, setFollowUpOptionsOpen] = useState(false);
  const [followUpImagesOpen, setFollowUpImagesOpen] = useState(false);

  // Audio options — initialised to current values passed via props
  const [useTTS, setUseTTS] = useState(true);
  const [useMusic, setUseMusic] = useState(true);
  const [musicGenre, setMusicGenre] = useState("corporate");
  const [voiceId, setVoiceId] = useState("aravind");
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);

  // New images to add / replace in this follow-up
  const [newImageEntries, setNewImageEntries] = useState<UserImageEntryWithPreview[]>([]);
  const [followUpUploadStep, setFollowUpUploadStep] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutateAsync: uploadImages, isPending: isUploading } = useUploadUserImages();

  const totalImagesAfterMerge =
    uploadedImages.length + newImageEntries.filter(
      // new entries that aren't replacing an existing slot by index — simple count cap
      () => true,
    ).length;

  // Combined slot count: existing persisted images + new additions (capped at 5)
  const slotsUsed = Math.min(totalImagesAfterMerge, MAX_USER_IMAGES);

  async function handleFollowUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpPrompt.trim() || isBusy) return;

    const options: GenerateVideoOptions = {
      useTTS, useMusic, ttsVolume, musicVolume,
      ...(useTTS && { voiceId }),
      ...(useMusic && { musicGenre }),
    };

    await onSubmit({ followUpPrompt, newImageEntries, options });

    // Reset local state after submission
    setFollowUpPrompt("");
    setNewImageEntries([]);
    setFollowUpUploadStep("idle");
    setFollowUpOptionsOpen(false);
    setFollowUpImagesOpen(false);
  }

  const renderFollowUpUploadBadge = () => {
    if (followUpUploadStep === "idle" || newImageEntries.length === 0) return null;
    if (followUpUploadStep === "uploading") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Uploading…
        </span>
      );
    }
    if (followUpUploadStep === "done") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-2.5 w-2.5" /> Uploaded
        </span>
      );
    }
    if (followUpUploadStep === "error") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
          <AlertCircle className="h-2.5 w-2.5" /> Upload failed
        </span>
      );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      {/* Header label */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <MessageSquarePlus className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
          Follow-up prompt
        </span>
        {uploadedImages.length > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground/40 border border-border rounded-full px-1.5 py-0.5">
            {uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""} in chat
          </span>
        )}
      </div>

      {/* Follow-up form */}
      <form onSubmit={handleFollowUpSubmit}>
        {/* Textarea */}
        <div className="relative px-4">
          <textarea
            ref={textareaRef}
            value={followUpPrompt}
            onChange={(e) => setFollowUpPrompt(e.target.value)}
            placeholder="e.g. Make the second scene darker, add a voiceover about climate change…"
            rows={3}
            disabled={isBusy}
            aria-label="Follow-up prompt"
            className="w-full px-0 pt-1 pb-6 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none disabled:opacity-40 border-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFollowUpSubmit(e);
            }}
          />
          <span className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground/25 tabular-nums">
            {followUpPrompt.length}/2000
          </span>
        </div>

        {/* Submit row */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[9px] font-mono text-muted-foreground/35 leading-relaxed hidden sm:block">
            Changes audio, images, or style without resetting the chat
          </p>
          <button
            type="submit"
            disabled={!followUpPrompt.trim() || isBusy}
            className="inline-flex items-center justify-center gap-2 px-4 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0 ml-auto"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Updating…</span>
              </>
            ) : (
              <>
                <SendHorizonal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Update video</span>
              </>
            )}
          </button>
        </div>

        {/* ── New images panel ──────────────────────────────────────────── */}
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setFollowUpImagesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImagePlus className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Add / replace images
              </span>
              {newImageEntries.length > 0 && (
                <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                  {newImageEntries.length} new
                </span>
              )}
              {renderFollowUpUploadBadge()}
            </div>
            {followUpImagesOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </button>

          {followUpImagesOpen && (
            <div className="px-4 pb-4 border-t border-border bg-muted/10">
              {/* Show currently persisted images as read-only reference */}
              {uploadedImages.length > 0 && (
                <div className="pt-3 pb-2 space-y-1.5">
                  <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                    Current images in chat
                  </p>
                  <div className="space-y-1.5">
                    {uploadedImages.map((img, i) => (
                      <div
                        key={img.url}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-border bg-muted/10"
                      >
                        <div className="shrink-0 w-10 h-7 rounded overflow-hidden border border-border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.description || `Image ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="flex-1 text-[10px] font-mono text-muted-foreground/60 truncate">
                          {img.description || `Image ${i + 1}`}
                        </p>
                        <span className="text-[9px] font-mono text-muted-foreground/30 shrink-0">
                          #{img.index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploader for new/replacement images */}
              {slotsUsed < MAX_USER_IMAGES && (
                <UserImageUploader
                  entries={newImageEntries}
                  onChange={setNewImageEntries}
                  disabled={isBusy}
                />
              )}

              {slotsUsed >= MAX_USER_IMAGES && newImageEntries.length === 0 && (
                <p className="pt-3 text-[9px] font-mono text-muted-foreground/40 leading-relaxed">
                  Maximum {MAX_USER_IMAGES} images reached. Remove an image from the chat before adding more.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Audio options panel ───────────────────────────────────────── */}
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setFollowUpOptionsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                Audio options
              </span>
              <div className="flex gap-1">
                {useTTS && (
                  <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                    TTS
                  </span>
                )}
                {useMusic && (
                  <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                    Music
                  </span>
                )}
              </div>
            </div>
            {followUpOptionsOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </button>

          {followUpOptionsOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/10">

              {/* TTS toggle + voice */}
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
                      <input
                        type="text"
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        placeholder="aravind"
                        className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                      <input
                        type="range" min="0" max="1" step="0.05" value={ttsVolume}
                        onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                        {Math.round(ttsVolume * 100)}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Music toggle + genre */}
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
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => setMusicGenre(g.value)}
                            className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${musicGenre === g.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                      <input
                        type="range" min="0" max="1" step="0.05" value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedRange, setSelectedRange] = useState<DurationRange>(DURATION_RANGES[1]);
  const [videoJson, setVideoJson] = useState<VideoJson | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  // ── History panel ──────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Chat persistence ───────────────────────────────────────────────────────
  // Set after first successful generation; reused for follow-up prompts.
  // Cleared by handleReset() so a "New video" starts a fresh chat.
  const [chatId, setChatId] = useState<string | null>(null);

  // ── History: track whether we're loading a chat from history ──────────────
  // When non-null, useVideoChat fetches the full detail and we render from it.
  const [loadingHistoryChatId, setLoadingHistoryChatId] = useState<string | null>(null);

  // Image upload state
  const [userImageEntries, setUserImageEntries] = useState<
    Array<{ id: string; file: File; description: string; previewUrl: string }>
  >([]);
  const [uploadStep, setUploadStep] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadedImages, setUploadedImages] = useState<UploadedUserImage[]>([]);
  const [imageSessionId, setImageSessionId] = useState<string | undefined>();

  // Audio options
  const [useTTS, setUseTTS] = useState(true);
  const [useMusic, setUseMusic] = useState(true);
  const [musicGenre, setMusicGenre] = useState("corporate");
  const [voiceId, setVoiceId] = useState("aravind");
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.3);

  // ── Download progress (0–1, null when not downloading) ───────────────────
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: generate, isPending: isGenerating } = useGenerateVideo();
  const { mutateAsync: uploadImages, isPending: isUploading } = useUploadUserImages();
  const { mutate: downloadVideo, isPending: isDownloading } = useDownloadVideo();

  // ── Fetch full chat detail when loading from history ──────────────────────
  const {
    data: historyChatDetail,
    isLoading: isLoadingHistoryChat,
    isError: isHistoryChatError,
  } = useVideoChat(loadingHistoryChatId);

  // When the history chat detail loads, populate videoJson + meta + prompt
  // We use a ref to track which chatId we've already applied so we don't reapply on re-renders
  const appliedHistoryChatIdRef = useRef<string | null>(null);

  if (
    historyChatDetail &&
    loadingHistoryChatId &&
    appliedHistoryChatIdRef.current !== loadingHistoryChatId
  ) {
    appliedHistoryChatIdRef.current = loadingHistoryChatId;

    const vj = historyChatDetail.videoJson;
    setVideoJson(vj);

    // Reconstruct meta from the videoJson
    const fps = vj.fps ?? 30;
    const totalFrames = vj.duration;
    setMeta({
      scenes: vj.scenes.length,
      totalFrames,
      durationSeconds: parseFloat((totalFrames / fps).toFixed(1)),
    });

    // Restore last prompt so user can send a follow-up
    const lastPrompt = historyChatDetail.prompts.at(-1)?.prompt ?? "";
    if (lastPrompt) setPrompt(lastPrompt);

    // Restore persisted user images so the follow-up block can show them
    if (historyChatDetail.userImages) {
      setUploadedImages(historyChatDetail.userImages);
    }

    // Restore audio options if saved
    if (historyChatDetail.options) {
      const opts = historyChatDetail.options;
      if (typeof opts.useTTS === "boolean") setUseTTS(opts.useTTS);
      if (typeof opts.useMusic === "boolean") setUseMusic(opts.useMusic);
      if (typeof opts.ttsVolume === "number") setTtsVolume(opts.ttsVolume);
      if (typeof opts.musicVolume === "number") setMusicVolume(opts.musicVolume);
      if (typeof opts.voiceId === "string") setVoiceId(opts.voiceId);
      if (typeof opts.musicGenre === "string") setMusicGenre(opts.musicGenre);
    }

    // Stop the loading state — the chatId is already set from handleSelectHistoryChat
    setLoadingHistoryChatId(null);
  }

  const hasResult = videoJson !== null;
  const isBusy = isGenerating || isUploading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isBusy) return;

    const options: GenerateVideoOptions = {
      useTTS, useMusic, ttsVolume, musicVolume,
      ...(useTTS && { voiceId }),
      ...(useMusic && { musicGenre }),
    };

    // Upload images first if any were added
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
        toast.error(err instanceof Error ? err.message : "Image upload failed");
        return;
      }
    }

    generate(
      {
        prompt: prompt.trim(),
        duration: selectedRange.seconds,
        options,
        chatId: chatId ?? null, // pass existing chatId for follow-ups; null = new chat
        userImages: resolvedUserImages.length > 0 ? resolvedUserImages : undefined,
        imageSessionId: resolvedSessionId,
      },
      {
        onSuccess: (data) => {
          setVideoJson(data.videoJson);
          setMeta(data.meta);
          setChatId(data.chatId); // store for follow-up prompts
          toast.success(`Generated ${data.meta.scenes} scenes`);
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to generate video");
        },
      },
    );
  }

  function handleReset() {
    // Revoke object URLs to avoid memory leaks
    userImageEntries.forEach((e) => URL.revokeObjectURL(e.previewUrl));

    setVideoJson(null);
    setMeta(null);
    setPrompt("");
    setSelectedRange(DURATION_RANGES[1]);
    setJsonOpen(false);
    setOptionsOpen(false);
    setImagesOpen(false);
    setTtsVolume(0.8);
    setMusicVolume(0.3);
    setUserImageEntries([]);
    setUploadStep("idle");
    setUploadedImages([]);
    setImageSessionId(undefined);
    setChatId(null); // clear so next generation starts a fresh chat
    setLoadingHistoryChatId(null);
    appliedHistoryChatIdRef.current = null;
    setDownloadProgress(null);
  }

  // ── History: load a past chat into the result view ────────────────────────
  // Sets chatId for follow-up continuity and triggers useVideoChat to fetch
  // the full detail (videoJson + prompts + options) so the player can render.
  function handleSelectHistoryChat(chat: VideoChatSummary) {
    // Clear any existing result first to avoid stale display
    setVideoJson(null);
    setMeta(null);
    appliedHistoryChatIdRef.current = null;

    // Set the chatId for follow-up continuity
    setChatId(chat.id);

    // Pre-populate the prompt field with the last known prompt from the summary
    if (chat.lastPrompt) setPrompt(chat.lastPrompt);

    // Trigger the detail fetch — useVideoChat watches this value
    setLoadingHistoryChatId(chat.id);

    // Scroll to top / focus textarea after state settles
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // ── Download handler ───────────────────────────────────────────────────────
  function handleDownload() {
    if (!videoJson || isDownloading) return;
    setDownloadProgress(0);
    downloadVideo(
      {
        videoJson,
        onProgress: (p) => setDownloadProgress(p),
      },
      {
        onSuccess: () => {
          toast.success("Download started!");
          setDownloadProgress(null);
        },
        onError: (err) => {
          toast.error(err.message ?? "Download failed");
          setDownloadProgress(null);
        },
      },
    );
  }

  // ── Follow-up handler ──────────────────────────────────────────────────────
  // Called by FollowUpBlock when the user submits a follow-up prompt.
  // Uploads any new images, merges them with existing ones, then calls generate.
  async function handleFollowUp({
    followUpPrompt,
    newImageEntries,
    options,
  }: {
    followUpPrompt: string;
    newImageEntries: UserImageEntryWithPreview[];
    options: GenerateVideoOptions;
  }) {
    if (!chatId) return; // should never happen — follow-up only shown when hasResult

    let resolvedNewImages: UploadedUserImage[] = [];
    let resolvedNewSessionId: string | undefined;

    // Upload new images if provided
    if (newImageEntries.length > 0) {
      try {
        const result = await uploadImages(newImageEntries);
        resolvedNewImages = result.images;
        resolvedNewSessionId = result.sessionId;
        toast.success(`Uploaded ${result.images.length} image${result.images.length !== 1 ? "s" : ""}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Image upload failed");
        return;
      }
    }

    // Merge: existing persisted images + newly uploaded ones.
    // Server handles de-duplication by index in generateVideoHandler.
    const mergedImages: UploadedUserImage[] = [
      ...uploadedImages,
      ...resolvedNewImages,
    ];

    generate(
      {
        prompt: followUpPrompt.trim(),
        duration: selectedRange.seconds,
        options,
        chatId, // existing chat — server treats this as a follow-up
        userImages: mergedImages.length > 0 ? mergedImages : undefined,
        imageSessionId: resolvedNewSessionId ?? imageSessionId,
      },
      {
        onSuccess: (data) => {
          setVideoJson(data.videoJson);
          setMeta(data.meta);
          // Update uploaded images to the merged set returned by server
          if (mergedImages.length > 0) setUploadedImages(mergedImages);
          if (resolvedNewSessionId) setImageSessionId(resolvedNewSessionId);
          toast.success(`Updated — ${data.meta.scenes} scenes`);
        },
        onError: (err) => {
          toast.error(err.message ?? "Follow-up failed");
        },
      },
    );
  }

  // ── Upload step indicator ──────────────────────────────────────────────────
  const renderUploadStepBadge = () => {
    if (uploadStep === "idle" || userImageEntries.length === 0) return null;
    if (uploadStep === "uploading") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Uploading…
        </span>
      );
    }
    if (uploadStep === "done") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-2.5 w-2.5" /> Uploaded
        </span>
      );
    }
    if (uploadStep === "error") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
          <AlertCircle className="h-2.5 w-2.5" /> Upload failed
        </span>
      );
    }
  };

  return (
    <div className="relative -m-4 w-[calc(100%+2rem)] min-h-screen bg-sidebar">
      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Top bar ── */}
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
            {/* History button — always visible */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all"
              aria-label="Open video history"
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
                New video
              </button>
            )}
          </div>
        </div>

        {/* ── Loading state when fetching a history chat ── */}
        {isLoadingHistoryChat && !hasResult && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-sans font-semibold text-foreground">Loading video…</p>
              <p className="text-[11px] font-mono text-muted-foreground/60">Fetching your saved video</p>
            </div>
          </div>
        )}

        {/* ── History chat load error ── */}
        {isHistoryChatError && !hasResult && !isLoadingHistoryChat && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
            <p className="text-[11px] font-mono text-muted-foreground/60">
              Failed to load video. Please try again.
            </p>
          </div>
        )}

        {/* ══ INPUT ═══════════════════════════════════════════════════════════ */}
        {!hasResult && !isLoadingHistoryChat && (
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

            {/* Input card */}
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
                    disabled={isBusy}
                    aria-label="Video prompt"
                    className="w-full px-4 pt-4 pb-8 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none disabled:opacity-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
                    }}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground/25 tabular-nums">
                    {prompt.length}/2000
                  </span>
                </div>

                {/* Duration selector + submit */}
                <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest shrink-0">
                      Duration
                    </span>
                    <div className="flex gap-1" role="group">
                      {DURATION_RANGES.map((range) => (
                        <button
                          key={range.value}
                          type="button"
                          onClick={() => setSelectedRange(range)}
                          aria-pressed={selectedRange.value === range.value}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-md border transition-all touch-manipulation ${selectedRange.value === range.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                            }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isBusy}
                    className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="hidden sm:inline">Uploading…</span>
                      </>
                    ) : isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="hidden sm:inline">Generating…</span>
                      </>
                    ) : (
                      <>
                        <Film className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ── Images panel ─────────────────────────────────────────── */}
                <div className="border-t border-border">
                  <button
                    type="button"
                    onClick={() => setImagesOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                        Your images
                      </span>
                      {userImageEntries.length > 0 && (
                        <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                          {userImageEntries.length}
                        </span>
                      )}
                      {renderUploadStepBadge()}
                    </div>
                    {imagesOpen
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                    }
                  </button>

                  {imagesOpen && (
                    <div className="px-4 pb-4 border-t border-border bg-muted/10">
                      <UserImageUploader
                        entries={userImageEntries}
                        onChange={setUserImageEntries}
                        disabled={isBusy}
                      />
                    </div>
                  )}
                </div>

                {/* ── Audio options panel ───────────────────────────────────── */}
                <div className="border-t border-border">
                  <button
                    type="button"
                    onClick={() => setOptionsOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                        Audio options
                      </span>
                      <div className="flex gap-1">
                        {useTTS && (
                          <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                            TTS
                          </span>
                        )}
                        {useMusic && (
                          <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                            Music
                          </span>
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

                      {/* TTS toggle + voice */}
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
                              <input
                                type="text"
                                value={voiceId}
                                onChange={(e) => setVoiceId(e.target.value)}
                                placeholder="aravind"
                                className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                              <input
                                type="range" min="0" max="1" step="0.05" value={ttsVolume}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setTtsVolume(v);
                                  setVideoJson(prev => prev ? { ...prev, ttsVolume: v } : null);
                                }}
                                className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                                {Math.round(ttsVolume * 100)}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Music toggle + genre */}
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
                                  <button
                                    key={g.value}
                                    type="button"
                                    onClick={() => setMusicGenre(g.value)}
                                    className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${musicGenre === g.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                                  >
                                    {g.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">Volume</span>
                              <input
                                type="range" min="0" max="1" step="0.05" value={musicVolume}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setMusicVolume(v);
                                  setVideoJson(prev => prev ? { ...prev, musicVolume: v } : null);
                                }}
                                className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground/50 w-8 text-right tabular-nums">
                                {Math.round(musicVolume * 100)}%
                              </span>
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
                  <p className="text-[11px] font-mono text-muted-foreground/60">
                    {isUploading
                      ? `Preparing ${userImageEntries.length} image${userImageEntries.length !== 1 ? "s" : ""}`
                      : `AI is composing ${selectedRange.label} of scenes`
                    }
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full max-w-xs">
                  {[
                    ...(userImageEntries.length > 0 ? ["Uploading your images"] : []),
                    "Analyzing your prompt",
                    "Composing scenes",
                    ...(useTTS ? ["Generating narration audio"] : []),
                    ...(useMusic ? ["Adding background music"] : []),
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <Loader2
                        className="h-3 w-3 text-primary animate-spin shrink-0"
                        style={{ animationDelay: `${i * 300}ms` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground/50">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example prompts */}
            {!isBusy && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">
                  Try an example
                </p>
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

        {/* ══ RESULT ══════════════════════════════════════════════════════════ */}
        {hasResult && videoJson && (
          <div className="space-y-4">

            {/* Meta row */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { icon: Layers, label: "scenes", value: meta?.scenes },
                  { icon: Clock, label: "seconds", value: meta?.durationSeconds.toFixed(1) },
                  { icon: Film, label: "frames", value: meta?.totalFrames },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-bold text-foreground tabular-nums leading-none">{value}</p>
                      <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1.5 ml-auto">
                  {uploadedImages.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <ImagePlus className="h-2.5 w-2.5" /> {uploadedImages.length} image{uploadedImages.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {videoJson.scenes.some(s => s.ttsUrl) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Mic className="h-2.5 w-2.5" /> TTS
                    </span>
                  )}
                  {videoJson.bgmUrl && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Music className="h-2.5 w-2.5" /> Music
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

            {/* ── Follow-up prompt block ───────────────────────────────────── */}
            {/* Only shown when a chatId exists (i.e. after first generation) */}
            {chatId && (
              <>
                {/* Generating overlay — replaces block while busy */}
                {isBusy ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4">
                    <div className="relative h-14 w-14">
                      <div className="absolute inset-0 rounded-full border-2 border-border" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-sans font-semibold text-foreground">Updating your video…</p>
                      <p className="text-[11px] font-mono text-muted-foreground/60">
                        AI is applying your follow-up changes
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full max-w-xs">
                      {[
                        "Reading chat history",
                        "Applying your changes",
                        ...(useTTS ? ["Regenerating narration"] : []),
                        ...(useMusic ? ["Adjusting music"] : []),
                      ].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                          <Loader2
                            className="h-3 w-3 text-primary animate-spin shrink-0"
                            style={{ animationDelay: `${i * 300}ms` }}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground/50">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <FollowUpBlock
                    isBusy={isBusy}
                    uploadedImages={uploadedImages}
                    onSubmit={handleFollowUp}
                  />
                )}
              </>
            )}

            {/* ── Download button ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {isDownloading ? "Rendering in browser…" : "Download MP4"}
                  </span>
                  {isDownloading && downloadProgress !== null && (
                    <span className="text-[9px] font-mono text-primary tabular-nums">
                      {Math.round(downloadProgress * 100)}%
                    </span>
                  )}
                </div>
                {isDownloading && downloadProgress !== null && (
                  <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(downloadProgress * 100)}%` }}
                    />
                  </div>
                )}
              </button>
              {/* Progress bar — full width, shown while rendering */}
              {isDownloading && downloadProgress !== null && (
                <div className="h-0.5 w-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round(downloadProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Post-generation volume controls */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Adjust volumes</p>
              {videoJson.scenes.some(s => s.ttsUrl) && (
                <div className="flex items-center gap-3">
                  <Mic className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground w-20 shrink-0">Narration</span>
                  <input
                    type="range" min="0" max="1" step="0.05" value={ttsVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTtsVolume(v);
                      setVideoJson(prev => prev ? { ...prev, ttsVolume: v } : null);
                    }}
                    className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground/50 w-10 text-right tabular-nums">
                    {Math.round(ttsVolume * 100)}%
                  </span>
                </div>
              )}
              {videoJson.bgmUrl && (
                <div className="flex items-center gap-3">
                  <Music className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground w-20 shrink-0">Music</span>
                  <input
                    type="range" min="0" max="1" step="0.05" value={musicVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMusicVolume(v);
                      setVideoJson(prev => prev ? { ...prev, musicVolume: v } : null);
                    }}
                    className="flex-1 h-1.5 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground/50 w-10 text-right tabular-nums">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Prompt used */}
            <div className="px-4 py-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1">Prompt</p>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">{prompt}</p>
            </div>

            {/* JSON debug panel */}
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setJsonOpen((v) => !v)}
                aria-expanded={jsonOpen}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors touch-manipulation"
              >
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Generated JSON</span>
                {jsonOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </button>
              {jsonOpen && (
                <pre className="border-t border-border px-4 py-4 text-[10px] font-mono text-muted-foreground/50 overflow-auto max-h-72 leading-relaxed custom-scrollbar bg-background/50">
                  {JSON.stringify(videoJson, null, 2)}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 flex-wrap pb-6 pt-1">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground/40 text-xs font-mono hover:text-muted-foreground transition-all ml-auto touch-manipulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                new video
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Video history panel (desktop sidebar + mobile bottom drawer) ── */}
      <VideoHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeChatId={chatId}
        onSelectChat={handleSelectHistoryChat}
      />
    </div>
  );
}