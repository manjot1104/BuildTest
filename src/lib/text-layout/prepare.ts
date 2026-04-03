import type { PreparedSegments, SegmentKind, TypographyStyle } from "./types"

const segmentWidthCaches = new Map<string, Map<string, number>>()
const preparedBlockCache = new Map<string, PreparedSegments>()

let measureContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined

function getCanvasContext():
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null {
  if (measureContext !== undefined) return measureContext

  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const c = new OffscreenCanvas(1, 1)
      measureContext = c.getContext("2d")
      return measureContext
    } catch {
      measureContext = null
      return null
    }
  }

  if (typeof document !== "undefined") {
    const c = document.createElement("canvas")
    measureContext = c.getContext("2d")
    return measureContext
  }

  measureContext = null
  return null
}

export function clearPrepareCaches(): void {
  segmentWidthCaches.clear()
  preparedBlockCache.clear()
  measureContext = undefined
}

function fontCss(style: TypographyStyle): string {
  const weight = style.fontWeight ?? "normal"
  return `${weight} ${style.fontSize}px ${style.fontFamily}`
}

function measureKey(style: TypographyStyle): string {
  return `${style.fontWeight ?? "normal"}|${style.fontSize}|${style.fontFamily}`
}

function getWidthCache(fontKey: string): Map<string, number> {
  let m = segmentWidthCaches.get(fontKey)
  if (!m) {
    m = new Map()
    segmentWidthCaches.set(fontKey, m)
  }
  return m
}

/** Deterministic fallback when canvas/`measureText` is unavailable (Node, workers without canvas). */
export function approximateTextWidth(text: string, fontSize: number, fontWeight: string | undefined): number {
  const w = fontWeight === "bold" || fontWeight === "700" || fontWeight === "600" ? 1.06 : 1
  const avgChar = fontSize * 0.52 * w
  const space = fontSize * 0.28
  let total = 0
  for (const ch of text) {
    total += ch === " " ? space : avgChar
  }
  return total
}

export function measureUsingPrepared(
  text: string,
  prepared: PreparedSegments,
  forceApproximateMetrics: boolean,
): number {
  return measureSegment(
    text,
    prepared.measureKey,
    prepared.fontCss,
    !forceApproximateMetrics,
    prepared.fontSize,
    prepared.fontWeight,
  )
}

function measureSegment(
  text: string,
  fontKey: string,
  fontCssString: string,
  useCanvas: boolean,
  fontSize: number,
  fontWeight: string | undefined,
): number {
  const cache = getWidthCache(fontKey)
  const hit = cache.get(text)
  if (hit !== undefined) return hit

  let width: number
  if (useCanvas) {
    const ctx = getCanvasContext()
    if (ctx) {
      ctx.font = fontCssString
      width = ctx.measureText(text).width
    } else {
      width = approximateTextWidth(text, fontSize, fontWeight)
    }
  } else {
    width = approximateTextWidth(text, fontSize, fontWeight)
  }

  cache.set(text, width)
  return width
}

function normalizeParagraph(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  return collapsed
}

let sharedWordSegmenter: Intl.Segmenter | undefined
let segmenterLocale: string | undefined

function getWordSegmenter(locale?: string): Intl.Segmenter {
  const next = locale && locale.length > 0 ? locale : undefined
  if (sharedWordSegmenter && segmenterLocale === next) return sharedWordSegmenter
  segmenterLocale = next
  sharedWordSegmenter = new Intl.Segmenter(segmenterLocale, { granularity: "word" })
  return sharedWordSegmenter
}

/**
 * Prepare phase (pretext-style): normalize, segment with `Intl.Segmenter`, measure each segment once and cache.
 * Same text + typography → same prepared buffers; layout can run at any width without remeasuring.
 */
export function prepareText(
  raw: string,
  style: TypographyStyle,
  options?: { forceApproximateMetrics?: boolean; locale?: string },
): PreparedSegments {
  const normalized = normalizeParagraph(raw)
  const fCss = fontCss(style)
  const mKey = measureKey(style)
  const useCanvas = options?.forceApproximateMetrics !== true
  const lineHeightPx = (style.lineHeight ?? 1.35) * style.fontSize
  const localeKey = options?.locale ?? ""
  const modeKey = options?.forceApproximateMetrics === true ? "a" : "c"
  const blockKey = `${mKey}|${localeKey}|${modeKey}|${normalized}`
  const cached = preparedBlockCache.get(blockKey)
  if (cached) return cached

  if (normalized.length === 0) {
    const empty: PreparedSegments = {
      texts: [],
      widths: [],
      kinds: [],
      fontCss: fCss,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeightPx,
      measureKey: mKey,
      normalized,
    }
    preparedBlockCache.set(blockKey, empty)
    return empty
  }

  const segmenter = getWordSegmenter(options?.locale)
  const texts: string[] = []
  const widths: number[] = []
  const kinds: SegmentKind[] = []

  for (const seg of segmenter.segment(normalized)) {
    const s = seg.segment
    if (s.length === 0) continue
    const isWord = seg.isWordLike === true
    const kind: SegmentKind = isWord ? "word" : "space"
    const w = measureSegment(s, mKey, fCss, useCanvas, style.fontSize, style.fontWeight)
    texts.push(s)
    widths.push(w)
    kinds.push(kind)
  }

  const prepared: PreparedSegments = {
    texts,
    widths,
    kinds,
    fontCss: fCss,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeightPx,
    measureKey: mKey,
    normalized,
  }
  preparedBlockCache.set(blockKey, prepared)
  return prepared
}
