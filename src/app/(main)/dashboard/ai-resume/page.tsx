'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Loader2, FileDown, Edit, Check, X, Sparkles, Send, BrainCircuit } from 'lucide-react'
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

type Step = 'form' | 'latex-preview' | 'compiling'

export default function AIResumeBuilderPage() {
  const [currentStep, setCurrentStep] = useState<Step>('form')
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [latexCode, setLatexCode] = useState('')
  const [editedLatex, setEditedLatex] = useState('')
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

  // Generate LaTeX code
  const onGenerateLaTeX = async (data: ResumeFormData) => {
    setIsGenerating(true)
    toast.loading('Generating LaTeX code...', { id: 'resume-generate' })

    try {
      const response = await fetch('/api/resume/generate-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, model: selectedModel }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate LaTeX' }))
        throw new Error(error.error || 'Failed to generate LaTeX code')
      }

      const result = await response.json()
      const generatedLatex = result.latex
      const rawResponse = result.rawResponse || ''

      if (!generatedLatex) {
        throw new Error('No LaTeX code returned from API')
      }

      setLatexCode(generatedLatex)
      setEditedLatex(generatedLatex)
      setRawAIResponse(rawResponse)
      setUsedModel(result.model || selectedModel)
      setIsFallback(result.isFallback || false)
      setCurrentStep('latex-preview')

      if (result.isFallback && result.model) {
        toast.warning(`Model unavailable. Used fallback: ${getModelName(result.model)}`, { id: 'resume-generate' })
      } else {
        toast.success('LaTeX code generated successfully!', { id: 'resume-generate' })
      }
    } catch (error) {
      console.error('Error generating LaTeX:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate LaTeX code. Please try again.',
        { id: 'resume-generate' }
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Compile LaTeX to PDF
  const onCompilePDF = async () => {
    setIsCompiling(true)
    toast.loading('Compiling PDF...', { id: 'resume-compile' })

    try {
      const response = await fetch('/api/resume/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latex: editedLatex,
          fileName: form.getValues('fullName') || 'Resume',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to compile PDF' }))
        throw new Error(error.error || 'Failed to compile PDF')
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
      console.error('Error compiling PDF:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to compile PDF. Please try again.',
        { id: 'resume-compile' }
      )
    } finally {
      setIsCompiling(false)
    }
  }

  const handleEdit = () => setIsEditing(true)

  const handleSaveEdit = () => {
    setLatexCode(editedLatex)
    setIsEditing(false)
    toast.success('LaTeX code updated')
  }

  const handleCancelEdit = () => {
    setEditedLatex(latexCode)
    setIsEditing(false)
  }

  // Handle follow-up prompt to modify LaTeX
  const handleFollowUpPrompt = async () => {
    if (!followUpPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsProcessingFollowUp(true)
    toast.loading('Processing your request...', { id: 'follow-up' })

    try {
      const response = await fetch('/api/resume/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLatex: editedLatex || latexCode,
          prompt: followUpPrompt,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to process follow-up' }))
        throw new Error(error.error || 'Failed to process follow-up prompt')
      }

      const result = await response.json()
      const updatedLatex = result.latex
      const rawResponse = result.rawResponse || ''

      if (!updatedLatex) {
        throw new Error('No LaTeX code returned from AI')
      }

      setLatexCode(updatedLatex)
      setEditedLatex(updatedLatex)
      setRawAIResponse(rawResponse)
      setUsedModel(result.model || selectedModel)
      setIsFallback(result.isFallback || false)
      setFollowUpPrompt('')

      if (result.isFallback && result.model) {
        toast.warning(`Model unavailable. Used fallback: ${getModelName(result.model)}`, { id: 'follow-up' })
      } else {
        toast.success('LaTeX updated successfully!', { id: 'follow-up' })
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
    setCurrentStep('form')
    setLatexCode('')
    setEditedLatex('')
    setRawAIResponse('')
    setFollowUpPrompt('')
    setIsEditing(false)
    setShowRawResponse(false)
    setUsedModel(null)
    setIsFallback(false)
    form.reset()
  }

  // Show LaTeX preview step
  if (currentStep === 'latex-preview') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight">LaTeX Code Preview</h1>
            <div className="flex items-center gap-3">
              {usedModel && (
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-md",
                  isFallback
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isFallback && "fallback: "}{getModelName(usedModel)}
                </span>
              )}
              <Button variant="outline" onClick={handleReset} size="sm">
                <X className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Review and edit the generated LaTeX code before compiling to PDF.
          </p>
        </div>

        <div className="space-y-4">
          {/* Raw AI Response Toggle */}
          {rawAIResponse && (
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">AI Response</span>
                <span className="text-xs text-muted-foreground">
                  View the raw response from AI before processing
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawResponse(!showRawResponse)}
                className="h-7"
              >
                {showRawResponse ? 'Hide' : 'Show'} Raw Response
              </Button>
            </div>
          )}

          {/* Raw AI Response Display */}
          {showRawResponse && rawAIResponse && (
            <div className="border rounded-lg overflow-hidden bg-background">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <span className="font-mono text-sm text-muted-foreground">Raw AI Response</span>
              </div>
              <div className="p-4 bg-muted/20 max-h-[400px] overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap wrap-break-word text-muted-foreground">
                  {rawAIResponse}
                </pre>
              </div>
            </div>
          )}

          {/* LaTeX Code Display/Editor */}
          <div className="border rounded-lg overflow-hidden bg-background">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">LaTeX Code</span>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-7 gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="h-7 gap-1.5 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-7 gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={editedLatex}
                onChange={(e) => setEditedLatex(e.target.value)}
                className={cn(
                  "min-h-[600px] font-mono text-sm leading-relaxed",
                  "resize-none border-0 rounded-none focus-visible:ring-0"
                )}
                placeholder="LaTeX code will appear here..."
              />
            ) : (
              <LaTeXPreview code={latexCode} />
            )}
          </div>

          {/* Follow-up Prompt Section */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Follow-up</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask AI to make changes to the LaTeX code. For example: &quot;Make the header more prominent&quot;, &quot;Add a color scheme&quot;, &quot;Change the font size&quot;, etc.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={followUpPrompt}
                onChange={(e) => setFollowUpPrompt(e.target.value)}
                placeholder="e.g., Make the header more prominent, add colors, change layout..."
                className="flex-1"
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
                size="default"
              >
                {isProcessingFollowUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Ctrl+Enter (or Cmd+Enter on Mac) to submit
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset}>
              Back to Form
            </Button>
            <Button
              onClick={onCompilePDF}
              disabled={isCompiling || !editedLatex.trim()}
              size="lg"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Compiling PDF...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Compile to PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Resume Builder</h1>
        <p className="text-muted-foreground">
          Fill in your details below and we&apos;ll generate a professional LaTeX resume for you. You can review and edit the LaTeX code before compiling to PDF.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onGenerateLaTeX)} className="space-y-6">
          {/* Model Selection */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Model</span>
            </div>
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
            {currentModelInfo && (
              <p className="text-xs text-muted-foreground mt-2">
                {currentModelInfo.description} • Powered by {currentModelInfo.provider} via OpenRouter
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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

          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skills</FormLabel>
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

          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Software Engineer at Company X (2020-2023) - Developed web applications..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe your work experience, including job titles, companies, dates, and key achievements.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="education"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Education</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Bachelor of Science in Computer Science, University Name (2016-2020)..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  List your educational background, degrees, institutions, and graduation dates.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projects"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projects</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., E-commerce Platform (2023) - Built a full-stack application using React and Node.js..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe your notable projects, including technologies used and key features.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="additionalInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Use a modern color scheme, make it more creative, add icons, use a two-column layout..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Add any specific instructions for the resume style, layout, colors, or formatting.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating LaTeX...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Generate LaTeX Code
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

// LaTeX Preview Component with Syntax Highlighting
function LaTeXPreview({ code }: { code: string }) {
  const { html, isLoading } = useHighlightCode(code, 'tex')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-muted/20">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading syntax highlighter...</span>
        </div>
      </div>
    )
  }

  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length

  return (
    <div className="overflow-auto max-h-[600px] bg-background" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex min-w-max">
        {/* Line numbers */}
        <div className="sticky left-0 z-10 flex flex-col bg-muted/30 border-r border-border select-none py-3 text-right">
          {lines.map((_, i) => (
            <span
              key={i}
              className="px-3 text-[11px] leading-5 text-muted-foreground/40 font-mono tabular-nums"
              style={{ minWidth: `${lineNumberWidth + 2}ch` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Code content */}
        <div
          className={cn(
            'flex-1 py-3 px-4',
            '[&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0!',
            '[&_code]:text-[13px]! [&_code]:leading-5! [&_code]:font-mono',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
