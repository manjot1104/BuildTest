import { logger } from "@/lib/logger";

/**
 * Compiles LaTeX code to PDF using the LaTeX Online API (latex.ytotech.com)
 * Production-ready: no local pdflatex installation required
 */

function sanitizeLatexForFastCompile(latexCode: string): string {
  let out = latexCode
    .replace(/^```latex\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  // Drop heavy/slow packages that commonly trigger remote compile timeouts.
  // Keep `fontawesome` when possible — retry preamble loads it; stripping breaks \\fa* in body.
  out = out.replace(
    /\\usepackage(?:\[[^\]]*\])?\{(?:tikz|pgfplots|minted|fontspec|pst-all|svg|standalone|flowfram|fontawesome5|firasans|xcharter|anyfontsize)\}\s*/gi,
    ""
  );

  // Remove shell-escape style commands if present in model output.
  out = out.replace(/\\write18\{[^}]*\}/gi, "");

  return out;
}

function extractDocumentBody(latexCode: string): string {
  const bodyMatch = latexCode.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
  if (bodyMatch?.[1]?.trim()) {
    return bodyMatch[1].trim();
  }
  return latexCode.trim();
}

/**
 * Load `bookmark` immediately after `hyperref` so auxiliary files match on the first pass.
 * Without it, rerunfilecheck often asks for a second run; remote APIs may return 400 even when a PDF was written.
 */
function ensureBookmarkAfterHyperref(latexCode: string): string {
  if (/\\usepackage(?:\[[^\]]*\])?\{bookmark\}/i.test(latexCode)) {
    return latexCode;
  }
  const re = /(\\usepackage(?:\[[^\]]*\])?\{hyperref\}\s*\n?)/i;
  if (re.test(latexCode)) {
    return latexCode.replace(re, "$1\\usepackage{bookmark}\n");
  }
  return latexCode;
}

/**
 * Fallback preamble when the original document fails to compile. Must cover common resume
 * packages — the extracted body often still contains `paracol`, `tabularx`, `mdframed`, etc.
 * A too-minimal preamble makes the retry fail with undefined control sequences.
 */
function toMinimalCompileDocument(latexCode: string): string {
  const body = extractDocumentBody(latexCode);
  return `\\documentclass[10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{calc}
\\usepackage{array}
\\usepackage{booktabs}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{graphicx}
\\usepackage{multicol}
\\usepackage{paracol}
\\usepackage{tabularx}
\\usepackage{mdframed}
\\usepackage{fontawesome}
\\usepackage{mathptmx}
\\usepackage[hidelinks]{hyperref}
\\usepackage{bookmark}
\\pagestyle{empty}
\\setlist[itemize]{leftmargin=*,topsep=0.15em,itemsep=0.08em}
\\setlength{\\parskip}{0.3em}
\\setlength{\\parindent}{0pt}
\\begin{document}
${body}
\\end{document}`;
}

async function callLatexApi(latexCode: string): Promise<Response> {
  return fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [
          {
            main: true,
            content: latexCode,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pull a short pdflatex excerpt from YTO JSON errors for debugging */
function summarizeLatexApiFailure(body: string): string {
  try {
    const j = JSON.parse(body) as {
      error?: string
      log_files?: Record<string, string>
    }
    const log = j.log_files?.["__main_document__.log"]
    if (log && log.length > 0) {
      const tail = log.trim().split(/\r?\n/).slice(-25).join("\n")
      return `${j.error ?? "error"}: ${tail.slice(-1800)}`
    }
    return j.error ?? body.slice(0, 400)
  } catch {
    return body.slice(0, 400)
  }
}

async function callLatexApiWithServerRetries(latexCode: string): Promise<Response> {
  let lastResponse: Response | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await callLatexApi(latexCode);
    lastResponse = response;
    if (response.ok) return response;

    const bodyText = await response.clone().text().catch(() => "");
    const isServerError = response.status >= 500 || bodyText.includes("SERVER_ERROR");
    if (!isServerError || attempt === maxAttempts) {
      return response;
    }

    // Transient upstream failures are common; brief backoff improves success rate.
    await sleep(450 * attempt);
  }
  return lastResponse as Response;
}

export async function compileLaTeXToPDF(
  latexCode: string,
): Promise<Buffer | null> {
  logger.info("Starting LaTeX compilation via API");
  const startTime = Date.now();

  try {
    const prepared = ensureBookmarkAfterHyperref(latexCode);
    const response = await callLatexApiWithServerRetries(prepared);

    const compileTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      const isTimeout = errorText.includes("COMPILATION_TIMEOUT");
      logger.error("LaTeX API error", {
        status: response.status,
        compileTime,
        error: errorText.slice(0, 500),
      });

      // Retry once with a sanitized/minimal document to recover from heavy or unsupported AI output.
      const retrySource = toMinimalCompileDocument(sanitizeLatexForFastCompile(latexCode));
      logger.warn("Retrying LaTeX compilation with sanitized minimal document", {
        reason: isTimeout ? "timeout" : "compile-error",
      });
      const retryResponse = await callLatexApiWithServerRetries(retrySource);
      if (retryResponse.ok) {
        const retryBuffer = Buffer.from(await retryResponse.arrayBuffer());
        logger.info("LaTeX compilation success on sanitized retry", {
          compileTime: Date.now() - startTime,
          pdfSize: retryBuffer.length,
        });
        return retryBuffer;
      }

      const retryError = await retryResponse.text().catch(() => "Unknown retry error");
      throw new Error(
        `LaTeX compilation failed after retry (${retryResponse.status}): ${summarizeLatexApiFailure(retryError).slice(0, 1200)}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      const body = await response.text().catch(() => "");
      logger.error("LaTeX API returned non-PDF", {
        contentType,
        compileTime,
        body: body.slice(0, 500),
      });
      throw new Error(
        `LaTeX compilation failed: ${body.slice(0, 200) || "No PDF output"}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    logger.info("LaTeX compilation success", {
      compileTime,
      pdfSize: pdfBuffer.length,
    });

    return pdfBuffer;
  } catch (error: any) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      logger.error("LaTeX compilation timed out");
      throw new Error(
        "LaTeX compilation timed out after 60 seconds. Please simplify your LaTeX code and try again.",
      );
    }

    logger.error("LaTeX compilation error", {
      message: error?.message,
    });

    if (error instanceof Error && error.message.startsWith("LaTeX")) {
      throw error;
    }

    throw new Error(
      `LaTeX compilation failed: ${error?.message || "Unknown error"}`,
    );
  }
}
