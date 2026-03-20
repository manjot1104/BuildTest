import { type CanvasElement } from './types'
import { type StudioTheme } from './themes'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BlockCategory =
  | 'hero'
  | 'about'
  | 'features'
  | 'projects'
  | 'testimonials'
  | 'contact'
  | 'footer'
  | 'other'

export interface BlockDefinition {
  id: string
  category: BlockCategory
  label: string
  description: string
  estimatedHeight: number
  create: (startY: number, canvasWidth: number, theme: StudioTheme) => CanvasElement[]
}

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string; dot: string }[] = [
  { id: 'hero', label: 'Hero', dot: 'bg-blue-500' },
  { id: 'about', label: 'About', dot: 'bg-emerald-500' },
  { id: 'features', label: 'Features', dot: 'bg-violet-500' },
  { id: 'projects', label: 'Projects', dot: 'bg-amber-500' },
  { id: 'testimonials', label: 'Testimonials', dot: 'bg-pink-500' },
  { id: 'contact', label: 'Contact', dot: 'bg-orange-500' },
  { id: 'footer', label: 'Footer', dot: 'bg-gray-500' },
  { id: 'other', label: 'Other', dot: 'bg-cyan-500' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const noLink = { enabled: false, href: '', target: '_blank' as const }

let _counter = 0
function uid(): string {
  return `blk-${Date.now()}-${++_counter}-${Math.random().toString(36).slice(2, 7)}`
}

function el(
  type: CanvasElement['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  styles: CanvasElement['styles'] = {},
  extras: Partial<CanvasElement> = {},
): CanvasElement {
  return {
    id: uid(),
    type,
    x,
    y,
    width: w,
    height: h,
    content,
    styles,
    link: noLink,
    zIndex: extras.zIndex ?? 1,
    enterAnimation: extras.enterAnimation ?? 'none',
    hoverAnimation: extras.hoverAnimation ?? 'none',
    ...extras,
  }
}

/** Shorthand for centered X */
function cx(canvasW: number, elW: number): number {
  return Math.round((canvasW - elW) / 2)
}

// Responsive helpers for mobile overrides
function mobileStyles(overrides: Partial<{ height: number; hidden: boolean; styles: Record<string, unknown> }>): CanvasElement['responsiveStyles'] {
  return { mobile: overrides as CanvasElement['responsiveStyles'] extends { mobile?: infer M } ? M : never }
}

// ─── HERO BLOCKS ───────────────────────────────────────────────────────────────

function heroImageCta(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 560
  const pad = 100
  const textW = 560
  const imgW = 480
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'hero', zIndex: 0 }),
    el('paragraph', pad, startY + 40, 120, 28, 'Welcome',
      { backgroundColor: `${t.colors.primary}20`, borderRadius: 20, padding: 5, color: t.colors.primary, fontSize: 11, fontWeight: '600', textAlign: 'center', border: `1px solid ${t.colors.border}` },
      { zIndex: 2, enterAnimation: 'fadeIn' }),
    el('heading', pad, startY + 80, textW, 110, 'Build Something\nAmazing Today',
      { color: t.colors.text, fontSize: t.typography.headingSize, fontWeight: '800', lineHeight: 1.1, fontFamily: t.typography.headingFont },
      { headingLevel: 1, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 28 } } } }),
    el('paragraph', pad, startY + 200, textW - 40, 60, 'Create stunning websites in minutes with our drag-and-drop builder. No coding required — just pick blocks, customize, and publish.',
      { color: t.colors.textMuted, fontSize: t.typography.bodySize, lineHeight: 1.7, fontFamily: t.typography.bodyFont },
      { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: { mobile: { styles: { fontSize: 13 } } } }),
    el('button', pad, startY + 280, 160, 48, 'Get Started',
      { backgroundColor: t.colors.primary, color: '#ffffff', fontSize: 14, fontWeight: '600', borderRadius: t.buttonStyle === 'pill' ? 24 : t.buttonStyle === 'square' ? 4 : t.borderRadius > 12 ? 10 : t.borderRadius },
      { zIndex: 3, hoverAnimation: 'lift', enterAnimation: 'slideUp', link: { enabled: true, href: '#', target: '_self' } }),
    el('button', pad + 176, startY + 280, 144, 48, 'Learn More',
      { backgroundColor: `${t.colors.primary}15`, color: t.colors.primary, fontSize: 14, fontWeight: '500', borderRadius: t.buttonStyle === 'pill' ? 24 : t.buttonStyle === 'square' ? 4 : 10, border: `1px solid ${t.colors.border}` },
      { zIndex: 3, hoverAnimation: 'lift', enterAnimation: 'slideUp' }),
    el('image', W - imgW - pad, startY + 60, imgW, H - 120, `https://placehold.co/${imgW}x${H - 120}/${t.colors.surface.replace('#', '')}/${t.colors.primary.replace('#', '')}?text=Your+Image`,
      { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.3)' },
      { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: { mobile: { height: 200 } } }),
  ]
}

