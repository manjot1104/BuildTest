'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FileDown, Edit, Check, X, Sparkles, Send, BrainCircuit, FileText, User, Briefcase, GraduationCap, FolderKanban, Settings2, ArrowLeft, ChevronDown, Copy, RotateCcw, Code, Upload, FileCheck, Link2, Award, MessageSquare, Target, LayoutGrid } from 'lucide-react'
import { TemplateSelection } from './components/template-selection'
import { ResumeTemplateBrowser } from './components/template-browser'
import { RESUME_TEMPLATES, type ResumeTemplate } from './templates'
import { toast } from 'sonner'
import { useHighlightCode } from '@/hooks/use-shiki'
import { cn } from '@/lib/utils'
import { ResumeScorePanel, type ResumeScoreData } from './components/resume-score-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResumeLayoutPreview } from './components/resume-layout-preview'
import { ResumeLayoutInsights } from './components/resume-layout-insights'
import {
  ParsedResumeLayoutStrip,
  type ParsedResumeLayoutEstimate,
} from './components/parsed-resume-layout-strip'
import { ScoreLayoutInsights } from './components/score-layout-insights'
import { JobFitEvaluationPanel } from './components/job-fit-evaluation-panel'
import {
  pickAiResumeLayoutFields,
  resumeFormToResumeData,
} from '@/lib/text-layout/form-to-resume-data'
import { computeResumeLayoutStatsFromResumeCode } from '@/lib/text-layout/layout-from-resume-code'
import { plainResumeTextToResumeData } from '@/lib/text-layout/plain-text-to-resume-data'
import {
  computeResumeLayoutStats,
  formatLayoutContextForScoring,
  TEXT_LAYOUT_CLIENT_OPTIONS,
} from '@/lib/text-layout/layout-stats'
import {
  buildPersonalizedStudioDraft,
  writeBuildifyStudioLegacyDraft,
  type PortfolioStudioResumeInput,
} from '@/lib/ai-resume/portfolio-studio-bridge'
import { writeResumeStudioBootstrap } from '@/components/buildify-studio/resume-studio-bootstrap'

function parsedExtractedFieldToString(
  v: string | string[] | null | undefined,
): string | undefined {
  if (v == null) return undefined
  const s = Array.isArray(v) ? v.filter(Boolean).join(', ') : v
  const t = s.trim()
  return t.length > 0 ? t : undefined
}

// ─── OpenRouter Models ───────────────────────────────────────────────────────

const RESUME_MODELS = [
  {
    id: 'google/gemma-3-12b-it:free',
    name: 'Gemma 3 12B',
    provider: 'Google',
    description: 'Fast and reliable',
  },
  {
    id: 'arcee-ai/trinity-large-preview:free',
    name: 'Trinity Large 400B',
    provider: 'Arcee AI',
    description: 'Massive 400B, strong general-purpose',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B',
    provider: 'Google',
    description: 'Strong quality with multilingual support',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'LLaMA 3.3 70B',
    provider: 'Meta',
    description: 'Best for complex reasoning & long context',
  },
  {
    id: 'qwen/qwen3-coder:free',
    name: 'Qwen3 Coder',
    provider: 'Alibaba',
    description: 'Specialised for code & LaTeX generation',
  },
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    name: 'Mistral Small 24B',
    provider: 'Mistral AI',
    description: 'Fast and reliable',
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b:free',
    name: 'Hermes 3 405B',
    provider: 'Nous Research',
    description: 'Massive 405B, excellent instruction-following',
  },
  {
    id: 'openai/gpt-oss-120b:free',
    name: 'GPT OSS 120B',
    provider: 'OpenAI',
    description: 'OpenAI open-source 120B model',
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT OSS 20B',
    provider: 'OpenAI',
    description: 'Lightweight and fast',
  },
] as const

const DEFAULT_MODEL = RESUME_MODELS[0].id

