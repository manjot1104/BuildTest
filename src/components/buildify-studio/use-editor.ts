'use client'

import { useReducer, useCallback } from 'react'
import {
  type CanvasElement,
  type EditorState,
  type EditorAction,
  type DeviceConfig,
  type CanvasBackground,
  type GridSettings,
  type FormField,
  type SocialLinkItem,
  type ResponsiveOverride,
  type ResponsiveDevice,
} from './types'

const MAX_HISTORY = 50

const DEFAULT_LINK = { enabled: false, href: '', target: '_blank' as const }
const DEFAULT_ENTER = 'none' as const
const DEFAULT_HOVER = 'none' as const

function makeFormFields(): FormField[] {
  return [
    { id: crypto.randomUUID(), type: 'text', label: 'Name', placeholder: 'Your name' },
    { id: crypto.randomUUID(), type: 'email', label: 'Email', placeholder: 'your@email.com' },
    { id: crypto.randomUUID(), type: 'textarea', label: 'Message', placeholder: 'Your message' },
  ]
}

function makeSocialLinks(): SocialLinkItem[] {
  return [
    { platform: 'github', url: '' },
    { platform: 'twitter', url: '' },
    { platform: 'linkedin', url: '' },
  ]
}

function pushToHistory(state: EditorState): EditorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  if (newHistory.length >= MAX_HISTORY) {
    newHistory.shift()
    return {
      ...state,
      history: [...newHistory, [...state.elements]],
      historyIndex: newHistory.length - 1,
    }
  }
  return {
    ...state,
    history: [...newHistory, [...state.elements]],
    historyIndex: newHistory.length,
  }
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_ELEMENT': {
      const newState = pushToHistory(state)
      return {
        ...newState,
        elements: [...newState.elements, action.element],
        selectedIds: [action.element.id],
        isDirty: true,
      }
    }
    case 'UPDATE_ELEMENT': {
      const newState = pushToHistory(state)
      return {
        ...newState,
        elements: newState.elements.map((el) =>
          el.id === action.id ? { ...el, ...action.updates } : el,
        ),
        isDirty: true,
      }
    }
    case 'UPDATE_ELEMENT_NO_HISTORY': {
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.id ? { ...el, ...action.updates } : el,
        ),
        isDirty: true,
      }
    }
    case 'DELETE_ELEMENT': {
      const newState = pushToHistory(state)
      return {
        ...newState,
        elements: newState.elements.filter((el) => el.id !== action.id),
        selectedIds: newState.selectedIds.filter((id) => id !== action.id),
        isDirty: true,
      }
    }
    case 'DELETE_SELECTED': {
      if (state.selectedIds.length === 0) return state
      const newState = pushToHistory(state)
      return {
        ...newState,
        elements: newState.elements.filter((el) => !newState.selectedIds.includes(el.id)),
        selectedIds: [],
        isDirty: true,
      }
    }
    case 'SELECT_ELEMENT':
      return {
        ...state,
        selectedIds: action.id ? [action.id] : [],
      }
    case 'SELECT_ELEMENTS':
      return { ...state, selectedIds: action.ids }
    case 'TOGGLE_SELECT_ELEMENT': {
      const alreadySelected = state.selectedIds.includes(action.id)
      return {
        ...state,
        selectedIds: alreadySelected
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    }
    case 'REORDER_ELEMENTS': {
      const newState = pushToHistory(state)
      const elements = [...newState.elements]
      const [moved] = elements.splice(action.fromIndex, 1)
      if (moved) elements.splice(action.toIndex, 0, moved)
      return { ...newState, elements, isDirty: true }
    }
    case 'DUPLICATE_ELEMENTS': {
      if (action.ids.length === 0) return state
      const newState = pushToHistory(state)
      const maxZ = Math.max(...newState.elements.map((e) => e.zIndex), 0)
      const copies: CanvasElement[] = []
      action.ids.forEach((id, i) => {
        const original = newState.elements.find((el) => el.id === id)
        if (!original) return
        copies.push({
          ...original,
          id: crypto.randomUUID(),
          x: original.x + 20,
          y: original.y + 20,
          zIndex: maxZ + i + 1,
        })
      })
      return {
        ...newState,
        elements: [...newState.elements, ...copies],
        selectedIds: copies.map((c) => c.id),
        isDirty: true,
      }
    }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(Math.max(action.zoom, 0.1), 3) }
    case 'SET_PAN':
      return { ...state, panX: action.panX, panY: action.panY }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        ...state,
        elements: [...(state.history[newIndex] ?? [])],
        historyIndex: newIndex,
        selectedIds: [],
      }
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        ...state,
        elements: [...(state.history[newIndex] ?? [])],
        historyIndex: newIndex,
        selectedIds: [],
      }
    }
    case 'SET_PREVIEW':
      return { ...state, isPreview: action.isPreview, selectedIds: [] }
    case 'BRING_FORWARD': {
      const newState = pushToHistory(state)
      const maxZ = Math.max(...newState.elements.map((e) => e.zIndex), 0)
      return {
        ...newState,
        elements: newState.elements.map((e) =>
          e.id === action.id ? { ...e, zIndex: maxZ + 1 } : e,
        ),
        isDirty: true,
      }
    }
    case 'SEND_BACKWARD': {
      const newState = pushToHistory(state)
      const minZ = Math.min(...newState.elements.map((e) => e.zIndex), 0)
      return {
        ...newState,
        elements: newState.elements.map((e) =>
          e.id === action.id ? { ...e, zIndex: Math.max(0, minZ - 1) } : e,
        ),
        isDirty: true,
      }
    }
    case 'LOAD_LAYOUT':
      return {
        ...state,
        elements: action.elements,
        history: [action.elements],
        historyIndex: 0,
        selectedIds: [],
        isDirty: false,
        ...(action.background ? { canvasBackground: action.background } : {}),
      }
    case 'SET_DIRTY':
      return { ...state, isDirty: action.isDirty }
    case 'SET_DEVICE':
      return { ...state, device: action.device }
    case 'SET_CANVAS_BACKGROUND':
      return { ...state, canvasBackground: action.background, isDirty: true }
    case 'SET_GRID':
      return { ...state, grid: action.grid }
    case 'ADD_ELEMENTS': {
      const newState = pushToHistory(state)
      return {
        ...newState,
        elements: [...newState.elements, ...action.elements],
        selectedIds: action.elements.map((el) => el.id),
        isDirty: true,
      }
    }
    case 'SET_THEME':
      return { ...state, themeId: action.themeId }
    default:
      return state
  }
}