function heroGradient(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 480
  const textW = 700
  return [
    el('section', 0, startY, W, H, '', { gradientType: 'linear', gradientFrom: t.colors.background, gradientTo: t.colors.surface, gradientAngle: 135, padding: 0 }, { sectionKey: 'hero', zIndex: 0 }),
    el('heading', cx(W, textW), startY + 100, textW, 120, 'Your Vision,\nOur Platform',
      { color: t.colors.text, fontSize: 56, fontWeight: '800', lineHeight: 1.1, textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 1, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 32 } } } }),
    el('paragraph', cx(W, 520), startY + 240, 520, 50, 'The fastest way to build and ship beautiful websites. Powered by intelligent blocks and themes.',
      { color: t.colors.textMuted, fontSize: 16, lineHeight: 1.7, textAlign: 'center', fontFamily: t.typography.bodyFont },
      { zIndex: 2, enterAnimation: 'fadeIn' }),
    el('button', cx(W, 180), startY + 320, 180, 52, 'Start Building',
      { backgroundColor: t.colors.primary, color: '#ffffff', fontSize: 16, fontWeight: '600', borderRadius: t.buttonStyle === 'pill' ? 26 : t.buttonStyle === 'square' ? 4 : 12, boxShadow: `0 4px 20px ${t.colors.primary}40` },
      { zIndex: 3, hoverAnimation: 'lift', enterAnimation: 'slideUp' }),
  ]
}

function heroMinimal(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 400
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'hero', zIndex: 0 }),
    el('heading', cx(W, 600), startY + 80, 600, 80, 'Hello, I\'m Alex',
      { color: t.colors.text, fontSize: 52, fontWeight: '800', textAlign: 'center', lineHeight: 1.1, fontFamily: t.typography.headingFont },
      { headingLevel: 1, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 32 } } } }),
    el('paragraph', cx(W, 440), startY + 180, 440, 40, 'Designer & Developer crafting digital experiences',
      { color: t.colors.textMuted, fontSize: 18, textAlign: 'center', fontFamily: t.typography.bodyFont },
      { zIndex: 2, enterAnimation: 'fadeIn' }),
    el('social-links', cx(W, 200), startY + 250, 200, 36, '',
      { iconColor: t.colors.textMuted, iconSize: 22, gap: 20 },
      { zIndex: 2, socialLinks: [{ platform: 'github', url: '#' }, { platform: 'linkedin', url: '#' }, { platform: 'twitter', url: '#' }] }),
    el('button', cx(W, 160), startY + 310, 160, 44, 'Contact Me',
      { backgroundColor: t.colors.primary, color: '#ffffff', fontSize: 14, fontWeight: '600', borderRadius: t.buttonStyle === 'pill' ? 22 : 10 },
      { zIndex: 3, hoverAnimation: 'lift' }),
  ]
}

// ─── ABOUT BLOCKS ──────────────────────────────────────────────────────────────

