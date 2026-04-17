// client-api/query-hooks/use-audio-preview.ts
//
// Unified hook for previewing both BGM genre tracks and TTS voice samples.
// Only one audio clip plays at a time across both uses.

import { useRef, useState, useCallback, useEffect } from "react";

const PREVIEW_DURATION_MS = 12_000;

export function useAudioPreview(getUrl: (id: string) => string | undefined) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const togglePreview = useCallback(
    (id: string) => {
      if (playingId === id) { stopPreview(); return; }
      stopPreview();
      const url = getUrl(id);
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => stopPreview());
      setPlayingId(id);
      timeoutRef.current = setTimeout(stopPreview, PREVIEW_DURATION_MS);
      audio.addEventListener("ended", stopPreview, { once: true });
    },
    [playingId, stopPreview, getUrl],
  );

  useEffect(() => () => { stopPreview(); }, [stopPreview]);

  return { playingId, togglePreview, stopPreview };
}

// ── Music ──────────────────────────────────────────────────────────────────

const GENRE_PREVIEW_URLS: Record<string, string> = {
  corporate: "/music/nastelbom-corporate-soft-488321.mp3",
  cinematic: "/music/nastelbom-epic-cinematic-473268.mp3",
  upbeat: "/music/joyinsound-corporate-background-music-quiet-progress-507151.mp3",
  lofi: "/music/mondamusic-lofi-lofi-girl-lofi-chill-512853.mp3",
};

export function useMusicPreview() {
  const hook = useAudioPreview((id) => GENRE_PREVIEW_URLS[id]);
  return { playingGenre: hook.playingId, togglePreview: hook.togglePreview, stopPreview: hook.stopPreview };
}

// ── TTS Voices ─────────────────────────────────────────────────────────────

export const TTS_VOICES = [
  { id: "aarush",  label: "Aarush"  },
  { id: "daniel",  label: "Daniel"  },
  { id: "magnus",  label: "Magnus"  },
  { id: "mia",     label: "Mia"     },
  { id: "neel",    label: "Neel"    },
  { id: "olivia",  label: "Olivia"  },
  { id: "quinn",   label: "Quinn"   },
  { id: "sakshi",  label: "Sakshi"  },
  { id: "sameera", label: "Sameera" },
];

const TTS_PREVIEW_URLS: Record<string, string> = Object.fromEntries(
  TTS_VOICES.map((v) => [v.id, `/TTS/${v.id}.mp3`])
);

export function useTTSPreview() {
  const hook = useAudioPreview((id) => TTS_PREVIEW_URLS[id]);
  return { playingVoice: hook.playingId, togglePreview: hook.togglePreview, stopPreview: hook.stopPreview };
}