import React from 'react'
import {
  CodeBlock,
  MathPart,
  type ThinkingSectionProps,
  type TaskSectionProps,
  type CodeProjectPartProps,
} from '@v0-sdk/react'
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning'
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from '@/components/ai-elements/task'
import {
  type TaskPart,
  type ChangedFile,
  type DesignInspiration,
  isTaskPart,
  isStartingRepoSearchPart,
  isSelectFilesPart,
  isFetchingDiagnosticsPart,
  isDiagnosticsPassedPart,
  isReadingFilePart,
  isCodeProjectPart,
  isLaunchTasksPart,
  isStartingWebSearchPart,
  isGotResultsPart,
  isFinishedWebSearchPart,
  isGeneratingDesignInspirationPart,
  isDesignInspirationCompletePart,
  isAnalyzingRequirementsPart,
  isRequirementsCompletePart,
  isThinkingPart,
  isProcessingPart,
  isCompletePart,
  isErrorPart,
  isAskingQuestionsPart,
  isStartingDesignInspirationPart,
  isFinishedDesignInspirationPart,
  isStartingIntegrationStatusCheckPart,
  hasMessage,
  hasDescription,
  hasText,
  hasStatus,
} from '@/types/api.types'
import { QuestionForm } from '@/components/question-form'

// Wrapper component to adapt AI Elements Reasoning to @v0-sdk/react ThinkingSection
export const ThinkingSectionWrapper = ({
  title,
  duration,
  thought,
  collapsed,
  onCollapse,
  children,
  ...props
}: ThinkingSectionProps) => {
  return (
    <Reasoning
      duration={duration ? Math.round(duration) : duration}
      defaultOpen={!collapsed}
      onOpenChange={() => onCollapse?.()}
      {...props}
    >
      <ReasoningTrigger title={title ?? 'Thinking'} />
      <ReasoningContent>
        {thought ??
          (typeof children === 'string'
            ? children
            : 'No thinking content available')}
      </ReasoningContent>
    </Reasoning>
  )
}