function aboutWithImage(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 480
  const pad = 100
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'about', zIndex: 0 }),
    el('paragraph', pad, startY + 50, 80, 22, 'ABOUT',
      { color: t.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, { zIndex: 2 }),
    el('heading', pad, startY + 80, 500, 44, 'Crafting Digital Experiences',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    el('paragraph', pad, startY + 140, 500, 100, "I'm a full-stack developer with 5+ years building web apps. I specialize in React, Node.js, and cloud infrastructure. I love turning complex problems into elegant solutions that people enjoy using.",
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.75, fontFamily: t.typography.bodyFont },
      { zIndex: 2 }),
    el('image', W - 480 - pad, startY + 50, 480, H - 100, `https://placehold.co/480x${H - 100}/${t.colors.background.replace('#', '')}/${t.colors.primary.replace('#', '')}?text=About+Image`,
      { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}` },
      { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: { mobile: { height: 200 } } }),
  ]
}

function aboutWithStats(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 420
  const pad = 100
  const cardW = 200
  const cardGap = 20
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'about', zIndex: 0 }),
    el('paragraph', pad, startY + 50, 80, 22, 'ABOUT',
      { color: t.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, { zIndex: 2 }),
    el('heading', pad, startY + 80, 560, 44, 'Building the Future',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    el('paragraph', pad, startY + 140, 540, 80, 'We are a team of passionate creators building tools that empower millions. Our mission is to make technology accessible to everyone.',
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.75, fontFamily: t.typography.bodyFont },
      { zIndex: 2 }),
    // Stat cards
    ...([
      { num: '50+', label: 'Projects Delivered' },
      { num: '10K+', label: 'Happy Users' },
      { num: '99%', label: 'Satisfaction Rate' },
    ] as const).map((stat, i) =>
      el('paragraph', pad + i * (cardW + cardGap), startY + 260, cardW, 80,
        `${stat.num}\n${stat.label}`,
        { backgroundColor: t.colors.surface, borderRadius: t.borderRadius, border: `1px solid ${t.colors.border}`, padding: 16, color: t.colors.text, fontSize: 14, fontWeight: '600', lineHeight: 1.5, textAlign: 'center' },
        { zIndex: 2, hoverAnimation: 'lift', groupId: `stat-${i}` })
    ),
  ]
}

// ─── FEATURES BLOCKS ───────────────────────────────────────────────────────────

function features3Col(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 480
  const pad = 100
  const cardW = 380
  const cardGap = 30
  const cards = [
    { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized performance that loads in milliseconds. Your users never wait.' },
    { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security with end-to-end encryption and SOC2 compliance.' },
    { icon: '🎨', title: 'Beautiful Design', desc: 'Pixel-perfect UI components that look great on every device and screen size.' },
  ]
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'features', zIndex: 0 }),
    el('paragraph', cx(W, 100), startY + 50, 100, 22, 'FEATURES',
      { color: t.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }, { zIndex: 2 }),
    el('heading', cx(W, 500), startY + 80, 500, 44, 'Everything You Need',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    ...cards.flatMap((card, i) => {
      const x = pad + i * (cardW + cardGap)
      const y = startY + 160
      return [
        el('paragraph', x, y, cardW, 240,
          `${card.icon}\n\n${card.title}\n\n${card.desc}`,
          { backgroundColor: t.colors.background, borderRadius: t.borderRadius, border: `1px solid ${t.colors.border}`, padding: 28, color: t.colors.text, fontSize: 13, lineHeight: 1.7 },
          { zIndex: 2, hoverAnimation: 'lift', groupId: `feature-${i}` }),
      ]
    }),
  ]
}

function featureAlt(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 600
  const pad = 100
  const textW = 480
  const imgW = 440
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'features', zIndex: 0 }),
    // Row 1: text left, image right
    el('heading', pad, startY + 60, textW, 40, 'Smart Analytics',
      { color: t.colors.text, fontSize: 28, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 3, zIndex: 2, groupId: 'feat-row1', responsiveStyles: { mobile: { styles: { fontSize: 22 } } } }),
    el('paragraph', pad, startY + 110, textW, 60, 'Get real-time insights into your performance. Track metrics that matter and make data-driven decisions with our powerful dashboard.',
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.75, fontFamily: t.typography.bodyFont },
      { zIndex: 2, groupId: 'feat-row1' }),
    el('image', W - imgW - pad, startY + 40, imgW, 200, `https://placehold.co/${imgW}x200/${t.colors.surface.replace('#', '')}/${t.colors.primary.replace('#', '')}?text=Analytics`,
      { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}` },
      { zIndex: 2, groupId: 'feat-row1', responsiveStyles: { mobile: { height: 160 } } }),
    // Row 2: image left, text right
    el('image', pad, startY + 320, imgW, 200, `https://placehold.co/${imgW}x200/${t.colors.surface.replace('#', '')}/${t.colors.secondary.replace('#', '')}?text=Collaboration`,
      { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}` },
      { zIndex: 2, groupId: 'feat-row2', responsiveStyles: { mobile: { height: 160 } } }),
    el('heading', W - textW - pad, startY + 340, textW, 40, 'Team Collaboration',
      { color: t.colors.text, fontSize: 28, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 3, zIndex: 2, groupId: 'feat-row2', responsiveStyles: { mobile: { styles: { fontSize: 22 } } } }),
    el('paragraph', W - textW - pad, startY + 390, textW, 60, 'Work together in real-time with your team. Share designs, leave comments, and iterate faster than ever before.',
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.75, fontFamily: t.typography.bodyFont },
      { zIndex: 2, groupId: 'feat-row2' }),
  ]
}

// ─── PROJECTS BLOCKS ───────────────────────────────────────────────────────────

function projectsGrid(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 520
  const pad = 100
  const cardW = 380
  const cardGap = 30
  const projects = [
    { title: 'Cloud Dashboard', desc: 'Real-time monitoring for cloud infrastructure.', tech: 'React · D3.js · AWS', color: t.colors.primary },
    { title: 'DevSync CLI', desc: 'Open-source CLI for scaffolding projects.', tech: 'TypeScript · Node.js', color: t.colors.secondary },
    { title: 'API Gateway', desc: 'High-performance gateway with rate limiting.', tech: 'Go · Redis · Docker', color: t.colors.accent },
  ]
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'projects', zIndex: 0 }),
    el('paragraph', pad, startY + 50, 100, 22, 'PROJECTS',
      { color: t.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, { zIndex: 2 }),
    el('heading', pad, startY + 80, 460, 44, 'Featured Projects',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    ...projects.flatMap((proj, i) => {
      const x = pad + i * (cardW + cardGap)
      const imgY = startY + 150
      return [
        el('image', x, imgY, cardW, 160, `https://placehold.co/${cardW}x160/${t.colors.surface.replace('#', '')}/${proj.color.replace('#', '')}?text=Project+${i + 1}`,
          { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}` },
          { zIndex: 2, groupId: `proj-${i}`, responsiveStyles: { mobile: { height: 140 } } }),
        el('heading', x, imgY + 172, cardW, 24, proj.title,
          { color: t.colors.text, fontSize: 18, fontWeight: '700' },
          { headingLevel: 3, zIndex: 2, groupId: `proj-${i}` }),
        el('paragraph', x, imgY + 202, cardW, 34, proj.desc,
          { color: t.colors.textMuted, fontSize: 12, lineHeight: 1.5 },
          { zIndex: 2, groupId: `proj-${i}` }),
        el('paragraph', x, imgY + 242, cardW, 18, proj.tech,
          { color: proj.color, fontSize: 10, fontWeight: '500' },
          { zIndex: 2, groupId: `proj-${i}` }),
      ]
    }),
  ]
}

function projectShowcase(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 500
  const pad = 100
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'projects', zIndex: 0 }),
    el('image', pad, startY + 50, W - pad * 2, 280, `https://placehold.co/${W - pad * 2}x280/${t.colors.background.replace('#', '')}/${t.colors.primary.replace('#', '')}?text=Project+Preview`,
      { borderRadius: t.borderRadius, objectFit: 'cover', border: `1px solid ${t.colors.border}` },
      { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: { mobile: { height: 180 } } }),
    el('heading', pad, startY + 350, 500, 36, 'Project Name',
      { color: t.colors.text, fontSize: 28, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, responsiveStyles: { mobile: { styles: { fontSize: 22 } } } }),
    el('paragraph', pad, startY + 396, 600, 40, 'A brief description of the project, its purpose, and the impact it made. Built with modern technologies.',
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.6 },
      { zIndex: 2 }),
    el('paragraph', pad, startY + 446, 400, 20, 'React · TypeScript · Node.js · PostgreSQL',
      { color: t.colors.primary, fontSize: 12, fontWeight: '500' },
      { zIndex: 2 }),
  ]
}

