import type { PreparedSegments, SegmentKind } from "./types"
import { measureUsingPrepared } from "./prepare"

/** Fixed tolerance (pretext non-Safari default) for stable, deterministic wrapping. */
const LINE_FIT_EPSILON = 0.005

export type TextLine = {
  text: string
  width: number
  fontSize: number
  fontWeight?: string
  lineHeightPx: number
}

let sharedGraphemeSegmenter: Intl.Segmenter | undefined

function graphemesOf(text: string): string[] {
  if (sharedGraphemeSegmenter === undefined) {
    sharedGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
  }
  const out: string[] = []
  for (const g of sharedGraphemeSegmenter.segment(text)) {
    out.push(g.segment)
  }
  return out
}

function isSpaceOnly(s: string): boolean {
  return /^\s+$/.test(s)
}

function emitLine(
  parts: string[],
  wsum: number,
  prepared: PreparedSegments,
  forceApproximateMetrics: boolean,
  out: TextLine[],
): void {
  while (parts.length > 0 && isSpaceOnly(parts[parts.length - 1]!)) {
    const sp = parts.pop()!
    wsum -= measureUsingPrepared(sp, prepared, forceApproximateMetrics)
  }
  if (parts.length === 0) return
  const text = parts.join("")
  out.push({
    text,
    width: wsum,
    fontSize: prepared.fontSize,
    fontWeight: prepared.fontWeight,
    lineHeightPx: prepared.lineHeightPx,
  })
}

function layoutOversizedWord(
  word: string,
  prepared: PreparedSegments,
  maxWidth: number,
  forceApproximateMetrics: boolean,
  out: TextLine[],
): void {
  const gs = graphemesOf(word)
  let gbuf = ""
  let gw = 0
  for (const g of gs) {
    const gmw = measureUsingPrepared(g, prepared, forceApproximateMetrics)
    if (gmw > maxWidth + LINE_FIT_EPSILON) {
      if (gbuf.length > 0) {
        emitLine([gbuf], gw, prepared, forceApproximateMetrics, out)
        gbuf = ""
        gw = 0
      }
      out.push({
        text: g,
        width: gmw,
        fontSize: prepared.fontSize,
        fontWeight: prepared.fontWeight,
        lineHeightPx: prepared.lineHeightPx,
      })
      continue
    }
    if (gbuf.length > 0 && gw + gmw > maxWidth + LINE_FIT_EPSILON) {
      emitLine([gbuf], gw, prepared, forceApproximateMetrics, out)
      gbuf = g
      gw = gmw
    } else {
      gbuf += g
      gw += gmw
    }
  }
  if (gbuf.length > 0) {
    out.push({
      text: gbuf,
      width: gw,
      fontSize: prepared.fontSize,
      fontWeight: prepared.fontWeight,
      lineHeightPx: prepared.lineHeightPx,
    })
  }
}

/**
 * Layout phase: pure geometry on prepared widths (plus grapheme fallback for overflow-wrap).
 * No canvas in the hot path beyond grapheme cache lookups.
 */
export function layoutParagraph(
  prepared: PreparedSegments,
  maxWidth: number,
  forceApproximateMetrics: boolean,
): TextLine[] {
  const { texts, widths, kinds } = prepared
  const n = texts.length
  if (n === 0) return []

  const lines: TextLine[] = []
  const parts: string[] = []
  let wsum = 0
  let i = 0

  const normalizeStart = (): void => {
    while (i < n && kinds[i] === "space") {
      i++
    }
  }

  normalizeStart()

  while (i < n) {
    const t = texts[i]!
    const tw = widths[i]!
    const k = kinds[i]! as SegmentKind

    if (k === "space") {
      if (parts.length === 0) {
        i++
        continue
      }
      if (wsum + tw <= maxWidth + LINE_FIT_EPSILON) {
        parts.push(t)
        wsum += tw
        i++
        continue
      }
      emitLine(parts, wsum, prepared, forceApproximateMetrics, lines)
      parts.length = 0
      wsum = 0
      i++
      normalizeStart()
      continue
    }

    if (parts.length === 0 && tw > maxWidth + LINE_FIT_EPSILON) {
      layoutOversizedWord(t, prepared, maxWidth, forceApproximateMetrics, lines)
      i++
      normalizeStart()
      continue
    }

    if (wsum + tw <= maxWidth + LINE_FIT_EPSILON) {
      parts.push(t)
      wsum += tw
      i++
      continue
    }

    if (parts.length > 0) {
      emitLine(parts, wsum, prepared, forceApproximateMetrics, lines)
      parts.length = 0
      wsum = 0
      continue
    }

    layoutOversizedWord(t, prepared, maxWidth, forceApproximateMetrics, lines)
    i++
    normalizeStart()
  }

  emitLine(parts, wsum, prepared, forceApproximateMetrics, lines)
  return lines
}
