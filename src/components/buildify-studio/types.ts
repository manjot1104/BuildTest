export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'section'
  | 'container'
  | 'divider'
  | 'spacer'
  | 'social-links'
  | 'video-embed'
  | 'icon'
  | 'navbar'
  | 'form'
  | 'code-block'
  | 'testimonial-block'
  | 'pricing-block'
  | 'hero-block'
  | 'stats-block'
  | 'feature-card'

export type EnterAnimation =
  | 'none'
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomIn'
  | 'bounce'

export type HoverAnimation = 'none' | 'scale' | 'lift' | 'outline'

/** @deprecated use EnterAnimation */
export type AnimationType = EnterAnimation

export type SocialPlatform =
  | 'github'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'discord'
  | 'website'
  | 'email'

export interface SocialLinkItem {
  platform: SocialPlatform
  url: string
}

export interface FormField {
  id: string
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
}

export interface ElementLink {
  enabled: boolean
  href: string
  target: '_blank' | '_self'
}

export interface ElementStyles {
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  borderRadius?: number
  opacity?: number
  border?: string
  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  letterSpacing?: number
  lineHeight?: number
  objectFit?: 'cover' | 'contain' | 'fill'
  boxShadow?: string
  textDecoration?: string
  gradientType?: 'none' | 'linear' | 'radial'
  gradientFrom?: string
  gradientTo?: string
  gradientAngle?: number
  overflow?: 'hidden' | 'visible' | 'auto'
  iconSize?: number
  iconColor?: string
  gap?: number
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between'
  alignItems?: 'flex-start' | 'center' | 'flex-end'
  // Video element properties
  videoAutoplay?: boolean
  videoLoop?: boolean
  videoMuted?: boolean
}

/** Per-device overrides for responsive design. Only specified properties override the base (desktop) values. */
export interface ResponsiveOverride {
  x?: number
  y?: number
  width?: number
  height?: number
  hidden?: boolean
  styles?: Partial<ElementStyles>
  /** When true, the user manually positioned this element on this device — skip auto-reflow */
  manuallyPositioned?: boolean
}

export type ResponsiveDevice = 'desktop' | 'tablet' | 'mobile'

/** How children of a section/container should flow in the published page */
export type LayoutHint = 'stack' | 'row' | 'grid'

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  content: string
  styles: ElementStyles
  enterAnimation: EnterAnimation
  hoverAnimation: HoverAnimation
  link: ElementLink
  zIndex: number
  locked?: boolean
  hidden?: boolean
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  socialLinks?: SocialLinkItem[]
  formFields?: FormField[]
  iconName?: string
  templateBlockId?: string
  sectionKey?: string
  /** Parent section/container ID — enables semantic grouping for published page */
  parentId?: string
  /** Logical group within a section (e.g. "card-1") — keeps elements together on mobile */
  groupId?: string
  /** How children should flow in published view (for section/container elements) */
  layoutHint?: LayoutHint
  /** Number of grid columns (when layoutHint is 'grid') */
  gridColumns?: number
  /** Responsive overrides — tablet/mobile values merged on top of base (desktop) */
  responsiveStyles?: {
    tablet?: ResponsiveOverride
    mobile?: ResponsiveOverride
  }
}

/** Device base widths used for proportional auto-scaling. */
export const DEVICE_WIDTHS: Record<ResponsiveDevice, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

/**
 * Resolve an element's effective properties for the given device.
 * - Explicit overrides take precedence.
 * - Otherwise x & width are proportionally scaled to the target device width
 *   so layouts automatically adapt without manual overrides.
 */