// ─── TESTIMONIALS BLOCKS ───────────────────────────────────────────────────────

function testimonialSingle(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 320
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'testimonials', zIndex: 0 }),
    el('paragraph', cx(W, 600), startY + 50, 600, 100,
      '"This product completely transformed our workflow. The team shipped 3x faster after adopting it. Best investment we made this year."',
      { color: t.colors.text, fontSize: 18, lineHeight: 1.8, textAlign: 'center', fontFamily: t.typography.bodyFont },
      { zIndex: 2, enterAnimation: 'fadeIn' }),
    el('image', cx(W, 56), startY + 175, 56, 56, `https://placehold.co/56x56/${t.colors.primary.replace('#', '')}/ffffff?text=JD`,
      { borderRadius: 28, objectFit: 'cover' },
      { zIndex: 2 }),
    el('paragraph', cx(W, 200), startY + 245, 200, 40, 'Jane Doe\nCTO at TechCorp',
      { color: t.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 1.5 },
      { zIndex: 2 }),
  ]
}

function testimonialGrid(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 420
  const pad = 100
  const cardW = 380
  const cardGap = 30
  const reviews = [
    { text: '"Incredible tool. Built our landing page in 30 minutes."', name: 'Sarah K.', role: 'Founder' },
    { text: '"The block system is genius. So intuitive to use."', name: 'Mike R.', role: 'Designer' },
    { text: '"Best builder I\'ve used. Clean code, fast output."', name: 'Alex T.', role: 'Developer' },
  ]
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'testimonials', zIndex: 0 }),
    el('heading', cx(W, 400), startY + 50, 400, 44, 'What People Say',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    ...reviews.map((r, i) =>
      el('paragraph', pad + i * (cardW + cardGap), startY + 130, cardW, 200,
        `${r.text}\n\n— ${r.name}, ${r.role}`,
        { backgroundColor: t.colors.surface, borderRadius: t.borderRadius, border: `1px solid ${t.colors.border}`, padding: 28, color: t.colors.text, fontSize: 14, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', groupId: `testimonial-${i}` })
    ),
  ]
}

// ─── CONTACT BLOCKS ────────────────────────────────────────────────────────────

function contactForm(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 500
  const pad = 100
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'contact', zIndex: 0 }),
    el('paragraph', pad, startY + 50, 100, 22, 'CONTACT',
      { color: t.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, { zIndex: 2 }),
    el('heading', pad, startY + 80, 500, 44, "Let's Work Together",
      { color: t.colors.text, fontSize: 32, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    el('paragraph', pad, startY + 134, 440, 36, "Have a project in mind? Send me a message and I'll get back to you within 24 hours.",
      { color: t.colors.textMuted, fontSize: 14, lineHeight: 1.6 },
      { zIndex: 2 }),
    el('form', W - 640 - pad, startY + 50, 640, 400, 'Send Message',
      { backgroundColor: t.colors.background, borderRadius: t.borderRadius, border: `1px solid ${t.colors.border}`, padding: 28, color: t.colors.text },
      { zIndex: 2, formFields: [
        { id: uid(), type: 'text', label: 'Your Name', placeholder: 'John Doe', required: true },
        { id: uid(), type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
        { id: uid(), type: 'textarea', label: 'Message', placeholder: 'Tell me about your project...', required: true },
      ], responsiveStyles: { mobile: { height: 340, styles: { padding: 16 } } } }),
  ]
}

function contactSocial(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 360
  const pad = 100
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'contact', zIndex: 0 }),
    el('heading', cx(W, 500), startY + 60, 500, 44, 'Get in Touch',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    el('paragraph', cx(W, 440), startY + 120, 440, 40, "I'd love to hear from you. Reach out through any of these channels.",
      { color: t.colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 1.6 },
      { zIndex: 2 }),
    el('paragraph', cx(W, 280), startY + 185, 280, 22, 'hello@example.com',
      { color: t.colors.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
      { zIndex: 2 }),
    el('social-links', cx(W, 280), startY + 230, 280, 40, '',
      { iconColor: t.colors.text, iconSize: 24, gap: 24 },
      { zIndex: 2, socialLinks: [
        { platform: 'github', url: '#' }, { platform: 'linkedin', url: '#' },
        { platform: 'twitter', url: '#' }, { platform: 'email', url: '#' },
      ] }),
    el('button', cx(W, 180), startY + 290, 180, 48, 'Schedule a Call',
      { backgroundColor: t.colors.primary, color: '#ffffff', fontSize: 14, fontWeight: '600', borderRadius: t.buttonStyle === 'pill' ? 24 : 10 },
      { zIndex: 3, hoverAnimation: 'lift' }),
  ]
}

// ─── FOOTER BLOCKS ─────────────────────────────────────────────────────────────

function footerSimple(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 120
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'footer', zIndex: 0 }),
    el('divider', 0, startY, W, 1, '', { backgroundColor: t.colors.border }, { zIndex: 2 }),
    el('paragraph', cx(W, 400), startY + 30, 400, 20, '© 2025 Your Company. All rights reserved.',
      { color: t.colors.textMuted, fontSize: 12, textAlign: 'center' },
      { zIndex: 2 }),
    el('social-links', cx(W, 200), startY + 65, 200, 30, '',
      { iconColor: t.colors.textMuted, iconSize: 18, gap: 18 },
      { zIndex: 2, socialLinks: [{ platform: 'github', url: '#' }, { platform: 'twitter', url: '#' }, { platform: 'linkedin', url: '#' }] }),
  ]
}

