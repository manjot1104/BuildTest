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

export type HoverAnimation = 'none' | 'scale' | 'lift' | 'glow'

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
  anchorId?: string // for in-page anchor navigation (sections/containers)
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