export function getResponsiveElement(
  el: CanvasElement,
  device: ResponsiveDevice,
  desktopWidth = 1440,
): CanvasElement {
  if (device === 'desktop') return el

  const targetWidth = DEVICE_WIDTHS[device]
  const ratio = targetWidth / desktopWidth
  const overrides = el.responsiveStyles?.[device]

  // Auto-scale font size — keep readable on small screens (min 75% of original)
  const autoFontSize =
    el.styles.fontSize !== undefined
      ? Math.round(el.styles.fontSize * Math.max(ratio, 0.75))
      : undefined

  const autoPadding =
    el.styles.padding !== undefined
      ? Math.round(el.styles.padding * Math.max(ratio, 0.6))
      : undefined

  // Auto-scale letter-spacing proportionally so wide-spaced labels don't break into
  // vertical text when squeezed on mobile. Cap at 1px on mobile.
  const autoLetterSpacing =
    el.styles.letterSpacing !== undefined && el.styles.letterSpacing > 0
      ? Math.max(Math.round(el.styles.letterSpacing * ratio * 10) / 10, device === 'mobile' ? 0.5 : 1)
      : undefined

  return {
    ...el,
    x: overrides?.x ?? Math.round(el.x * ratio),
    y: overrides?.y ?? el.y,
    width: overrides?.width ?? Math.max(Math.round(el.width * ratio), 40),
    height: overrides?.height ?? el.height,
    hidden: overrides?.hidden ?? el.hidden,
    styles: {
      ...el.styles,
      ...(autoFontSize !== undefined ? { fontSize: autoFontSize } : {}),
      ...(autoPadding !== undefined ? { padding: autoPadding } : {}),
      ...(autoLetterSpacing !== undefined ? { letterSpacing: autoLetterSpacing } : {}),
      ...overrides?.styles,
    },
  }
}

/**
 * Compute a fully-reflowed responsive layout for ALL elements.
 *
 * Key improvement: respects `groupId` to keep logically-grouped elements together
 * (e.g. project card = image + title + description stay as a unit on mobile).
 *
 * Mobile: groups desktop elements into rows, then stacks them vertically
 *         making most elements full-width for readability.
 * Tablet: groups into rows, keeps elements side-by-side if they fit,
 *         otherwise stacks vertically.
 *
 * Returns a new array of CanvasElements (same indices) with resolved positions & styles.
 */
