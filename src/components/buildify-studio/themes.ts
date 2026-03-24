export interface StudioTheme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textMuted: string
    border: string
  }
  typography: {
    headingFont: string
    bodyFont: string
    headingSize: number
    bodySize: number
  }
  borderRadius: number
  buttonStyle: 'rounded' | 'pill' | 'square'
}

// ─── Preset Themes ─────────────────────────────────────────────────────────────

export const THEMES: StudioTheme[] = [
  {
    id: 'dark-indigo',
    name: 'Dark Indigo',
    colors: {
      primary: '#6366f1',
      secondary: '#a78bfa',
      accent: '#60a5fa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: 'rgba(99,102,241,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 16,
    buttonStyle: 'rounded',
  },
  {
    id: 'light-clean',
    name: 'Light Clean',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 12,
    buttonStyle: 'rounded',
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    colors: {
      primary: '#f59e0b',
      secondary: '#ef4444',
      accent: '#fb923c',
      background: '#1c1917',
      surface: '#292524',
      text: '#fef3c7',
      textMuted: '#a8a29e',
      border: 'rgba(245,158,11,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 14,
    buttonStyle: 'pill',
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#10b981',
      secondary: '#06b6d4',
      accent: '#34d399',
      background: '#022c22',
      surface: '#064e3b',
      text: '#ecfdf5',
      textMuted: '#6ee7b7',
      border: 'rgba(16,185,129,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 16,
    buttonStyle: 'rounded',
  },
  {
    id: 'minimal-mono',
    name: 'Minimal Mono',
    colors: {
      primary: '#18181b',
      secondary: '#3f3f46',
      accent: '#71717a',
      background: '#fafafa',
      surface: '#f4f4f5',
      text: '#18181b',
      textMuted: '#71717a',
      border: '#e4e4e7',
    },
    typography: {
      headingFont: '"DM Sans", Inter, system-ui, sans-serif',
      bodyFont: '"DM Sans", Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 8,
    buttonStyle: 'square',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#7dd3fc',
      background: '#0c1222',
      surface: '#162032',
      text: '#e0f2fe',
      textMuted: '#7dd3fc',
      border: 'rgba(14,165,233,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 14,
    buttonStyle: 'rounded',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    colors: {
      primary: '#e11d48',
      secondary: '#fb7185',
      accent: '#fda4af',
      background: '#1a0a10',
      surface: '#2a1520',
      text: '#fff1f2',
      textMuted: '#fda4af',
      border: 'rgba(225,29,72,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 16,
    buttonStyle: 'pill',
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    colors: {
      primary: '#8b5cf6',
      secondary: '#c084fc',
      accent: '#a78bfa',
      background: '#13061f',
      surface: '#1e1035',
      text: '#f5f3ff',
      textMuted: '#c4b5fd',
      border: 'rgba(139,92,246,0.2)',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 18,
    buttonStyle: 'rounded',
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    colors: {
      primary: '#22d3ee',
      secondary: '#a3e635',
      accent: '#f472b6',
      background: '#09090b',
      surface: '#18181b',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      border: 'rgba(34,211,238,0.15)',
    },
    typography: {
      headingFont: '"JetBrains Mono", monospace',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 4,
    buttonStyle: 'square',
  },
  {
    id: 'earthy-clay',
    name: 'Earthy Clay',
    colors: {
      primary: '#c2410c',
      secondary: '#ea580c',
      accent: '#fb923c',
      background: '#fef7ed',
      surface: '#fff7ed',
      text: '#431407',
      textMuted: '#9a3412',
      border: '#fed7aa',
    },
    typography: {
      headingFont: '"DM Serif Display", Georgia, serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingSize: 48,
      bodySize: 15,
    },
    borderRadius: 10,
    buttonStyle: 'rounded',
  },
]

export const DEFAULT_THEME_ID = 'dark-indigo'

export function getThemeById(id: string): StudioTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