function footerMultiCol(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 260
  const pad = 100
  const colW = 200
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'footer', zIndex: 0 }),
    el('divider', 0, startY, W, 1, '', { backgroundColor: t.colors.border }, { zIndex: 2 }),
    el('heading', pad, startY + 30, 200, 28, 'YourBrand',
      { color: t.colors.text, fontSize: 18, fontWeight: '700', fontFamily: t.typography.headingFont },
      { headingLevel: 3, zIndex: 2 }),
    el('paragraph', pad, startY + 65, 260, 50, 'Building the future of web design, one block at a time.',
      { color: t.colors.textMuted, fontSize: 12, lineHeight: 1.6 },
      { zIndex: 2 }),
    // Column 1
    el('paragraph', pad + 400, startY + 30, colW, 120, 'Product\n\nFeatures\nPricing\nTemplates\nIntegrations',
      { color: t.colors.textMuted, fontSize: 12, lineHeight: 1.8 },
      { zIndex: 2 }),
    // Column 2
    el('paragraph', pad + 640, startY + 30, colW, 120, 'Company\n\nAbout\nCareers\nBlog\nContact',
      { color: t.colors.textMuted, fontSize: 12, lineHeight: 1.8 },
      { zIndex: 2 }),
    // Column 3
    el('paragraph', pad + 880, startY + 30, colW, 120, 'Legal\n\nPrivacy\nTerms\nCookies\nLicenses',
      { color: t.colors.textMuted, fontSize: 12, lineHeight: 1.8 },
      { zIndex: 2 }),
    // Copyright
    el('paragraph', pad, startY + 210, W - pad * 2, 20, '© 2025 YourBrand. All rights reserved.',
      { color: t.colors.textMuted, fontSize: 11, textAlign: 'center' },
      { zIndex: 2 }),
  ]
}

