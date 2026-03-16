'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Loader2, FileDown, Edit, Check, X, Sparkles, Send, BrainCircuit, FileText, User, Briefcase, GraduationCap, FolderKanban, Settings2, ArrowLeft, ChevronDown, Copy, RotateCcw, Code } from 'lucide-react'
import { TemplateSelection } from './components/template-selection'
import { ResumeTemplateBrowser } from './components/template-browser'
import type { ResumeTemplate } from './templates'
import { toast } from 'sonner'
import { useHighlightCode } from '@/hooks/use-shiki'
import { cn } from '@/lib/utils'

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

// ─── Schema ──────────────────────────────────────────────────────────────────

const resumeSchema = z.object({
  templateType: z.enum(['latex', 'html']),
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').max(20),
  skills: z.string().min(1, 'Skills are required'),
  experience: z.string().min(1, 'Experience is required'),
  education: z.string().min(1, 'Education is required'),
  projects: z.string().min(1, 'Projects are required'),
  additionalInstructions: z.string().optional(),
})

type ResumeFormData = z.infer<typeof resumeSchema>

type Step = 'template-browser' | 'format-selection' | 'form' | 'preview' | 'compiling'

export default function AIResumeBuilderPage() {
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

  const form = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      templateType: 'latex',
      fullName: '',
      email: '',
      phone: '',
      skills: '',
      experience: '',
      education: '',
      projects: '',
      additionalInstructions: '',
    },
  })

  const currentModelInfo = RESUME_MODELS.find((m) => m.id === selectedModel)

  // Generate Resume code (LaTeX or HTML)
  const onGenerateResume = async (data: ResumeFormData) => {
    setIsGenerating(true)
    const isLaTeX = data.templateType === 'latex'
    setTemplateType(data.templateType)
    toast.loading(`Generating ${isLaTeX ? 'LaTeX' : 'HTML'} code...`, { id: 'resume-generate' })

    try {
      const endpoint = isLaTeX ? '/api/resume/generate-latex' : '/api/resume/generate-html'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          model: selectedModel,
          templateId: selectedTemplate?.id,
          templateStyleGuide: selectedTemplate?.styleGuide,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `Failed to generate ${isLaTeX ? 'LaTeX' : 'HTML'}` }))
        throw new Error(error.error || `Failed to generate ${isLaTeX ? 'LaTeX' : 'HTML'} code`)
      }

      const result = await response.json()
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

      if (result.isFallback && result.model) {
        toast.warning(`Model unavailable. Used fallback: ${getModelName(result.model)}`, { id: 'resume-generate' })
      } else {
        toast.success(`${isLaTeX ? 'LaTeX' : 'HTML'} code generated successfully!`, { id: 'resume-generate' })
      }
    } catch (error) {
      console.error(`Error generating ${isLaTeX ? 'LaTeX' : 'HTML'}:`, error)
      toast.error(
        error instanceof Error ? error.message : `Failed to generate ${isLaTeX ? 'LaTeX' : 'HTML'} code. Please try again.`,
        { id: 'resume-generate' }
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Compile to PDF (LaTeX or HTML)
  const onCompilePDF = async () => {
    setIsCompiling(true)
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
        throw new Error(error.error || 'Failed to generate PDF')
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
      console.error('Error generating PDF:', error)
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

  const handleReset = () => {
    setCurrentStep('format-selection')
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
    form.reset()
  }

  const handleResumeTemplateSelect = (template: ResumeTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep('form')
  }

  const handleFormatSelect = (selectedType: 'latex' | 'html') => {
    setTemplateType(selectedType)
    form.setValue('templateType', selectedType)
    
    // Show templates for both HTML and LaTeX formats
    setCurrentStep('template-browser')
  }

  // Show format selection first
  if (currentStep === 'format-selection') {
    return (
      <div className="bg-background h-[calc(100vh-48px)] flex items-center justify-center">
        <TemplateSelection onSelect={handleFormatSelect} />
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
                  navigator.clipboard.writeText(codeToCopy)
                  toast.success(`${templateType === 'latex' ? 'LaTeX' : 'HTML'} copied to clipboard`)
                }}
                className="gap-1.5"
              >
                <Copy className="size-3.5" />
                <span className="hidden xs:inline">Copy</span>
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
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words text-muted-foreground">
                    {rawAIResponse}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Code Display/Editor */}
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
                      handleFollowUpPrompt()
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
            Fill in your details and AI will craft a professional resume you can edit and download as PDF.
          </p>
        </div>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onGenerateResume)} className="space-y-6">
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
                      if (templateType === 'html') {
                        setCurrentStep('template-browser')
                      } else {
                        setCurrentStep('format-selection')
                      }
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
                    if (templateType === 'html' && selectedTemplate) {
                      setCurrentStep('template-browser')
                    } else {
                      setCurrentStep('format-selection')
                    }
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
              </div>
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
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., JavaScript, React, Node.js, Python, SQL, AWS..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List your technical skills, programming languages, tools, and technologies.
                    </FormDescription>
                    <FormMessage />
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
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Software Engineer at Company X (2020-2023) - Developed web applications..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include job titles, companies, dates, and key achievements.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Education Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <GraduationCap className="size-4 text-violet-500" />
              <span className="text-sm font-medium">Education</span>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Bachelor of Science in Computer Science, University Name (2016-2020)..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Degrees, institutions, and graduation dates.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Projects Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <FolderKanban className="size-4 text-rose-500" />
              <span className="text-sm font-medium">Projects</span>
            </div>
            <div className="p-4">
              <FormField
                control={form.control}
                name="projects"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., E-commerce Platform (2023) - Built a full-stack application using React and Node.js..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Notable projects, technologies used, and key features.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </motion.div>

          {/* Additional Instructions Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-card"
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
