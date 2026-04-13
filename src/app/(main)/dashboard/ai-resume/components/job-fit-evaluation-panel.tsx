'use client'

import { useState } from 'react'
import { Loader2, Sparkles, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { JobFitEvaluationResult } from '@/lib/resume/job-fit-evaluation'

type Props = {
  jobDescription: string
  onJobDescriptionChange: (value: string) => void
  resumeContext: string
  selectedModel: string
}

export function JobFitEvaluationPanel({
  jobDescription,
  onJobDescriptionChange,
  resumeContext,
  selectedModel,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<JobFitEvaluationResult | null>(null)
  const [modelUsed, setModelUsed] = useState<string | null>(null)

  async function runEvaluation() {
    const jd = jobDescription.trim()
    if (jd.length < 80) {
      toast.error('Paste at least a few lines of the job description (80+ characters).')
      return
    }
    setLoading(true)
    setResult(null)
    setModelUsed(null)
    try {
      const res = await fetch('/api/resume/evaluate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jd,
          resumeContext: resumeContext.trim() || undefined,
          model: selectedModel,
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        evaluation?: JobFitEvaluationResult
        model?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Request failed')
      }
      if (!data.evaluation) {
        throw new Error('No evaluation returned')
      }
      setResult(data.evaluation)
      setModelUsed(data.model ?? null)
      toast.success('Job fit analysis ready')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not analyze job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">Job fit insights</CardTitle>
              <CardDescription className="text-xs">
                Optional: analyze a posting vs your form fields. Does not change resume generation.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 text-xs"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <>
                Hide <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Show <ChevronDown className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            placeholder="Paste the job description here (or it may pre-fill when you upload a JD file)."
            className="min-h-[120px] text-sm"
            disabled={loading}
          />
          <p className="text-[11px] text-muted-foreground">
            Your form fields (summary, skills, experience, etc.) are sent only when you click Analyze —
            only for this report, not for Generate resume.
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={loading || jobDescription.trim().length < 80}
            onClick={() => void runEvaluation()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Analyze fit
          </Button>

          {result && (
            <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-card p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Fit score</span>
                <Badge variant="secondary" className="font-mono text-sm">
                  {result.fitScore} / 5
                </Badge>
                {modelUsed && (
                  <span className="text-[10px] text-muted-foreground">via {modelUsed}</span>
                )}
              </div>
              <Section title="Summary" body={result.fitSummary} />
              <Section title="Role in plain language" body={result.roleSummary} />
              <ListSection title="Match highlights" items={result.matchHighlights} />
              <ListSection title="Gaps & risks" items={result.gapsAndRisks} />
              <ListSection title="Tailoring ideas" items={result.tailoringIdeas} />
              <ListSection title="Interview prep" items={result.interviewPrep} />
              {result.caution ? (
                <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-100">
                  {result.caution}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-foreground">{title}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold text-foreground">{title}</h4>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