// ─── OTHER BLOCKS ──────────────────────────────────────────────────────────────

function pricingCards(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 520
  const pad = 100
  const cardW = 380
  const cardGap = 30
  const plans = [
    { name: 'Starter', price: '$9', features: '5 Projects\n1 GB Storage\nEmail Support\nBasic Analytics' },
    { name: 'Pro', price: '$29', features: 'Unlimited Projects\n10 GB Storage\nPriority Support\nAdvanced Analytics' },
    { name: 'Enterprise', price: '$99', features: 'Everything in Pro\n100 GB Storage\n24/7 Support\nCustom Integrations' },
  ]
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.surface, padding: 0 }, { sectionKey: 'pricing', zIndex: 0 }),
    el('heading', cx(W, 400), startY + 50, 400, 44, 'Simple Pricing',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    ...plans.map((plan, i) =>
      el('paragraph', pad + i * (cardW + cardGap), startY + 120, cardW, 340,
        `${plan.name}\n\n${plan.price}/mo\n\n${plan.features}`,
        { backgroundColor: i === 1 ? t.colors.primary + '15' : t.colors.background, borderRadius: t.borderRadius, border: `1px solid ${i === 1 ? t.colors.primary : t.colors.border}`, padding: 28, color: t.colors.text, fontSize: 14, lineHeight: 1.7, textAlign: 'center' },
        { zIndex: 2, hoverAnimation: 'lift', groupId: `pricing-${i}` })
    ),
  ]
}

