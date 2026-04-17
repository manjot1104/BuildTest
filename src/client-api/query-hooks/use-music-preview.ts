// src/hooks/use-music-preview.ts
//
// Manages a single shared Audio instance for previewing BGM genre tracks.
// Only one genre can play at a time — clicking a second genre stops the first.
// Auto-stops after PREVIEW_DURATION_MS milliseconds.

import { useRef, useState, useCallback, useEffect } from "react";

// Map genre values to their public music file paths
// These must match MUSIC_LIBRARY in video-gen-music.engine.ts
const GENRE_PREVIEW_URLS: Record<string, string> = {
  corporate: "/music/nastelbom-corporate-soft-488321.mp3",
  cinematic: "/music/nastelbom-epic-cinematic-473268.mp3",
  upbeat: "/music/joyinsound-corporate-background-music-quiet-progress-507151.mp3",
  lofi: "/music/mondamusic-lofi-lofi-girl-lofi-chill-512853.mp3",
};

const PREVIEW_DURATION_MS = 12_000; // 12 seconds preview

export function useMusicPreview() {
  const [playingGenre, setPlayingGenre] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup helper — stops audio and clears the auto-stop timer
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
    setPlayingGenre(null);
  }, []);

  // Toggle: clicking a playing genre stops it; clicking a new genre starts it
  const togglePreview = useCallback(
    (genre: string) => {
      if (playingGenre === genre) {
        stopPreview();
        return;
      }

      // Stop any currently playing preview first
      stopPreview();

      const url = GENRE_PREVIEW_URLS[genre];
      if (!url) return;

      const audio = new Audio(url);
      audio.volume = 0.5;
      audioRef.current = audio;

      audio.play().catch((err) => {
        console.warn("[MusicPreview] Playback failed:", err);
        stopPreview();
      });

      setPlayingGenre(genre);

      // Auto-stop after PREVIEW_DURATION_MS
      timeoutRef.current = setTimeout(stopPreview, PREVIEW_DURATION_MS);

      // Also stop when the track naturally ends (short tracks)
      audio.addEventListener("ended", stopPreview, { once: true });
    },
    [playingGenre, stopPreview],
  );

  // Stop preview when component unmounts (e.g. user navigates away)
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  return { playingGenre, togglePreview, stopPreview };
}