const initialState: EditorState = {
  elements: [],
  selectedIds: [],
  zoom: 1,
  panX: 40,
  panY: 40,
  isPreview: false,
  history: [[]],
  historyIndex: 0,
  isDirty: false,
  device: { preset: 'desktop', width: 1440, height: 960 },
  canvasBackground: {
    type: 'solid',
    color: '#ffffff',
    gradientFrom: '#f8fafc',
    gradientTo: '#f1f5f9',
    gradientAngle: 135,
    imageUrl: '',
  },
  grid: { enabled: false, snap: false, size: 16 },
  themeId: 'dark-indigo',
}

export function useEditor() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const addElement = useCallback(
    (type: CanvasElement['type']) => {
      const offsetX = 100 + Math.random() * 60
      const offsetY = 80 + Math.random() * 60

      type Defaults = Partial<CanvasElement>

   const defaults: Partial<Record<CanvasElement['type'], Defaults>> = {
        heading: {
          width: 500,
          height: 80,
          content: 'Your Heading',
          styles: { fontSize: 48, fontWeight: '700', color: '#1a1a1a' },
          headingLevel: 1,
        },
        paragraph: {
          width: 420,
          height: 100,
          content: 'Your paragraph text goes here. Click to edit this text.',
          styles: { fontSize: 16, fontWeight: '400', color: '#374151', lineHeight: 1.6 },
        },
        image: {
          width: 320,
          height: 220,
          content: 'https://placehold.co/320x220/e2e8f0/94a3b8?text=Image',
          styles: { objectFit: 'cover', borderRadius: 8 },
        },
        button: {
          width: 160,
          height: 48,
          content: 'Click Me',
          styles: {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '600',
            borderRadius: 8,
          },
        },
     section: {
  width: 600,
  height: 200,
  content: '',
  sectionKey: 'section-' + Date.now(),
  styles: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    border: '2px dashed #e2e8f0',
    padding: 24,
  },
},
        container: {
          width: 400,
          height: 200,
          content: '',
          styles: {
            backgroundColor: 'transparent',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          },
        },
        divider: {
          width: 400,
          height: 2,
          content: '',
          styles: { backgroundColor: '#e2e8f0' },
        },
        spacer: {
          width: 400,
          height: 40,
          content: '',
          styles: {},
        },
        'social-links': {
          width: 300,
          height: 56,
          content: '',
          styles: { gap: 16, iconSize: 32, iconColor: '#374151' },
          socialLinks: makeSocialLinks(),
        },
        'video-embed': {
          width: 560,
          height: 315,
          content: '',
          styles: { borderRadius: 8 },
        },
        icon: {
          width: 64,
          height: 64,
          content: 'star',
          styles: { iconSize: 48, iconColor: '#3b82f6' },
        },
        navbar: {
          width: 800,
          height: 60,
          content: 'Home|About|Work|Contact',
          styles: {
            backgroundColor: '#1a1a2e',
            color: '#ffffff',
            padding: 16,
            fontSize: 14,
            fontWeight: '500',
          },
        },
        form: {
          width: 420,
          height: 320,
          content: 'Contact Us',
          styles: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: 24,
          },
          formFields: makeFormFields(),
        },
        'code-block': {
          width: 520,
          height: 200,
          content: '// Your code here\nconsole.log("Hello, World!")',
          styles: {
            backgroundColor: '#1e1e2e',
            color: '#cdd6f4',
            fontSize: 13,
            fontFamily: '"Fira Code", "Cascadia Code", monospace',
            borderRadius: 8,
            padding: 20,
          },
        },
      }

      const def = defaults[type] ?? {}
      let sectionKey: string | undefined