function statsCounter(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 200
  const pad = 100
  const stats = [
    { num: '10K+', label: 'Users' },
    { num: '500+', label: 'Projects' },
    { num: '99.9%', label: 'Uptime' },
    { num: '24/7', label: 'Support' },
  ]
  const cardW = 260
  const totalW = stats.length * cardW + (stats.length - 1) * 20
  const startX = cx(W, totalW)
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.primary + '08', padding: 0 }, { sectionKey: 'stats', zIndex: 0 }),
    ...stats.map((stat, i) =>
      el('paragraph', startX + i * (cardW + 20), startY + 50, cardW, 100,
        `${stat.num}\n${stat.label}`,
        { color: t.colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 2 },
        { zIndex: 2, groupId: `stat-${i}` })
    ),
  ]
}

function faqBlock(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 520
  const pad = 100
  const qW = W - pad * 2
  const faqs = [
    { q: 'How do I get started?', a: 'Simply pick a theme, add blocks, customize your content, and publish. It takes less than 10 minutes.' },
    { q: 'Can I use my own domain?', a: 'Yes! You can connect any custom domain to your published page. We handle the DNS and SSL for you.' },
    { q: 'Is there a free plan?', a: 'We offer a generous free tier with 3 published pages. Upgrade for unlimited pages and premium features.' },
    { q: 'Can I export the code?', a: 'Pro and Enterprise plans include HTML/CSS export. You own your code completely.' },
  ]
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.background, padding: 0 }, { sectionKey: 'faq', zIndex: 0 }),
    el('heading', cx(W, 400), startY + 50, 400, 44, 'Frequently Asked',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    ...faqs.flatMap((faq, i) => {
      const y = startY + 120 + i * 90
      return [
        el('paragraph', pad, y, qW, 75,
          `${faq.q}\n\n${faq.a}`,
          { backgroundColor: t.colors.surface, borderRadius: t.borderRadius, border: `1px solid ${t.colors.border}`, padding: 20, color: t.colors.text, fontSize: 13, lineHeight: 1.6 },
          { zIndex: 2 }),
      ]
    }),
  ]
}

