'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ChevronDown, Globe, Play } from 'lucide-react'
import { useState } from 'react'

const STANDARDS_OPTIONS = [
  { value: 'wcag2a', label: 'WCAG 2.0 Level A' },
  { value: 'wcag2aa', label: 'WCAG 2.0 Level AA' },
  { value: 'wcag21a', label: 'WCAG 2.1 Level A' },
  { value: 'wcag21aa', label: 'WCAG 2.1 Level AA' },
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="size-5" />
          Test Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      disabled={isRunning}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="standards"
              render={() => (
                <FormItem>
                  <FormLabel>Compliance Standards</FormLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STANDARDS_OPTIONS.map((option) => (
                      <FormField
                        key={option.value}
                        control={form.control}
                        name="standards"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes(option.value)}
                                disabled={isRunning}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, option.value])
                                  } else {
                                    field.onChange(
                                      field.value.filter((v) => v !== option.value),
                                    )
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer text-sm font-normal">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground">
                  <ChevronDown
                    className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                  Advanced Options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="maxPages"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Max Pages</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value}</span>
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
                        <FormLabel>Max Depth</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value}</span>
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
              </CollapsibleContent>
            </Collapsible>

            <Button type="submit" disabled={isRunning} className="w-full gap-2">
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running Test...
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
      </CardContent>
    </Card>
  )
}