// Helper function to render a single task part
function renderTaskPart(part: string | TaskPart, index: number): React.ReactNode {
  // Handle string parts
  if (typeof part === 'string') {
    return <TaskItem key={index}>{part}</TaskItem>
  }

  // Handle structured task parts using type guards
  if (isStartingRepoSearchPart(part)) {
    return (
      <TaskItem key={index}>Searching: &quot;{part.query}&quot;</TaskItem>
    )
  }

  if (isSelectFilesPart(part)) {
    return (
      <TaskItem key={index}>
        Read{' '}
        {part.filePaths.map((file: string, i: number) => (
          <TaskItemFile key={i}>
            {file.split('/').pop()}
          </TaskItemFile>
        ))}
      </TaskItem>
    )
  }

  if (isFetchingDiagnosticsPart(part)) {
    return <TaskItem key={index}>Checking for issues...</TaskItem>
  }

  if (isDiagnosticsPassedPart(part)) {
    return <TaskItem key={index}>No issues found</TaskItem>
  }

  if (isReadingFilePart(part)) {
    return (
      <TaskItem key={index}>
        Reading file <TaskItemFile>{part.filePath}</TaskItemFile>
      </TaskItem>
    )
  }

  if (isCodeProjectPart(part) && part.changedFiles) {
    return (
      <TaskItem key={index}>
        Editing{' '}
        {part.changedFiles.map((file: ChangedFile, i: number) => (
          <TaskItemFile key={i}>
            {file.fileName ?? file.baseName}
          </TaskItemFile>
        ))}
      </TaskItem>
    )
  }

  if (isLaunchTasksPart(part)) {
    return <TaskItem key={index}>Starting tasks...</TaskItem>
  }

  if (isStartingWebSearchPart(part)) {
    return (
      <TaskItem key={index}>Searching: &quot;{part.query}&quot;</TaskItem>
    )
  }

  if (isGotResultsPart(part)) {
    return (
      <TaskItem key={index}>Found {part.count} results</TaskItem>
    )
  }

  if (isFinishedWebSearchPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {part.answer}
        </div>
      </TaskItem>
    )
  }

  if (isGeneratingDesignInspirationPart(part)) {
    return (
      <TaskItem key={index}>
        Generating design inspiration...
      </TaskItem>
    )
  }

  if (isDesignInspirationCompletePart(part) || (part.type === 'design-inspiration-complete' && 'inspirations' in part)) {
    const inspirations = (part as { inspirations?: DesignInspiration[] }).inspirations ?? []
    return (
      <TaskItem key={index}>
        <div className="space-y-2">
          <div className="text-gray-700 dark:text-gray-300 text-sm font-medium">
            Generated {inspirations.length} design inspiration{inspirations.length !== 1 ? 's' : ''}
          </div>
          {inspirations.map((inspiration: DesignInspiration, i: number) => (
            <div
              key={i}
              className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700"
            >
              {inspiration.title && (
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">{inspiration.title}</div>
              )}
              {inspiration.description && (
                <div className="text-gray-500 dark:text-gray-400">{inspiration.description}</div>
              )}
              {!inspiration.title && !inspiration.description && `Inspiration ${i + 1}`}
            </div>
          ))}
          {inspirations.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">No inspirations available</div>
          )}
        </div>
      </TaskItem>
    )
  }

  if (isAnalyzingRequirementsPart(part)) {
    return (
      <TaskItem key={index}>Analyzing requirements...</TaskItem>
    )
  }

  if (isRequirementsCompletePart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-700 dark:text-gray-300 text-sm">
          Analyzed {part.requirements?.length ?? 'several'} requirements
        </div>
      </TaskItem>
    )
  }

  if (isThinkingPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm italic">
          Thinking...
        </div>
      </TaskItem>
    )
  }

  if (isProcessingPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          Processing...
        </div>
      </TaskItem>
    )
  }

  if (isCompletePart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-green-600 dark:text-green-400 text-sm">
          Complete
        </div>
      </TaskItem>
    )
  }

  if (isErrorPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {part.error ?? part.message ?? 'Task failed'}
        </div>
      </TaskItem>
    )
  }

  // Handle asking-questions part - display interactive question form
  if (isAskingQuestionsPart(part)) {
    return (
      <TaskItem key={index}>
        <QuestionForm questions={part.questions} className="mt-2" />
      </TaskItem>
    )
  }

  // Handle starting-design-inspiration part
  if (isStartingDesignInspirationPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          Generating design inspiration...
        </div>
      </TaskItem>
    )
  }

  // Handle finished-design-inspiration part
  if (isFinishedDesignInspirationPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
          <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Design inspiration generated successfully
        </div>
      </TaskItem>
    )
  }

  // Handle starting-integration-status-check part
  if (isStartingIntegrationStatusCheckPart(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          Checking available integrations...
        </div>
      </TaskItem>
    )
  }

  // Handle generic parts with message/description/text
  if (hasMessage(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-700 dark:text-gray-300 text-sm">
          {part.message}
        </div>
      </TaskItem>
    )
  }

  if (hasDescription(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-700 dark:text-gray-300 text-sm">
          {part.description}
        </div>
      </TaskItem>
    )
  }

  if (hasText(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-700 dark:text-gray-300 text-sm">
          {part.text}
        </div>
      </TaskItem>
    )
  }

  if (hasStatus(part)) {
    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm capitalize">
          {part.status.replace(/-/g, ' ')}...
        </div>
      </TaskItem>
    )
  }

  // Show task type as a readable label for unknown types
  if (part.type && part.type !== 'unknown') {
    const readableType = part.type
      .replace(/-/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase())

    return (
      <TaskItem key={index}>
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {readableType}
        </div>
      </TaskItem>
    )
  }

  // Final fallback for completely unknown parts
  return (
    <TaskItem key={index}>
      <details className="text-xs">
        <summary className="text-gray-500 dark:text-gray-400 cursor-pointer">
          Unknown task part (click to expand)
        </summary>
        <div className="font-mono mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded">
          {JSON.stringify(part, null, 2)}
        </div>
      </details>
    </TaskItem>
  )
}

// Wrapper component to adapt AI Elements Task to @v0-sdk/react TaskSection
export const TaskSectionWrapper = ({
  title,
  type,
  parts,
  collapsed,
  onCollapse,
  children,
}: TaskSectionProps) => {
  return (
    <Task
      className="w-full mb-4"
      defaultOpen={!collapsed}
      onOpenChange={() => onCollapse?.()}
    >
      <TaskTrigger title={title ?? type ?? 'Task'} />
      <TaskContent>
        {parts &&
          parts.length > 0 &&
          parts.map((part, index) => {
            // Type narrow the part
            if (typeof part === 'string') {
              return renderTaskPart(part, index)
            }

            if (part && typeof part === 'object' && isTaskPart(part)) {
              return renderTaskPart(part as TaskPart, index)
            }

            return null
          })}

        {children && <TaskItem>{children}</TaskItem>}
      </TaskContent>
    </Task>
  )
}