/** Get friendly model name from ID */
function getModelName(modelId: string): string {
  const found = RESUME_MODELS.find((m) => m.id === modelId)
  if (found) return found.name
  // Strip provider prefix and :free suffix for unknown models
  return modelId.replace(/^[^/]+\//, '').replace(/:free$/, '')
}

/** Strips the block appended after JD parse (re-parse / new JD must not stack duplicates). */
function stripJobDescriptionInstructions(text: string): string {
  return text.replace(/\n\nJOB DESCRIPTION REQUIREMENTS:[\s\S]*/g, '').trimEnd()
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const resumeSchema = z.object({
  templateType: z.enum(['latex', 'html']),
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  title: z.string().max(200).optional(),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  /** International numbers + spaces — was max(20), too tight for many users */
  phone: z.string().trim().min(1, 'Phone number is required').max(40),
  location: z.string().max(200).optional(),
  linkedin: z.string().max(300).optional(),
  github: z.string().max(300).optional(),
  portfolio: z.string().max(300).optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  projects: z.string().optional(),
  certifications: z.string().optional(),
  achievements: z.string().optional(),
  languagesKnown: z.string().optional(),
  additionalInstructions: z.string().max(100_000).optional(),
})

type ResumeFormData = z.infer<typeof resumeSchema>

type Step =
  | 'template-browser'
  | 'format-selection'
  | 'form'
  | 'preview'
  | 'compiling'
  | 'score'
  | 'cover-letter'

const PORTFOLIO_STUDIO_EXAMPLES = [
  {
    id: 'developer-portfolio',
    studioTemplateId: 'developer-dark' as const,
    title: 'Developer Portfolio',
    description: 'Use shared resume to create a clean dev portfolio in Studio.',
    prompt:
      'Convert this shared resume into a single-page developer portfolio in Buildify Studio. Keep a dark modern UI, add sections for About, Skills, Experience, Featured Projects, and Contact. Highlight measurable impact from experience bullets and make CTA buttons clear.',
  },
  {
    id: 'designer-portfolio',
    studioTemplateId: 'designer-clean' as const,
    title: 'Designer Portfolio',
    description: 'Turn resume highlights into a visual design portfolio.',
    prompt:
      'Create a visual portfolio website from this resume for a product/designer profile. Prioritize hero intro, case-study style project cards, tools/skills chips, and social links. Keep typography elegant and spacing premium with a clean light theme.',
  },
  {
    id: 'freelancer-landing',
    studioTemplateId: 'freelancer-clean' as const,
    title: 'Freelancer Landing',
    description: 'Generate a service-focused portfolio + inquiry form.',
    prompt:
      'Build a freelancer portfolio from this resume with sections: Hero, Services, Selected Work, Testimonials, and Contact Form. Add trust signals from achievements/certifications and include a clear "Book a Call" call-to-action above the fold.',
  },
] as const

export default function AIResumeBuilderPage() {
  const router = useRouter()
  /** `portfolio`: entered via Portfolio card — show Buildify Studio examples only in this path. */
  const [resumeBuilderMode, setResumeBuilderMode] = useState<'resume' | 'portfolio'>('resume')
  const [currentStep, setCurrentStep] = useState<Step>('format-selection')
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null)
  const [templateType, setTemplateType] = useState<'latex' | 'html'>('html')
  const [latexCode, setLatexCode] = useState('')
  const [editedLatex, setEditedLatex] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [editedHtml, setEditedHtml] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [rawAIResponse, setRawAIResponse] = useState('')
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [followUpPrompt, setFollowUpPrompt] = useState('')
  const [isProcessingFollowUp, setIsProcessingFollowUp] = useState(false)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [isParsingFiles, setIsParsingFiles] = useState(false)
  const [parsedData, setParsedData] = useState<{
    resumeData?: Record<string, string | string[] | undefined>
    jdRequirements?: Record<string, string | string[] | undefined>
    /** A4 text-layout estimate from raw uploaded resume text (parse-files API). */
    resumeLayoutEstimate?: ParsedResumeLayoutEstimate | null
  } | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [scoreData, setScoreData] = useState<ResumeScoreData | null>(null)
  const [showScore, setShowScore] = useState(false)
  const [scoreInput, setScoreInput] = useState('')
  const [scoreFormat, setScoreFormat] = useState<'html' | 'latex' | 'text'>('text')
  const [scoreFile, setScoreFile] = useState<File | null>(null)
  const [isExtractingText, setIsExtractingText] = useState(false)
  const [coverLetterCompany, setCoverLetterCompany] = useState('')
  const [coverLetterHiringManager, setCoverLetterHiringManager] = useState('')
  const [coverLetterJobDescription, setCoverLetterJobDescription] = useState('')
  const [coverLetterOutput, setCoverLetterOutput] = useState('')
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [coverLetterMeta, setCoverLetterMeta] = useState<{
    model?: string
    isFallback?: boolean
    inferredTone?: string
    focusedKeywords?: string[]
  } | null>(null)
  const [aiWriterLoading, setAiWriterLoading] = useState<Record<string, boolean>>({})
  /** JD text for optional job-fit panel only — not wired to generate resume. */
  const [jobFitJdDraft, setJobFitJdDraft] = useState('')
  const [openingPortfolioExampleId, setOpeningPortfolioExampleId] = useState<string | null>(null)

  const form = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      templateType: 'latex',
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      summary: '',
      skills: '',
      experience: '',
      education: '',
      projects: '',
      certifications: '',
      achievements: '',
      languagesKnown: '',
      additionalInstructions: '',
    },
  })

  const additionalInstructionsSectionRef = useRef<HTMLDivElement | null>(null)

  const applyPortfolioStudioExample = useCallback(
    (examplePrompt: string, options?: { scroll?: boolean; silent?: boolean }) => {
      const current = form.getValues('additionalInstructions')?.trim() ?? ''
      const nextValue = current ? `${current}\n\n${examplePrompt}` : examplePrompt
      if (nextValue.length > 100_000) {
        toast.error(
          'Additional instructions would exceed the limit. Remove some text and try again.',
        )
        return false
      }
      form.setValue('additionalInstructions', nextValue, { shouldDirty: true })
      if (!options?.silent) {
        toast.success('Portfolio Studio example added to instructions')
      }
      if (options?.scroll !== false) {
        additionalInstructionsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
      return true
    },
    [form],
  )

  const openPortfolioStudioFromExample = useCallback(
    (example: (typeof PORTFOLIO_STUDIO_EXAMPLES)[number]) => {
      if (openingPortfolioExampleId) return
      if (!applyPortfolioStudioExample(example.prompt, { scroll: false, silent: true })) return
      setOpeningPortfolioExampleId(example.id)
      try {
        const data = form.getValues() as PortfolioStudioResumeInput
        writeResumeStudioBootstrap({ templateId: example.studioTemplateId, resume: data })
        const draft = buildPersonalizedStudioDraft(example.studioTemplateId, data)
        writeBuildifyStudioLegacyDraft(draft.elements, draft.background)
        toast.success('Opening Buildify Studio with your portfolio draft…')
        router.push('/buildify-studio/new')
      } catch (e) {
        setOpeningPortfolioExampleId(null)
        toast.error(e instanceof Error ? e.message : 'Could not prepare Buildify Studio draft.')
      }
    },
    [applyPortfolioStudioExample, form, openingPortfolioExampleId, router],
  )

  const navigateJobFitToGenerate = useCallback(() => {
    additionalInstructionsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    window.setTimeout(() => {
      void form.setFocus('additionalInstructions')
    }, 450)
  }, [form])

  const watchedResumeFields = useWatch({ control: form.control }) as ResumeFormData

  const resumeContextForJobFit = useMemo(() => {
    const w = watchedResumeFields
    if (!w) return ''
    const parts = [
      w.fullName && `Name: ${w.fullName}`,
      w.title && `Target title: ${w.title}`,
      w.summary && `Summary: ${w.summary}`,
      w.skills && `Skills: ${w.skills}`,
      w.experience && `Experience:\n${w.experience}`,
      w.education && `Education:\n${w.education}`,
      w.projects && `Projects:\n${w.projects}`,
      w.certifications && `Certifications:\n${w.certifications}`,
      w.achievements && `Achievements:\n${w.achievements}`,
      w.languagesKnown && `Languages: ${w.languagesKnown}`,
    ].filter(Boolean) as string[]
    return parts.join('\n\n').slice(0, 12_000)
  }, [watchedResumeFields])

  const layoutPreviewForm = pickAiResumeLayoutFields(watchedResumeFields ?? {})

  const previewLayoutStats = useMemo(() => {
    const formStats = computeResumeLayoutStats(
      resumeFormToResumeData(layoutPreviewForm),
      TEXT_LAYOUT_CLIENT_OPTIONS,
    )
    const fmt = templateType === 'latex' ? 'latex' : 'html'
    const code =
      templateType === 'latex' ? (editedLatex || latexCode) : (editedHtml || htmlCode)
    const fromCode = computeResumeLayoutStatsFromResumeCode(code, fmt, TEXT_LAYOUT_CLIENT_OPTIONS)
    return fromCode ?? formStats
  }, [
    templateType,
    editedLatex,
    latexCode,
    editedHtml,
    htmlCode,
    JSON.stringify(layoutPreviewForm),
  ])

  const currentModelInfo = RESUME_MODELS.find((m) => m.id === selectedModel)

  // Generate Resume code (LaTeX or HTML)
  const onGenerateInvalid = (errors: FieldErrors<ResumeFormData>) => {
    const keys = Object.keys(errors) as (keyof ResumeFormData)[]
    const first = keys[0]
    const fieldErr = first ? errors[first] : undefined
    const msg =
      fieldErr && typeof fieldErr === 'object' && 'message' in fieldErr && typeof fieldErr.message === 'string'
        ? fieldErr.message
        : 'Please fix the highlighted fields. Name, email, and phone are required.'
    if (first) {
      void form.setFocus(first)
    }
    toast.error(msg, { duration: 6000, id: 'resume-generate' })
  }

  const onGenerateResume = async (data: ResumeFormData) => {
    setIsGenerating(true)
    const isLaTeX = data.templateType === 'latex'
    setTemplateType(data.templateType)
    toast.loading(`Generating ${isLaTeX ? 'LaTeX' : 'HTML'} code...`, { id: 'resume-generate' })

    try {
      const endpoint = isLaTeX ? '/api/resume/generate-latex' : '/api/resume/generate-html'

      const layoutStatsForUi = computeResumeLayoutStats(
        resumeFormToResumeData(pickAiResumeLayoutFields(data)),
        TEXT_LAYOUT_CLIENT_OPTIONS,
      )

      // Server: up to 3 OpenRouter attempts × ~78s + JSON/processing — must exceed that budget.
      const GENERATE_FETCH_MS = 260_000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GENERATE_FETCH_MS)

      const buildGenerateBody = (forceLocalOnly: boolean) =>
        JSON.stringify({
          ...data,
          model: selectedModel,
          templateId: selectedTemplate?.id,
          // Keep generation format-specific to avoid mixed HTML/LaTeX outputs.
          templateStyleGuide: selectedTemplate?.styleGuide,
          ...(forceLocalOnly ? { forceLocalOnly: true as const } : {}),
        })

      let usedLocalTimeoutFallback = false
      let response: Response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: buildGenerateBody(false),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (fetchError) {
        clearTimeout(timeoutId)

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          usedLocalTimeoutFallback = true
          toast.loading('AI took too long — generating with local template...', { id: 'resume-generate' })
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: buildGenerateBody(true),
            })
          } catch (retryErr) {
            if (retryErr instanceof TypeError && retryErr.message === 'Failed to fetch') {
              throw new Error(
                'Unable to connect to server. Please check your internet connection and try again.',
              )
            }
            throw retryErr
          }
        } else if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          throw new Error('Unable to connect to server. Please check your internet connection and try again.')
        } else {
          throw fetchError
        }
      }

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          error: `Server returned error: ${response.status} ${response.statusText}`,
        }))) as {
          error?: string
          details?: Array<{ path?: (string | number)[]; message?: string }>
        }
        let message =
          response.status === 401
            ? 'Please sign in to generate a resume.'
            : error.error || `Failed to generate ${isLaTeX ? 'LaTeX' : 'HTML'} code`
        if (response.status === 400 && Array.isArray(error.details) && error.details[0]?.message) {
          const d = error.details[0]
          const path = Array.isArray(d.path) ? d.path.join('.') : ''
          message = path ? `${path}: ${d.message}` : (d.message ?? message)
        }
        toast.error(message, {
          id: 'resume-generate',
          duration: 9000,
        })
        return
      }

      const result = await response.json() as {
        latex?: string
        html?: string
        model?: string
        isFallback?: boolean
        warning?: string
      }
      const generatedCode = isLaTeX ? result.latex : result.html
      const rawResponse = ''

      if (!generatedCode) {
        throw new Error(`No ${isLaTeX ? 'LaTeX' : 'HTML'} code returned from API`)
      }

      if (isLaTeX) {
        setLatexCode(generatedCode)
        setEditedLatex(generatedCode)
      } else {
        setHtmlCode(generatedCode)
        setEditedHtml(generatedCode)
      }
      setRawAIResponse(rawResponse)
      setUsedModel(result.model || selectedModel)
      setIsFallback(result.isFallback || false)
      setCurrentStep('preview')

      if (typeof result.warning === 'string' && result.warning.trim()) {
        toast.warning(
          usedLocalTimeoutFallback
            ? 'AI timed out — your resume was generated with the local template.'
            : result.warning,
          { id: 'resume-generate', duration: 8000 },
        )
      } else if (result.isFallback && result.model) {
        toast.warning(`Model unavailable. Used fallback: ${getModelName(result.model)}`, { id: 'resume-generate' })
      } else {
        toast.success(
          `${isLaTeX ? 'LaTeX' : 'HTML'} generated · ~${layoutStatsForUi.pageCount} pg text estimate (see Layout tab)`,
          { id: 'resume-generate' },
        )
      }
    } catch (error) {
      console.error(`Error generating ${isLaTeX ? 'LaTeX' : 'HTML'}:`, error)
      
      let errorMessage = `Failed to generate ${isLaTeX ? 'LaTeX' : 'HTML'} code. Please try again.`
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { 
        id: 'resume-generate',
        duration: 5000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Compile to PDF (LaTeX or HTML)
  const onCompilePDF = async () => {
    setIsCompiling(true)

    const fmt = templateType === 'latex' ? 'latex' : 'html'
    const codeForLayout =
      templateType === 'latex' ? (editedLatex || latexCode) : (editedHtml || htmlCode)
    const compileLayoutStats =
      computeResumeLayoutStatsFromResumeCode(codeForLayout, fmt, TEXT_LAYOUT_CLIENT_OPTIONS) ??
      computeResumeLayoutStats(
        resumeFormToResumeData(layoutPreviewForm),
        TEXT_LAYOUT_CLIENT_OPTIONS,
      )
    if (compileLayoutStats.exceedsTwoPages) {
      toast.info(
        `Your resume content estimates ~${compileLayoutStats.pageCount} A4 pages (text layout). The PDF may be long.`,
        { duration: 4500 },
      )
    }

    toast.loading('Generating PDF...', { id: 'resume-compile' })

    try {
      const endpoint = templateType === 'latex' ? '/api/resume/compile-pdf' : '/api/resume/compile-html-pdf'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [templateType === 'latex' ? 'latex' : 'html']: templateType === 'latex' ? editedLatex : editedHtml,
          fileName: form.getValues('fullName') || 'Resume',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }))
        toast.error(error.error || 'Failed to generate PDF', { id: 'resume-compile' })
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form.getValues('fullName').replace(/\s+/g, '_') || 'Resume'}_Resume.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('PDF generated successfully!', { id: 'resume-compile' })
    } catch (error) {
      console.warn('Error generating PDF:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        { id: 'resume-compile' }
      )
    } finally {
      setIsCompiling(false)
    }
  }

  const handleEdit = () => setIsEditing(true)

  const handleSaveEdit = () => {
    if (templateType === 'latex') {
      setLatexCode(editedLatex)
    } else {
      setHtmlCode(editedHtml)
    }
    setIsEditing(false)
    toast.success(`${templateType === 'latex' ? 'LaTeX' : 'HTML'} code updated`)
  }

  const handleCancelEdit = () => {
    if (templateType === 'latex') {
      setEditedLatex(latexCode)
    } else {
      setEditedHtml(htmlCode)
    }
    setIsEditing(false)
  }

  // Handle follow-up prompt to modify code
  const handleFollowUpPrompt = async () => {
    if (!followUpPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsProcessingFollowUp(true)
    toast.loading('Processing your request...', { id: 'follow-up' })

    try {
      const endpoint = templateType === 'latex' ? '/api/resume/follow-up' : '/api/resume/follow-up-html'
      const currentCode = templateType === 'latex' ? (editedLatex || latexCode) : (editedHtml || htmlCode)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [templateType === 'latex' ? 'currentLatex' : 'currentHtml']: currentCode,
          prompt: followUpPrompt,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to process follow-up' }))
        throw new Error(error.error || 'Failed to process follow-up prompt')
      }

      const result = await response.json()
      const updatedCode = templateType === 'latex' ? result.latex : result.html
      const rawResponse = ''

      if (!updatedCode) {
        throw new Error(`No ${templateType === 'latex' ? 'LaTeX' : 'HTML'} code returned from AI`)
      }

      if (templateType === 'latex') {
        setLatexCode(updatedCode)
        setEditedLatex(updatedCode)
      } else {
        setHtmlCode(updatedCode)
        setEditedHtml(updatedCode)
      }
      setRawAIResponse(rawResponse)
      setUsedModel(result.model || selectedModel)
      setIsFallback(result.isFallback || false)
      setFollowUpPrompt('')

      if (result.isFallback && result.model) {
        toast.warning(`Model unavailable. Used fallback: ${getModelName(result.model)}`, { id: 'follow-up' })
      } else {
        toast.success(`${templateType === 'latex' ? 'LaTeX' : 'HTML'} updated successfully!`, { id: 'follow-up' })
      }
    } catch (error) {
      console.error('Error processing follow-up:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to process follow-up. Please try again.',
        { id: 'follow-up' }
      )
    } finally {
      setIsProcessingFollowUp(false)
    }
  }

  // Score resume with AI
  const handleScoreResume = async (codeOverride?: string, formatOverride?: 'html' | 'latex' | 'text') => {
    const currentCode = codeOverride || (templateType === 'latex' ? (editedLatex || latexCode) : (editedHtml || htmlCode))
    const currentFormat = formatOverride || templateType
    if (!currentCode.trim()) {
      toast.error('No resume code to score')
      return
    }

    setIsScoring(true)
    toast.loading('Analyzing your resume...', { id: 'resume-score' })

    let layoutContext: string | undefined
    try {
      const usePlainTextLayout = formatOverride === 'text'
      let s
      if (usePlainTextLayout) {
        s = computeResumeLayoutStats(
          plainResumeTextToResumeData(currentCode.trim()),
          TEXT_LAYOUT_CLIENT_OPTIONS,
        )
      } else {
        const fmt = currentFormat === 'latex' ? 'latex' : 'html'
        s =
          computeResumeLayoutStatsFromResumeCode(
            currentCode,
            fmt,
            TEXT_LAYOUT_CLIENT_OPTIONS,
          ) ??
          computeResumeLayoutStats(
            resumeFormToResumeData(pickAiResumeLayoutFields(form.getValues())),
            TEXT_LAYOUT_CLIENT_OPTIONS,
          )
      }
      if (s.lineCount > 0) {
        layoutContext = formatLayoutContextForScoring(s)
      }
    } catch {
      // Ignore layout failures; scoring still runs without layout context.
    }

    try {
      const response = await fetch('/api/resume/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          format: currentFormat,
          model: selectedModel,
          ...(layoutContext ? { layoutContext } : {}),
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to score resume' }))
        throw new Error((error as { error?: string }).error || 'Failed to score resume')
      }

      const result = await response.json() as { scoring: ResumeScoreData }
      setScoreData(result.scoring)
      setShowScore(true)
      toast.success(`Resume scored: ${result.scoring.score}/100`, { id: 'resume-score' })
    } catch (error) {
      console.error('Error scoring resume:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to score resume. Please try again.',
        { id: 'resume-score' },
      )
    } finally {
      setIsScoring(false)
    }
  }

  const handleReset = () => {
    setCurrentStep('format-selection')
    setResumeBuilderMode('resume')
    setSelectedTemplate(null)
    setLatexCode('')
    setEditedLatex('')
    setHtmlCode('')
    setEditedHtml('')
    setRawAIResponse('')
    setFollowUpPrompt('')
    setIsEditing(false)
    setShowRawResponse(false)
    setUsedModel(null)
    setIsFallback(false)
    setResumeFile(null)
    setJdFile(null)
    setParsedData(null)
    setScoreData(null)
    setShowScore(false)
    setScoreFile(null)
    setScoreInput('')
    setCoverLetterCompany('')
    setCoverLetterHiringManager('')
    setCoverLetterJobDescription('')
    setCoverLetterOutput('')
    setCoverLetterMeta(null)
    form.reset()
  }

  const handleGenerateCoverLetter = async () => {
    if (!coverLetterCompany.trim()) {
      toast.error('Please enter a company name.')
      return
    }
    if (coverLetterJobDescription.trim().length < 50) {
      toast.error('Please add a fuller job description (at least 50 characters).')
      return
    }

    const data = form.getValues()
    if (!data.fullName?.trim() || !data.email?.trim() || !data.phone?.trim()) {
      toast.error('Please fill name, email, and phone in resume form first.')
      return
    }

    setIsGeneratingCoverLetter(true)
    toast.loading('Generating tailored cover letter...', { id: 'cover-letter-generate' })
    try {
      const response = await fetch('/api/resume/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: data.fullName,
          title: data.title,
          email: data.email,
          phone: data.phone,
          summary: data.summary,
          skills: data.skills,
          experience: data.experience,
          projects: data.projects,
          achievements: data.achievements,
          certifications: data.certifications,
          jobDescription: coverLetterJobDescription,
          companyName: coverLetterCompany,
          hiringManager: coverLetterHiringManager,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to generate cover letter' }))
        throw new Error((err as { error?: string }).error || 'Failed to generate cover letter')
      }

      const result = (await response.json()) as {
        coverLetter: string
        model?: string
        isFallback?: boolean
        inferredTone?: string
        focusedKeywords?: string[]
      }
      setCoverLetterOutput(result.coverLetter || '')
      setCoverLetterMeta({
        model: result.model,
        isFallback: result.isFallback,
        inferredTone: result.inferredTone,
        focusedKeywords: result.focusedKeywords,
      })

      if (result.isFallback && result.model) {
        toast.warning(`Generated with fallback: ${getModelName(result.model)}`, {
          id: 'cover-letter-generate',
        })
      } else {
        toast.success('Cover letter generated.', { id: 'cover-letter-generate' })
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate cover letter.',
        { id: 'cover-letter-generate' },
      )
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }

  const handleAiRewriteSection = async (
    section:
      | 'summary'
      | 'skills'
      | 'experience'
      | 'projects'
      | 'education'
      | 'certifications'
      | 'achievements'
      | 'languagesKnown',
  ) => {
    const current = (form.getValues(section) || '').trim()
    if (!current) {
      toast.error(`Add some text in ${section} first.`)
      return
    }

    const instruction = window.prompt(
      `AI Writer for ${section}\nOptional: what should be improved?`,
      'Improve clarity and impact, keep facts same.',
    )
    if (instruction === null) return

    setAiWriterLoading((prev) => ({ ...prev, [section]: true }))
    toast.loading(`Rewriting ${section}...`, { id: `rewrite-${section}` })
    try {
      const data = form.getValues()
      const response = await fetch('/api/resume/rewrite-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section,
          sectionText: current,
          instruction: instruction || undefined,
          model: selectedModel,
          fullName: data.fullName,
          title: data.title,
          targetRole: data.title,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to rewrite section' }))
        throw new Error((err as { error?: string }).error || 'Failed to rewrite section')
      }
      const result = (await response.json()) as { rewrittenText: string; model?: string; isFallback?: boolean }
      form.setValue(section, result.rewrittenText || current, { shouldDirty: true })
      if (result.isFallback && result.model) {
        toast.warning(`Section rewritten with fallback: ${getModelName(result.model)}`, {
          id: `rewrite-${section}`,
        })
      } else {
        toast.success(`${section} updated by AI Writer.`, { id: `rewrite-${section}` })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI Writer failed.', {
        id: `rewrite-${section}`,
      })
    } finally {
      setAiWriterLoading((prev) => ({ ...prev, [section]: false }))
    }
  }

  // Handle file uploads and parsing
  const handleFileUpload = async (type: 'resume' | 'jd', file: File) => {
    if (type === 'resume') {
      setResumeFile(file)
    } else {
      setJdFile(file)
    }

    // Auto-parse if both files are uploaded or if single file is uploaded
    if ((type === 'resume' && file) || (type === 'jd' && file)) {
      await parseUploadedFiles(type === 'resume' ? file : resumeFile, type === 'jd' ? file : jdFile)
    }
  }

  const parseUploadedFiles = async (resume: File | null, jd: File | null) => {
    if (!resume && !jd) return

    setIsParsingFiles(true)
    let aiProgressTimer: ReturnType<typeof setTimeout> | null = null
    
    // Show progress updates
    toast.loading('Extracting text from files...', { id: 'parse-files' })
    
    try {
      const formData = new FormData()
      if (resume) formData.append('resume', resume)
      if (jd) formData.append('jd', jd)

      // Update progress
      aiProgressTimer = setTimeout(() => {
        toast.loading('Analyzing content with AI...', { id: 'parse-files' })
      }, 2000)

      let response: Response
      try {
        response = await fetch('/api/resume/parse-files', {
          method: 'POST',
          body: formData,
          // Match server maxDuration (60s) + buffer
          signal: AbortSignal.timeout(65000), // 65 seconds
        })
      } catch (fetchError) {
        console.warn('[parse-files] Fetch error (handled gracefully):', fetchError)
        
        if (aiProgressTimer) { clearTimeout(aiProgressTimer); aiProgressTimer = null }
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
            toast.error('Request timed out. Please try smaller files or fill the form manually.', { id: 'parse-files', duration: 5000 })
          } else if (fetchError.message === 'Failed to fetch') {
            toast.error('Unable to connect to server. Please check if the server is running.', { id: 'parse-files', duration: 5000 })
          } else {
            toast.error(`Network error: ${fetchError.message}`, { id: 'parse-files', duration: 5000 })
          }
        } else {
          toast.error('Network error occurred. Please check your connection.', { id: 'parse-files', duration: 5000 })
        }
        setIsParsingFiles(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status} ${response.statusText}` }))
        const errorMessage = errorData.error || errorData.details || 'Failed to parse files'
        throw new Error(errorMessage)
      }

      if (aiProgressTimer) {
        clearTimeout(aiProgressTimer)
        aiProgressTimer = null
      }
      toast.loading('Processing extracted data...', { id: 'parse-files' })

      const result = await response.json() as {
        success?: boolean
        error?: string
        details?: string
        extractedResumeData?: Record<string, string | string[] | undefined> | null
        jdRequirements?: Record<string, string | string[] | undefined> | null
        /** Raw JD excerpt from upload — for optional job-fit panel only */
        jdText?: string
        /** Server set when AI JD parse failed (e.g. 429) but raw JD text was attached */
        jdUsedRawFallback?: boolean
        resumeLayoutEstimate?: {
          pageCount: number
          lineCount: number
          exceedsTwoPages: boolean
        } | null
      }
      console.log('[parse-files] API response:', result)
      console.log('[parse-files] Extracted resume data:', result.extractedResumeData)
      console.log('[parse-files] JD requirements:', result.jdRequirements)
      
      // Check if extraction failed - but still continue if success is true
      if (result.success === false) {
        if (aiProgressTimer) {
          clearTimeout(aiProgressTimer)
          aiProgressTimer = null
        }
        toast.warning(
          result.error || 'Could not extract data from files. Please fill the form manually.',
          { 
            id: 'parse-files',
            description: result.details || 'The files might be image-based PDFs or in an unsupported format.',
            duration: 6000,
          }
        )
        setIsParsingFiles(false)
        return
      }
      
      // If no data extracted, show friendly info message (not error)
      if (!result.extractedResumeData && !result.jdRequirements) {
        if (aiProgressTimer) {
          clearTimeout(aiProgressTimer)
          aiProgressTimer = null
        }
        // Show as info message - this is normal for image-based PDFs
        toast.info(
          'Files uploaded successfully',
          { 
            id: 'parse-files',
            description: 'PDF text extraction wasn\'t possible (likely image-based PDFs). Please fill the form manually.',
            duration: 4000,
          }
        )
        setIsParsingFiles(false)
        return // Exit early since there's no data to process
      }
      
      setParsedData({
        resumeData: result.extractedResumeData ?? undefined,
        jdRequirements: result.jdRequirements ?? undefined,
        resumeLayoutEstimate: result.resumeLayoutEstimate ?? null,
      })

      if (result.jdText?.trim()) {
        setJobFitJdDraft((prev) => (prev.trim().length > 0 ? prev : result.jdText!.trim()))
      }

      // Auto-fill form if resume data is extracted
      let fieldsFilled = 0
      if (result.extractedResumeData) {
        const data = result.extractedResumeData
        console.log('[parse-files] Auto-filling form with data:', data)

        // Simple string fields — set if present
        const fieldMap: Array<[keyof ResumeFormData, string | undefined]> = [
          ['fullName', parsedExtractedFieldToString(data.fullName)],
          ['title', parsedExtractedFieldToString(data.title)],
          ['email', parsedExtractedFieldToString(data.email)],
          ['phone', parsedExtractedFieldToString(data.phone)],
          ['location', parsedExtractedFieldToString(data.location)],
          ['linkedin', parsedExtractedFieldToString(data.linkedin)],
          ['github', parsedExtractedFieldToString(data.github)],
          ['portfolio', parsedExtractedFieldToString(data.portfolio)],
          ['summary', parsedExtractedFieldToString(data.summary)],
          ['skills', parsedExtractedFieldToString(data.skills)],
          ['experience', parsedExtractedFieldToString(data.experience)],
          ['education', parsedExtractedFieldToString(data.education)],
          ['projects', parsedExtractedFieldToString(data.projects)],
          ['certifications', parsedExtractedFieldToString(data.certifications)],
          ['achievements', parsedExtractedFieldToString(data.achievements)],
          ['languagesKnown', parsedExtractedFieldToString(data.languagesKnown)],
        ]

        for (const [field, value] of fieldMap) {
          if (value) {
            form.setValue(field, value)
            fieldsFilled++
          }
        }
        
        console.log(`[parse-files] Filled ${fieldsFilled} form fields`)
      } else {
        console.warn('[parse-files] No extractedResumeData found in response')
      }

      // Add JD requirements to additional instructions if JD is provided
      if (result.jdRequirements && jd) {
        const jdReqs = result.jdRequirements as Record<string, string | string[] | undefined>
        const requiredSkills = Array.isArray(jdReqs.requiredSkills) ? jdReqs.requiredSkills.join(', ') : (jdReqs.requiredSkills || 'N/A')
        const jdInstructions = `\n\nJOB DESCRIPTION REQUIREMENTS:\n- Required Skills: ${requiredSkills}\n- Qualifications: ${jdReqs.qualifications || 'N/A'}\n- Key Requirements: ${jdReqs.keyRequirements || 'N/A'}\n\nPlease tailor the resume to match these requirements and highlight relevant experience and skills.`
        const base = stripJobDescriptionInstructions(form.getValues('additionalInstructions') || '')
        form.setValue('additionalInstructions', base + jdInstructions)
        console.log('[parse-files] Added JD requirements to instructions')
      }

      const layoutNote =
        result.resumeLayoutEstimate && result.resumeLayoutEstimate.lineCount > 0
          ? ` · ~${result.resumeLayoutEstimate.pageCount} pg text estimate`
          : ''

      if (fieldsFilled > 0) {
        toast.success(
          `Files parsed successfully! ${fieldsFilled} form fields auto-filled.${layoutNote}`,
          {
            id: 'parse-files',
            description: result.jdUsedRawFallback
              ? 'JD added as full text (AI summarization hit rate limit).'
              : undefined,
          },
        )
      } else if (result.extractedResumeData) {
        toast.warning('Files parsed but no data could be extracted. Please fill the form manually.', {
          id: 'parse-files',
        })
      } else {
        toast.success(`Files parsed successfully!${layoutNote}`, {
          id: 'parse-files',
          description: result.jdUsedRawFallback
            ? 'JD added as full text (AI summarization hit rate limit).'
            : undefined,
        })
      }
    } catch (error) {
      if (aiProgressTimer) {
        clearTimeout(aiProgressTimer)
        aiProgressTimer = null
      }
      console.warn('[parse-files] Handled error:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to parse files. Please try again.'
      toast.error(errorMessage, { id: 'parse-files', duration: 5000 })
    } finally {
      if (aiProgressTimer) {
        clearTimeout(aiProgressTimer)
      }
      setIsParsingFiles(false)
    }
  }

  const handleResumeTemplateSelect = (template: ResumeTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep('form')
  }

  const handleFormatSelect = (selectedType: 'latex' | 'html') => {
    setResumeBuilderMode('resume')
    setTemplateType(selectedType)
    form.setValue('templateType', selectedType)
    
    // Show templates for both HTML and LaTeX formats
    setCurrentStep('template-browser')
  }

  const handlePortfolioEntry = () => {
    setResumeBuilderMode('portfolio')
    setTemplateType('html')
    form.setValue('templateType', 'html')
    setSelectedTemplate(null)
    setCurrentStep('form')
  }

  // Show format selection first
  if (currentStep === 'format-selection') {
    return (
      <div className="bg-background h-[calc(100vh-48px)] flex items-center justify-center">
        <TemplateSelection
          onSelect={handleFormatSelect}
          onScoreResume={() => {
            setResumeBuilderMode('resume')
            setCurrentStep('score')
          }}
          onPortfolio={handlePortfolioEntry}
          onCoverLetter={() => {
            setResumeBuilderMode('resume')
            setCurrentStep('cover-letter')
          }}
        />
      </div>
    )
  }

  // Handle file upload for scoring
  const handleScoreFileUpload = async (file: File) => {
    setScoreFile(file)
    setIsExtractingText(true)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()

      // For plain text files, read directly
      if (ext === 'txt') {
        const text = await file.text()
        setScoreInput(text)
        toast.success('Resume text loaded')
        setIsExtractingText(false)
        return
      }

      // For PDF/DOC/DOCX, use the parse-files API to extract text
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch('/api/resume/parse-files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to extract text from file')
      }

      const result = await response.json() as {
        extractedResumeData?: Record<string, string | string[] | undefined>
        resumeText?: string
        resumeLayoutEstimate?: { pageCount: number; lineCount: number } | null
      }

      // Build readable resume text from parsed data
      const parts: string[] = []
      const rd = result.extractedResumeData
      if (rd) {
        if (rd.fullName) parts.push(`Name: ${rd.fullName}`)
        if (rd.title) parts.push(`Title: ${rd.title}`)
        if (rd.email) parts.push(`Email: ${rd.email}`)
        if (rd.phone) parts.push(`Phone: ${rd.phone}`)
        if (rd.location) parts.push(`Location: ${rd.location}`)
        if (rd.linkedin) parts.push(`LinkedIn: ${rd.linkedin}`)
        if (rd.github) parts.push(`GitHub: ${rd.github}`)
        if (rd.portfolio) parts.push(`Portfolio: ${rd.portfolio}`)
        if (rd.summary) parts.push(`\nSummary:\n${rd.summary}`)
        if (rd.skills) parts.push(`\nSkills:\n${rd.skills}`)
        if (rd.experience) parts.push(`\nExperience:\n${rd.experience}`)
        if (rd.education) parts.push(`\nEducation:\n${rd.education}`)
        if (rd.projects) parts.push(`\nProjects:\n${rd.projects}`)
        if (rd.certifications) {
          const certs = Array.isArray(rd.certifications) ? rd.certifications.join('\n') : rd.certifications
          parts.push(`\nCertifications:\n${certs}`)
        }
        if (rd.achievements) {
          const achs = Array.isArray(rd.achievements) ? rd.achievements.join('\n') : rd.achievements
          parts.push(`\nAchievements:\n${achs}`)
        }
      }

      const extractedText = parts.length > 3 ? parts.join('\n') : (result.resumeText || '')

      if (extractedText.trim()) {
        setScoreInput(extractedText)
        const est = result.resumeLayoutEstimate
        toast.success(
          est && est.lineCount > 0
            ? `Resume text extracted · ~${est.pageCount} pg text estimate`
            : 'Resume text extracted successfully',
        )
      } else {
        toast.error('Could not extract text from file. Try pasting your resume text directly.')
      }
    } catch (error) {
      console.error('Error extracting text:', error)
      toast.error('Failed to read file. Try pasting your resume text directly.')
    } finally {
      setIsExtractingText(false)
    }
  }

  // Show score step
  if (currentStep === 'score') {
    return (
      <div className="container mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setResumeBuilderMode('resume')
                  setCurrentStep('format-selection')
                  setScoreData(null)
                  setShowScore(false)
                  setScoreInput('')
                  setScoreFile(null)
                }}
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Score Your Resume</h1>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                    AI Review
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Upload your resume or paste text for a FAANG-level AI analysis with detailed scoring.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* AI Model Selection */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <Settings2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Model</span>
              </div>
              <div className="p-4">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-9 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESUME_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} <span className="text-muted-foreground">— {model.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <Upload className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Upload Resume</span>
              </div>
              <div className="p-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleScoreFileUpload(file)
                    }}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    disabled={isExtractingText || isScoring}
                  />
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 px-6 py-8 text-center transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5",
                    isExtractingText && "pointer-events-none opacity-60"
                  )}>
                    {isExtractingText ? (
                      <>
                        <Loader2 className="size-8 animate-spin text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium">Extracting text...</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Reading your resume file</p>
                        </div>
                      </>
                    ) : scoreFile ? (
                      <>
                        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                          <FileCheck className="size-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{scoreFile.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {(scoreFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted ring-1 ring-border/60">
                          <Upload className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Drop your resume here or click to browse</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Supports PDF, DOC, DOCX, TXT
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-xs font-medium text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {/* Text Paste */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Paste Resume Text</span>
                </div>
                <div className="flex items-center gap-2">
                  {scoreInput.trim() && (
                    <span className="text-[10px] text-muted-foreground">
                      {scoreInput.length.toLocaleString()} chars
                    </span>
                  )}
                  {scoreInput.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => { setScoreInput(''); setScoreFile(null) }}
                    >
                      <X className="size-3" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                className={cn(
                  "min-h-[200px] text-sm leading-relaxed sm:min-h-[280px]",
                  "resize-none border-0 rounded-none focus-visible:ring-0"
                )}
                placeholder={"Paste your resume content here...\n\nExample:\nJohn Doe\nSoftware Engineer\njohn@email.com | (555) 123-4567\n\nSummary:\nExperienced software engineer with 5+ years...\n\nExperience:\nSenior Engineer at Google (2021-Present)\n• Built scalable microservices...\n• Led team of 8 engineers..."}
              />
              <ScoreLayoutInsights pastedText={scoreInput} className="border-t border-border/60" />
            </div>

            {/* Score Button */}
            <div className="flex items-center justify-between gap-4">
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Analyzed across 6 categories: ATS Compatibility, Content Quality, Impact &amp; Metrics, Keywords, Readability, Experience Strength.
              </p>
              <Button
                onClick={() => void handleScoreResume(scoreInput, scoreFormat)}
                disabled={isScoring || isExtractingText || !scoreInput.trim()}
                size="lg"
                className="gap-2"
              >
                {isScoring ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="size-4" />
                    Score My Resume
                  </>
                )}
              </Button>
            </div>

            {/* Score Results */}
            {showScore && scoreData && (
              <ResumeScorePanel
                data={scoreData}
                onClose={() => setShowScore(false)}
              />
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  if (currentStep === 'cover-letter') {
    return (
      <div className="container mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="mb-6 flex items-start gap-3 sm:gap-4">
            <button
              onClick={() => setCurrentStep('format-selection')}
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Cover Letter Generator</h1>
                <span className="shrink-0 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                  Tailored
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Generate a job-specific cover letter aligned with your resume tone and JD keyword focus.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card">
              <div className="flex items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
                <Upload className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Upload Resume (Auto-fill)</span>
              </div>
              <div className="p-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFileUpload('resume', file)
                    }}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    disabled={isParsingFiles}
                  />
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 px-4 py-5 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/5',
                      isParsingFiles && 'pointer-events-none opacity-60',
                    )}
                  >
                    {isParsingFiles ? (
                      <>
                        <Loader2 className="size-5 animate-spin text-cyan-500" />
                        <div>
                          <p className="text-sm font-medium">Extracting details from resume...</p>
                          <p className="text-xs text-muted-foreground">Please wait, fields will auto-fill.</p>
                        </div>
                      </>
                    ) : resumeFile ? (
                      <>
                        <FileCheck className="size-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium">{resumeFile.name}</p>
                          <p className="text-xs text-muted-foreground">Resume parsed. Click to replace file.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Drop or click to upload resume</p>
                          <p className="text-xs text-muted-foreground">Supports PDF, DOC, DOCX, TXT</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <span className="text-sm font-medium">Resume Context (for tone and achievements)</span>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input
                      value={watchedResumeFields.fullName || ''}
                      onChange={(e) =>
                        form.setValue('fullName', e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Target Title</label>
                    <Input
                      value={watchedResumeFields.title || ''}
                      onChange={(e) =>
                        form.setValue('title', e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      placeholder="e.g., Frontend Engineer"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      value={watchedResumeFields.email || ''}
                      onChange={(e) =>
                        form.setValue('email', e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <Input
                      value={watchedResumeFields.phone || ''}
                      onChange={(e) =>
                        form.setValue('phone', e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      placeholder="+91 98xxxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Professional Summary</label>
                  <Textarea
                    value={watchedResumeFields.summary || ''}
                    onChange={(e) =>
                      form.setValue('summary', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="min-h-[100px]"
                    placeholder="Short profile summary..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Skills</label>
                  <Textarea
                    value={watchedResumeFields.skills || ''}
                    onChange={(e) =>
                      form.setValue('skills', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="min-h-[100px]"
                    placeholder="React, Node.js, SQL, Leadership..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Experience</label>
                  <Textarea
                    value={watchedResumeFields.experience || ''}
                    onChange={(e) =>
                      form.setValue('experience', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="min-h-[140px]"
                    placeholder="Add key experiences with impact and metrics..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Projects</label>
                  <Textarea
                    value={watchedResumeFields.projects || ''}
                    onChange={(e) =>
                      form.setValue('projects', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                    className="min-h-[120px]"
                    placeholder="Mention projects relevant to the job..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <Settings2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Model</span>
              </div>
              <div className="p-4">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-9 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESUME_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} <span className="text-muted-foreground">— {model.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company Name</label>
                <Input
                  value={coverLetterCompany}
                  onChange={(e) => setCoverLetterCompany(e.target.value)}
                  placeholder="e.g., Stripe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Hiring Manager (optional)</label>
                <Input
                  value={coverLetterHiringManager}
                  onChange={(e) => setCoverLetterHiringManager(e.target.value)}
                  placeholder="e.g., Sarah Johnson"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <span className="text-sm font-medium">Job Description</span>
              </div>
              <Textarea
                value={coverLetterJobDescription}
                onChange={(e) => setCoverLetterJobDescription(e.target.value)}
                className="min-h-[220px] resize-none border-0 rounded-none focus-visible:ring-0"
                placeholder="Paste the full job description here to match tone and keyword focus..."
              />
            </div>

            <div className="flex items-center justify-end">
              <Button
                onClick={() => void handleGenerateCoverLetter()}
                disabled={isGeneratingCoverLetter}
                className="gap-2"
              >
                {isGeneratingCoverLetter ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>

            {(coverLetterMeta?.inferredTone || (coverLetterMeta?.focusedKeywords?.length ?? 0) > 0) && (
              <div className="rounded-xl border border-border/60 bg-card p-4 text-sm">
                {coverLetterMeta.inferredTone ? (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Inferred tone:</span> {coverLetterMeta.inferredTone}
                  </p>
                ) : null}
                {(coverLetterMeta.focusedKeywords?.length ?? 0) > 0 ? (
                  <p className="mt-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Keyword focus:</span>{' '}
                    {coverLetterMeta.focusedKeywords?.slice(0, 10).join(', ')}
                  </p>
                ) : null}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <span className="text-sm font-medium">Generated Cover Letter</span>
                {coverLetterOutput.trim() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(coverLetterOutput)
                      toast.success('Cover letter copied to clipboard')
                    }}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                ) : null}
              </div>
              <Textarea
                value={coverLetterOutput}
                onChange={(e) => setCoverLetterOutput(e.target.value)}
                className="min-h-[260px] resize-none border-0 rounded-none focus-visible:ring-0"
                placeholder="Your tailored cover letter will appear here..."
              />
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Show template browser only for HTML format
  if (currentStep === 'template-browser') {
    return (
      <div className="bg-background min-h-[calc(100vh-48px)]">
        <ResumeTemplateBrowser 
          onSelect={handleResumeTemplateSelect} 
          defaultFormat={templateType}
        />
      </div>
    )
  }

  // Show preview step
  if (currentStep === 'preview') {
    return (
      <div className="container mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <button
                onClick={handleReset}
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{templateType === 'latex' ? 'LaTeX' : 'HTML'} Preview</h1>
                  {previewLayoutStats.lineCount > 0 && (
                    <span
                      className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60"
                      title="A4 estimate from your HTML/LaTeX (plain-text model): margins & type scale aligned with PDF export; complex template layouts may still differ slightly"
                    >
                      ~{previewLayoutStats.pageCount} pg
                    </span>
                  )}
                  {usedModel && (
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      isFallback
                        ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
                        : "bg-muted text-muted-foreground ring-1 ring-border/60"
                    )}>
                      {isFallback && "fallback: "}{getModelName(usedModel)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Review, edit, or refine with AI before generating PDF.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:self-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const codeToCopy = templateType === 'latex' ? (editedLatex || latexCode) : (editedHtml || htmlCode)
                  void navigator.clipboard.writeText(codeToCopy)
                  toast.success(`${templateType === 'latex' ? 'LaTeX' : 'HTML'} copied to clipboard`)
                }}
                className="gap-1.5"
              >
                <Copy className="size-3.5" />
                <span className="hidden xs:inline">Copy</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleScoreResume()}
                disabled={isScoring || (templateType === 'latex' ? !editedLatex.trim() : !editedHtml.trim())}
                className="gap-1.5"
              >
                {isScoring ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="hidden xs:inline">Scoring...</span>
                  </>
                ) : (
                  <>
                    <Target className="size-3.5" />
                    <span className="hidden xs:inline">Score</span>
                  </>
                )}
              </Button>
              <Button
                onClick={onCompilePDF}
                disabled={isCompiling || (templateType === 'latex' ? !editedLatex.trim() : !editedHtml.trim())}
                size="sm"
                className="flex-1 gap-1.5 sm:flex-initial"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Compiling...
                  </>
                ) : (
                  <>
                    <FileDown className="size-3.5" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Raw AI Response Toggle */}
            {rawAIResponse && (
              <button
                onClick={() => setShowRawResponse(!showRawResponse)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <BrainCircuit className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium">Raw AI Response</span>
                    <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">View the unprocessed output</span>
                  </div>
                </div>
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", showRawResponse && "rotate-180")} />
              </button>
            )}

            {showRawResponse && rawAIResponse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <div className="max-h-[400px] overflow-auto p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap wrap-break-word text-muted-foreground">
                    {rawAIResponse}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Code display / structured layout (pretext-style engine from form data) */}
            <Tabs defaultValue="code" className="w-full">
              <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
                <TabsTrigger value="code" className="gap-1.5">
                  <FileText className="size-3.5 shrink-0" />
                  {templateType === 'latex' ? 'LaTeX' : 'HTML'}
                </TabsTrigger>
                <TabsTrigger value="layout" className="gap-1.5">
                  <LayoutGrid className="size-3.5 shrink-0" />
                  Layout preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-4">
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10">
                        <FileText className="size-3 text-primary" />
                      </div>
                      <span className="truncate font-mono text-xs font-medium text-muted-foreground">
                        {templateType === 'latex' ? 'resume.tex' : 'resume.html'}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 gap-1.5 text-xs">
                          <Edit className="size-3" />
                          <span className="hidden xs:inline">Edit</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveEdit}
                            className="h-7 gap-1.5 text-xs text-green-600 hover:text-green-700"
                          >
                            <Check className="size-3" />
                            <span className="hidden xs:inline">Save</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 gap-1.5 text-xs">
                            <X className="size-3" />
                            <span className="hidden xs:inline">Cancel</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={templateType === 'latex' ? editedLatex : editedHtml}
                      onChange={(e) => {
                        if (templateType === 'latex') {
                          setEditedLatex(e.target.value)
                        } else {
                          setEditedHtml(e.target.value)
                        }
                      }}
                      className={cn(
                        "min-h-[400px] font-mono text-sm leading-relaxed sm:min-h-[600px]",
                        "resize-none border-0 rounded-none focus-visible:ring-0"
                      )}
                      placeholder={`${templateType === 'latex' ? 'LaTeX' : 'HTML'} code will appear here...`}
                    />
                  ) : templateType === 'latex' ? (
                    <LaTeXPreview code={latexCode} />
                  ) : (
                    <HTMLPreview code={htmlCode} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="layout" className="mt-4 space-y-2">
                <ResumeLayoutPreview
                  formValues={layoutPreviewForm}
                  emptyHint="Go back to the form and fill your details to populate this preview."
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Pretext-style pipeline on your form: canvas prepare + deterministic wrap. Generated{" "}
                  {templateType === 'latex' ? 'LaTeX' : 'HTML'} for PDF is separate; use this to sanity-check length
                  and line breaks.
                </p>
              </TabsContent>
            </Tabs>

            {/* Follow-up Prompt Section */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-medium">Refine with AI</span>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">— describe changes and press Cmd+Enter</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <Input
                  value={followUpPrompt}
                  onChange={(e) => setFollowUpPrompt(e.target.value)}
                  placeholder="e.g., Make the header more prominent..."
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void handleFollowUpPrompt()
                    }
                  }}
                  disabled={isProcessingFollowUp}
                />
                <Button
                  onClick={handleFollowUpPrompt}
                  disabled={isProcessingFollowUp || !followUpPrompt.trim()}
                  size="sm"
                  className="w-full shrink-0 gap-1.5 sm:w-auto"
                >
                  {isProcessingFollowUp ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {isProcessingFollowUp ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </div>

            {/* Resume Score Panel */}
            {showScore && scoreData && (
              <ResumeScorePanel
                data={scoreData}
                onClose={() => setShowScore(false)}
              />
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col-reverse items-start gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="size-3.5" />
                Start Over
              </Button>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Tip: Press <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[10px]">Cmd+Enter</kbd> to apply AI changes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="size-3.5" />
            AI-Powered Resume
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Build Your Resume</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            {resumeBuilderMode === 'portfolio'
              ? 'Fill in your details, then use the Portfolio Studio examples below to open Buildify Studio with your content. Resume output uses HTML → PDF.'
              : 'Fill in your details and AI will craft a professional resume you can edit and download as PDF.'}
          </p>
        </div>
      </motion.div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onGenerateResume, onGenerateInvalid)}
          noValidate
          className="space-y-6"
        >
          {/* File Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.01, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <Upload className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Quick Upload (Optional)</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
            </div>
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Upload Your Resume</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleFileUpload('resume', file)
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isParsingFiles}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
                      {resumeFile ? (
                        <>
                          <FileCheck className="size-4 text-green-600" />
                          <span className="text-xs font-medium truncate flex-1">{resumeFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setResumeFile(null)
                              setParsedData(null)
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* JD Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Upload Job Description</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleFileUpload('jd', file)
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isParsingFiles}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
                      {jdFile ? (
                        <>
                          <FileCheck className="size-4 text-green-600" />
                          <span className="text-xs font-medium truncate flex-1">{jdFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setJdFile(null)
                              if (parsedData) {
                                const cleaned = stripJobDescriptionInstructions(
                                  form.getValues('additionalInstructions') || '',
                                )
                                form.setValue('additionalInstructions', cleaned)
                              }
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {isParsingFiles && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Parsing files and extracting data...</span>
                </div>
              )}
              {parsedData && !isParsingFiles && (
                <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Files parsed successfully! Form fields auto-filled and JD requirements added to instructions.
                  </p>
                </div>
              )}
              {parsedData?.resumeLayoutEstimate &&
                parsedData.resumeLayoutEstimate.lineCount > 0 &&
                !isParsingFiles && (
                  <ParsedResumeLayoutStrip estimate={parsedData.resumeLayoutEstimate} />
                )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Upload your existing resume to auto-fill the form, or upload a job description to tailor your resume to specific requirements.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.015, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <JobFitEvaluationPanel
              jobDescription={jobFitJdDraft}
              onJobDescriptionChange={setJobFitJdDraft}
              resumeContext={resumeContextForJobFit}
              selectedModel={selectedModel}
              onNavigateToGenerate={navigateJobFitToGenerate}
              onAppendTailoringToInstructions={(block) => {
                const cur = form.getValues('additionalInstructions') ?? ''
                const next = cur.trim() ? `${cur.trim()}\n\n${block}` : block
                if (next.length > 100_000) {
                  toast.error(
                    'Additional instructions would exceed the limit. Shorten existing text or use Copy instead.',
                  )
                  return
                }
                form.setValue('additionalInstructions', next)
                toast.success('Tailoring ideas appended to Additional instructions')
                navigateJobFitToGenerate()
              }}
            />
          </motion.div>

          {/* Selected Template & Format Display */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.02, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-3"
          >
            {/* Template Info */}
            {selectedTemplate && (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="flex items-center justify-between gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="shrink-0 text-sm font-medium">Selected Template</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResumeBuilderMode('resume')
                    setCurrentStep('format-selection')
                    }}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <ArrowLeft className="size-3" />
                    <span className="hidden xs:inline">Change</span>
                  </Button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Format Type */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex items-center justify-between gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2.5">
                  <Settings2 className="size-4 shrink-0 text-primary" />
                  <span className="shrink-0 text-sm font-medium">Output Format</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResumeBuilderMode('resume')
                    setCurrentStep('format-selection')
                  }}
                  className="h-7 gap-1.5 text-xs"
                >
                  <ArrowLeft className="size-3" />
                  <span className="hidden xs:inline">Change</span>
                </Button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {templateType === 'latex' ? (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                        <FileText className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">LaTeX → PDF</p>
                        <p className="text-xs text-muted-foreground">Professional typography, ATS-friendly</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                        <Code className="size-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">HTML → PDF</p>
                        <p className="text-xs text-muted-foreground">Modern design, flexible styling</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          {/* Model Selection */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <BrainCircuit className="size-4 shrink-0 text-primary" />
              <span className="shrink-0 text-sm font-medium">AI Model</span>
              {currentModelInfo && (
                <span className="ml-auto hidden truncate text-[11px] text-muted-foreground sm:block">
                  {currentModelInfo.provider} • {currentModelInfo.description}
                </span>
              )}
            </div>
            <div className="p-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {RESUME_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.provider} — {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Personal Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <User className="size-4 text-blue-500" />
              <span className="text-sm font-medium">Personal Information</span>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title <span className="text-[10px] text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location <span className="text-[10px] text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco, CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <Link2 className="size-4 text-cyan-500" />
              <span className="text-sm font-medium text-muted-foreground">Links</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="linkedin.com/in/johndoe" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="github"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">GitHub</FormLabel>
                      <FormControl>
                        <Input placeholder="github.com/johndoe" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="portfolio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Portfolio</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe.dev" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </motion.div>

          {/* Professional Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.13, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <MessageSquare className="size-4 text-indigo-500" />
              <span className="text-sm font-medium text-muted-foreground">Professional Summary</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1.5 text-xs"
                onClick={() => void handleAiRewriteSection('summary')}
                disabled={!!aiWriterLoading.summary}
              >
                {aiWriterLoading.summary ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Writer
              </Button>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Results-driven software engineer with 6+ years of experience building scalable applications..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      2-3 sentence professional summary highlighting your key strengths and impact.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Skills Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <Sparkles className="size-4 text-amber-500" />
              <span className="text-sm font-medium">Skills</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1.5 text-xs"
                onClick={() => void handleAiRewriteSection('skills')}
                disabled={!!aiWriterLoading.skills}
              >
                {aiWriterLoading.skills ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Writer
              </Button>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={"Languages: JavaScript, TypeScript, Python\nFrameworks: React, Next.js, Node.js\nTools: AWS, Docker, Git, PostgreSQL"}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List skills by category or comma-separated. If left empty, this section won&apos;t appear.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Experience Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <Briefcase className="size-4 text-emerald-500" />
              <span className="text-sm font-medium">Experience</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1.5 text-xs"
                onClick={() => void handleAiRewriteSection('experience')}
                disabled={!!aiWriterLoading.experience}
              >
                {aiWriterLoading.experience ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Writer
              </Button>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={"Senior Software Engineer | Google | 2021 – Present\n• Architected microservices platform reducing deployment time by 60%\n• Led migration serving 5M+ DAU with 99.99% uptime\n\nSoftware Engineer | Stripe | 2019 – 2021\n• Built payment processing pipeline handling $2B+ annual volume"}
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use &quot;Role | Company | Dates&quot; then bullet points. Separate entries with blank lines. Empty = section hidden.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Projects Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <FolderKanban className="size-4 text-rose-500" />
              <span className="text-sm font-medium">Projects</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1.5 text-xs"
                onClick={() => void handleAiRewriteSection('projects')}
                disabled={!!aiWriterLoading.projects}
              >
                {aiWriterLoading.projects ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Writer
              </Button>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="projects"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={"Analytics Dashboard | React, D3.js, WebSocket\n• Streaming analytics processing 50K+ events/sec\n• Reduced decision-making time by 40%\n\nCLI Tool | TypeScript, Node.js\n• Developer productivity tool with 2K+ GitHub stars"}
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use &quot;Project Name | Tech Stack&quot; then bullet points. Separate entries with blank lines. Empty = section hidden.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Education Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <GraduationCap className="size-4 text-violet-500" />
              <span className="text-sm font-medium">Education</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1.5 text-xs"
                onClick={() => void handleAiRewriteSection('education')}
                disabled={!!aiWriterLoading.education}
              >
                {aiWriterLoading.education ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                AI Writer
              </Button>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={"B.S. Computer Science\nStanford University | 2015 – 2019"}
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use &quot;Degree&quot; on first line, &quot;College | Year&quot; on second. Empty = section hidden.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Certifications & Achievements Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <Award className="size-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">Certifications &amp; Achievements</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
            </div>
            <div className="space-y-4 p-4">
              <FormField
                control={form.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 flex items-center gap-2">
                      <FormLabel className="text-xs">Certifications</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto h-6 gap-1.5 px-2 text-[10px]"
                        onClick={() => void handleAiRewriteSection('certifications')}
                        disabled={!!aiWriterLoading.certifications}
                      >
                        {aiWriterLoading.certifications ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        AI Writer
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="AWS Solutions Architect Associate (2023), Google Cloud Professional Developer (2022)"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list. If empty, section won&apos;t appear.
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="achievements"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 flex items-center gap-2">
                      <FormLabel className="text-xs">Achievements</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto h-6 gap-1.5 px-2 text-[10px]"
                        onClick={() => void handleAiRewriteSection('achievements')}
                        disabled={!!aiWriterLoading.achievements}
                      >
                        {aiWriterLoading.achievements ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        AI Writer
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Best Innovation Award — Google Hackathon 2023, Speaker — ReactConf 2022"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Awards, recognitions, notable achievements. Comma-separated.
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languagesKnown"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 flex items-center gap-2">
                      <FormLabel className="text-xs">Languages Spoken</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto h-6 gap-1.5 px-2 text-[10px]"
                        onClick={() => void handleAiRewriteSection('languagesKnown')}
                        disabled={!!aiWriterLoading.languagesKnown}
                      >
                        {aiWriterLoading.languagesKnown ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        AI Writer
                      </Button>
                    </div>
                    <FormControl>
                      <Input placeholder="English (Native), Spanish (Conversational)" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Additional Instructions Section — job fit Step 3 scroll target */}
          <motion.div
            ref={additionalInstructionsSectionRef}
            id="ai-resume-additional-instructions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="scroll-mt-20 overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-dashed border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
              <Settings2 className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Additional Instructions</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Optional</span>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="additionalInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Use a modern color scheme, make it more creative, add icons, use a two-column layout..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Style, layout, colors, or formatting preferences.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {resumeBuilderMode === 'portfolio' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.37, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden rounded-xl border border-border/60 bg-card"
            >
              <div className="flex flex-wrap items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
                <FolderKanban className="size-4 text-violet-500" />
                <span className="text-sm font-medium">Portfolio Studio Examples</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Working examples
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 gap-1.5 text-xs"
                  onClick={() => router.push('/buildify-studio/new')}
                >
                  Open Studio
                </Button>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-xs text-muted-foreground">
                  Pick an example to quickly generate a portfolio from a person&apos;s shared resume, then refine in Buildify Studio.
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  {PORTFOLIO_STUDIO_EXAMPLES.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => openPortfolioStudioFromExample(example)}
                      disabled={openingPortfolioExampleId !== null}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        {openingPortfolioExampleId === example.id && <Loader2 className="size-3 animate-spin" />}
                        {example.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {openingPortfolioExampleId === example.id
                          ? 'Preparing your layout and opening Buildify Studio...'
                          : example.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <ResumeLayoutInsights formValues={layoutPreviewForm} />

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex justify-end pt-2"
          >
            <Button type="submit" disabled={isGenerating} size="lg" className="gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating {form.watch('templateType') === 'latex' ? 'LaTeX' : 'HTML'}...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Resume
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>
    </div>
  )
}

// LaTeX Preview Component with Syntax Highlighting
function LaTeXPreview({ code }: { code: string }) {
  const { html, isLoading } = useHighlightCode(code, 'latex')

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center bg-muted/20 sm:min-h-[600px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading syntax highlighter...</span>
        </div>
      </div>
    )
  }

  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length

  return (
    <div className="max-h-[400px] overflow-auto bg-background sm:max-h-[600px]" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex min-w-0">
        {/* Line numbers */}
        <div className="sticky left-0 z-10 hidden flex-col border-r border-border bg-muted/30 py-3 text-right select-none sm:flex">
          {lines.map((_, i) => (
            <span
              key={i}
              className="px-3 font-mono text-[11px] tabular-nums leading-5 text-muted-foreground/40"
              style={{ minWidth: `${lineNumberWidth + 2}ch` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Code content */}
        <div
          className={cn(
            'min-w-0 flex-1 overflow-x-auto px-3 py-3 sm:px-4',
            '[&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0!',
            '[&_code]:text-[12px]! [&_code]:leading-5! [&_code]:font-mono sm:[&_code]:text-[13px]!',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}

// HTML Preview Component with Syntax Highlighting
function HTMLPreview({ code }: { code: string }) {
  const { html, isLoading } = useHighlightCode(code, 'html')

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center bg-muted/20 sm:min-h-[600px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading syntax highlighter...</span>
        </div>
      </div>
    )
  }

  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length

  return (
    <div className="max-h-[400px] overflow-auto bg-background sm:max-h-[600px]" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex min-w-0">
        {/* Line numbers */}
        <div className="sticky left-0 z-10 hidden flex-col border-r border-border bg-muted/30 py-3 text-right select-none sm:flex">
          {lines.map((_, i) => (
            <span
              key={i}
              className="px-3 font-mono text-[11px] tabular-nums leading-5 text-muted-foreground/40"
              style={{ minWidth: `${lineNumberWidth + 2}ch` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Code content */}
        <div
          className={cn(
            'min-w-0 flex-1 overflow-x-auto px-3 py-3 sm:px-4',
            '[&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0!',
            '[&_code]:text-[12px]! [&_code]:leading-5! [&_code]:font-mono sm:[&_code]:text-[13px]!',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