if (type === 'section') {
  const sectionCount = state.elements.filter(e => e.type === 'section').length

  const defaultKeys = ['about', 'skills', 'projects', 'work', 'services', 'contact']

  sectionKey = defaultKeys[sectionCount] ?? `section-${sectionCount + 1}`
}
      dispatch({
        type: 'ADD_ELEMENT',
        element: {
          id: crypto.randomUUID(),
          type,
          x: Math.round(offsetX),
          y: Math.round(offsetY),
          width: def.width ?? 200,
          height: def.height ?? 100,
          content: def.content ?? '',
          styles: def.styles ?? {},
          enterAnimation: DEFAULT_ENTER,
          hoverAnimation: DEFAULT_HOVER,
          link: { ...DEFAULT_LINK },
          zIndex: state.elements.length,
          locked: false,
          hidden: false,
          ...(def.headingLevel ? { headingLevel: def.headingLevel } : {}),
          ...(def.socialLinks ? { socialLinks: def.socialLinks } : {}),
          ...(def.formFields ? { formFields: def.formFields } : {}),
          ...(def.iconName ? { iconName: def.iconName } : {}),
          ...(sectionKey ? { sectionKey } : {}),
        },
      })
    },
    [state.elements.length],
  )

  const addTemplateBlock = useCallback(
    (templateType: 'testimonial' | 'pricing' | 'hero' | 'stats' | 'feature') => {
      const baseX = 100 + Math.random() * 60
      const baseY = 80 + Math.random() * 60
      const maxZ = Math.max(...state.elements.map((e) => e.zIndex), 0)

      type BlockElement = Omit<CanvasElement, 'id' | 'zIndex' | 'link' | 'enterAnimation' | 'hoverAnimation' | 'locked' | 'hidden'>

      // Block template definitions
      const templates: Record<'testimonial' | 'pricing' | 'hero' | 'stats' | 'feature' | 'faq' | 'alert', BlockElement[]> = {
        testimonial: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 420,
            height: 280,
            content: 'testimonials',
            sectionKey: 'testimonials',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#0f172a',
              gradientTo: '#1e1b4b',
              gradientAngle: 145,
              borderRadius: 20,
              border: '1px solid rgba(139,92,246,0.25)',
            },
          } as BlockElement,
          // Decorative quote mark
          {
  type: 'heading',
  x: baseX + 24,
  y: baseY + 24,
  width: 60,
  height: 52,
  content: '\u201c',
  headingLevel: 1,
  styles: { fontSize: 64, fontWeight: '700', color: '#6366f1', lineHeight: 1 },
} as BlockElement,
         
          // Quote text
          {
            type: 'paragraph',
            x: baseX + 28,
        y: baseY + 76,
            width: 364,
            height: 80,
       content: 'This tool completely transformed how I build websites. It made my workflow much faster and more efficient while maintaining great quality.',
            styles: { fontSize: 15, color: '#e2e8f0', lineHeight: 1.7 },
          } as BlockElement,
       // Avatar
          {
            type: 'image',
            x: baseX + 28,
            y: baseY + 216,
            width: 36,
            height: 36,
            content: 'https://placehold.co/36x36/6366f1/ffffff?text=SA',
            styles: { borderRadius: 18, objectFit: 'cover' },
          } as BlockElement,
          // Name
          {
            type: 'heading',
            x: baseX + 74,
            y: baseY + 218,
            width: 180,
            height: 20,
            content: 'Sarah Anderson',
            headingLevel: 3,
            styles: { fontSize: 13, fontWeight: '600', color: '#f1f5f9' },
          } as BlockElement,
          // Role
          {
            type: 'paragraph',
            x: baseX + 74,
            y: baseY + 238,
            width: 180,
            height: 18,
            content: 'Product Designer, Vercel',
            styles: { fontSize: 11, color: '#818cf8' },
          } as BlockElement,
          // Stars — all inside card width (420), starting from right
          {
            type: 'icon',
            x: baseX + 304,
            y: baseY + 220,
            width: 20,
            height: 20,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 16, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 324,
            y: baseY + 220,
            width: 20,
            height: 20,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 16, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 344,
            y: baseY + 220,
            width: 20,
            height: 20,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 16, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 364,
            y: baseY + 220,
            width: 20,
            height: 20,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 16, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 384,
            y: baseY + 220,
            width: 20,
            height: 20,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 16, iconColor: '#f59e0b' },
          } as BlockElement,
        ],


        pricing: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 360,
            height: 420,
            content: 'pricing',
            sectionKey: 'pricing',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#0f172a',
              gradientTo: '#0c0a1e',
              gradientAngle: 160,
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.35)',
            },
          } as BlockElement,
          // "Most Popular" badge
          {
            type: 'button',
            x: baseX + 110,
            y: baseY + 24,
            width: 140,
            height: 28,
            content: '★ Most Popular',
            styles: {
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: '700',
              borderRadius: 20,
              letterSpacing: 0.5,
            },
          } as BlockElement,
          // Plan name
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 68,
            width: 296,
            height: 36,
            content: 'Pro Plan',
            headingLevel: 2,
            styles: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.3 },
          } as BlockElement,
         // Price — big number
{
  type: 'heading',
  x: baseX + 32,
  y: baseY + 112,
  width: 160,
  height: 60,
  content: '$29',
  headingLevel: 3,
  styles: { fontSize: 44, fontWeight: '700', color: '#ffffff', letterSpacing: -1 },
} as BlockElement,
// Price suffix — small
{
  type: 'paragraph',
  x: baseX + 110,
  y: baseY + 132,
  width: 80,
  height: 24,
  content: '/month',
  styles: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
} as BlockElement,
          // Divider
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 182,
            width: 296,
            height: 1,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.08)' },
          } as BlockElement,
          // Feature rows
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 202,
            width: 296,
            height: 26,
            content: '✦  Unlimited projects',
            styles: { fontSize: 14, color: '#cbd5e1' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 232,
            width: 296,
            height: 26,
            content: '✦  Advanced analytics',
            styles: { fontSize: 14, color: '#cbd5e1' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 262,
            width: 296,
            height: 26,
            content: '✦  Priority support 24/7',
            styles: { fontSize: 14, color: '#cbd5e1' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 292,
            width: 296,
            height: 26,
            content: '✦  Custom integrations',
            styles: { fontSize: 14, color: '#cbd5e1' },
          } as BlockElement,
          // CTA Button
          {
            type: 'button',
            x: baseX + 32,
            y: baseY + 348,
            width: 296,
            height: 50,
            content: 'Get Started →',
            styles: {
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '700',
              borderRadius: 14,
              letterSpacing: 0.3,
            },
          } as BlockElement,
        ],
        hero: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 600,
         height: 340,   
            content: 'hero',  
  sectionKey: 'hero',  
            styles: {
              backgroundColor: '#0f172a',
              borderRadius: 12,
              padding: 60,
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 60,
            y: baseY + 60,
            width: 480,
             height: 110, 
            content: 'Build Amazing Websites',
            headingLevel: 1,
            styles: { fontSize: 48, fontWeight: '700', color: '#ffffff' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 60,
          y: baseY + 185,
            width: 480,
            height: 60,
            content: 'Create beautiful landing pages and websites without writing a single line of code.',
            styles: { fontSize: 18, color: '#cbd5e1', lineHeight: 1.6 },
          } as BlockElement,
          {
            type: 'button',
            x: baseX + 60,
            y: baseY + 265,   
            width: 140,
            height: 48,
            content: 'Get Started',
            styles: {
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
              borderRadius: 8,
            },
          } as BlockElement,
          {
            type: 'button',
            x: baseX + 220,
            y: baseY + 265,
            width: 140,
            height: 48,
            content: 'Learn More',
            styles: {
              backgroundColor: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              fontSize: 16,
              fontWeight: '600',
              borderRadius: 8,
            },
          } as BlockElement,
        ],
        stats: [
          // Background section — dark with subtle gradient
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 620,
            height: 180,
            content: 'stats',
            sectionKey: 'stats',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#0f172a',
              gradientTo: '#1e1b4b',
              gradientAngle: 135,
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.2)',
            },
          } as BlockElement,
          // Divider line 1
          {
            type: 'divider',
            x: baseX + 206,
            y: baseY + 40,
            width: 1,
            height: 100,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.08)' },
          } as BlockElement,
          // Divider line 2
          {
            type: 'divider',
            x: baseX + 413,
            y: baseY + 40,
            width: 1,
            height: 100,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.08)' },
          } as BlockElement,
          // Stat 1 number
          {
            type: 'heading',
            x: baseX + 40,
            y: baseY + 38,
            width: 126,
            height: 56,
            content: '10M+',
            headingLevel: 3,
            styles: { fontSize: 38, fontWeight: '700', color: '#a5b4fc', letterSpacing: -1 },
          } as BlockElement,
          // Stat 1 label
          {
            type: 'paragraph',
            x: baseX + 40,
            y: baseY + 102,
            width: 126,
            height: 22,
            content: 'Users worldwide',
            styles: { fontSize: 13, color: '#64748b', letterSpacing: 0.2 },
          } as BlockElement,
          // Stat 2 number
          {
            type: 'heading',
            x: baseX + 247,
            y: baseY + 38,
            width: 126,
            height: 56,
            content: '99.9%',
            headingLevel: 3,
            styles: { fontSize: 38, fontWeight: '700', color: '#a5b4fc', letterSpacing: -1 },
          } as BlockElement,
          // Stat 2 label
          {
            type: 'paragraph',
            x: baseX + 247,
            y: baseY + 102,
            width: 126,
            height: 22,
            content: 'Uptime SLA',
            styles: { fontSize: 13, color: '#64748b', letterSpacing: 0.2 },
          } as BlockElement,
          // Stat 3 number
          {
            type: 'heading',
            x: baseX + 453,
            y: baseY + 38,
            width: 126,
            height: 56,
            content: '24/7',
            headingLevel: 3,
            styles: { fontSize: 38, fontWeight: '700', color: '#a5b4fc', letterSpacing: -1 },
          } as BlockElement,
          // Stat 3 label
          {
            type: 'paragraph',
            x: baseX + 453,
            y: baseY + 102,
            width: 126,
            height: 22,
            content: 'Expert support',
            styles: { fontSize: 13, color: '#64748b', letterSpacing: 0.2 },
          } as BlockElement,
        ],
        feature: [
          // Card — dark glass with colored border
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 300,
            height: 300,
            content: 'features',
            sectionKey: 'features',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#0f172a',
              gradientTo: '#111827',
              gradientAngle: 145,
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.25)',
            },
          } as BlockElement,
          // Icon container pill
          {
            type: 'button',
            x: baseX + 24,
            y: baseY + 28,
            width: 52,
            height: 52,
            content: '⚡',
            styles: {
              backgroundColor: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 14,
              fontSize: 24,
              color: '#a5b4fc',
            },
          } as BlockElement,
          // Category tag
          {
            type: 'button',
            x: baseX + 88,
            y: baseY + 40,
            width: 90,
            height: 22,
            content: 'Performance',
            styles: {
              backgroundColor: 'rgba(99,102,241,0.12)',
              color: '#818cf8',
              fontSize: 10,
              fontWeight: '600',
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.25)',
              letterSpacing: 0.5,
            },
          } as BlockElement,
          // Heading
          {
            type: 'heading',
            x: baseX + 24,
            y: baseY + 100,
            width: 252,
            height: 40,
            content: 'Lightning Fast',
            headingLevel: 3,
            styles: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.3 },
          } as BlockElement,

          // Description
          {
            type: 'paragraph',
            x: baseX + 24,
            y: baseY + 150,
            width: 252,
            height: 90,
            content: 'Experience blazing fast load times and smooth interactions. Our platform is built for peak performance.',
            styles: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },
          } as BlockElement,
          // Arrow link
          {
            type: 'paragraph',
            x: baseX + 24,
            y: baseY + 258,
            width: 160,
            height: 22,
            content: 'Learn more →',
            styles: { fontSize: 13, color: '#6366f1', fontWeight: '600', letterSpacing: 0.2 },
          } as BlockElement,
        ],
        faq: [
          // Card background
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 540,
            height: 430,
            content: 'faq',
            sectionKey: 'faq',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#0f172a',
              gradientTo: '#111827',
              gradientAngle: 150,
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.07)',
            },
          } as BlockElement,
          // Section label badge
          {
            type: 'button',
            x: baseX + 32,
            y: baseY + 28,
            width: 60,
            height: 22,
            content: 'FAQ',
            styles: {
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              fontSize: 10,
              fontWeight: '700',
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.3)',
              letterSpacing: 1,
            },
          } as BlockElement,
          // Main heading
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 60,
            width: 476,
            height: 40,
            content: 'Frequently Asked Questions',
            headingLevel: 2,
            styles: { fontSize: 24, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.3 },
          } as BlockElement,
          // Divider top
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 112,
            width: 476,
            height: 1,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.07)' },
          } as BlockElement,
          // Q1
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 126,
            width: 440,
            height: 28,
            content: 'What is this product?',
            headingLevel: 3,
            styles: { fontSize: 15, fontWeight: '600', color: '#e2e8f0', letterSpacing: 0.1 },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 160,
            width: 476,
            height: 40,
            content: 'A powerful no-code builder designed to help you create stunning websites with ease.',
            styles: { fontSize: 13, color: '#64748b', lineHeight: 1.65 },
          } as BlockElement,
          // Divider
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 210,
            width: 476,
            height: 1,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.07)' },
          } as BlockElement,
          // Q2
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 224,
            width: 440,
            height: 28,
            content: 'How do I get started?',
            headingLevel: 3,
            styles: { fontSize: 15, fontWeight: '600', color: '#e2e8f0', letterSpacing: 0.1 },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 258,
            width: 476,
            height: 40,
            content: 'Sign up, pick a template, and start building. Our intuitive interface guides you through every step.',
            styles: { fontSize: 13, color: '#64748b', lineHeight: 1.65 },
          } as BlockElement,
          // Divider
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 308,
            width: 476,
            height: 1,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.07)' },
          } as BlockElement,
          // Q3
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 322,
            width: 440,
            height: 28,
            content: 'Is there support available?',
            headingLevel: 3,
            styles: { fontSize: 15, fontWeight: '600', color: '#e2e8f0', letterSpacing: 0.1 },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 356,
            width: 476,
            height: 40,
            content: 'Yes! We offer 24/7 live chat and email support. Our team typically responds within minutes.',
            styles: { fontSize: 13, color: '#64748b', lineHeight: 1.65 },
          } as BlockElement,
          // Bottom divider
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 406,
            width: 476,
            height: 1,
            content: '',
            styles: { backgroundColor: 'rgba(255,255,255,0.07)' },
          } as BlockElement,
        ],
        alert: [
          // Alert background — amber/warning dark style
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 580,
            height: 88,
            content: 'alert',
            sectionKey: 'alert',
            styles: {
              gradientType: 'linear',
              gradientFrom: '#1c1407',
              gradientTo: '#1f1a08',
              gradientAngle: 135,
              borderRadius: 14,
              border: '1px solid rgba(245,158,11,0.35)',
            },
          } as BlockElement,
          // Icon badge
          {
            type: 'button',
            x: baseX + 20,
            y: baseY + 22,
            width: 42,
            height: 42,
            content: '⚠',
            styles: {
              backgroundColor: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 10,
              fontSize: 18,
              color: '#f59e0b',
            },
          } as BlockElement,
          // Title
          {
            type: 'heading',
            x: baseX + 76,
            y: baseY + 18,
            width: 480,
            height: 26,
            content: 'Important Notice',
            headingLevel: 3,
            styles: { fontSize: 15, fontWeight: '700', color: '#fcd34d', letterSpacing: 0.1 },
          } as BlockElement,
          // Body
          {
            type: 'paragraph',
            x: baseX + 76,
            y: baseY + 48,
            width: 460,
            height: 24,
            content: 'This is an important message that requires your immediate attention.',
            styles: { fontSize: 13, color: '#92400e', letterSpacing: 0.1 },
          } as BlockElement,
        ],
      }

    const blockElements = templates[templateType]
