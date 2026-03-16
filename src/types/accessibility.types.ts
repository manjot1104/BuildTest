export type ComplianceStandard = 'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa' | 'best-practice'

export interface AccessibilityTestConfig {
  url: string
  standards: ComplianceStandard[]
  maxPages?: number
  maxDepth?: number
}

export type SSEEvent =
  | { type: 'crawl:start'; url: string; timestamp: string }
  | { type: 'crawl:page_discovered'; url: string; count: number }
  | { type: 'crawl:complete'; totalPages: number }
  | { type: 'test:start'; url: string; pageIndex: number; totalPages: number }
  | { type: 'test:violation'; url: string; ruleId: string; impact: string; description: string; nodeCount: number }
  | { type: 'test:page_complete'; url: string; violationCount: number; passCount: number; incompleteCount: number }
  | { type: 'test:complete'; summary: TestSummary }
  | { type: 'report:generating' }
  | { type: 'report:complete'; testRunId: string }
  | { type: 'error'; message: string; fatal: boolean }
  | { type: 'progress'; phase: string; current: number; total: number; percentage: number }

export interface TestSummary {
  totalPages: number
  totalViolations: number
  totalPasses: number
  totalIncomplete: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
}

export interface AxeViolation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: Array<{ html: string; target: string[]; failureSummary: string }>
}

export interface PageResult {
  url: string
  title: string
  violations: AxeViolation[]
  passes: Array<{ id: string; description: string; help: string; tags: string[] }>
  incomplete: Array<{ id: string; description: string; help: string; impact: string; tags: string[] }>
  inapplicable: Array<{ id: string; description: string; tags: string[] }>
}
