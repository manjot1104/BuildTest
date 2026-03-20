/**
 * API Types for Buildify
 * Centralized type definitions for type-safe API interactions
 */

// ============================================================================
// V0 SDK Task Part Types
// ============================================================================

/** Base interface for all task parts */
interface BaseTaskPart {
  type: string
}

/** Starting repo search task part */
export interface StartingRepoSearchPart extends BaseTaskPart {
  type: 'starting-repo-search'
  query: string
}

/** Select files task part */
export interface SelectFilesPart extends BaseTaskPart {
  type: 'select-files'
  filePaths: string[]
}

/** Fetching diagnostics task part */
export interface FetchingDiagnosticsPart extends BaseTaskPart {
  type: 'fetching-diagnostics'
}

/** Diagnostics passed task part */
export interface DiagnosticsPassedPart extends BaseTaskPart {
  type: 'diagnostics-passed'
}

/** Reading file task part */
export interface ReadingFilePart extends BaseTaskPart {
  type: 'reading-file'
  filePath: string
}

/** Changed file in code project */
export interface ChangedFile {
  fileName?: string
  baseName?: string
  filePath?: string
}

/** Code project task part */
export interface CodeProjectPart extends BaseTaskPart {
  type: 'code-project'
  changedFiles?: ChangedFile[]
  source?: string
}

/** Launch tasks task part */
export interface LaunchTasksPart extends BaseTaskPart {
  type: 'launch-tasks'
}

/** Starting web search task part */
export interface StartingWebSearchPart extends BaseTaskPart {
  type: 'starting-web-search'
  query: string
}

/** Got results task part */
export interface GotResultsPart extends BaseTaskPart {
  type: 'got-results'
  count: number
}

/** Finished web search task part */
export interface FinishedWebSearchPart extends BaseTaskPart {
  type: 'finished-web-search'
  answer: string
}

/** Design inspiration item */
export interface DesignInspiration {
  title?: string
  description?: string
}

/** Generating design inspiration task part */
export interface GeneratingDesignInspirationPart extends BaseTaskPart {
  type: 'generating-design-inspiration'
}

/** Design inspiration complete task part */
export interface DesignInspirationCompletePart extends BaseTaskPart {
  type: 'design-inspiration-complete'
  inspirations: DesignInspiration[]
}

/** Analyzing requirements task part */
export interface AnalyzingRequirementsPart extends BaseTaskPart {
  type: 'analyzing-requirements'
}

/** Requirements complete task part */
export interface RequirementsCompletePart extends BaseTaskPart {
  type: 'requirements-complete'
  requirements: unknown[]
}

/** Thinking/Analyzing task part */
export interface ThinkingPart extends BaseTaskPart {
  type: 'thinking' | 'analyzing'
}

/** Processing/Working task part */
export interface ProcessingPart extends BaseTaskPart {
  type: 'processing' | 'working'
}

/** Complete/Finished task part */
export interface CompletePart extends BaseTaskPart {
  type: 'complete' | 'finished'
}

/** Error/Failed task part */
export interface ErrorPart extends BaseTaskPart {
  type: 'error' | 'failed'
  error?: string
  message?: string
}

/** Question option for user questions */
export interface QuestionOption {
  id: string
  label: string
  description?: string
}

/** Single question in asking-questions part */
export interface Question {
  id: string
  question: string
  header?: string
  options: QuestionOption[]
  multiSelect?: boolean
}

/** Asking questions task part - v0 asks user to choose options */
export interface AskingQuestionsPart extends BaseTaskPart {
  type: 'asking-questions'
  questions: Question[]
}

/** Starting design inspiration task part */
export interface StartingDesignInspirationPart extends BaseTaskPart {
  type: 'starting-design-inspiration'
  prompt?: string
}

/** Finished design inspiration task part */
export interface FinishedDesignInspirationPart extends BaseTaskPart {
  type: 'finished-design-inspiration'
}

/** Starting integration status check task part */
export interface StartingIntegrationStatusCheckPart extends BaseTaskPart {
  type: 'starting-integration-status-check'
}

/** Generic fallback task part */
export interface GenericTaskPart extends BaseTaskPart {
  type: string
  status?: string
  message?: string
  description?: string
  text?: string
}

/** Union type for all task parts */
export type TaskPart =
  | StartingRepoSearchPart
  | SelectFilesPart
  | FetchingDiagnosticsPart
  | DiagnosticsPassedPart
  | ReadingFilePart
  | CodeProjectPart
  | LaunchTasksPart
  | StartingWebSearchPart
  | GotResultsPart
  | FinishedWebSearchPart
  | GeneratingDesignInspirationPart
  | DesignInspirationCompletePart
  | AnalyzingRequirementsPart
  | RequirementsCompletePart
  | ThinkingPart
  | ProcessingPart
  | CompletePart
  | ErrorPart
  | AskingQuestionsPart
  | StartingDesignInspirationPart
  | FinishedDesignInspirationPart
  | StartingIntegrationStatusCheckPart
  | GenericTaskPart

