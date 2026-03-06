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
    gradientFrom: '#667eea',
    gradientTo: '#764ba2',
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

      const defaults: Record<CanvasElement['type'], Defaults> = {
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

      const def = defaults[type]!
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
        },
      })
    },
    [state.elements.length],
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
    selectedElement,
    selectedElements,
    canUndo,
    canRedo,
    addElement,
    updateElement,
    deleteElement,
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
