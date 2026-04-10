// server/engines/video-gen-images.engine.ts
//
// Image sourcing for video generation.
// Priority: User images → Pexels → Picsum (fallback)
//
// IMAGE URL FORMATS understood by resolveUrl():
//   user://image-N          → user-uploaded image by index
//   seed:dense-forest-river → semantic seed; tries Pexels first, falls back to Picsum
//   https://picsum.photos/seed/... → legacy full picsum URL (still supported)
//   any other https://...   → returned as-is
//
// The LLM should ONLY emit "seed:words-here" for non-user images.
// Full picsum URLs in the output are treated as legacy and still work.
//
// PEXELS COMPLIANCE:
//   - Attribution is tracked on every photo fetched (photographer + page URL).
//   - The caller/renderer is responsible for displaying attribution where visible.
//   - We never hotlink modified photos — we link to the original Pexels CDN src.
//   - We do not use Pexels images to train ML models.
//   - Per Pexels guidelines: https://www.pexels.com/api/documentation/
//
// TO ADD A NEW PROVIDER: add a new fetch function + insert it into resolveImageUrl()
// before the picsum fallback.

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserImage {
  /** Index used as the reference key, e.g. user://image-0 */
  index: number;
  /** Public-accessible URL or file path that Remotion can load */
  url: string;
  /** Human description the user provided — used for LLM matching */
  description: string;
}