// ============================================================================
// Message Binary Format Types
// ============================================================================

/** A single row in the MessageBinaryFormat array */
export type MessageBinaryFormatRow = [number, ...unknown[]]

/** Extended MessageBinaryFormat with proper typing */
export type TypedMessageBinaryFormat = MessageBinaryFormatRow[]

// ============================================================================
// Chat API Types
// ============================================================================

/** Attachment for chat messages */
export interface ChatAttachment {
  url: string
}

/** Chat request body */
export interface ChatRequestBody {
  message: string
  chatId?: string
  streaming?: boolean
  attachments?: ChatAttachment[]
  envVarNames?: string[]
}

/** Chat message from API */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  experimental_content?: unknown
}

/** Chat response from API */
export interface ChatResponse {
  id: string
  demo?: string
  url?: string
  messages?: ChatMessage[]
}

/** V0 version file */
export interface V0VersionFile {
  object: 'file'
  name: string
  content: string
  locked: boolean
}

/** Chat details from API */
export interface ChatDetails {
  id: string
  demo?: string
  url?: string
  messages?: ChatMessage[]
  isOwner?: boolean
  latestVersion?: {
    demoUrl?: string
    files?: V0VersionFile[]
  }
}

/** Chat history item - stored locally in user_chats table */
export interface ChatHistoryItem {
  id: string
  v0ChatId: string
  title?: string | null
  prompt?: string | null
  demoUrl?: string | null
  previewUrl?: string | null
  createdAt: string
  updatedAt: string
  type: 'builder' | 'openrouter'
  folderId?: string | null
}

/** Community build item - for discovery grid */
export interface CommunityBuildItem {
  id: string
  v0ChatId: string
  title?: string | null
  prompt?: string | null
  demoUrl?: string | null
  previewUrl?: string | null
  createdAt: string
  updatedAt: string
  authorName: string
  authorImage?: string | null
}

/** Paginated community builds response */
export interface CommunityBuildsPage {
  data: CommunityBuildItem[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/** Chat ownership response */
export interface ChatOwnershipResponse {
  success: boolean
}

/** Fork chat response */
export interface ForkChatResponse {
  success: boolean
  newChatId: string
  demoUrl?: string
}

/** Parameters for creating a user chat */
export interface CreateUserChatParams {
  v0ChatId: string
  userId: string
  title?: string
  prompt?: string
  demoUrl?: string
  previewUrl?: string
}

/** Parameters for updating a user chat */
export interface UpdateUserChatParams {
  v0ChatId: string
  title?: string
  demoUrl?: string
  previewUrl?: string
}

// ============================================================================
// API Error Types
// ============================================================================

/** Standard API error response */
export interface ApiErrorResponse {
  error: string
  message?: string
  details?: string
  status?: number
  required?: number
  available?: number
}

/** Rate limit error response */
export interface RateLimitErrorResponse {
  error: 'rate_limit:chat' | 'rate_limit:speech'
  message: string
}

/** Insufficient credits error response */
export interface InsufficientCreditsErrorResponse {
  error: 'insufficient_credits'
  message: string
  required: number
  available: number
}

/** Speech-to-text success response */
export interface SpeechToTextResponse {
  transcript: string
  language: string | null
}

/** Speech-to-text error response */
export interface SpeechToTextErrorResponse {
  error: string
  message: string
}

// ============================================================================
// Type Guards
// ============================================================================

/** Type guard to check if a value is a TaskPart object */
export function isTaskPart(value: unknown): value is TaskPart {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as BaseTaskPart).type === 'string'
  )
}

/** Type guard for StartingRepoSearchPart */
export function isStartingRepoSearchPart(
  part: TaskPart,
): part is StartingRepoSearchPart {
  return part.type === 'starting-repo-search' && 'query' in part
}

/** Type guard for SelectFilesPart */
export function isSelectFilesPart(part: TaskPart): part is SelectFilesPart {
  return part.type === 'select-files' && Array.isArray((part as SelectFilesPart).filePaths)
}

/** Type guard for FetchingDiagnosticsPart */
export function isFetchingDiagnosticsPart(
  part: TaskPart,
): part is FetchingDiagnosticsPart {
  return part.type === 'fetching-diagnostics'
}

/** Type guard for DiagnosticsPassedPart */
export function isDiagnosticsPassedPart(
  part: TaskPart,
): part is DiagnosticsPassedPart {
  return part.type === 'diagnostics-passed'
}

/** Type guard for ReadingFilePart */
export function isReadingFilePart(part: TaskPart): part is ReadingFilePart {
  return part.type === 'reading-file' && 'filePath' in part
}

/** Type guard for CodeProjectPart */
export function isCodeProjectPart(part: TaskPart): part is CodeProjectPart {
  return part.type === 'code-project'
}

/** Type guard for LaunchTasksPart */
export function isLaunchTasksPart(part: TaskPart): part is LaunchTasksPart {
  return part.type === 'launch-tasks'
}

