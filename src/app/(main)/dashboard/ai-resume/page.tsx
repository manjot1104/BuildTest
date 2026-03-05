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
import { Loader2, FileDown, Edit, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useHighlightCode } from '@/hooks/use-shiki'
import { cn } from '@/lib/utils'

const resumeSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').max(20),
  skills: z.string().min(1, 'Skills are required'),
  experience: z.string().min(1, 'Experience is required'),
  education: z.string().min(1, 'Education is required'),
  projects: z.string().min(1, 'Projects are required'),
})

type ResumeFormData = z.infer<typeof resumeSchema>

type Step = 'form' | 'latex-preview' | 'compiling'

export default function AIResumeBuilderPage() {
  const [currentStep, setCurrentStep] = useState<Step>('form')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [latexCode, setLatexCode] = useState('')
  const [editedLatex, setEditedLatex] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [rawAIResponse, setRawAIResponse] = useState('')
  const [showRawResponse, setShowRawResponse] = useState(false)

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
    },
  })

  // Generate LaTeX code
  const onGenerateLaTeX = async (data: ResumeFormData) => {
    setIsGenerating(true)
    toast.loading('Generating LaTeX code...', { id: 'resume-generate' })

    try {
      const response = await fetch('/api/resume/generate-latex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
      setCurrentStep('latex-preview')
      toast.success('LaTeX code generated successfully!', { id: 'resume-generate' })
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latex: editedLatex,
          fileName: form.getValues('fullName') || 'Resume',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to compile PDF' }))
        throw new Error(error.error || 'Failed to compile PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()

      // Create download link
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

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    setLatexCode(editedLatex)
    setIsEditing(false)
    toast.success('LaTeX code updated')
  }

  const handleCancelEdit = () => {
    setEditedLatex(latexCode)
    setIsEditing(false)
  }

  const handleReset = () => {
    setCurrentStep('form')
    setLatexCode('')
    setEditedLatex('')
    setRawAIResponse('')
    setIsEditing(false)
    setShowRawResponse(false)
    form.reset()
  }

  // Show LaTeX preview step
  if (currentStep === 'latex-preview') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight">LaTeX Code Preview</h1>
            <Button variant="outline" onClick={handleReset} size="sm">
              <X className="mr-2 h-4 w-4" />
              Start Over
            </Button>
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
          Fill in your details below and we'll generate a professional LaTeX resume for you. You can review and edit the LaTeX code before compiling to PDF.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onGenerateLaTeX)} className="space-y-6">
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