function newsletterBlock(startY: number, W: number, t: StudioTheme): CanvasElement[] {
  const H = 280
  return [
    el('section', 0, startY, W, H, '', { backgroundColor: t.colors.primary + '10', padding: 0 }, { sectionKey: 'newsletter', zIndex: 0 }),
    el('heading', cx(W, 500), startY + 50, 500, 44, 'Stay in the Loop',
      { color: t.colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', fontFamily: t.typography.headingFont },
      { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: { mobile: { styles: { fontSize: 24 } } } }),
    el('paragraph', cx(W, 440), startY + 110, 440, 30, 'Get the latest updates, tips, and resources delivered to your inbox.',
      { color: t.colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 1.6 },
      { zIndex: 2 }),
    el('form', cx(W, 480), startY + 165, 480, 80, '',
      { backgroundColor: 'transparent', borderRadius: 0, padding: 0, color: t.colors.text },
      { zIndex: 2, formFields: [
        { id: uid(), type: 'email', label: '', placeholder: 'Enter your email', required: true },
      ] }),
  ]
}

// ─── BLOCK REGISTRY ────────────────────────────────────────────────────────────

export const BLOCKS: BlockDefinition[] = [
  // Hero
  { id: 'hero-image-cta', category: 'hero', label: 'Hero with Image + CTA', description: 'Full hero section with image, headline, and call-to-action buttons', estimatedHeight: 560, create: heroImageCta },
  { id: 'hero-gradient', category: 'hero', label: 'Hero Gradient', description: 'Centered hero with gradient background and bold headline', estimatedHeight: 480, create: heroGradient },
  { id: 'hero-minimal', category: 'hero', label: 'Hero Minimal', description: 'Clean minimal hero with centered text and social links', estimatedHeight: 400, create: heroMinimal },
  // About
  { id: 'about-image', category: 'about', label: 'About with Image', description: 'About section with text on left and image on right', estimatedHeight: 480, create: aboutWithImage },
  { id: 'about-stats', category: 'about', label: 'About with Stats', description: 'About section with stat cards below', estimatedHeight: 420, create: aboutWithStats },
  // Features
  { id: 'features-3col', category: 'features', label: '3-Column Features', description: 'Three feature cards with icons and descriptions', estimatedHeight: 480, create: features3Col },
  { id: 'features-alternating', category: 'features', label: 'Alternating Features', description: 'Alternating image and text rows', estimatedHeight: 600, create: featureAlt },
  // Projects
  { id: 'projects-grid', category: 'projects', label: 'Project Cards Grid', description: 'Three project cards with images, titles, and tech stacks', estimatedHeight: 520, create: projectsGrid },
  { id: 'projects-showcase', category: 'projects', label: 'Project Showcase', description: 'Single project spotlight with large image', estimatedHeight: 500, create: projectShowcase },
  // Testimonials
  { id: 'testimonial-single', category: 'testimonials', label: 'Single Testimonial', description: 'Centered testimonial quote with avatar', estimatedHeight: 320, create: testimonialSingle },
  { id: 'testimonial-grid', category: 'testimonials', label: 'Testimonial Grid', description: 'Three testimonial cards side by side', estimatedHeight: 420, create: testimonialGrid },
  // Contact
  { id: 'contact-form', category: 'contact', label: 'Contact Form', description: 'Contact section with heading and full form', estimatedHeight: 500, create: contactForm },
  { id: 'contact-social', category: 'contact', label: 'Contact + Social', description: 'Contact with email, social links, and CTA button', estimatedHeight: 360, create: contactSocial },
  // Footer
  { id: 'footer-simple', category: 'footer', label: 'Simple Footer', description: 'Minimal footer with copyright and social links', estimatedHeight: 120, create: footerSimple },
  { id: 'footer-multi-col', category: 'footer', label: 'Multi-Column Footer', description: 'Footer with brand, links columns, and copyright', estimatedHeight: 260, create: footerMultiCol },
  // Other
  { id: 'pricing-cards', category: 'other', label: 'Pricing Cards', description: 'Three pricing plan cards', estimatedHeight: 520, create: pricingCards },
  { id: 'stats-counter', category: 'other', label: 'Stats Counter', description: 'Horizontal stat numbers bar', estimatedHeight: 200, create: statsCounter },
  { id: 'faq-section', category: 'other', label: 'FAQ Section', description: 'Frequently asked questions with answers', estimatedHeight: 520, create: faqBlock },
  { id: 'newsletter', category: 'other', label: 'Newsletter Signup', description: 'Email signup section with heading', estimatedHeight: 280, create: newsletterBlock },
]
