'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, ChevronDown, Play, Settings2, Check, Link2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const STANDARDS_OPTIONS = [
  { value: 'wcag2a', label: 'WCAG 2.0 A' },
  { value: 'wcag2aa', label: 'WCAG 2.0 AA' },
  { value: 'wcag21a', label: 'WCAG 2.1 A' },
  { value: 'wcag21aa', label: 'WCAG 2.1 AA' },
  { value: 'best-practice', label: 'Best Practices' },
] as const

const formSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .refine((val) => {
      try {
        new URL(val.startsWith('http') ? val : `https://${val}`)
        return true
      } catch {
        return false
      }
    }, 'Please enter a valid URL'),
  standards: z.array(z.string()).min(1, 'Select at least one standard'),
  maxPages: z.number().min(1).max(50),
  maxDepth: z.number().min(1).max(5),
})

type FormValues = z.infer<typeof formSchema>

interface TestConfigFormProps {
  onSubmit: (values: FormValues) => void
  isRunning: boolean
}

export function TestConfigForm({ onSubmit, isRunning }: TestConfigFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      standards: ['wcag2aa'],
      maxPages: 20,
      maxDepth: 3,
    },
  })

  return (
    <div className="relative rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      {/* Faint glow behind card */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/[0.02] blur-xl" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* URL Input */}
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Website URL</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Link2 className="size-4 text-muted-foreground/60" />
                    </div>
                    <Input
                      placeholder="https://example.com"
                      className="h-11 pl-10 shadow-sm transition-shadow duration-200 focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.15)] focus-visible:ring-2 focus-visible:ring-primary/30"
                      {...field}
                      disabled={isRunning}
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Enter the full URL of the website you want to test
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Compliance Standards */}
          <FormField
            control={form.control}
            name="standards"
            render={() => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Compliance Standards</FormLabel>
                <div className="flex flex-wrap gap-2.5">
                  {STANDARDS_OPTIONS.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name="standards"
                      render={({ field }) => {
                        const isChecked = field.value.includes(option.value)
                        return (
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => {
                              if (isChecked) {
                                field.onChange(field.value.filter((v) => v !== option.value))
                              } else {
                                field.onChange([...field.value, option.value])
                              }
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium',
                              'transition-all duration-200 ease-out',
                              'hover:shadow-sm',
                              isChecked
                                ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_0_12px_-2px_hsl(var(--primary)/0.15)]'
                                : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground',
                              isRunning && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-4 items-center justify-center rounded-full border transition-all duration-200',
                                isChecked
                                  ? 'border-primary bg-primary text-primary-foreground scale-100'
                                  : 'border-muted-foreground/30 scale-90',
                              )}
                            >
                              {isChecked && <Check className="size-2.5" strokeWidth={3} />}
                            </span>
                            {option.label}
                          </button>
                        )
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Advanced Options */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                <Settings2 className="size-4 transition-transform duration-200 group-hover:rotate-45" />
                <span className="font-medium">Advanced Options</span>
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-300 ease-out',
                    advancedOpen && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
              <div className="mt-4 space-y-5 rounded-xl border bg-muted/30 p-5">
                <FormField
                  control={form.control}
                  name="maxPages"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">Max Pages to Crawl</FormLabel>
                        <span className="rounded-md bg-background px-2.5 py-1 text-sm font-mono font-semibold tabular-nums shadow-sm">
                          {field.value}
                        </span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={50}
                          step={1}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          disabled={isRunning}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxDepth"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">Max Crawl Depth</FormLabel>
                        <span className="rounded-md bg-background px-2.5 py-1 text-sm font-mono font-semibold tabular-nums shadow-sm">
                          {field.value}
                        </span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          disabled={isRunning}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* CTA Button */}
          <Button
            type="submit"
            disabled={isRunning}
            size="lg"
            className={cn(
              'w-full gap-2.5 text-[15px] font-semibold h-12 rounded-xl',
              'bg-gradient-to-r from-primary to-primary/90',
              'shadow-md shadow-primary/20',
              'transition-all duration-250 ease-out',
              'hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px',
              'active:translate-y-0 active:shadow-md',
              'disabled:opacity-50 disabled:shadow-none disabled:translate-y-0',
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start Accessibility Test
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
