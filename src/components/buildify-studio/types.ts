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
}

/** Per-device overrides for responsive design. Only specified properties override the base (desktop) values. */
export interface ResponsiveOverride {
  x?: number
  y?: number
  width?: number
  height?: number
  hidden?: boolean
  styles?: Partial<ElementStyles>
}

export type ResponsiveDevice = 'desktop' | 'tablet' | 'mobile'

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
 
  sectionKey?: string
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

  // Step 1: Apply per-element responsive style/font scaling (NOT position scaling —
  //         positions will be laid out by the reflow algorithm below).
  const scaled: CanvasElement[] = elements.map((el) =>
    getResponsiveElement(el, device, desktopWidth),
  )

  // Step 1b: Auto-fix elements that break mobile/tablet layouts.
  if (device === 'mobile' || device === 'tablet') {
    for (let i = 0; i < scaled.length; i++) {
      const orig = elements[i]!
      const s = scaled[i]!
      if (s.hidden) continue

      // Auto-hide decorative sections/containers (background shapes, section backgrounds)
      // that are purely visual and oversized.
      const isDecorative = (orig.type === 'section' || orig.type === 'container') && !orig.content.trim()
      const isOversized = orig.width >= desktopWidth * 0.9 || (orig.width >= 400 && orig.height >= 400)
      if (isDecorative && isOversized) {
        scaled[i] = { ...s, hidden: true }
        continue
      }

      // Auto-cap image height on mobile if the user hasn't set an explicit mobile height.
      // Without this, a 420px tall desktop image renders at 420px on a 375px wide screen.
      if (device === 'mobile' && orig.type === 'image' && !orig.responsiveStyles?.mobile?.height) {
        const maxImgH = Math.round(targetWidth * 0.6) // 60% of width = max ~225px on 375px
        if (s.height > maxImgH) {
          scaled[i] = { ...s, height: maxImgH }
        }
      }
      if (device === 'tablet' && orig.type === 'image' && !orig.responsiveStyles?.tablet?.height) {
        const maxImgH = Math.round(targetWidth * 0.55) // ~422px on 768px
        if (s.height > maxImgH) {
          scaled[i] = { ...s, height: maxImgH }
        }
      }
    }
  }

  // Step 2: Build reading order from DESKTOP positions (Y then X) and group into rows.
  // Use a capped "effective height" for row grouping to prevent tall side-by-side elements
  // (like a 420px image next to 100px text) from creating a mega-row that absorbs everything.
  const HEIGHT_CAP = 200 // Max height contribution for row boundary calculation
  type Item = { orig: CanvasElement; scaled: CanvasElement; idx: number }
  const visible: Item[] = elements
    .map((el, i) => ({ orig: el, scaled: scaled[i]!, idx: i }))
    .filter((item) => !item.scaled.hidden)
    .sort((a, b) => {
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
    // Use capped heights to prevent one tall element from absorbing the entire page
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

  // Step 2b: On mobile, reorder within each row so images/code-blocks come after text.
  // This produces a natural mobile reading order: heading → text → image
  // instead of the desktop X-sorted order which may put images before text.
  if (device === 'mobile') {
    const textTypes = new Set(['heading', 'paragraph', 'button', 'navbar', 'social-links', 'form', 'divider', 'spacer'])
    for (const row of rows) {
      if (row.length <= 1) continue
      const textEls = row.filter((item) => textTypes.has(item.orig.type))
      const mediaEls = row.filter((item) => !textTypes.has(item.orig.type))
      // Only reorder if there's a mix of text and media
      if (textEls.length > 0 && mediaEls.length > 0) {
        // Within text elements, keep their original sort order (by desktop Y then X)
        row.length = 0
        row.push(...textEls, ...mediaEls)
      }
    }
  }

  // Step 3: Lay out each row
  const positions = new Array<{ x: number; y: number; w: number; h: number } | null>(
    elements.length,
  ).fill(null)

  // Preserve the original first-element gap from the top
  let cursorY = rows[0]?.[0]?.orig.y ?? 0

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!

    // Preserve inter-row gaps from desktop (clamped so we don't get huge whitespace)
    if (ri > 0) {
      const prevRow = rows[ri - 1]!
      const prevBottom = Math.max(...prevRow.map((r) => r.orig.y + r.orig.height))
      const thisTop = Math.min(...row.map((r) => r.orig.y))
      const desktopGap = thisTop - prevBottom
      cursorY += Math.max(gap, Math.min(desktopGap, gap * 4))
    }

    if (device === 'mobile') {
      // ── Mobile: stack everything vertically, most elements full-width ──
      for (const item of row) {
        // Respect explicit user overrides
        if (
          item.orig.responsiveStyles?.mobile?.x !== undefined &&
          item.orig.responsiveStyles?.mobile?.y !== undefined
        ) {
          positions[item.idx] = {
            x: item.scaled.x,
            y: item.scaled.y,
            w: item.scaled.width,
            h: item.scaled.height,
          }
          continue
        }

        // Small elements (icons, small buttons) stay proportional & centered
        const isSmall = item.orig.width < 120 && item.orig.height < 80

        const w = isSmall ? Math.min(item.scaled.width, maxW) : maxW
        const x = isSmall ? Math.round((targetWidth - w) / 2) : margin

        positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
        cursorY += item.scaled.height + gap
      }
    } else {
      // ── Tablet: keep side-by-side if they fit, otherwise stack ──
      const scaledWidths = row.map((item) =>
        Math.min(item.scaled.width, maxW),
      )
      const totalW =
        scaledWidths.reduce((s, w) => s + w, 0) + gap * (row.length - 1)

      if (totalW <= maxW && row.length > 1) {
        // Row fits side by side
        let xPos = margin
        const rowH = Math.max(...row.map((item) => item.scaled.height))
        for (let ci = 0; ci < row.length; ci++) {
          const item = row[ci]!
          if (
            item.orig.responsiveStyles?.tablet?.x !== undefined &&
            item.orig.responsiveStyles?.tablet?.y !== undefined
          ) {
            positions[item.idx] = {
              x: item.scaled.x,
              y: item.scaled.y,
              w: item.scaled.width,
              h: item.scaled.height,
            }
            continue
          }
          positions[item.idx] = {
            x: xPos,
            y: cursorY,
            w: scaledWidths[ci]!,
            h: item.scaled.height,
          }
          xPos += scaledWidths[ci]! + gap
        }
        cursorY += rowH + gap
      } else {
        // Stack vertically
        for (const item of row) {
          if (
            item.orig.responsiveStyles?.tablet?.x !== undefined &&
            item.orig.responsiveStyles?.tablet?.y !== undefined
          ) {
            positions[item.idx] = {
              x: item.scaled.x,
              y: item.scaled.y,
              w: item.scaled.width,
              h: item.scaled.height,
            }
            continue
          }
          const isSubstantial = item.orig.width > 200
          const w = isSubstantial ? maxW : Math.min(item.scaled.width, maxW)
          const x = isSubstantial
            ? margin
            : Math.round((targetWidth - w) / 2)

          positions[item.idx] = { x, y: cursorY, w, h: item.scaled.height }
          cursorY += item.scaled.height + gap
        }
      }
    }
  }

  // Step 4: Merge positions back, preserving hidden elements unchanged
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