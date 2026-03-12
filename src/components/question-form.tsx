'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'
import { useChatActions } from '@/context/chat-actions'
import type { Question, QuestionOption } from '@/types/api.types'

interface QuestionCardProps {
  question: Question
  selectedOptions: string[]
  onSelect: (optionId: string) => void
  disabled?: boolean
}

function QuestionCard({
  question,
  selectedOptions,
  onSelect,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="space-y-3">
      {question.header && (
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {question.header}
        </div>
      )}
      <div className="text-sm font-medium text-foreground">
        {question.question}
      </div>
      <div className="space-y-2">
        {question.options.map((option: QuestionOption) => {
          const isSelected = selectedOptions.includes(option.id)
          return (
            <button
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              disabled={disabled}
              className={cn(
                'w-full text-left p-2.5 rounded-lg border transition-all',
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-primary/50 hover:bg-accent/50 cursor-pointer',
                isSelected
                  ? 'border-primary bg-muted shadow-sm'
                  : 'border-border bg-background',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50',
                  )}
                >
                  {isSelected && (
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface QuestionFormProps {
  questions: Question[]
  className?: string
}

export function QuestionForm({ questions, className }: QuestionFormProps) {
  const { sendMessage, isAnswering, isAvailable } = useChatActions()
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (
    questionId: string,
    optionId: string,
    multiSelect: boolean,
  ) => {
    if (submitted) return

    setAnswers((prev) => {
      if (multiSelect) {
        const current = prev[questionId] ?? []
        if (current.includes(optionId)) {
          return {
            ...prev,
            [questionId]: current.filter((id) => id !== optionId),
          }
        }
        return {
          ...prev,
          [questionId]: [...current, optionId],
        }
      }
      return {
        ...prev,
        [questionId]: [optionId],
      }
    })
  }

  const handleSubmit = () => {
    if (!isAvailable || submitted) return

    // Format answers as a message - just send the selected option label(s)
    const answerParts: string[] = []

    for (const question of questions) {
      const selectedOptionIds = answers[question.id] ?? []
      const selectedOptions = question.options.filter((opt) =>
        selectedOptionIds.includes(opt.id),
      )

      if (selectedOptions.length > 0) {
        const labels = selectedOptions.map((opt) => opt.label).join(', ')
        answerParts.push(labels)
      }
    }

    if (answerParts.length > 0) {
      const message = answerParts.join('\n')
      setSubmitted(true)
      sendMessage(message)
    }
  }

  // Check if all required questions have been answered
  const allQuestionsAnswered = questions.every(
    (q) => (answers[q.id]?.length ?? 0) > 0,
  )

  // If chat actions not available, show read-only version
  if (!isAvailable) {
    return <QuestionDisplay questions={questions} className={className} />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          selectedOptions={answers[question.id] ?? []}
          onSelect={(optionId) =>
            handleSelect(question.id, optionId, question.multiSelect ?? false)
          }
          disabled={submitted || isAnswering}
        />
      ))}

      <div className="pt-2 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!allQuestionsAnswered || submitted || isAnswering}
          className="w-fit min-w-[100px] h-8 px-6 py-1.5 text-sm"
        >
          {isAnswering ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Sending...
            </>
          ) : submitted ? (
            <>
              <Check className="w-3.5 h-3.5 mr-2" />
              Sent
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  )
}

// Simple read-only display of questions (fallback when context not available)
export function QuestionDisplay({
  questions,
  className,
}: {
  questions: Question[]
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          {question.header && (
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {question.header}
            </div>
          )}
          <div className="text-sm font-medium text-foreground">
            {question.question}
          </div>
          <div className="space-y-1.5">
            {question.options.map((option: QuestionOption) => (
              <div
                key={option.id}
                className="p-2.5 rounded-md border border-border bg-muted/30"
              >
                <div className="text-sm text-foreground">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="text-xs text-muted-foreground italic">
        Loading...
      </div>
    </div>
  )
}