export function computeResponsiveLayout(
  elements: CanvasElement[],
  device: ResponsiveDevice,
  desktopWidth = 1440,
): CanvasElement[] {
  if (device === 'desktop') return elements

  const targetWidth = DEVICE_WIDTHS[device]
  const ratio = targetWidth / desktopWidth
  const gap = 12
  const margin = device === 'mobile' ? 10 : 16
  const maxW = targetWidth - margin * 2

  // Step 1: Apply per-element responsive style/font scaling.
  const scaled: CanvasElement[] = elements.map((el) =>
    getResponsiveElement(el, device, desktopWidth),
  )

  // Step 1b: Auto-fix elements that break mobile/tablet layouts.
  for (let i = 0; i < scaled.length; i++) {
    const orig = elements[i]!
    const s = scaled[i]!
    if (s.hidden) continue

    // Auto-hide decorative sections/containers (background shapes, section backgrounds)
    // that are purely visual and oversized.
    const isDecorative = (orig.type === 'section' || orig.type === 'container') && !orig.content.trim() && !orig.sectionKey
    const isOversized = orig.width >= desktopWidth * 0.9 || (orig.width >= 400 && orig.height >= 400)
    if (isDecorative && isOversized) {
      scaled[i] = { ...s, hidden: true }
      continue
    }

    // Auto-cap image height
    if (device === 'mobile' && orig.type === 'image' && !orig.responsiveStyles?.mobile?.height) {
      const maxImgH = Math.round(targetWidth * 0.6)
      if (s.height > maxImgH) scaled[i] = { ...s, height: maxImgH }
    }
    if (device === 'tablet' && orig.type === 'image' && !orig.responsiveStyles?.tablet?.height) {
      const maxImgH = Math.round(targetWidth * 0.55)
      if (s.height > maxImgH) scaled[i] = { ...s, height: maxImgH }
    }

    // Auto-grow text element height when squeezed to narrower width.
    // When a wide heading (680px) goes to 355px mobile, text wraps and needs more height.
    // Always run this for text elements — even if they have an explicit responsive height,
    // the explicit value may be too small for the actual wrapped text.
    const isTextType = orig.type === 'heading' || orig.type === 'paragraph'
    if (isTextType && orig.content.trim()) {
      const origW = orig.width
      const newW = Math.max(targetWidth - margin * 2, 40)
      // Estimate how many lines the text will need at the target width
      const fs = s.styles.fontSize ?? (orig.type === 'heading' ? 48 : 16)
      const lh = s.styles.lineHeight ?? (orig.type === 'heading' ? 1.2 : 1.6)
      const lineH = fs * (typeof lh === 'number' ? lh : 1.4)
      const padding = (s.styles.padding ?? 4) * 2
      const textLen = orig.content.length
      // Average character width: bold/heavy text is wider (~65% of font size), normal is ~50%
      const isBold = s.styles.fontWeight && parseInt(s.styles.fontWeight) >= 700
      const charWidthRatio = isBold ? 0.65 : 0.50
      const charsPerLine = Math.max(1, Math.floor(newW / (fs * charWidthRatio)))
      const lineCount = Math.max(1, Math.ceil(textLen / charsPerLine))
      // Also count explicit newlines
      const newlineCount = (orig.content.match(/\n/g) ?? []).length
      const totalLines = Math.max(lineCount, newlineCount + 1)
      // Add 30% safety margin — character width estimation is inherently imprecise
      const estimatedH = Math.ceil(totalLines * lineH * 1.3 + padding)
      if (estimatedH > s.height) {
        scaled[i] = { ...s, height: estimatedH }
      }
    }
  }

  // Step 2: Separate manually positioned elements from auto-laid-out ones
  const positions = new Array<{ x: number; y: number; w: number; h: number } | null>(
    elements.length,
  ).fill(null)

  type Item = { orig: CanvasElement; scaled: CanvasElement; idx: number }
  const autoItems: Item[] = []

  for (let i = 0; i < elements.length; i++) {
    const orig = elements[i]!
    const s = scaled[i]!
    if (s.hidden) continue

    const overrides = orig.responsiveStyles?.[device]
    if (overrides?.manuallyPositioned) {
      // User explicitly placed this — keep their position
      positions[i] = { x: s.x, y: s.y, w: s.width, h: s.height }
    } else {
      autoItems.push({ orig, scaled: s, idx: i })
    }
  }

  // Step 3: Check if elements use groupId for semantic grouping
  const hasGroups = autoItems.some((item) => item.orig.groupId)

  if (hasGroups) {
    // ── Group-aware layout ──
    // Collect items into groups (by parentId + groupId), and ungrouped items
    type Group = { groupId: string; parentId?: string; items: Item[] }
    const groupMap = new Map<string, Group>()
    const ungrouped: Item[] = []

    for (const item of autoItems) {
      if (item.orig.groupId) {
        const key = `${item.orig.parentId ?? ''}::${item.orig.groupId}`
        if (!groupMap.has(key)) {
          groupMap.set(key, { groupId: item.orig.groupId, parentId: item.orig.parentId, items: [] })
        }
        groupMap.get(key)!.items.push(item)
      } else {
        ungrouped.push(item)
      }
    }

    // Sort items within each group by Y then X (desktop reading order)
    for (const group of groupMap.values()) {
      group.items.sort((a, b) => a.orig.y - b.orig.y || a.orig.x - b.orig.x)
    }

    // Build a mixed list of "layout units" (a group or a single element)
    type LayoutUnit = { kind: 'group'; group: Group; topY: number } | { kind: 'single'; item: Item; topY: number }
    const units: LayoutUnit[] = []

    for (const group of groupMap.values()) {
      const topY = Math.min(...group.items.map((i) => i.orig.y))
      units.push({ kind: 'group', group, topY })
    }
    for (const item of ungrouped) {
      units.push({ kind: 'single', item, topY: item.orig.y })
    }

    // Sort units by desktop Y position
    units.sort((a, b) => a.topY - b.topY)

    // Group units into visual rows by Y overlap (same logic as before, but operating on units)
    type UnitRow = LayoutUnit[]
    const unitRows: UnitRow[] = []
    let currentUnitRow: UnitRow = []

    for (const unit of units) {
      if (currentUnitRow.length === 0) {
        currentUnitRow.push(unit)
        continue
      }
      const rowTopY = Math.min(...currentUnitRow.map((u) => u.topY))
      // Use a generous threshold for grouping units into the same row
      const threshold = 80
      if (unit.topY < rowTopY + threshold) {
        currentUnitRow.push(unit)
      } else {
        unitRows.push(currentUnitRow)
        currentUnitRow = [unit]
      }
    }
    if (currentUnitRow.length > 0) unitRows.push(currentUnitRow)

    // Lay out unit rows
    let cursorY = unitRows[0]?.[0]?.topY ?? 0

    for (let ri = 0; ri < unitRows.length; ri++) {
      const unitRow = unitRows[ri]!

      if (ri > 0) {
        cursorY += gap * 2
      }

      if (device === 'mobile') {
        // Mobile: stack all units vertically. Within a group, stack elements vertically (card layout).
        for (const unit of unitRow) {
          if (unit.kind === 'group') {
            // Render group as a card: elements stacked vertically, full width
            for (const item of unit.group.items) {
              const w = maxW
              const x = margin
              positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
              cursorY += item.scaled.height + gap
            }
            cursorY += gap // extra gap between cards
          } else {
            const item = unit.item
            const isSmall = item.orig.width < 120 && item.orig.height < 80
            const w = isSmall ? Math.min(item.scaled.width, maxW) : maxW
            const x = isSmall ? Math.round((targetWidth - w) / 2) : margin
            positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
            cursorY += item.scaled.height + gap
          }
        }
      } else {
        // Tablet: try to fit groups side by side
        const unitCount = unitRow.length
        if (unitCount > 1) {
          const perUnitWidth = Math.floor((maxW - gap * (unitCount - 1)) / unitCount)
          let xPos = margin
          let maxRowH = 0

          for (const unit of unitRow) {
            if (unit.kind === 'group') {
              let innerY = cursorY
              for (const item of unit.group.items) {
                positions[item.idx] = { x: xPos, y: innerY, w: perUnitWidth, h: item.scaled.height }
                innerY += item.scaled.height + gap
              }
              maxRowH = Math.max(maxRowH, innerY - cursorY)
            } else {
              positions[unit.item.idx] = { x: xPos, y: cursorY, w: perUnitWidth, h: unit.item.scaled.height }
              maxRowH = Math.max(maxRowH, unit.item.scaled.height + gap)
            }
            xPos += perUnitWidth + gap
          }
          cursorY += maxRowH
        } else {
          // Single unit in row — full width, stack children
          const unit = unitRow[0]!
          if (unit.kind === 'group') {
            for (const item of unit.group.items) {
              const w = maxW
              positions[item.idx] = { x: margin, y: cursorY, w, h: item.scaled.height }
              cursorY += item.scaled.height + gap
            }
          } else {
            const item = unit.item
            const isSubstantial = item.orig.width > 200
            const w = isSubstantial ? maxW : Math.min(item.scaled.width, maxW)
            const x = isSubstantial ? margin : Math.round((targetWidth - w) / 2)
            positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
            cursorY += item.scaled.height + gap
          }
        }
      }
    }
  } else {
    // ── Legacy layout (no groupId) — original Y-overlap row grouping ──
    const HEIGHT_CAP = 200
    const visible = autoItems.sort((a, b) => {
      const threshold = Math.min(a.orig.height, b.orig.height) * 0.3
      if (Math.abs(a.orig.y - b.orig.y) < Math.max(threshold, 20))
        return a.orig.x - b.orig.x
      return a.orig.y - b.orig.y
    })

    const rows: Item[][] = []
    let currentRow: Item[] = []
    for (const item of visible) {
      if (currentRow.length === 0) {
        currentRow.push(item)
        continue
      }
      const rowTop = Math.min(...currentRow.map((r) => r.orig.y))
      const rowBottom = Math.max(...currentRow.map((r) => r.orig.y + Math.min(r.orig.height, HEIGHT_CAP)))
      const itemEffH = Math.min(item.orig.height, HEIGHT_CAP)
      const overlap = Math.min(rowBottom - rowTop, itemEffH) * 0.3
      if (item.orig.y < rowBottom - overlap) {
        currentRow.push(item)
      } else {
        rows.push(currentRow)
        currentRow = [item]
      }
    }
    if (currentRow.length > 0) rows.push(currentRow)

    // Auto-detect column patterns: when consecutive rows have elements at matching
    // X positions (e.g. 3 images at x=100,520,940 then 3 titles at x=100,520,940),
    // regroup into columns so mobile renders as cards instead of row-by-row.
    if (device === 'mobile' && rows.length >= 2) {
      const columnsDetected: Item[][] = []
      let ri = 0

      while (ri < rows.length) {
        const row = rows[ri]!

        // Check if this row + next rows form a grid pattern (same X positions, same count)
        if (row.length >= 2 && ri + 1 < rows.length) {
          const xPositions = row.map((item) => item.orig.x).sort((a, b) => a - b)
          let gridRows = [row]
          let nextRi = ri + 1

          while (nextRi < rows.length) {
            const nextRow = rows[nextRi]!
            if (nextRow.length !== row.length) break
            const nextXs = nextRow.map((item) => item.orig.x).sort((a, b) => a - b)
            // Check if X positions match within tolerance (50px)
            const matches = xPositions.every((x, i) => Math.abs(x - (nextXs[i] ?? 0)) < 50)
            if (matches) {
              gridRows.push(nextRow)
              nextRi++
            } else {
              break
            }
          }

          if (gridRows.length >= 2) {
            // Detected a grid! Regroup into columns
            const colCount = row.length
            for (let ci = 0; ci < colCount; ci++) {
              const column: Item[] = []
              for (const gridRow of gridRows) {
                // Find the element in this row closest to the target X
                const targetX = xPositions[ci]!
                const closest = gridRow.reduce((best, item) =>
                  Math.abs(item.orig.x - targetX) < Math.abs(best.orig.x - targetX) ? item : best
                )
                column.push(closest)
              }
              columnsDetected.push(column)
            }
            ri = nextRi
            continue
          }
        }

        // Not a grid row — keep as-is (single items)
        for (const item of row) {
          columnsDetected.push([item])
        }
        ri++
      }

      // Replace the layout logic: stack columns vertically
      let cursorY = columnsDetected[0]?.[0]?.orig.y ?? 0
      for (let ci = 0; ci < columnsDetected.length; ci++) {
        const col = columnsDetected[ci]!
        if (ci > 0) cursorY += gap * 2

        for (const item of col) {
          const w = maxW
          const x = margin
          positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
          cursorY += item.scaled.height + gap
        }
      }
    } else {
    // Reorder within rows: text before media on mobile (fallback for non-mobile)
    if (device === 'mobile') {
      const textTypes = new Set(['heading', 'paragraph', 'button', 'navbar', 'social-links', 'form', 'divider', 'spacer'])
      for (const row of rows) {
        if (row.length <= 1) continue
        const textEls = row.filter((item) => textTypes.has(item.orig.type))
        const mediaEls = row.filter((item) => !textTypes.has(item.orig.type))
        if (textEls.length > 0 && mediaEls.length > 0) {
          row.length = 0
          row.push(...textEls, ...mediaEls)
        }
      }
    }

    let cursorY = rows[0]?.[0]?.orig.y ?? 0

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]!

      if (ri > 0) {
        const prevRow = rows[ri - 1]!
        const prevBottom = Math.max(...prevRow.map((r) => r.orig.y + r.orig.height))
        const thisTop = Math.min(...row.map((r) => r.orig.y))
        const desktopGap = thisTop - prevBottom
        cursorY += Math.max(gap, Math.min(desktopGap, gap * 4))
      }

      if (device === 'mobile') {
        for (const item of row) {
          const isSmall = item.orig.width < 120 && item.orig.height < 80
          const w = isSmall ? Math.min(item.scaled.width, maxW) : maxW
          const x = isSmall ? Math.round((targetWidth - w) / 2) : margin
          positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
          cursorY += item.scaled.height + gap
        }
      } else {
        const scaledWidths = row.map((item) => Math.min(item.scaled.width, maxW))
        const totalW = scaledWidths.reduce((s, w) => s + w, 0) + gap * (row.length - 1)

        if (totalW <= maxW && row.length > 1) {
          let xPos = margin
          const rowH = Math.max(...row.map((item) => item.scaled.height))
          for (let ci = 0; ci < row.length; ci++) {
            const item = row[ci]!
            positions[item.idx] = { x: xPos, y: cursorY, w: scaledWidths[ci]!, h: item.scaled.height }
            xPos += scaledWidths[ci]! + gap
          }
          cursorY += rowH + gap
        } else {
          for (const item of row) {
            const isSubstantial = item.orig.width > 200
            const w = isSubstantial ? maxW : Math.min(item.scaled.width, maxW)
            const x = isSubstantial ? margin : Math.round((targetWidth - w) / 2)
            positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
            cursorY += item.scaled.height + gap
          }
        }
      }
    }
    } // close else for column-detection
  } // close else for hasGroups

  // Final: Merge positions back, preserving hidden elements unchanged
  return elements.map((el, i) => {
    const s = scaled[i]!
    const p = positions[i]
    if (!p) return s // hidden or skipped
    return { ...s, x: p.x, y: p.y, width: p.w, height: p.h }
  })
}