const templateBlockId = crypto.randomUUID()   
const elements = blockElements.map((el, idx) => ({
  ...el,
  id: crypto.randomUUID(),
  templateBlockId,                           
  link: { enabled: false, href: '', target: '_self' as const },
  enterAnimation: 'none' as const,
  hoverAnimation: 'none' as const,
  zIndex: maxZ + idx + 1,
  locked: false,
  hidden: false,
  sectionKey: el.sectionKey,
}))

      elements.forEach((el) => {
        dispatch({
          type: 'ADD_ELEMENT',
          element: el,
        })
      })
    },
    [state.elements],
  )

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
      dispatch({
        type: skipHistory ? 'UPDATE_ELEMENT_NO_HISTORY' : 'UPDATE_ELEMENT',
        id,
        updates,
      })
    },
    [],
  )

  /** Returns 'desktop' | 'tablet' | 'mobile' based on current device preset */
  const activeDevice: ResponsiveDevice =
    state.device.preset === 'tablet' ? 'tablet'
    : state.device.preset === 'mobile' ? 'mobile'
    : 'desktop'

  /**
   * Device-aware update: on desktop writes to base element,
   * on tablet/mobile writes to responsiveStyles overrides.
   */
  const updateElementResponsive = useCallback(
    (id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
      const device = state.device.preset === 'tablet' ? 'tablet'
        : state.device.preset === 'mobile' ? 'mobile'
        : 'desktop'

      if (device === 'desktop') {
        dispatch({
          type: skipHistory ? 'UPDATE_ELEMENT_NO_HISTORY' : 'UPDATE_ELEMENT',
          id,
          updates,
        })
        return
      }

      // Build responsive override from the updates
      const el = state.elements.find((e) => e.id === id)
      if (!el) return

      const override: ResponsiveOverride = {}
      if (updates.x !== undefined) override.x = updates.x
      if (updates.y !== undefined) override.y = updates.y
      if (updates.width !== undefined) override.width = updates.width
      if (updates.height !== undefined) override.height = updates.height
      if (updates.hidden !== undefined) override.hidden = updates.hidden
      if (updates.styles) {
        override.styles = { ...(el.responsiveStyles?.[device]?.styles ?? {}), ...updates.styles }
      }

      const newResponsive = {
        ...el.responsiveStyles,
        [device]: { ...(el.responsiveStyles?.[device] ?? {}), ...override },
      }

      dispatch({
        type: skipHistory ? 'UPDATE_ELEMENT_NO_HISTORY' : 'UPDATE_ELEMENT',
        id,
        updates: { responsiveStyles: newResponsive },
      })
    },
    [state.device.preset, state.elements],
  )

  const deleteElement = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ELEMENT', id })
  }, [])

  const deleteSelected = useCallback(() => {
    dispatch({ type: 'DELETE_SELECTED' })
  }, [])

  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ELEMENT', id })
  }, [])

  const selectElements = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_ELEMENTS', ids })
  }, [])

  const toggleSelectElement = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SELECT_ELEMENT', id })
  }, [])

  const reorderElements = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_ELEMENTS', fromIndex, toIndex })
  }, [])

  const duplicateElements = useCallback((ids: string[]) => {
    dispatch({ type: 'DUPLICATE_ELEMENTS', ids })
  }, [])

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', zoom })
  }, [])

  const setPan = useCallback((panX: number, panY: number) => {
    dispatch({ type: 'SET_PAN', panX, panY })
  }, [])

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  const setPreview = useCallback((isPreview: boolean) => {
    dispatch({ type: 'SET_PREVIEW', isPreview })
  }, [])

  const bringForward = useCallback((id: string) => {
    dispatch({ type: 'BRING_FORWARD', id })
  }, [])

  const sendBackward = useCallback((id: string) => {
    dispatch({ type: 'SEND_BACKWARD', id })
  }, [])

  const loadLayout = useCallback(
    (elements: CanvasElement[], background?: CanvasBackground) => {
      dispatch({ type: 'LOAD_LAYOUT', elements, background })
    },
    [],
  )

  const setDevice = useCallback((device: DeviceConfig) => {
    dispatch({ type: 'SET_DEVICE', device })
  }, [])

  const setCanvasBackground = useCallback((background: CanvasBackground) => {
    dispatch({ type: 'SET_CANVAS_BACKGROUND', background })
  }, [])

  const setGrid = useCallback((grid: GridSettings) => {
    dispatch({ type: 'SET_GRID', grid })
  }, [])

  const setTheme = useCallback((themeId: string) => {
    dispatch({ type: 'SET_THEME', themeId })
  }, [])

  const addBlock = useCallback(
    (blockId: string) => {
      const { BLOCKS } = require('./blocks') as typeof import('./blocks')
      const { getThemeById } = require('./themes') as typeof import('./themes')

      const block = BLOCKS.find((b: { id: string }) => b.id === blockId)
      if (!block) return

      const theme = getThemeById(state.themeId)
      const maxZ = Math.max(...state.elements.map((e) => e.zIndex), 0)

      // Smart insert: stack below existing content
      const bottomY = state.elements.length > 0
        ? Math.max(...state.elements.map((e) => e.y + e.height))
        : 0
      const startY = bottomY

      const canvasWidth = state.device.width
      const elements = block.create(startY, canvasWidth, theme)

      const templateBlockId = crypto.randomUUID()
      const finalized = elements.map((el: CanvasElement, idx: number) => ({
        ...el,
        templateBlockId,
        zIndex: maxZ + idx + 1,
        locked: false,
        hidden: false,
      }))

      dispatch({ type: 'ADD_ELEMENTS', elements: finalized })
    },
    [state.elements, state.device.width, state.themeId],
  )

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1
  const selectedElement =
    state.elements.find((el) => el.id === state.selectedIds[0]) ?? null
  const selectedElements = state.elements.filter((el) =>
    state.selectedIds.includes(el.id),
  )

  return {
    state,
    activeDevice,
    selectedElement,
    selectedElements,
    canUndo,
    canRedo,
    addElement,
    updateElement,
    updateElementResponsive,
    deleteElement,
    addTemplateBlock,
    deleteSelected,
    selectElement,
    selectElements,
    toggleSelectElement,
    reorderElements,
    duplicateElements,
    setZoom,
    setPan,
    undo,
    redo,
    setPreview,
    bringForward,
    sendBackward,
    loadLayout,
    setDevice,
    setCanvasBackground,
    setGrid,
    setTheme,
    addBlock,
    dispatch,
  }
}

export type UseEditorReturn = ReturnType<typeof useEditor>