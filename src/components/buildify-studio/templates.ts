import { type CanvasElement, type CanvasBackground } from './types'

export type TemplateCategory =
  | 'developer'
  | 'designer'
  | 'personal'
  | 'minimal'
  | 'creative'
  | 'photography'
  | 'futuristic'

export interface StudioTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string
  background: CanvasBackground
  elements: CanvasElement[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const noLink = { enabled: false, href: '', target: '_blank' as const }

function el(
  id: string,
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
    id,
    type,
    x,
    y,
    width: w,
    height: h,
    content,
    styles,
    link: noLink,
    zIndex: extras.zIndex ?? 1,
    enterAnimation: 'none',
    hoverAnimation: 'none',
    ...extras,
  }
}

function mkBg(
  type: CanvasBackground['type'],
  color: string,
  opts: Partial<Omit<CanvasBackground, 'type' | 'color'>> = {},
): CanvasBackground {
  return {
    type,
    color,
    gradientFrom: opts.gradientFrom ?? color,
    gradientTo: opts.gradientTo ?? '#ffffff',
    gradientAngle: opts.gradientAngle ?? 135,
    imageUrl: opts.imageUrl ?? '',
  }
}

// ─── template definitions ─────────────────────────────────────────────────────

export const TEMPLATES: StudioTemplate[] = [
  // ── 1. Developer Dark ────────────────────────────────────────────────────────
  {
    id: 'developer-dark',
    name: 'Developer Dark',
    category: 'developer',
    description: 'Dark code-focused portfolio for engineers',
    background: mkBg('solid', '#0d1117'),
    elements: [
      el('d-nav', 'navbar', 0, 0, 1440, 64, 'DevFolio|Projects|Skills|Blog|Contact',
        { backgroundColor: '#161b22', color: '#f0f6fc', fontSize: 14, fontWeight: '600' },
        { zIndex: 10 }),
      el('d-h1', 'heading', 100, 100, 700, 100, "Hi, I'm Alex Johnson",
        { color: '#f0f6fc', fontSize: 52, fontWeight: '800', lineHeight: 1.15 },
        { headingLevel: 1, zIndex: 2 }),
      el('d-role', 'heading', 100, 214, 680, 52, 'Full Stack Developer & OSS Contributor',
        { color: '#58a6ff', fontSize: 22, fontWeight: '600' },
        { headingLevel: 2, zIndex: 2 }),
      el('d-bio', 'paragraph', 100, 282, 560, 76,
        'Crafting scalable web applications and open-source tools.\nTypeScript · React · Node.js · PostgreSQL · Docker',
        { color: '#8b949e', fontSize: 15, lineHeight: 1.7 }, { zIndex: 2 }),
      el('d-btn1', 'button', 100, 378, 160, 44, 'View Projects',
        { backgroundColor: '#1f6feb', color: '#ffffff', fontSize: 15, fontWeight: '600', borderRadius: 6 },
        { zIndex: 3 }),
      el('d-btn2', 'button', 272, 378, 148, 44, 'Download CV',
        { backgroundColor: '#21262d', color: '#c9d1d9', fontSize: 15, fontWeight: '500', borderRadius: 6, border: '1px solid #30363d' },
        { zIndex: 3 }),
      el('d-social', 'social-links', 100, 444, 280, 36, '',
        { iconColor: '#8b949e', iconSize: 22, gap: 16 },
        { zIndex: 2, socialLinks: [{ platform: 'github', url: '' }, { platform: 'twitter', url: '' }, { platform: 'linkedin', url: '' }, { platform: 'discord', url: '' }] }),
      el('d-code', 'code-block', 836, 88, 504, 376,
        '// portfolio.js\nconst alex = {\n  skills: [\n    "TypeScript", "React",\n    "Node.js", "PostgreSQL",\n    "Docker", "AWS",\n  ],\n  currentProject:\n    "Open Source CLI Tool",\n  coffee: Infinity,\n  available: true,\n};\n\nconsole.log("Building the future...");',
        { backgroundColor: '#161b22', color: '#cdd6f4', fontSize: 13, fontFamily: '"Fira Code", monospace', lineHeight: 1.6 },
        { zIndex: 2 }),
      el('d-skillbg', 'section', 0, 556, 1440, 404, '',
  { backgroundColor: '#161b22', border: '1px solid #21262d' },
  { zIndex: 1, sectionKey: 'skills' }),
      el('d-skill-h', 'heading', 100, 580, 400, 48, 'Tech Stack',
        { color: '#f0f6fc', fontSize: 24, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('d-card1', 'paragraph', 100, 642, 212, 88,
        'Frontend\nReact · Next.js · TypeScript',
        { backgroundColor: '#1f2937', borderRadius: 10, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-card2', 'paragraph', 324, 642, 212, 88,
        'Backend\nNode.js · PostgreSQL · Redis',
        { backgroundColor: '#1f2937', borderRadius: 10, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-card3', 'paragraph', 548, 642, 212, 88,
        'DevOps\nDocker · AWS · CI/CD',
        { backgroundColor: '#1f2937', borderRadius: 10, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-card4', 'paragraph', 772, 642, 212, 88,
        'Tools\nGit · VS Code · Figma',
        { backgroundColor: '#1f2937', borderRadius: 10, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-proj-h', 'heading', 100, 758, 420, 44, 'Featured Projects',
        { color: '#f0f6fc', fontSize: 22, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('d-proj1', 'paragraph', 100, 814, 360, 124,
        'Portfolio CLI\nScaffolding tool for dev projects\n\nTypeScript · Node.js · npm',
        { backgroundColor: '#1f2937', borderRadius: 12, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-proj2', 'paragraph', 476, 814, 360, 124,
        'React Dashboard\nReal-time analytics with D3 charts\n\nReact · D3.js · WebSockets',
        { backgroundColor: '#1f2937', borderRadius: 12, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('d-proj3', 'paragraph', 852, 814, 360, 124,
        'API Gateway\nHigh-performance GraphQL API\n\nNode.js · GraphQL · Redis',
        { backgroundColor: '#1f2937', borderRadius: 12, border: '1px solid #374151', padding: 16, color: '#c9d1d9', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
    ],
  },

  // ── 2. Designer Clean ────────────────────────────────────────────────────────
  {
    id: 'designer-clean',
    name: 'Designer Clean',
    category: 'designer',
    description: 'Minimal white portfolio for creatives',
    background: mkBg('solid', '#ffffff'),
    elements: [
      el('dc-nav', 'navbar', 0, 0, 1440, 70, 'Studio|Work|About|Process|Contact',
        { backgroundColor: '#ffffff', color: '#0f172a', fontSize: 14, fontWeight: '500', border: '1px solid #e5e7eb' },
        { zIndex: 10 }),
      el('dc-h1', 'heading', 120, 96, 900, 130, 'Sarah Chen',
        { color: '#0f172a', fontSize: 88, fontWeight: '800', letterSpacing: -3, lineHeight: 1.0 },
        { headingLevel: 1, zIndex: 2 }),
      el('dc-role', 'heading', 120, 240, 700, 48, 'Visual Designer & Creative Director',
        { color: '#7c3aed', fontSize: 22, fontWeight: '500' },
        { headingLevel: 2, zIndex: 2 }),
      el('dc-div', 'divider', 120, 304, 300, 3, '',
        { backgroundColor: '#7c3aed', borderRadius: 2 }, { zIndex: 2 }),
      el('dc-img', 'image', 120, 326, 420, 552,
        'https://placehold.co/420x552/e8e0ff/7c3aed?text=Sarah+Chen',
        { borderRadius: 16, objectFit: 'cover' }, { zIndex: 2 }),
      el('dc-about-h', 'heading', 580, 326, 220, 40, 'About Me',
        { color: '#0f172a', fontSize: 22, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('dc-about', 'paragraph', 580, 380, 500, 112,
        'Creative director with 8+ years crafting visual identities and digital experiences for global brands. I believe great design solves problems beautifully.',
        { color: '#374151', fontSize: 15, lineHeight: 1.8 }, { zIndex: 2 }),
      el('dc-work-h', 'heading', 580, 514, 220, 40, 'Selected Work',
        { color: '#0f172a', fontSize: 22, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('dc-w1', 'paragraph', 580, 566, 214, 144,
        'Brand Identity\nForbes 500 client rebrand\n\n2024 · Branding',
        { backgroundColor: '#f8f4ff', borderRadius: 16, border: '1px solid #ddd6fe', padding: 20, color: '#374151', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('dc-w2', 'paragraph', 808, 566, 214, 144,
        'Digital Campaign\nViral social media push\n\n2024 · Campaign',
        { backgroundColor: '#fef3c7', borderRadius: 16, border: '1px solid #fde68a', padding: 20, color: '#374151', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('dc-w3', 'paragraph', 580, 722, 214, 144,
        'Product Design\nMobile UX redesign\n\n2023 · UX/UI',
        { backgroundColor: '#ecfdf5', borderRadius: 16, border: '1px solid #a7f3d0', padding: 20, color: '#374151', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('dc-w4', 'paragraph', 808, 722, 214, 144,
        'Motion Design\nBrand film production\n\n2023 · Animation',
        { backgroundColor: '#fff1f2', borderRadius: 16, border: '1px solid #fecdd3', padding: 20, color: '#374151', fontSize: 12, lineHeight: 1.6 }, { zIndex: 2 }),
      el('dc-contact-h', 'heading', 1064, 326, 280, 40, "Let's Talk",
        { color: '#0f172a', fontSize: 22, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('dc-email', 'paragraph', 1064, 378, 280, 44,
        'hello@sarahchen.design',
        { color: '#7c3aed', fontSize: 15, fontWeight: '500' }, { zIndex: 2 }),
      el('dc-social', 'social-links', 1064, 438, 260, 36, '',
        { iconColor: '#7c3aed', iconSize: 24, gap: 20 },
        { zIndex: 2, socialLinks: [{ platform: 'instagram', url: '' }, { platform: 'linkedin', url: '' }, { platform: 'twitter', url: '' }] }),
      el('dc-btn', 'button', 580, 888, 196, 44, 'View Full Portfolio',
        { backgroundColor: '#7c3aed', color: '#ffffff', fontSize: 15, fontWeight: '600', borderRadius: 8 },
        { zIndex: 3 }),
    ],
  },

  // ── 3. Personal Warm ─────────────────────────────────────────────────────────
  {
    id: 'personal-warm',
    name: 'Personal Warm',
    category: 'personal',
    description: 'Warm creator page for bloggers and writers',
    background: mkBg('solid', '#fef9f0'),
    elements: [
    el('pw-leftbg', 'section', 0, 0, 580, 960, '',
  { backgroundColor: '#fff8f0', border: '1px solid #fed7aa' },
  { zIndex: 0, sectionKey: 'about' }),
      el('pw-img', 'image', 80, 60, 420, 440,
        'https://placehold.co/420x440/fed7aa/ea580c?text=Jordan',
        { borderRadius: 20, objectFit: 'cover', boxShadow: '0 8px 32px rgba(234,88,12,0.15)' }, { zIndex: 2 }),
      el('pw-h1', 'heading', 80, 520, 440, 90, 'Jordan Rivera',
        { color: '#1c1917', fontSize: 48, fontWeight: '800', lineHeight: 1.1 },
        { headingLevel: 1, zIndex: 2 }),
      el('pw-role', 'heading', 80, 624, 440, 48, 'Content Creator & Writer',
        { color: '#ea580c', fontSize: 20, fontWeight: '600' },
        { headingLevel: 2, zIndex: 2 }),
      el('pw-tagline', 'paragraph', 80, 686, 440, 72,
        'Sharing stories about life, travel, and creativity. Join me on this journey.',
        { color: '#57534e', fontSize: 15, lineHeight: 1.7 }, { zIndex: 2 }),
      el('pw-social', 'social-links', 80, 778, 300, 36, '',
        { iconColor: '#ea580c', iconSize: 22, gap: 18 },
        { zIndex: 2, socialLinks: [{ platform: 'instagram', url: '' }, { platform: 'youtube', url: '' }, { platform: 'twitter', url: '' }, { platform: 'tiktok', url: '' }] }),
      el('pw-btn', 'button', 80, 836, 164, 44, 'Say Hello',
        { backgroundColor: '#ea580c', color: '#ffffff', fontSize: 15, fontWeight: '600', borderRadius: 8 },
        { zIndex: 3 }),
      el('pw-posts-h', 'heading', 650, 60, 360, 48, 'Latest Posts',
        { color: '#1c1917', fontSize: 28, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('pw-post1', 'paragraph', 650, 122, 700, 116,
        'The Art of Slow Travel\nA journey through Southeast Asia without a plan.\n\n5 min read · March 2024',
        { backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa', padding: 20, color: '#1c1917', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('pw-post2', 'paragraph', 650, 252, 700, 116,
        'Morning Routines That Changed My Life\n6 habits picked up from high performers.\n\n8 min read · February 2024',
        { backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa', padding: 20, color: '#1c1917', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('pw-post3', 'paragraph', 650, 382, 700, 116,
        "Building in Public: 6 Month Update\nWhat worked, what didn't, and lessons learned.\n\n10 min read · January 2024",
        { backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa', padding: 20, color: '#1c1917', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('pw-contact-h', 'heading', 650, 526, 360, 44, 'Get in Touch',
        { color: '#1c1917', fontSize: 22, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('pw-form', 'form', 650, 582, 700, 280, 'Send a Message',
        { backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa', padding: 24 },
        { zIndex: 2, formFields: [
          { id: 'f1', type: 'text', label: 'Name', placeholder: 'Your name' },
          { id: 'f2', type: 'email', label: 'Email', placeholder: 'your@email.com' },
          { id: 'f3', type: 'textarea', label: 'Message', placeholder: 'Say hello...' },
        ] }),
    ],
  },

  // ── 4. Minimal Resume ────────────────────────────────────────────────────────
  {
    id: 'minimal-resume',
    name: 'Minimal Resume',
    category: 'minimal',
    description: 'Clean centered resume for professionals',
    background: mkBg('solid', '#f8fafc'),
    elements: [
      el('mr-h1', 'heading', 320, 80, 800, 130, 'Morgan Blake',
        { color: '#0f172a', fontSize: 80, fontWeight: '800', textAlign: 'center', lineHeight: 1.0, letterSpacing: -2 },
        { headingLevel: 1, zIndex: 2 }),
      el('mr-role', 'paragraph', 320, 224, 800, 48,
        'Senior Software Engineer · Open to Opportunities',
        { color: '#475569', fontSize: 20, textAlign: 'center', lineHeight: 1.4 }, { zIndex: 2 }),
      el('mr-div1', 'divider', 560, 288, 320, 2, '',
        { backgroundColor: '#e2e8f0', borderRadius: 2 }, { zIndex: 2 }),
      el('mr-about', 'paragraph', 320, 308, 800, 72,
        '5+ years building products at scale. Passionate about distributed systems, developer experience, and mentoring junior engineers.',
        { color: '#334155', fontSize: 16, textAlign: 'center', lineHeight: 1.8 }, { zIndex: 2 }),
      el('mr-div2', 'divider', 560, 396, 320, 2, '',
        { backgroundColor: '#e2e8f0', borderRadius: 2 }, { zIndex: 2 }),
      el('mr-skill-h', 'heading', 320, 416, 800, 44, 'Skills',
        { color: '#0f172a', fontSize: 18, fontWeight: '700', textAlign: 'center' },
        { headingLevel: 2, zIndex: 2 }),
      el('mr-skills', 'paragraph', 320, 472, 800, 48,
        'TypeScript · React · Node.js · PostgreSQL · AWS · Docker · System Design · GraphQL',
        { color: '#475569', fontSize: 15, textAlign: 'center', lineHeight: 1.8 }, { zIndex: 2 }),
      el('mr-div3', 'divider', 560, 536, 320, 2, '',
        { backgroundColor: '#e2e8f0', borderRadius: 2 }, { zIndex: 2 }),
      el('mr-exp-h', 'heading', 320, 556, 800, 44, 'Experience',
        { color: '#0f172a', fontSize: 18, fontWeight: '700', textAlign: 'center' },
        { headingLevel: 2, zIndex: 2 }),
      el('mr-exp1', 'paragraph', 320, 612, 360, 120,
        'Senior Engineer · Acme Corp\n2022 – Present\n\nLed platform migration from monolith to microservices serving 2M+ users.',
        { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, color: '#334155', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('mr-exp2', 'paragraph', 760, 612, 360, 120,
        'Software Engineer · StartupX\n2019 – 2022\n\nBuilt core product features used by 200k+ daily active users.',
        { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, color: '#334155', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('mr-div4', 'divider', 560, 748, 320, 2, '',
        { backgroundColor: '#e2e8f0', borderRadius: 2 }, { zIndex: 2 }),
      el('mr-social', 'social-links', 320, 768, 800, 40, '',
        { iconColor: '#64748b', iconSize: 22, gap: 24, justifyContent: 'center' },
        { zIndex: 2, socialLinks: [{ platform: 'github', url: '' }, { platform: 'linkedin', url: '' }, { platform: 'twitter', url: '' }, { platform: 'email', url: '' }] }),
      el('mr-footer', 'paragraph', 320, 824, 800, 32,
        'Available for senior roles & consulting · morgan@blake.dev',
        { color: '#94a3b8', fontSize: 13, textAlign: 'center' }, { zIndex: 2 }),
    ],
  },

  // ── 5. Creative Studio ───────────────────────────────────────────────────────
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    category: 'creative',
    description: 'Bold gradient design for agencies',
    background: mkBg('gradient', '#1a0536', { gradientFrom: '#1a0536', gradientTo: '#0d1b4b', gradientAngle: 135 }),
    elements: [
      el('cs-nav', 'navbar', 0, 0, 1440, 64, 'CREAT|Services|Work|Team|Contact',
        { backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: 14, fontWeight: '500', border: '1px solid rgba(255,255,255,0.1)' },
        { zIndex: 10 }),
      el('cs-h1', 'heading', 100, 110, 820, 200, 'We Build\nDigital Futures',
        { color: '#ffffff', fontSize: 72, fontWeight: '800', lineHeight: 1.05, letterSpacing: -2 },
        { headingLevel: 1, zIndex: 2 }),
      el('cs-tagline', 'paragraph', 100, 330, 580, 64,
        'Award-winning creative studio specializing in brand identities, web experiences, and digital campaigns.',
        { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.7 }, { zIndex: 2 }),
      el('cs-btn1', 'button', 100, 414, 180, 52, 'Start a Project',
        { backgroundColor: '#a855f7', color: '#ffffff', fontSize: 16, fontWeight: '600', borderRadius: 8 },
        { zIndex: 3 }),
      el('cs-btn2', 'button', 296, 414, 164, 52, 'View Our Work',
        { backgroundColor: 'transparent', color: '#ffffff', fontSize: 16, fontWeight: '500', borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)' },
        { zIndex: 3 }),
      el('cs-img', 'image', 1000, 72, 360, 500,
        'https://placehold.co/360x500/2d1b69/a855f7?text=Studio',
        { borderRadius: 16, objectFit: 'cover', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
        { zIndex: 2 }),
    el('cs-svcbg', 'section', 0, 560, 1440, 400, '',
  { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' },
  { zIndex: 1, sectionKey: 'services' }),
      el('cs-svc-h', 'heading', 100, 588, 400, 52, 'What We Do',
        { color: '#ffffff', fontSize: 28, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2 }),
      el('cs-svc1', 'paragraph', 100, 654, 284, 152,
        'Brand Identity\nComplete visual identity systems — logo, palette, typography, and brand guidelines.',
        { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('cs-svc2', 'paragraph', 400, 654, 284, 152,
        'Web Design\nBespoke websites that convert. Pixel-perfect design with motion and interaction.',
        { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('cs-svc3', 'paragraph', 700, 654, 284, 152,
        'Digital Marketing\nData-driven campaigns that drive growth and lasting brand recognition.',
        { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('cs-svc4', 'paragraph', 1000, 654, 284, 152,
        'Motion & Film\nAnimated brand films, product videos, and social-first content.',
        { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }, { zIndex: 2 }),
      el('cs-cta', 'button', 100, 828, 196, 48, 'Begin Your Project →',
        { backgroundColor: '#a855f7', color: '#ffffff', fontSize: 15, fontWeight: '600', borderRadius: 8 },
        { zIndex: 3 }),
      el('cs-social', 'social-links', 340, 836, 260, 40, '',
        { iconColor: 'rgba(255,255,255,0.6)', iconSize: 20, gap: 16 },
        { zIndex: 2, socialLinks: [{ platform: 'instagram', url: '' }, { platform: 'twitter', url: '' }, { platform: 'linkedin', url: '' }] }),
    ],
  },

  // ── 6. Photography ───────────────────────────────────────────────────────────
  {
    id: 'photography',
    name: 'Photography',
    category: 'photography',
    description: 'Dark visual portfolio for photographers',
    background: mkBg('solid', '#0a0a0a'),
    elements: [
      el('ph-nav', 'navbar', 0, 0, 1440, 64, 'LENS|Portfolio|Series|About|Contact',
        { backgroundColor: 'transparent', color: '#ffffff', fontSize: 13, fontWeight: '600', letterSpacing: 2 },
        { zIndex: 10 }),
      el('ph-hero', 'image', 0, 64, 880, 572,
        'https://placehold.co/880x572/1a1a1a/4b5563?text=Featured+Photo',
        { objectFit: 'cover' }, { zIndex: 2 }),
      el('ph-side1', 'image', 896, 64, 544, 274,
        'https://placehold.co/544x274/222222/6b7280?text=Series+01',
        { objectFit: 'cover' }, { zIndex: 2 }),
      el('ph-side2', 'image', 896, 350, 544, 286,
        'https://placehold.co/544x286/1e1e1e/6b7280?text=Series+02',
        { objectFit: 'cover' }, { zIndex: 2 }),
     el('ph-textbg', 'section', 0, 596, 880, 364, '',
  { backgroundColor: '#0a0a0a' },
  { zIndex: 1, sectionKey: 'about' }),
      el('ph-h1', 'heading', 40, 620, 600, 96, 'Elena Vasquez',
        { color: '#ffffff', fontSize: 56, fontWeight: '800', letterSpacing: -1 },
        { headingLevel: 1, zIndex: 3 }),
      el('ph-specialty', 'heading', 40, 728, 500, 48, 'Portrait & Landscape Photography',
        { color: '#f59e0b', fontSize: 18, fontWeight: '500' },
        { headingLevel: 2, zIndex: 3 }),
      el('ph-bio', 'paragraph', 40, 788, 600, 72,
        'Based in Barcelona. Capturing the world one frame at a time. Available for commercial and editorial projects.',
        { color: '#9ca3af', fontSize: 14, lineHeight: 1.7 }, { zIndex: 3 }),
      el('ph-btn', 'button', 40, 876, 172, 44, 'View Portfolio',
        { backgroundColor: '#f59e0b', color: '#0a0a0a', fontSize: 14, fontWeight: '700', borderRadius: 4 },
        { zIndex: 4 }),
      el('ph-social', 'social-links', 228, 878, 240, 40, '',
        { iconColor: '#9ca3af', iconSize: 20, gap: 16 },
        { zIndex: 4, socialLinks: [{ platform: 'instagram', url: '' }, { platform: 'website', url: '' }, { platform: 'email', url: '' }] }),
      el('ph-contact', 'paragraph', 920, 640, 480, 128,
        'Available for Work\nhello@elenavasquez.com\n+34 612 345 678\nBarcelona, Spain',
        { backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 24, color: '#9ca3af', fontSize: 14, lineHeight: 1.8 }, { zIndex: 3 }),
    ],
  },

  // ── 7. Futuristic Developer Portfolio ────────────────────────────────────────
  // NO decorative section elements (glow orbs, section BGs) — they break mobile reflow.
  // Glow effects achieved via boxShadow on content elements instead.
  // Hero image at y=540 (below hero text y=80–500) so reflow puts it in separate row.
  // Code block at y=880 (separate row from about text).
  {
    id: 'futuristic-dev',
    name: 'Futuristic Dev Portfolio',
    category: 'futuristic',
    description: 'Premium futuristic portfolio for developers',
    background: mkBg('gradient', '#06080f', { gradientFrom: '#06080f', gradientTo: '#0c1225', gradientAngle: 180 }),
    elements: [

      // ── Navbar ──────────────────────────────────────────────────────────────
      el('fd-nav', 'navbar', 0, 0, 1440, 56, 'Portfolio|About|Skills|Experience|Projects|Education|Contact',
        { backgroundColor: 'rgba(6,8,15,0.9)', color: '#e2e8f0', fontSize: 13, fontWeight: '500', border: '1px solid rgba(59,130,246,0.08)' },
        { zIndex: 20, responsiveStyles: {
          tablet: { height: 50, styles: { fontSize: 12 } },
          mobile: { height: 46, styles: { fontSize: 10 } },
        } }),

      // ── Hero Section — text only (y=76–496), image at y=540 ─────────────
      el('fd-hero-tag', 'paragraph', 100, 80, 160, 28,
        'Available for hire',
        { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 20, padding: 5, color: '#60a5fa', fontSize: 11, fontWeight: '600', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' },
        { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: {
          tablet: { height: 26 },
          mobile: { height: 24, styles: { fontSize: 10 } },
        } }),

      el('fd-hero-h1', 'heading', 100, 122, 680, 100, "Hi, I'm Alex Carter",
        { color: '#f1f5f9', fontSize: 52, fontWeight: '800', lineHeight: 1.1, letterSpacing: -1 },
        { headingLevel: 1, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 80, styles: { fontSize: 40 } },
          mobile: { height: 80, styles: { fontSize: 28, letterSpacing: 0 } },
        } }),

      el('fd-hero-role', 'heading', 100, 234, 560, 36, 'Full Stack Developer',
        { color: 'transparent', fontSize: 26, fontWeight: '700', gradientType: 'linear', gradientFrom: '#60a5fa', gradientTo: '#a78bfa', gradientAngle: 90 },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 32, styles: { fontSize: 20 } },
          mobile: { height: 32, styles: { fontSize: 17 } },
        } }),

      el('fd-hero-desc', 'paragraph', 100, 284, 520, 64,
        'I build performant web applications and scalable systems.\nPassionate about clean code, open source, and developer experience.',
        { color: '#94a3b8', fontSize: 15, lineHeight: 1.75 },
        { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: {
          tablet: { height: 60, styles: { fontSize: 14 } },
          mobile: { height: 100, styles: { fontSize: 13, lineHeight: 1.6 } },
        } }),

      el('fd-hero-btn1', 'button', 100, 364, 160, 44, 'Download CV',
        { backgroundColor: '#3b82f6', color: '#ffffff', fontSize: 14, fontWeight: '600', borderRadius: 10, boxShadow: '0 4px 20px rgba(59,130,246,0.3)' },
        { zIndex: 3, hoverAnimation: 'lift', enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 42 },
          mobile: { height: 42, styles: { fontSize: 13 } },
        } }),

      el('fd-hero-btn2', 'button', 276, 364, 144, 44, 'Contact Me',
        { backgroundColor: 'rgba(59,130,246,0.08)', color: '#93c5fd', fontSize: 14, fontWeight: '500', borderRadius: 10, border: '1px solid rgba(59,130,246,0.3)' },
        { zIndex: 3, hoverAnimation: 'lift', enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 42 },
          mobile: { height: 42, styles: { fontSize: 13 } },
        } }),

      el('fd-hero-social', 'social-links', 100, 426, 240, 32, '',
        { iconColor: '#64748b', iconSize: 18, gap: 16 },
        { zIndex: 2, socialLinks: [{ platform: 'github', url: '' }, { platform: 'linkedin', url: '' }, { platform: 'twitter', url: '' }, { platform: 'discord', url: '' }] }),

      // Hero image at y=540 — clearly below text (y=80–458) → separate reflow row
      el('fd-hero-img', 'image', 860, 540, 460, 420,
        'https://placehold.co/460x420/0f172a/3b82f6?text=Your+Photo',
        { borderRadius: 20, objectFit: 'cover', border: '2px solid rgba(59,130,246,0.12)', boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 60px rgba(59,130,246,0.06)' },
        { zIndex: 2, enterAnimation: 'fadeIn', responsiveStyles: {
          tablet: { height: 260, styles: { borderRadius: 16 } },
          mobile: { height: 200, styles: { borderRadius: 14 } },
        } }),

      // ── About Section (no background section element) ─────────────────────
      el('fd-about-label', 'paragraph', 100, 580, 100, 22,
        'ABOUT ME',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-about-h', 'heading', 100, 610, 560, 42, 'Crafting Digital Experiences',
        { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 38, styles: { fontSize: 24 } },
          mobile: { height: 34, styles: { fontSize: 20 } },
        } }),

      el('fd-about-p', 'paragraph', 100, 662, 540, 72,
        "I'm a full stack developer with 5+ years of experience building web applications. I specialize in React, Node.js, and cloud infrastructure. I love turning complex problems into elegant solutions.",
        { color: '#94a3b8', fontSize: 14, lineHeight: 1.75 },
        { zIndex: 2, responsiveStyles: {
          tablet: { height: 68 },
          mobile: { height: 88, styles: { fontSize: 13, lineHeight: 1.65 } },
        } }),

      // About highlight cards (y=750 — separate row from text at y=662)
      el('fd-about-c1', 'paragraph', 100, 750, 210, 72,
        '5+\nYears Experience',
        { backgroundColor: 'rgba(59,130,246,0.06)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.1)', padding: 14, color: '#e2e8f0', fontSize: 13, fontWeight: '600', lineHeight: 1.4, textAlign: 'center' },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 64 },
        } }),

      el('fd-about-c2', 'paragraph', 326, 750, 210, 72,
        '30+\nProjects Delivered',
        { backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.1)', padding: 14, color: '#e2e8f0', fontSize: 13, fontWeight: '600', lineHeight: 1.4, textAlign: 'center' },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 64 },
        } }),

      el('fd-about-c3', 'paragraph', 552, 750, 210, 72,
        '10+\nOpen Source Repos',
        { backgroundColor: 'rgba(6,182,212,0.06)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.1)', padding: 14, color: '#e2e8f0', fontSize: 13, fontWeight: '600', lineHeight: 1.4, textAlign: 'center' },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 64 },
        } }),

      // Code block (y=840 — own row, hidden on mobile via responsive)
      el('fd-about-code', 'code-block', 860, 580, 480, 240,
        '// about.ts\nconst developer = {\n  name: "Alex Carter",\n  role: "Full Stack Dev",\n  languages: ["TS", "Python", "Go"],\n  interests: [\n    "Open Source",\n    "System Design",\n  ],\n  available: true,\n};',
        { backgroundColor: '#0d1117', color: '#c9d1d9', fontSize: 12, fontFamily: '"Fira Code", monospace', lineHeight: 1.6, borderRadius: 14, border: '1px solid rgba(59,130,246,0.08)' },
        { zIndex: 2, responsiveStyles: {
          tablet: { hidden: true },
          mobile: { hidden: true },
        } }),

      // ── Skills Section ──────────────────────────────────────────────────────
      el('fd-skills-label', 'paragraph', 100, 860, 80, 22,
        'SKILLS',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-skills-h', 'heading', 100, 888, 460, 38, 'Tech Stack & Expertise',
        { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 36, styles: { fontSize: 24 } },
          mobile: { height: 32, styles: { fontSize: 20 } },
        } }),

      // Skill cards (all at y=940 — same row, reflow stacks them vertically on mobile)
      el('fd-sk1', 'paragraph', 100, 940, 300, 100,
        'Frontend\n\nReact · Next.js · TypeScript\nTailwind CSS · Framer Motion',
        { backgroundColor: 'rgba(59,130,246,0.04)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.1)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 90, styles: { fontSize: 12 } },
        } }),

      el('fd-sk2', 'paragraph', 416, 940, 300, 100,
        'Backend\n\nNode.js · Express · Python\nGraphQL · REST APIs',
        { backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.1)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 90, styles: { fontSize: 12 } },
        } }),

      el('fd-sk3', 'paragraph', 732, 940, 300, 100,
        'Database & Cloud\n\nPostgreSQL · MongoDB · Redis\nAWS · Docker · Kubernetes',
        { backgroundColor: 'rgba(6,182,212,0.04)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.1)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 90, styles: { fontSize: 12 } },
        } }),

      el('fd-sk4', 'paragraph', 1048, 940, 300, 100,
        'Tools & Design\n\nGit · GitHub Actions · CI/CD\nFigma · VS Code · Postman',
        { backgroundColor: 'rgba(244,114,182,0.04)', borderRadius: 14, border: '1px solid rgba(244,114,182,0.1)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          mobile: { height: 90, styles: { fontSize: 12 } },
        } }),

      // ── Experience Section ──────────────────────────────────────────────────
      el('fd-exp-label', 'paragraph', 100, 1070, 120, 22,
        'EXPERIENCE',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-exp-h', 'heading', 100, 1098, 460, 38, 'Work Experience',
        { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 36, styles: { fontSize: 24 } },
          mobile: { height: 32, styles: { fontSize: 20 } },
        } }),

      el('fd-exp1', 'paragraph', 100, 1150, 600, 110,
        'Senior Full Stack Developer\nTechCorp Inc. · 2022 – Present\n\nLead a team of 5 engineers building a SaaS platform serving 100K+ users.',
        { backgroundColor: 'rgba(59,130,246,0.04)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.08)', padding: 18, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          tablet: { height: 120 },
          mobile: { height: 130, styles: { padding: 14 } },
        } }),

      el('fd-exp2', 'paragraph', 740, 1150, 600, 110,
        'Software Developer\nStartupLab · 2020 – 2022\n\nBuilt core product features from scratch. Increased test coverage to 85%.',
        { backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.08)', padding: 18, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          tablet: { height: 120 },
          mobile: { height: 130, styles: { padding: 14 } },
        } }),

      el('fd-exp3', 'paragraph', 100, 1278, 600, 110,
        'Junior Developer\nCodeWorks Agency · 2018 – 2020\n\nDeveloped responsive web applications for 15+ clients across industries.',
        { backgroundColor: 'rgba(6,182,212,0.04)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.08)', padding: 18, color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 },
        { zIndex: 2, hoverAnimation: 'lift', responsiveStyles: {
          tablet: { height: 120 },
          mobile: { height: 130, styles: { padding: 14 } },
        } }),

      // ── Projects Section ────────────────────────────────────────────────────
      el('fd-proj-label', 'paragraph', 100, 1420, 100, 22,
        'PROJECTS',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-proj-h', 'heading', 100, 1448, 460, 38, 'Featured Projects',
        { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 36, styles: { fontSize: 24 } },
          mobile: { height: 32, styles: { fontSize: 20 } },
        } }),

      // Project 1 — grouped as card
      el('fd-p1-img', 'image', 100, 1502, 400, 160,
        'https://placehold.co/400x200/0f172a/3b82f6?text=Project+01',
        { borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(59,130,246,0.1)' },
        { zIndex: 2, groupId: 'proj-1', responsiveStyles: { mobile: { height: 140 } } }),
      el('fd-p1-title', 'heading', 100, 1674, 400, 24, 'Cloud Dashboard',
        { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
        { headingLevel: 3, zIndex: 2, groupId: 'proj-1', responsiveStyles: { mobile: { styles: { fontSize: 16 } } } }),
      el('fd-p1-desc', 'paragraph', 100, 1704, 400, 34,
        'Real-time monitoring dashboard for cloud infrastructure.',
        { color: '#94a3b8', fontSize: 12, lineHeight: 1.5 },
        { zIndex: 2, groupId: 'proj-1' }),
      el('fd-p1-tech', 'paragraph', 100, 1744, 400, 18,
        'React · D3.js · WebSockets · AWS',
        { color: '#60a5fa', fontSize: 10, fontWeight: '500' },
        { zIndex: 2, groupId: 'proj-1' }),

      // Project 2 — grouped as card
      el('fd-p2-img', 'image', 520, 1502, 400, 160,
        'https://placehold.co/400x200/0f172a/8b5cf6?text=Project+02',
        { borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(139,92,246,0.1)' },
        { zIndex: 2, groupId: 'proj-2', responsiveStyles: { mobile: { height: 140 } } }),
      el('fd-p2-title', 'heading', 520, 1674, 400, 24, 'DevSync CLI',
        { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
        { headingLevel: 3, zIndex: 2, groupId: 'proj-2', responsiveStyles: { mobile: { styles: { fontSize: 16 } } } }),
      el('fd-p2-desc', 'paragraph', 520, 1704, 400, 34,
        'Open-source CLI for scaffolding projects with CI/CD templates.',
        { color: '#94a3b8', fontSize: 12, lineHeight: 1.5 },
        { zIndex: 2, groupId: 'proj-2' }),
      el('fd-p2-tech', 'paragraph', 520, 1744, 400, 18,
        'TypeScript · Node.js · npm · GitHub Actions',
        { color: '#a78bfa', fontSize: 10, fontWeight: '500' },
        { zIndex: 2, groupId: 'proj-2' }),

      // Project 3 — grouped as card
      el('fd-p3-img', 'image', 940, 1502, 400, 160,
        'https://placehold.co/400x200/0f172a/06b6d4?text=Project+03',
        { borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(6,182,212,0.1)' },
        { zIndex: 2, groupId: 'proj-3', responsiveStyles: { mobile: { height: 140 } } }),
      el('fd-p3-title', 'heading', 940, 1674, 400, 24, 'API Gateway',
        { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
        { headingLevel: 3, zIndex: 2, groupId: 'proj-3', responsiveStyles: { mobile: { styles: { fontSize: 16 } } } }),
      el('fd-p3-desc', 'paragraph', 940, 1704, 400, 34,
        'High-performance API gateway with rate limiting and caching.',
        { color: '#94a3b8', fontSize: 12, lineHeight: 1.5 },
        { zIndex: 2, groupId: 'proj-3' }),
      el('fd-p3-tech', 'paragraph', 940, 1744, 400, 18,
        'Go · Redis · PostgreSQL · Docker',
        { color: '#22d3ee', fontSize: 10, fontWeight: '500' },
        { zIndex: 2, groupId: 'proj-3' }),

      // ── Education Section ───────────────────────────────────────────────────
      el('fd-edu-label', 'paragraph', 100, 1796, 110, 22,
        'EDUCATION',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-edu-h', 'heading', 100, 1824, 460, 36, 'Education',
        { color: '#f1f5f9', fontSize: 30, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 34, styles: { fontSize: 24 } },
          mobile: { height: 30, styles: { fontSize: 20 } },
        } }),

      el('fd-edu1', 'paragraph', 100, 1874, 400, 88,
        "B.S. Computer Science\nStanford University · 2014 – 2018\n\nGraduated with honors.",
        { backgroundColor: 'rgba(59,130,246,0.04)', borderRadius: 14, border: '1px solid rgba(59,130,246,0.08)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 },
        { zIndex: 2, hoverAnimation: 'lift', groupId: 'edu-1', responsiveStyles: {
          mobile: { height: 92, styles: { fontSize: 12 } },
        } }),

      el('fd-edu2', 'paragraph', 520, 1874, 400, 88,
        "AWS Solutions Architect\nAmazon Web Services · 2021\n\nProfessional cloud certification.",
        { backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.08)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 },
        { zIndex: 2, hoverAnimation: 'lift', groupId: 'edu-2', responsiveStyles: {
          mobile: { height: 88, styles: { fontSize: 12 } },
        } }),

      el('fd-edu3', 'paragraph', 940, 1874, 400, 88,
        "Full Stack Bootcamp\nHack Reactor · 2018\n\nIntensive 12-week JS & React program.",
        { backgroundColor: 'rgba(6,182,212,0.04)', borderRadius: 14, border: '1px solid rgba(6,182,212,0.08)', padding: 14, color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 },
        { zIndex: 2, hoverAnimation: 'lift', groupId: 'edu-3', responsiveStyles: {
          mobile: { height: 88, styles: { fontSize: 12 } },
        } }),

      // ── Contact Section ─────────────────────────────────────────────────────
      el('fd-contact-label', 'paragraph', 100, 1996, 100, 22,
        'CONTACT',
        { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
        { zIndex: 2 }),

      el('fd-contact-h', 'heading', 100, 2024, 500, 38, "Let's Work Together",
        { color: '#f1f5f9', fontSize: 32, fontWeight: '700' },
        { headingLevel: 2, zIndex: 2, enterAnimation: 'slideUp', responsiveStyles: {
          tablet: { height: 36, styles: { fontSize: 26 } },
          mobile: { height: 30, styles: { fontSize: 20 } },
        } }),

      el('fd-contact-p', 'paragraph', 100, 2072, 440, 36,
        "Have a project in mind? Send me a message and I'll get back to you.",
        { color: '#94a3b8', fontSize: 13, lineHeight: 1.6 },
        { zIndex: 2, responsiveStyles: {
          mobile: { height: 44, styles: { fontSize: 12 } },
        } }),

      el('fd-contact-email', 'paragraph', 100, 2120, 280, 22,
        'alex@carter.dev',
        { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
        { zIndex: 2 }),

      el('fd-contact-social', 'social-links', 100, 2154, 240, 32, '',
        { iconColor: '#60a5fa', iconSize: 20, gap: 18 },
        { zIndex: 2, socialLinks: [
          { platform: 'github', url: '' },
          { platform: 'linkedin', url: '' },
          { platform: 'twitter', url: '' },
          { platform: 'email', url: '' },
        ] }),

      // Contact form (y=2024 — same row start as contact text, reflow stacks on mobile)
      el('fd-contact-form', 'form', 700, 2024, 640, 320, 'Send Message',
        { backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 18, border: '1px solid rgba(59,130,246,0.08)', padding: 24, color: '#e2e8f0' },
        { zIndex: 2, formFields: [
          { id: 'fc1', type: 'text', label: 'Your Name', placeholder: 'John Doe', required: true },
          { id: 'fc2', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
          { id: 'fc3', type: 'textarea', label: 'Message', placeholder: "Tell me about your project...", required: true },
        ], responsiveStyles: {
          tablet: { height: 320, styles: { padding: 20 } },
          mobile: { height: 340, styles: { padding: 16, borderRadius: 14 } },
        } }),

      // Footer
      el('fd-footer-div', 'divider', 100, 2370, 1240, 1, '',
        { backgroundColor: 'rgba(59,130,246,0.08)' },
        { zIndex: 2 }),

      el('fd-footer', 'paragraph', 100, 2386, 1240, 20,
        'Designed & built by Alex Carter. All rights reserved.',
        { color: '#475569', fontSize: 11, textAlign: 'center' },
        { zIndex: 2, responsiveStyles: {
          mobile: { styles: { fontSize: 10 } },
        } }),
    ],
  },
]