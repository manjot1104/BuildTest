import { z } from 'zod'

const MAX_CODE_SIZE = 100000
const MAX_COMPILE_CODE_SIZE = 200000

const latexFollowUpSchema = z.object({
  currentLatex: z.string().min(1, 'LaTeX code is required').max(MAX_CODE_SIZE),
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  model: z.string().max(100).optional(),
})

const htmlFollowUpSchema = z.object({
  currentHtml: z.string().min(1, 'HTML code is required').max(MAX_CODE_SIZE),
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  model: z.string().max(100).optional(),
})

const compileLatexSchema = z.object({
  latex: z.string().min(1, 'LaTeX code is required').max(MAX_COMPILE_CODE_SIZE),
  fileName: z.string().max(100).optional().default('Resume'),
})

const compileHtmlSchema = z.object({
  html: z.string().min(1, 'HTML code is required').max(MAX_COMPILE_CODE_SIZE),
  fileName: z.string().max(100).optional().default('Resume'),
})

export type ValidatedLatexFollowUp = z.infer<typeof latexFollowUpSchema>
export type ValidatedHtmlFollowUp = z.infer<typeof htmlFollowUpSchema>

export function validateLatexFollowUpInput(payload: unknown): ValidatedLatexFollowUp {
  return latexFollowUpSchema.parse(payload)
}

export function validateHtmlFollowUpInput(payload: unknown): ValidatedHtmlFollowUp {
  return htmlFollowUpSchema.parse(payload)
}

export type ValidatedCompileLatexInput = z.infer<typeof compileLatexSchema>
export type ValidatedCompileHtmlInput = z.infer<typeof compileHtmlSchema>

export function validateCompileLatexInput(payload: unknown): ValidatedCompileLatexInput {
  return compileLatexSchema.parse(payload)
}

export function validateCompileHtmlInput(payload: unknown): ValidatedCompileHtmlInput {
  return compileHtmlSchema.parse(payload)
}

