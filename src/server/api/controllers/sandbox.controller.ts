import { getSession } from "@/server/better-auth/server";
import { env } from "@/env";
import {
  executeCode,
  isSupportedLanguage,
  resolveSandboxLanguage,
  validateCode,
  isUserExecuting,
  type ExecuteCodeResult,
} from "@/server/services/daytona.service";
import type { ApiErrorResponse } from "@/types/api.types";

/**
 * Execute code in a Daytona sandbox.
 * Requires authentication. Enforces one-execution-at-a-time per user.
 */
export async function executeCodeHandler({
  body,
}: {
  body: { code: string; language: string };
}): Promise<ExecuteCodeResult | ApiErrorResponse> {
  // Auth check
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  // Check if Daytona is configured
  if (!env.DAYTONA_API_KEY) {
    return {
      error: "Sandbox not configured",
      message:
        "Server-side code execution requires a Daytona API key. Please add DAYTONA_API_KEY to your environment variables.",
      status: 503,
    };
  }

  const userId = session.user.id;
  const { code, language } = body;

  // Validate language
  if (!isSupportedLanguage(language)) {
    return {
      error: "Unsupported language",
      message: `Language "${language}" is not supported. Supported: typescript, javascript, python, tsx, jsx, ts, js, py, node, mjs, cjs.`,
      status: 400,
    };
  }

  // Validate code
  const codeValidation = validateCode(code);
  if (!codeValidation.valid) {
    return {
      error: "Invalid code",
      message: codeValidation.error,
      status: 400,
    };
  }

  // Concurrency check
  if (isUserExecuting(userId)) {
    return {
      error: "Execution in progress",
      message:
        "You already have a sandbox execution running. Please wait for it to complete.",
      status: 429,
    };
  }

  try {
    const result = await executeCode({
      userId,
      code,
      language: resolveSandboxLanguage(language),
    });

    return result;
  } catch (error) {
    console.error("Sandbox execution error:", error);
    return {
      error: "Failed to execute code",
      message: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    };
  }
}
