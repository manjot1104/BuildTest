"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Mic, Music, Clock, Layers, X, Trash2, Loader2, Pencil } from "lucide-react";
import { useVideoChats, useRenameVideoChat, type VideoChatSummary } from "@/client-api/query-hooks/use-video-hooks";

interface VideoHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  activeChatId: string | null;
  onSelectChat: (chat: VideoChatSummary) => void;
}

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

function ChatRow({
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
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group mb-0.5 ${
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
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
            <span className={`text-[9px] font-mono rounded-full px-2 py-0.5 border ${isActive ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground/60 bg-muted border-border"}`}>
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
        <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">
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

export function VideoHistoryPanel({
  open,
  onClose,
  activeChatId,
  onSelectChat,
}: VideoHistoryPanelProps) {
  const { data: chats, isLoading, isError } = useVideoChats();
  const { mutate: renameChat } = useRenameVideoChat();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll on mobile when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Film className="h-3.5 w-3.5 text-muted-foreground/50" />
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
          aria-label="Close history"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
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
              <ChatRow
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                onClick={() => {
                  onSelectChat(chat);
                  onClose();
                }}
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
      {/* ── Desktop: sidebar overlay ─────────────────────────────── */}
      <div
        className={`hidden sm:block fixed inset-0 z-40 transition-all duration-200 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          ref={overlayRef}
          onClick={onClose}
          className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-background border-r border-border shadow-lg transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </div>
      </div>

      {/* ── Mobile: bottom drawer ─────────────────────────────────── */}
      <div
        className={`sm:hidden fixed inset-0 z-40 transition-all duration-200 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-background/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}
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
          {content}
        </div>
      </div>
    </>
  );
}