// server/engines/video-gen-music.engine.ts

export type MusicGenre = "upbeat" | "corporate" | "cinematic" | "lofi" | "none";

interface MusicTrack {
  id: string;
  url: string;
  defaultVolume: number;
  label: string;
}

// in /public/music/
const MUSIC_LIBRARY: Record<MusicGenre, MusicTrack | null> = {
  upbeat: {
    id: "upbeat_01",
    url: "/music/joyinsound-corporate-background-music-quiet-progress-507151.mp3",
    defaultVolume: 0.2,
    label: "Energetic & Fast",
  },
  corporate: {
    id: "corp_01",
    url: "/music/nastelbom-corporate-soft-488321.mp3",
    defaultVolume: 0.15,
    label: "Professional & Clean",
  },
  cinematic: {
    id: "cine_01",
    url: "/music/nastelbom-epic-cinematic-473268.mp3",
    defaultVolume: 0.25,
    label: "Epic & Dramatic",
  },
  lofi: {
    id: "lofi_01",
    url: "/music/mondamusic-lofi-lofi-girl-lofi-chill-512853.mp3",
    defaultVolume: 0.3,
    label: "Relaxed & Calm",
  },
  none: null,
};

/**
 * Returns a track based on the user's selection or 
 * falls back to a default based on prompt keywords.
 */
export function getMusicTrack(genre: string = "corporate"): MusicTrack | null {
  const selected = genre.toLowerCase() as MusicGenre;
  return MUSIC_LIBRARY[selected] || MUSIC_LIBRARY["corporate"];
}