export type DevicePreset = 'desktop' | 'tablet' | 'mobile' | 'custom'

export interface DeviceConfig {
  preset: DevicePreset
  width: number
  height: number
}

export interface CanvasBackground {
  type: 'solid' | 'gradient' | 'image'
  color: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  imageUrl: string
}

export interface GridSettings {
  enabled: boolean
  snap: boolean
  size: number
}

export interface EditorState {
  elements: CanvasElement[]
  selectedIds: string[]
  zoom: number
  panX: number
  panY: number
  isPreview: boolean
  history: CanvasElement[][]
  historyIndex: number
  isDirty: boolean
  device: DeviceConfig
  canvasBackground: CanvasBackground
  grid: GridSettings
  themeId: string
}

export type EditorAction =
  | { type: 'ADD_ELEMENT'; element: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<CanvasElement> }
  | { type: 'UPDATE_ELEMENT_NO_HISTORY'; id: string; updates: Partial<CanvasElement> }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'DELETE_SELECTED' }
  | { type: 'SELECT_ELEMENT'; id: string | null }
  | { type: 'SELECT_ELEMENTS'; ids: string[] }
  | { type: 'TOGGLE_SELECT_ELEMENT'; id: string }
  | { type: 'REORDER_ELEMENTS'; fromIndex: number; toIndex: number }
  | { type: 'DUPLICATE_ELEMENTS'; ids: string[] }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; panX: number; panY: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PREVIEW'; isPreview: boolean }
  | { type: 'BRING_FORWARD'; id: string }
  | { type: 'SEND_BACKWARD'; id: string }
  | { type: 'LOAD_LAYOUT'; elements: CanvasElement[]; background?: CanvasBackground }
  | { type: 'SET_DIRTY'; isDirty: boolean }
  | { type: 'SET_DEVICE'; device: DeviceConfig }
  | { type: 'SET_CANVAS_BACKGROUND'; background: CanvasBackground }
  | { type: 'SET_GRID'; grid: GridSettings }
  | { type: 'ADD_ELEMENTS'; elements: CanvasElement[] }
  | { type: 'SET_THEME'; themeId: string }