import { Daytona } from "@daytonaio/sdk";
import { db } from "@/server/db";
import { sandbox_executions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";

// ============================================================================
// Types
// ============================================================================

export type SandboxLanguage = "typescript" | "javascript" | "python";

/** Languages Daytona natively supports */
const SUPPORTED_LANGUAGES: SandboxLanguage[] = [
  "typescript",
  "javascript",
  "python",
];

/** Maps language aliases to Daytona-supported runtimes */
const LANGUAGE_ALIAS_MAP: Record<string, SandboxLanguage> = {
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  node: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  python: "python",
  py: "python",
};

export interface ExecuteCodeParams {
  userId: string;
  code: string;
  language: SandboxLanguage;
}

export interface ExecuteCodeResult {
  executionId: string;
  output: string;
  error: string | null;
  exitCode: number;
  executionTimeMs: number;
  status: "completed" | "failed" | "timeout";
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum code length in characters */
const MAX_CODE_LENGTH = 50_000;

/** Execution timeout in milliseconds (30 seconds) */
const EXECUTION_TIMEOUT_MS = 30_000;

/** In-memory concurrency guard: one execution per user at a time */
const _activeExecutions = new Map<string, boolean>();

// ============================================================================
// Validation
// ============================================================================

export function isSupportedLanguage(lang: string): boolean {
  return (
    SUPPORTED_LANGUAGES.includes(lang as SandboxLanguage) ||
    lang in LANGUAGE_ALIAS_MAP
  );
}

/** Resolves a language string (including aliases like tsx, jsx, py) to a Daytona runtime */
export function resolveSandboxLanguage(lang: string): SandboxLanguage {
  return LANGUAGE_ALIAS_MAP[lang] ?? (lang as SandboxLanguage);
}

export function validateCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Code cannot be empty" };
  }
  if (code.length > MAX_CODE_LENGTH) {
    return {
      valid: false,
      error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
    };
  }
  return { valid: true };
}

// ============================================================================
// Concurrency Guard
// ============================================================================

export function isUserExecuting(userId: string): boolean {
  return _activeExecutions.get(userId) === true;
}

function setUserExecuting(userId: string, executing: boolean) {
  if (executing) {
    _activeExecutions.set(userId, true);
  } else {
    _activeExecutions.delete(userId);
  }
}

// ============================================================================
// Daytona Client
// ============================================================================

function getDaytonaClient(): Daytona {
  if (!env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY is not configured");
  }
  return new Daytona({
    apiKey: env.DAYTONA_API_KEY,
    target: (env.DAYTONA_TARGET as "us" | "eu") ?? "us",
  });
}

// ============================================================================
// Core Execution
// ============================================================================

export async function executeCode(
  params: ExecuteCodeParams,
): Promise<ExecuteCodeResult> {
  const { userId, code, language } = params;

  // Create execution record
  const executionId = crypto.randomUUID();
  await db.insert(sandbox_executions).values({
    id: executionId,
    user_id: userId,
    language,
    code,
    status: "running",
  });

  // Set concurrency lock
  setUserExecuting(userId, true);

  const startTime = Date.now();
  let sandbox: Awaited<ReturnType<Daytona["create"]>> | null = null;

  try {
    const daytona = getDaytonaClient();

    // Create an isolated sandbox for this execution
    sandbox = await daytona.create({ language });

    // Execute code with timeout
    const result = await Promise.race([
      sandbox.process.codeRun(code),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timed out")),
          EXECUTION_TIMEOUT_MS,
        ),
      ),
    ]);

    const executionTimeMs = Date.now() - startTime;
    const isSuccess = result.exitCode === 0;

    // Update execution record
    await db
      .update(sandbox_executions)
      .set({
        status: isSuccess ? "completed" : "failed",
        output: result.result ?? "",
        error: isSuccess ? null : (result.result ?? "Unknown error"),
        exit_code: result.exitCode,
        execution_time_ms: executionTimeMs,
        completed_at: new Date(),
      })
      .where(eq(sandbox_executions.id, executionId));

    return {
      executionId,
      output: result.result ?? "",
      error: isSuccess ? null : (result.result ?? "Unknown error"),
      exitCode: result.exitCode,
      executionTimeMs,
      status: isSuccess ? "completed" : "failed",
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const isTimeout =
      error instanceof Error && error.message === "Execution timed out";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update execution record with error
    await db
      .update(sandbox_executions)
      .set({
        status: isTimeout ? "timeout" : "failed",
        error: errorMessage,
        exit_code: -1,
        execution_time_ms: executionTimeMs,
        completed_at: new Date(),
      })
      .where(eq(sandbox_executions.id, executionId));

    return {
      executionId,
      output: "",
      error: errorMessage,
      exitCode: -1,
      executionTimeMs,
      status: isTimeout ? "timeout" : "failed",
    };
  } finally {
    // Always clean up: delete sandbox and release concurrency lock
    if (sandbox) {
      try {
        await sandbox.delete();
      } catch {
        // Cleanup failure is non-critical
      }
    }
    setUserExecuting(userId, false);
  }
}
