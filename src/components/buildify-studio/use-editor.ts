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
            width: 400,
            height: 280,
            content: 'testimonials',  
  sectionKey: 'testimonials',
            styles: {
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              padding: 24,
              border: '1px solid #e2e8f0',
            },
          } as BlockElement,
          {
            type: 'image',
            x: baseX + 20,
            y: baseY + 20,
            width: 80,
            height: 80,
            content: 'https://placehold.co/80x80/cbd5e1/64748b?text=Avatar',
            styles: { 
              borderRadius: 40, 
              objectFit: 'cover',
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 120,
            y: baseY + 20,
            width: 260,
            height: 40,
            content: 'Sarah Anderson',
            headingLevel: 3,
            styles: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 20,
            y: baseY + 120,
            width: 360,
            height: 80,
            content: '"This tool has completely transformed how I build websites. Highly recommended!"',
            styles: { fontSize: 14, color: '#4b5563', lineHeight: 1.6 },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 20,
            y: baseY + 210,
            width: 24,
            height: 24,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 20, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 50,
            y: baseY + 210,
            width: 24,
            height: 24,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 20, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 80,
            y: baseY + 210,
            width: 24,
            height: 24,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 20, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 110,
            y: baseY + 210,
            width: 24,
            height: 24,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 20, iconColor: '#f59e0b' },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 140,
            y: baseY + 210,
            width: 24,
            height: 24,
            content: 'star',
            iconName: 'star',
            styles: { iconSize: 20, iconColor: '#f59e0b' },
          } as BlockElement,
        ],
        pricing: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 380,
            height: 380,
             content: 'pricing',  
  sectionKey: 'pricing',
            styles: {
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '2px solid #e2e8f0',
              padding: 32,
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 32,
            width: 316,
            height: 40,
            content: 'Pro Plan',
            headingLevel: 2,
            styles: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 80,
            width: 316,
            height: 50,
            content: '$29/month',
            headingLevel: 3,
            styles: { fontSize: 36, fontWeight: '700', color: '#3b82f6' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 140,
            width: 316,
            height: 30,
            content: '✓ Unlimited projects',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 175,
            width: 316,
            height: 30,
            content: '✓ Advanced analytics',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 210,
            width: 316,
            height: 30,
            content: '✓ Priority support',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 245,
            width: 316,
            height: 30,
            content: '✓ Custom integrations',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'button',
            x: baseX + 60,
            y: baseY + 295,
            width: 260,
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
        ],
        hero: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 600,
            height: 300,
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
            height: 80,
            content: 'Build Amazing Websites',
            headingLevel: 1,
            styles: { fontSize: 48, fontWeight: '700', color: '#ffffff' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 60,
            y: baseY + 150,
            width: 480,
            height: 60,
            content: 'Create beautiful landing pages and websites without writing a single line of code.',
            styles: { fontSize: 18, color: '#cbd5e1', lineHeight: 1.6 },
          } as BlockElement,
          {
            type: 'button',
            x: baseX + 60,
            y: baseY + 225,
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
            y: baseY + 225,
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
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 600,
            height: 200,
          content: 'stats', 
  sectionKey: 'stats', 
            styles: {
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              padding: 40,
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 40,
            y: baseY + 40,
            width: 120,
            height: 50,
            content: '10M+',
            headingLevel: 3,
            styles: { fontSize: 32, fontWeight: '700', color: '#3b82f6' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 40,
            y: baseY + 100,
            width: 120,
            height: 30,
            content: 'Users worldwide',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 200,
            y: baseY + 40,
            width: 120,
            height: 50,
            content: '99.9%',
            headingLevel: 3,
            styles: { fontSize: 32, fontWeight: '700', color: '#3b82f6' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 200,
            y: baseY + 100,
            width: 120,
            height: 30,
            content: 'Uptime',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 360,
            y: baseY + 40,
            width: 120,
            height: 50,
            content: '24/7',
            headingLevel: 3,
            styles: { fontSize: 32, fontWeight: '700', color: '#3b82f6' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 360,
            y: baseY + 100,
            width: 120,
            height: 30,
            content: 'Support',
            styles: { fontSize: 14, color: '#4b5563' },
          } as BlockElement,
        ],
        feature: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 300,
            height: 320,
             content: 'features', 
  sectionKey: 'features',  
            styles: {
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            },
          } as BlockElement,
          {
            type: 'icon',
            x: baseX + 24,
            y: baseY + 24,
            width: 48,
            height: 48,
            content: 'zap',
            iconName: 'zap',
            styles: { iconSize: 40, iconColor: '#3b82f6' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 24,
            y: baseY + 90,
            width: 252,
            height: 40,
            content: 'Lightning Fast',
            headingLevel: 3,
            styles: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 24,
            y: baseY + 140,
            width: 252,
            height: 120,
            content: 'Experience blazing fast load times and smooth interactions. Our platform is optimized for performance.',
            styles: { fontSize: 14, color: '#4b5563', lineHeight: 1.6 },
          } as BlockElement,
        ],
        faq: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 500,
            height: 400,
            content: 'faq', 
  sectionKey: 'faq', 
            styles: {
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: 32,
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 32,
            width: 436,
            height: 40,
            content: 'Frequently Asked Questions',
            headingLevel: 2,
            styles: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 90,
            width: 436,
            height: 30,
            content: 'What is this product?',
            headingLevel: 3,
            styles: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 130,
            width: 436,
            height: 50,
            content: 'This is a powerful tool designed to help you build and create amazing things with ease.',
            styles: { fontSize: 14, color: '#4b5563', lineHeight: 1.6 },
          } as BlockElement,
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 190,
            width: 436,
            height: 2,
            content: '',
            styles: { backgroundColor: '#e2e8f0' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 210,
            width: 436,
            height: 30,
            content: 'How do I get started?',
            headingLevel: 3,
            styles: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 250,
            width: 436,
            height: 50,
            content: 'Simply sign up for an account and start creating. Our intuitive interface makes it easy for beginners.',
            styles: { fontSize: 14, color: '#4b5563', lineHeight: 1.6 },
          } as BlockElement,
          {
            type: 'divider',
            x: baseX + 32,
            y: baseY + 310,
            width: 436,
            height: 2,
            content: '',
            styles: { backgroundColor: '#e2e8f0' },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 32,
            y: baseY + 330,
            width: 436,
            height: 30,
            content: 'Is there support available?',
            headingLevel: 3,
            styles: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 32,
            y: baseY + 370,
            width: 436,
            height: 30,
            content: 'Yes! We offer 24/7 customer support to help you succeed.',
            styles: { fontSize: 14, color: '#4b5563', lineHeight: 1.6 },
          } as BlockElement,
        ],
        alert: [
          {
            type: 'section',
            x: baseX,
            y: baseY,
            width: 600,
            height: 80,
            content: 'alert',  
  sectionKey: 'alert',  
            styles: {
              backgroundColor: '#fef3c7',
              borderRadius: 8,
              border: '1px solid #fcd34d',
              padding: 16,
              
            },
          } as BlockElement,
          {
            type: 'heading',
            x: baseX + 16,
            y: baseY + 16,
            width: 550,
            height: 24,
            content: '⚠️ Important Notice',
            headingLevel: 3,
            styles: { fontSize: 16, fontWeight: '600', color: '#92400e' },
          } as BlockElement,
          {
            type: 'paragraph',
            x: baseX + 16,
            y: baseY + 48,
            width: 520,
            height: 20,
            content: 'This is an important message that users should pay attention to.',
            styles: { fontSize: 14, color: '#b45309' },
          } as BlockElement,
        ],
      }

      const blockElements = templates[templateType]
    const elements = blockElements.map((el, idx) => ({
  ...el,
  id: crypto.randomUUID(),
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
    dispatch,
  }
}

export type UseEditorReturn = ReturnType<typeof useEditor>