interface PexelsPhoto {
  id: number;
  url: string; // Pexels page URL — for attribution
  photographer: string;
  photographer_url: string;
  src: {
    large2x: string;
    large: string;
    original: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

/**
 * Attribution data required by Pexels API guidelines.
 * Store this alongside the image URL if you display it in the final render.
 */
export interface PexelsAttribution {
  photographer: string;
  photographerUrl: string;
  pexelsPageUrl: string;
  photoId: number;
}

export interface ResolvedImage {
  url: string;
  source: "user" | "pexels" | "picsum";
  /** Only present when source === "pexels" */
  attribution?: PexelsAttribution;
}

// ── Pexels ────────────────────────────────────────────────────────────────────

/** In-process cache: query → resolved image (lives for the process lifetime) */
const pexelsCache = new Map<string, ResolvedImage>();

export async function fetchPexelsImage(
  query: string,
): Promise<ResolvedImage | null> {
  if (!PEXELS_API_KEY) return null;

  const cacheKey = query.toLowerCase().trim();
  if (pexelsCache.has(cacheKey)) return pexelsCache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({
      query,
      per_page: "5",
      orientation: "landscape",
    });

    const res = await fetch(`${PEXELS_API_URL}?${params}`, {
      headers: {
        Authorization: PEXELS_API_KEY,
        // Pexels guidelines: identify your application
        "User-Agent": "VideoGeneratorApp/1.0",
      },
    });

    if (res.status === 429) {
      console.warn("[ImagesEngine] Pexels rate-limited (429)");
      return null;
    }

    if (!res.ok) {
      console.warn(`[ImagesEngine] Pexels HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as PexelsResponse;

    if (!data.photos?.length) {
      console.warn(`[ImagesEngine] Pexels no results for: "${query}"`);
      return null;
    }

    // Pick a random photo from top 5 results to add variety
    const photo = data.photos[Math.floor(Math.random() * data.photos.length)];

    // Guard: array indexing can return undefined in strict TS
    if (!photo) {
      console.warn(`[ImagesEngine] Pexels photo selection failed for: "${query}"`);
      return null;
    }

    const imageUrl = photo.src.large2x || photo.src.large;

    const resolved: ResolvedImage = {
      url: imageUrl,
      source: "pexels",
      attribution: {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsPageUrl: photo.url,
        photoId: photo.id,
      },
    };

    pexelsCache.set(cacheKey, resolved);
    console.log(
      `[ImagesEngine] ✓ Pexels: "${query}" → ${imageUrl.slice(0, 60)}… (by ${photo.photographer})`,
    );
    return resolved;
  } catch (err) {
    console.warn(`[ImagesEngine] Pexels fetch error: ${err}`);
    return null;
  }
}

// ── Picsum (fallback) ─────────────────────────────────────────────────────────

export function buildPicsumUrl(seed: string, w = 1280, h = 720): string {
  // Sanitize: keep only alphanumeric + hyphens, max 60 chars
  const clean = seed
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `https://picsum.photos/seed/${clean}/${w}/${h}.jpg`;
}

// ── User image resolution ─────────────────────────────────────────────────────

const USER_URL_PREFIX = "user://image-";

export function isUserImageUrl(url: string): boolean {
  return url.startsWith(USER_URL_PREFIX);
}

export function resolveUserImageUrl(
  url: string,
  userImages: UserImage[],
): string | null {
  const indexStr = url.replace(USER_URL_PREFIX, "");
  const index = parseInt(indexStr, 10);

  // 1. Check if the parse failed
  if (isNaN(index)) return null;

  // 2. Access the item first
  const image = userImages[index];

  // 3. Verify the image actually exists at that index
  if (!image) {
    console.warn(`[ImagesEngine] No user image found at index ${index}`);
    return null;
  }

  return image.url;
}

// ── Seed URL helpers ──────────────────────────────────────────────────────────

/**
 * The LLM emits image URLs in the form "seed:dense-forest-river".
 * This prefix tells the resolver to look up the best image for that topic.
 */
export const SEED_URL_PREFIX = "seed:";

export function isSeedUrl(url: string): boolean {
  return url.startsWith(SEED_URL_PREFIX);
}

export function extractSeedFromUrl(url: string): string {
  return url.slice(SEED_URL_PREFIX.length).trim() || "abstract";
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves a seed string to the best available image URL.
 * Order: Pexels → Picsum fallback
 *
 * Use `resolveUserImageUrl` separately for user:// URLs (before calling this).
 */
export async function resolveImageUrl(
  seed: string,
  w = 1280,
  h = 720,
): Promise<string> {
  // Convert hyphenated seed to a natural query, e.g. "dense-forest-river" → "dense forest river"
  const query = seed.replace(/-/g, " ").trim();

  const pexelsResult = await fetchPexelsImage(query);
  if (pexelsResult) return pexelsResult.url;

  // Picsum as unconditional fallback
  return buildPicsumUrl(seed, w, h);
}

// ── Single URL resolver ───────────────────────────────────────────────────────
// Extracted as a top-level function so TypeScript sees stable parameter types
// and doesn't lose narrowing through closure mutation.

import type { VideoJson } from "@/remotion-src/types";

const PICSUM_BASE = "https://picsum.photos/seed/";

async function resolveUrl(url: string, userImages: UserImage[]): Promise<string> {
  // 1. User image reference — highest priority, resolve directly
  if (isUserImageUrl(url)) {
    const resolved = resolveUserImageUrl(url, userImages);
    if (resolved) {
      console.log(`[ImagesEngine] ✓ User image: ${url} → ${resolved.slice(0, 60)}…`);
      return resolved;
    }
    console.warn(`[ImagesEngine] Could not resolve user image URL: ${url}`);
    return buildPicsumUrl("abstract-background", 1280, 720);
  }

  // 2. Seed URL — the preferred LLM output format: "seed:dense-forest-river"
  if (isSeedUrl(url)) {
    const seed = extractSeedFromUrl(url);
    console.log(`[ImagesEngine] Resolving seed URL: "${url}" → seed="${seed}"`);
    return resolveImageUrl(seed);
  }

  // 3. Legacy full Picsum URL — extract seed and try Pexels first
  if (url.startsWith(PICSUM_BASE)) {
    const remainder = url.replace(PICSUM_BASE, "");
    const seed = remainder.split("/").at(0) ?? "abstract";
    console.log(`[ImagesEngine] Legacy Picsum URL, extracted seed="${seed}"`);
    return resolveImageUrl(seed);
  }

  // 4. Any other URL (Pexels CDN direct, etc.) → return as-is
  return url;
}

// ── Batch post-process: resolve all image URLs in a VideoJson ────────────────
// Called after LLM generation, before returning to client.
// Replaces:
//   - seed:words        → Pexels (if available) or Picsum
//   - user://image-N    → actual user image URLs
//   - picsum full URLs  → Pexels (if available) or same Picsum URL (legacy support)

export async function resolveAllImageUrls(
  videoJson: VideoJson,
  userImages: UserImage[] = [],
): Promise<VideoJson> {
  const processedScenes = await Promise.all(
    videoJson.scenes.map(async (scene) => {
      // ── Background ──────────────────────────────────────────────────────────
      // Capture as a const before the async boundary so TypeScript can narrow
      // the discriminated union type. Accessing scene.background inside an async
      // callback defeats narrowing because the property is mutable.
      const bg = scene.background;
      const resolvedBackground =
        bg.type === "image" && bg.url
          ? { ...bg, url: await resolveUrl(bg.url, userImages) }
          : bg;

      // ── Elements ────────────────────────────────────────────────────────────
      const resolvedElements = await Promise.all(
        (scene.elements ?? []).map(async (el) => {
          if (el.type === "image" && el.url) {
            return { ...el, url: await resolveUrl(el.url, userImages) };
          }
          return el;
        }),
      );

      return {
        ...scene,
        background: resolvedBackground,
        elements: resolvedElements,
      };
    }),
  );

  return { ...videoJson, scenes: processedScenes };
}