/** Type guard for StartingWebSearchPart */
export function isStartingWebSearchPart(
  part: TaskPart,
): part is StartingWebSearchPart {
  return part.type === 'starting-web-search' && 'query' in part
}

/** Type guard for GotResultsPart */
export function isGotResultsPart(part: TaskPart): part is GotResultsPart {
  return part.type === 'got-results' && 'count' in part
}

/** Type guard for FinishedWebSearchPart */
export function isFinishedWebSearchPart(
  part: TaskPart,
): part is FinishedWebSearchPart {
  return part.type === 'finished-web-search' && 'answer' in part
}

/** Type guard for GeneratingDesignInspirationPart */
export function isGeneratingDesignInspirationPart(
  part: TaskPart,
): part is GeneratingDesignInspirationPart {
  return part.type === 'generating-design-inspiration'
}

/** Type guard for DesignInspirationCompletePart */
export function isDesignInspirationCompletePart(
  part: TaskPart,
): part is DesignInspirationCompletePart {
  return (
    part.type === 'design-inspiration-complete' &&
    Array.isArray((part as DesignInspirationCompletePart).inspirations)
  )
}

/** Type guard for AnalyzingRequirementsPart */
export function isAnalyzingRequirementsPart(
  part: TaskPart,
): part is AnalyzingRequirementsPart {
  return part.type === 'analyzing-requirements'
}

/** Type guard for RequirementsCompletePart */
export function isRequirementsCompletePart(
  part: TaskPart,
): part is RequirementsCompletePart {
  return part.type === 'requirements-complete' && 'requirements' in part
}

/** Type guard for ThinkingPart */
export function isThinkingPart(part: TaskPart): part is ThinkingPart {
  return part.type === 'thinking' || part.type === 'analyzing'
}

/** Type guard for ProcessingPart */
export function isProcessingPart(part: TaskPart): part is ProcessingPart {
  return part.type === 'processing' || part.type === 'working'
}

/** Type guard for CompletePart */
export function isCompletePart(part: TaskPart): part is CompletePart {
  return part.type === 'complete' || part.type === 'finished'
}

/** Type guard for ErrorPart */
export function isErrorPart(part: TaskPart): part is ErrorPart {
  return part.type === 'error' || part.type === 'failed'
}

/** Type guard for AskingQuestionsPart */
export function isAskingQuestionsPart(
  part: TaskPart,
): part is AskingQuestionsPart {
  return (
    part.type === 'asking-questions' &&
    'questions' in part &&
    Array.isArray((part as AskingQuestionsPart).questions)
  )
}

/** Type guard for StartingDesignInspirationPart */
export function isStartingDesignInspirationPart(
  part: TaskPart,
): part is StartingDesignInspirationPart {
  return part.type === 'starting-design-inspiration'
}

/** Type guard for FinishedDesignInspirationPart */
export function isFinishedDesignInspirationPart(
  part: TaskPart,
): part is FinishedDesignInspirationPart {
  return part.type === 'finished-design-inspiration'
}

/** Type guard for StartingIntegrationStatusCheckPart */
export function isStartingIntegrationStatusCheckPart(
  part: TaskPart,
): part is StartingIntegrationStatusCheckPart {
  return part.type === 'starting-integration-status-check'
}

/** Type guard for GenericTaskPart with message */
export function hasMessage(
  part: TaskPart,
): part is GenericTaskPart & { message: string } {
  return 'message' in part && typeof (part as GenericTaskPart).message === 'string'
}

/** Type guard for GenericTaskPart with description */
export function hasDescription(
  part: TaskPart,
): part is GenericTaskPart & { description: string } {
  return 'description' in part && typeof (part as GenericTaskPart).description === 'string'
}

/** Type guard for GenericTaskPart with text */
export function hasText(
  part: TaskPart,
): part is GenericTaskPart & { text: string } {
  return 'text' in part && typeof (part as GenericTaskPart).text === 'string'
}

/** Type guard for GenericTaskPart with status */
export function hasStatus(
  part: TaskPart,
): part is GenericTaskPart & { status: string } {
  return 'status' in part && typeof (part as GenericTaskPart).status === 'string'
}

// ============================================================================
// API Response Type Helpers
// ============================================================================

/** Helper type for API responses that can be either success or error */
export type ApiResult<T> = T | ApiErrorResponse

/** Check if response is an error */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'string'
  )
}

/** Check if response is a rate limit error */
export function isRateLimitError(
  response: unknown,
): response is RateLimitErrorResponse {
  if (!isApiError(response)) return false
  const error = (response as RateLimitErrorResponse).error
  return error === 'rate_limit:chat' || error === 'rate_limit:speech'
}

/** Check if response is an insufficient credits error */
export function isInsufficientCreditsError(
  response: unknown,
): response is InsufficientCreditsErrorResponse {
  return (
    isApiError(response) && (response as InsufficientCreditsErrorResponse).error === 'insufficient_credits'
  )
}