// Wrapper component to adapt AI Elements styling to @v0-sdk/react CodeProjectPart
export const CodeProjectPartWrapper = ({
  title,
  filename,
  collapsed,
  className,
  children,
  ...props
}: CodeProjectPartProps) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed ?? true)

  return (
    <div
      className={`my-6 border border-border dark:border-input rounded-lg ${className ?? ''}`}
      {...props}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-black dark:text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {title ?? 'Code Project'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            v1
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className="border-t border-border dark:border-input">
          {children ?? (
            <div className="p-4">
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-black dark:text-white">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-mono">
                    {filename ?? 'app/page.tsx'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Extended props for CustomTaskSectionWrapper
interface CustomTaskSectionWrapperProps extends TaskSectionProps {
  taskNameComplete?: string
  taskNameActive?: string
}

// Shared components object that can be used by both StreamingMessage and MessageRenderer
const CustomTaskSectionWrapper = (props: CustomTaskSectionWrapperProps) => {
  const { parts, type, title, taskNameComplete, taskNameActive, ...restProps } = props

  // Check if this contains a code-project part
  if (parts && Array.isArray(parts)) {
    const codeProjectPart = parts.find(
      (part): part is TaskPart =>
        part !== null &&
        typeof part === 'object' &&
        isTaskPart(part) &&
        isCodeProjectPart(part),
    )

    if (codeProjectPart && isCodeProjectPart(codeProjectPart)) {
      const changedFiles = codeProjectPart.changedFiles
      return (
        <CodeProjectPartWrapper
          title={title ?? 'Code Project'}
          filename={changedFiles?.[0]?.fileName ?? 'project'}
          code={codeProjectPart.source ?? ''}
          language="typescript"
          collapsed={false}
        >
          {changedFiles && changedFiles.length > 0 && (
            <div className="p-4">
              <div className="space-y-2">
                {changedFiles.map((file: ChangedFile, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-black dark:text-white"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-mono">
                      {file.fileName ?? file.baseName ?? `file-${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CodeProjectPartWrapper>
      )
    }
  }

  if (type === 'task-generate-design-inspiration-v1') {
    return (
      <TaskSectionWrapper
        {...restProps}
        type={type}
        parts={parts}
        title={title ?? 'Design Inspiration'}
        collapsed={false}
      />
    )
  }

  // Force Questions accordion to be open
  if (type === 'task-ask-user-questions-v1') {
    return (
      <TaskSectionWrapper
        {...restProps}
        type={type}
        parts={parts}
        title={title ?? 'Questions'}
        collapsed={false}
      />
    )
  }

  if (type?.startsWith('task-') && type?.endsWith('-v1')) {
    const taskName = type
      .replace('task-', '')
      .replace('-v1', '')
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    return (
      <TaskSectionWrapper
        {...restProps}
        type={type}
        parts={parts}
        title={title ?? taskNameComplete ?? taskNameActive ?? taskName}
      />
    )
  }

  return <TaskSectionWrapper {...props} />
}

export const sharedComponents = {
  ThinkingSection: ThinkingSectionWrapper,
  TaskSection: CustomTaskSectionWrapper,
  CodeProjectPart: CodeProjectPartWrapper,
  CodeBlock,
  MathPart,
  p: {
    className: 'mb-4 text-gray-700 dark:text-gray-200 leading-relaxed',
  },
  h1: {
    className: 'mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100',
  },
  h2: {
    className: 'mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100',
  },
  h3: {
    className: 'mb-3 text-lg font-medium text-gray-900 dark:text-gray-100',
  },
  h4: {
    className: 'mb-3 text-base font-medium text-gray-900 dark:text-gray-100',
  },
  h5: {
    className: 'mb-2 text-sm font-medium text-gray-900 dark:text-gray-100',
  },
  h6: {
    className: 'mb-2 text-sm font-medium text-gray-900 dark:text-gray-100',
  },
  ul: {
    className: 'mb-4 ml-6 list-disc space-y-1 text-gray-700 dark:text-gray-200',
  },
  ol: {
    className:
      'mb-4 ml-6 list-decimal space-y-1 text-gray-700 dark:text-gray-200',
  },
  li: {
    className: 'text-gray-700 dark:text-gray-200',
  },
  blockquote: {
    className:
      'mb-4 border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400',
  },
  code: {
    className:
      'rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-sm font-mono text-gray-900 dark:text-gray-100',
  },
  pre: {
    className:
      'mb-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-4',
  },
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // Prevent any v0.dev links from navigating externally
    if (href && (href.includes('v0.dev') || href.includes('v0.io'))) {
      return (
        <span className="text-blue-600 dark:text-blue-400" {...props}>
          {children}
        </span>
      )
    }
    return (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  strong: {
    className: 'font-semibold text-gray-900 dark:text-gray-100',
  },
  em: {
    className: 'italic text-gray-700 dark:text-gray-300',
  },
}
