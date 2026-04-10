import type { ResumeTemplate } from './templates'

export const LATEX_TO_HTML_PREVIEW_MAP: Record<string, string> = {
  'latex-classic-professional': 'professional-classic',
  'latex-two-column': 'creative-portfolio',
  'latex-minimal-ats': 'ats-pure',
  'latex-academic': 'html-academic-research',
  'latex-executive': 'executive-summary',
  'latex-technical': 'tech-professional',
  // Thumbnail / fallback HTML family for LaTeX templates (modal PDF uses compiled LaTeX)
  'latex-blue-magenta-financial': 'html-contemporary-design',
  'latex-dwight-modern-engineer': 'tech-professional',
  'latex-dwight-classic-iconbars': 'creative-portfolio',
}

function extractMandatoryBlock(styleGuide: string | undefined, kind: 'HTML' | 'LaTeX'): string | null {
  if (!styleGuide) return null
  const startToken = `MANDATORY STRUCTURE (${kind}):`
  const startIdx = styleGuide.indexOf(startToken)
  if (startIdx === -1) return null

  const afterStart = styleGuide.slice(startIdx + startToken.length).trim()
  const endCandidates = [
    afterStart.indexOf('CRITICAL FORMATTING RULES:'),
    afterStart.indexOf('REQUIRED DATA SCHEMA'),
    afterStart.indexOf('MANDATORY STRUCTURE (HTML):'),
    afterStart.indexOf('MANDATORY STRUCTURE (LaTeX):'),
  ].filter((n) => n > 0)

  const endIdx = endCandidates.length ? Math.min(...endCandidates) : afterStart.length
  const block = afterStart.slice(0, endIdx).trim()
  const cleaned = block.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
  return cleaned || null
}

export function resolveHtmlPreviewTemplate(
  template: ResumeTemplate,
  templates: ResumeTemplate[]
): ResumeTemplate | null {
  if (template.format !== 'latex') return template

  const mappedHtmlId = LATEX_TO_HTML_PREVIEW_MAP[template.id]
  if (!mappedHtmlId) return null

  const mappedTemplate = templates.find((t) => t.id === mappedHtmlId)
  if (!mappedTemplate) return null

  // Prevent generic default preview fallback.
  const htmlBlock = extractMandatoryBlock(mappedTemplate.styleGuide, 'HTML')
  return htmlBlock ? mappedTemplate : null
}

export function buildUnifiedTemplateStyleGuide(
  template: ResumeTemplate | null,
  templates: ResumeTemplate[]
): string | undefined {
  if (!template) return undefined

  // Templates that already contain both structures remain the single source.
  if (template.format !== 'latex') return template.styleGuide

  const htmlTemplate = resolveHtmlPreviewTemplate(template, templates)
  if (!htmlTemplate) return template.styleGuide

  const htmlBlock = extractMandatoryBlock(htmlTemplate.styleGuide, 'HTML')
  const latexBlock = extractMandatoryBlock(template.styleGuide, 'LaTeX')
  if (!htmlBlock || !latexBlock) return template.styleGuide

  // Unified style guide guarantees both preview and final generation use one structure family.
  return `UNIFIED TEMPLATE FAMILY

MANDATORY STRUCTURE (HTML):
${htmlBlock}

MANDATORY STRUCTURE (LaTeX):
${latexBlock}

CRITICAL FORMATTING RULES:
- Keep identical section order in HTML and LaTeX.
- Keep equivalent header alignment and spacing rhythm.
- Keep role/company/date grouping consistent across both formats.
- Remove empty sections in both formats.`
}

